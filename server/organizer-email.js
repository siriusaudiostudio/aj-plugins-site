const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const bytes = value => Uint8Array.from(value.match(/../g), byte => parseInt(byte, 16));
const hash = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function emailEnabled(env) { return env.ORGANIZER_EMAIL_ENABLED === 'true'; }

async function encryptionKey(env) {
  if (!/^[a-f0-9]{64}$/.test(env.ORGANIZER_DELIVERY_KEY ?? '')) throw new Error('delivery_configuration');
  return crypto.subtle.importKey('raw', bytes(env.ORGANIZER_DELIVERY_KEY), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export function deliveryMessage(order, token, origin) {
  const link = origin + '/produtos/organizador-pro/#pedido=' + token;
  const text = `Olá, ${order.buyer_name}!\n\nSeu pagamento do AJ Organizer Pro foi aprovado.\n\nCódigo de ativação:\n${token}\n\nDownload privado e acesso ao pedido:\n${link}\n\nAbra o link, clique em Verificar pagamento e depois em Baixar instalador. Após instalar, abra o Organizer no REAPER e use Ativar com código.\n\nSua licença é vitalícia, com pagamento único de R$ 19,90, para até dois computadores. Use o mesmo código em ambos. O arquivo de licença é gerado para cada computador durante a ativação.\n\nGuarde este e-mail e não compartilhe o código ou o link.\nPedido: ${order.id}\n\nAJ Plugins`;
  return { subject: 'AJ Organizer Pro — sua licença e download', textContent: text,
    htmlContent: '<!doctype html><html lang="pt-BR"><body><div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;line-height:1.6"><h1>Seu AJ Organizer Pro está liberado</h1><p>' + escape(text).replaceAll('\n', '<br>') + '</p><p><a href="' + link + '">Acessar meu download privado</a></p></div></body></html>' };
}

// A second credential preserves existing activation codes and the same two-machine allocation.
// Only its hash and AES-GCM encrypted value are stored in D1.
export async function deliverOrder(env, orderId, { resend = false } = {}) {
  if (!emailEnabled(env)) return { state: 'disabled' };
  if (!env.BREVO_API_KEY || !env.ORGANIZER_EMAIL_FROM) throw new Error('delivery_configuration');
  const origin = new URL(env.ORGANIZER_PUBLIC_ORIGIN);
  if (origin.protocol !== 'https:' || origin.origin !== env.ORGANIZER_PUBLIC_ORIGIN) throw new Error('delivery_configuration');
  const order = await env.ORGANIZER_DB.prepare('SELECT id, buyer_name, buyer_email FROM organizer_orders WHERE id = ? AND payment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organizer_access_blocks WHERE order_id = organizer_orders.id)').bind(orderId).first();
  if (!order) return { state: 'unpaid' };
  const key = await encryptionKey(env);
  let delivery = await env.ORGANIZER_DB.prepare('SELECT * FROM organizer_delivery WHERE order_id = ?').bind(orderId).first();
  if (!delivery) {
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(orderId) }, key, encoder.encode(token));
    await env.ORGANIZER_DB.prepare('INSERT OR IGNORE INTO organizer_delivery (order_id, access_hash, token_box) VALUES (?, ?, ?)')
      .bind(orderId, await hash(token), hex(iv) + ':' + hex(encrypted)).run();
    delivery = await env.ORGANIZER_DB.prepare('SELECT * FROM organizer_delivery WHERE order_id = ?').bind(orderId).first();
  }
  if (delivery.state === 'sent' && !resend) return { state: 'sent' };
  const now = Date.now();
  if (resend && delivery.sent_at && now - Date.parse(delivery.sent_at) < 900000) return { state: 'cooldown' };
  const lease = now + 120000;
  const claim = await env.ORGANIZER_DB.prepare("UPDATE organizer_delivery SET state = 'sending', lease_until = ?, attempts = attempts + 1 WHERE order_id = ? AND " + (resend ? "(sent_at IS NULL OR sent_at = ?) AND " : "state <> 'sent' AND ") + "lease_until <= ?")
    .bind(...(resend ? [lease, orderId, delivery.sent_at, now] : [lease, orderId, now])).run();
  if (!claim.meta.changes) throw new Error('delivery_busy');
  let providerId;
  try {
    const [iv, ciphertext] = delivery.token_box.split(':');
    const token = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv), additionalData: encoder.encode(orderId) }, key, bytes(ciphertext)));
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', 'api-key': env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: 'AJ Plugins', email: env.ORGANIZER_EMAIL_FROM },
        replyTo: { name: 'AJ Plugins', email: env.ORGANIZER_EMAIL_REPLY_TO || env.ORGANIZER_EMAIL_FROM },
        to: [{ name: order.buyer_name, email: order.buyer_email }],
        headers: { IdempotencyKey: 'organizer-delivery-' + orderId + (resend ? '-recovery-' + Math.floor(now / 900000) : '') },
        tags: ['organizer-delivery'], ...deliveryMessage(order, token, origin.origin),
      }),
    });
    if (!response.ok) throw new Error('provider_http_' + response.status);
    providerId = (await response.json()).messageId;
    if (typeof providerId !== 'string' || !providerId) throw new Error('provider_response');
  } catch (error) {
    const safeError = /^provider_(http_\d+|response)$/.test(error.message) ? error.message : 'delivery_failed';
    await env.ORGANIZER_DB.prepare("UPDATE organizer_delivery SET state = 'pending', lease_until = 0, last_error = ? WHERE order_id = ? AND lease_until = ?")
      .bind(safeError, orderId, lease).run();
    throw new Error(safeError);
  }
  await env.ORGANIZER_DB.prepare("UPDATE organizer_delivery SET state = 'sent', provider_id = ?, sent_at = ?, last_error = NULL, lease_until = 0 WHERE order_id = ? AND lease_until = ?")
    .bind(providerId, new Date().toISOString(), orderId, lease).run();
  return { state: 'sent' }; // Provider acceptance is not proof of inbox delivery.
}
