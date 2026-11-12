const encoder = new TextEncoder();
const product = 'AJ-Organizer-Pro';
const installer = 'AJ-Organizer-Pro-Setup-0.2.80-x64.exe';
const headers = { 'Cache-Control': 'no-store' };
const json = (status, body) => Response.json(body, { status, headers });
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const tokenHash = async token => hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));

async function createOrder(request, url, env) {
  if (request.headers.get('Origin') !== url.origin) return json(403, { error: 'Origem inválida.' });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Informe nome e e-mail válidos.' });
  }
  const id = crypto.randomUUID();
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const returnUrl = url.origin + '/produtos/organizador-pro/#licenca';
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      external_reference: id,
      items: [{ id: product, title: 'AJ Organizer Pro — licença vitalícia', quantity: 1, currency_id: 'BRL', unit_price: 19.90 }],
      payer: { name, email },
      back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
      notification_url: url.origin + '/api/organizer?webhook',
      payment_methods: { installments: 1, excluded_payment_types: ['ticket', 'atm', 'prepaid_card', 'digital_currency', 'consumer_credits', 'account_money'].map(id => ({ id })) },
    }),
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    const code = /^[a-z_]{1,80}$/i.test(failure?.error ?? '') ? failure.error : 'unknown';
    return json(502, { error: 'Não foi possível abrir o checkout.', providerStatus: response.status, providerCode: code });
  }
  const preference = await response.json();
  const checkout = URL.parse(env.MP_LIVE_MODE === 'true' ? preference.init_point : preference.sandbox_init_point);
  if (!checkout || checkout.protocol !== 'https:' || !['www.mercadopago.com.br', 'sandbox.mercadopago.com.br'].includes(checkout.hostname)) {
    return json(502, { error: 'Endereço do checkout inválido.' });
  }
  await env.ORGANIZER_DB.prepare(
    'INSERT INTO organizer_orders (id, access_hash, buyer_name, buyer_email) VALUES (?, ?, ?, ?)',
  ).bind(id, await tokenHash(token), name, email).run();
  return json(201, { checkout: checkout.href, token });
}

async function approve(request, url, env) {
  const id = url.searchParams.get('data.id');
  const requestId = request.headers.get('x-request-id');
  const signature = new URLSearchParams((request.headers.get('x-signature') ?? '').replaceAll(',', '&'));
  const timestamp = signature.get('ts')?.trim();
  const digest = signature.get('v1')?.trim() ?? signature.get(' v1')?.trim();
  if (!id || !/^\d+$/.test(id) || !requestId || !/^\d+$/.test(timestamp ?? '') || !/^[a-f0-9]{64}$/.test(digest ?? '')) {
    return json(401, { error: 'Notificação inválida.' });
  }
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.MP_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(digest.match(/../g), byte => parseInt(byte, 16)),
    encoder.encode(`id:${id};request-id:${requestId};ts:${timestamp};`));
  if (!valid) return json(401, { error: 'Notificação inválida.' });

  const upstream = await fetch('https://api.mercadopago.com/v1/payments/' + id, {
    headers: { Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN },
  });
  if (!upstream.ok) return json(502, { error: 'Não foi possível consultar o pagamento.' });
  const payment = await upstream.json();
  if (String(payment.id) !== id || String(payment.collector_id) !== env.MP_COLLECTOR_ID ||
      payment.live_mode !== (env.MP_LIVE_MODE === 'true') || payment.status !== 'approved' ||
      !(payment.payment_method_id === 'pix' || (['credit_card', 'debit_card'].includes(payment.payment_type_id) && payment.installments === 1)) || payment.currency_id !== 'BRL' || payment.transaction_amount !== 19.90 ||
      typeof payment.external_reference !== 'string') {
    return json(200, { accepted: false });
  }
  const { meta } = await env.ORGANIZER_DB.prepare(
    'UPDATE organizer_orders SET payment_id = ? WHERE id = ? AND (payment_id IS NULL OR payment_id = ?) AND NOT EXISTS (SELECT 1 FROM organizer_orders WHERE payment_id = ? AND id <> ?)',
  ).bind(id, payment.external_reference, id, id, payment.external_reference).run();
  return json(200, { accepted: meta.changes > 0 });
}

export async function onRequest({ request, env }) {
  if (!env.ORGANIZER_DB || !env.ORGANIZER_INSTALLERS || !env.ORGANIZER_SIGNING_KEY ||
      !env.MP_WEBHOOK_SECRET || !env.MP_ACCESS_TOKEN || !env.MP_COLLECTOR_ID) {
    return json(503, { error: 'Serviço indisponível.' });
  }
  const url = new URL(request.url);
  if (url.searchParams.has('webhook') && request.method === 'POST') return approve(request, url, env);
  if (url.searchParams.has('checkout') && request.method === 'POST') return createOrder(request, url, env);

  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return json(401, { error: 'Acesso inválido.' });
  const hash = await tokenHash(token);
  const order = await env.ORGANIZER_DB.prepare(
    'SELECT id, buyer_name, buyer_email FROM organizer_orders WHERE access_hash = ? AND payment_id IS NOT NULL',
  ).bind(hash).first();
  if (!order) return json(403, { error: 'Pedido sem acesso liberado.' });
  if (request.method === 'GET' && url.searchParams.has('status')) return json(200, { approved: true });

  if (request.method === 'GET') {
    const file = await env.ORGANIZER_INSTALLERS.get(installer);
    if (!file) return json(503, { error: 'Instalador indisponível.' });
    return new Response(file.body, { headers: { ...headers, 'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${installer}"` } });
  }
  if (request.method !== 'POST') return json(405, { error: 'Método inválido.' });
  const machine = (await request.json().catch(() => null))?.machine;
  if (typeof machine !== 'string' || !/^[a-f0-9]{64}$/.test(machine)) return json(400, { error: 'Computador inválido.' });
  const { meta } = await env.ORGANIZER_DB.prepare(
    'UPDATE organizer_orders SET machine = COALESCE(machine, ?1), second_machine = CASE WHEN machine IS NOT NULL AND machine <> ?1 THEN COALESCE(second_machine, ?1) ELSE second_machine END WHERE id = ?2 AND payment_id IS NOT NULL AND (machine IS NULL OR machine = ?1 OR second_machine IS NULL OR second_machine = ?1)',
  ).bind(machine, order.id).run();
  if (!meta.changes) return json(409, { error: 'A licença já foi ativada em dois computadores.' });

  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.ORGANIZER_SIGNING_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const payload = encoder.encode(['AJLICENSE1', product, order.id, 'permanent', machine,
    base64(encoder.encode(order.buyer_name)), base64(encoder.encode(order.buyer_email)), new Date().toISOString(), ''].join('\n'));
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, payload);
  return new Response(`AJSIGNED1\n${base64(payload)}\n${base64(signature)}\n`, {
    headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="Licenca-AJ.ajlic"' },
  });
}
