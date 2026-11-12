import { deliverOrder, emailEnabled } from './organizer-email.js';

const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const reply = () => Response.json({ message: 'Se houver uma compra aprovada para esse e-mail, enviaremos o acesso ao endereço informado na compra. Confira também o spam. Aguarde 15 minutos antes de tentar novamente.' }, { status: 202, headers: { 'Cache-Control': 'no-store' } });

async function limit(db, key, maximum, windowMs) {
  const now = Date.now();
  const result = await db.prepare(`INSERT INTO organizer_recovery_limits (key, count, expires) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires <= ? THEN 1 ELSE count + 1 END,
    expires = CASE WHEN expires <= ? THEN excluded.expires ELSE expires END
    WHERE expires <= ? OR count < ?`).bind(key, now + windowMs, now, now, now, maximum).run();
  return result.meta.changes > 0;
}

export async function recoverOrder(request, env, waitUntil) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2048) return new Response(null, { status: 413 });
  let email;
  try { email = JSON.parse(raw)?.email; } catch { /* same generic response */ }
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return reply();
  if (!emailEnabled(env)) return new Response(JSON.stringify({ error: 'Recuperação temporariamente indisponível. Entre em contato com o suporte.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  email = email.trim().toLowerCase();
  const db = env.ORGANIZER_DB;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  // Hash with a server secret to avoid a database of recoverable e-mail/IP hashes.
  const identity = await hash(env.ORGANIZER_DELIVERY_KEY + ':email:' + email);
  const ipKey = await hash(env.ORGANIZER_DELIVERY_KEY + ':ip:' + ip);
  if (!await limit(db, 'ip:' + ipKey, 10, 3600000) ||
      !await limit(db, 'cooldown:' + identity, 1, 900000) ||
      !await limit(db, 'day:' + identity, 3, 86400000) ||
      !await limit(db, 'global', 100, 86400000)) return reply();
  const work = async () => {
    const orders = await db.prepare('SELECT id FROM organizer_orders WHERE lower(buyer_email) = ? AND payment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organizer_access_blocks WHERE order_id = organizer_orders.id) LIMIT 5').bind(email).all();
    for (const order of orders.results) {
      try { await deliverOrder(env, order.id, { resend: true }); }
      catch { console.error('organizer_recovery_delivery_pending'); } // No tokens or buyer data in logs.
    }
    await db.prepare('DELETE FROM organizer_recovery_limits WHERE expires < ?').bind(Date.now() - 86400000).run();
  };
  // Do not reveal account existence through response content or upstream timing.
  waitUntil(work());
  return reply();
}

export async function deliveryStatus(env, orderId) {
  const delivery = await env.ORGANIZER_DB.prepare('SELECT state, provider_id FROM organizer_delivery WHERE order_id = ?').bind(orderId).first();
  if (!delivery) return 'pending';
  if (delivery.state !== 'sent' || !delivery.provider_id) return 'pending';
  const cached = await env.ORGANIZER_DB.prepare('SELECT * FROM organizer_email_status WHERE order_id = ?').bind(orderId).first();
  if (cached?.provider_id === delivery.provider_id && Date.now() - cached.checked_at < 60000) return cached.state;
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/statistics/events?limit=100&messageId=' + encodeURIComponent(delivery.provider_id), {
      headers: { 'api-key': env.BREVO_API_KEY }, signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return 'unknown';
    const { events = [] } = await response.json();
    const types = events.map(e => e.event);
    const state = types.includes('delivered') ? 'delivered' :
      types.some(e => ['hardBounces', 'hard_bounce', 'blocked', 'invalid', 'error'].includes(e)) ? 'blocked' :
      types.some(e => ['deferred', 'softBounces', 'soft_bounce'].includes(e)) ? 'deferred' : 'accepted';
    await env.ORGANIZER_DB.prepare(`INSERT INTO organizer_email_status (order_id, provider_id, state, checked_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET provider_id = excluded.provider_id, state = excluded.state, checked_at = excluded.checked_at`)
      .bind(orderId, delivery.provider_id, state, Date.now()).run();
    return state;
  } catch { return 'unknown'; }
}
