import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { deliverOrder, deliveryMessage } from '../server/organizer-email.js';
import { onRequest } from '../functions/api/organizer.js';
import { onRequest as manageOrders } from '../functions/api/organizer-orders.js';
import { deliveryStatus } from '../server/organizer-recovery.js';

const orderId = '11111111-1111-4111-8111-111111111111';
const originalToken = 'a'.repeat(64);
const sha = async s => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).toString('hex');
async function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../db/organizer-orders.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../db/organizer-email.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../db/organizer-recovery.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT INTO organizer_orders VALUES (?, ?, ?, ?, ?, ?, ?)').run(orderId, await sha(originalToken), '<Cliente>', 'buyer@example.com', '123', '1'.repeat(64), '2'.repeat(64));
  const env = {
    ORGANIZER_DB: { prepare(sql) { return { bind(...args) { return {
      async first() { return db.prepare(sql).get(...args); },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { return { meta: db.prepare(sql).run(...args) }; },
    }; } }; } },
    ORGANIZER_EMAIL_ENABLED: 'true', ORGANIZER_DELIVERY_KEY: '3'.repeat(64),
    ORGANIZER_EMAIL_FROM: 'sender@example.com', ORGANIZER_PUBLIC_ORIGIN: 'https://example.com',
    BREVO_API_KEY: 'test-only', ORGANIZER_DELIVERY_ADMIN_TOKEN: 'admin-test-only',
    ORGANIZER_INSTALLERS: { async get() { return { body: 'installer-fixture' }; } },
    ORGANIZER_SIGNING_KEY: '{}', MP_WEBHOOK_SECRET: 'secret', MP_ACCESS_TOKEN: 'test-only', MP_COLLECTOR_ID: '7', MP_LIVE_MODE: 'false',
  };
  return { db, env };
}

test('paid delivery, encrypted credential, retries and access controls', async () => {
  const { db, env } = await fixture();
  const priorFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    sent.push(JSON.parse(options.body));
    return Response.json({ messageId: 'test-message' }, { status: 201 });
  };
  try {
    assert.equal((await deliverOrder(env, orderId)).state, 'sent');
    assert.equal(sent[0].to[0].email, 'buyer@example.com');
    assert.ok(sent[0].htmlContent.includes('&lt;Cliente&gt;'));
    const token = sent[0].textContent.match(/Código de ativação:\n([a-f0-9]{64})/)[1];
    assert.ok(sent[0].textContent.includes('#pedido=' + token));
    const stored = db.prepare('SELECT * FROM organizer_delivery').get();
    assert.equal(stored.access_hash, await sha(token));
    assert.ok(!stored.token_box.includes(token));
    await deliverOrder(env, orderId);
    assert.equal(sent.length, 1, 'duplicate webhook does not resend');
    for (const access of [token, originalToken]) {
      assert.equal((await onRequest({ env, request: new Request('https://example.com/api/organizer?status', { headers: { Authorization: 'Bearer ' + access } }) })).status, 200);
      assert.equal((await onRequest({ env, request: new Request('https://example.com/api/organizer', { method: 'POST', headers: { Authorization: 'Bearer ' + access }, body: JSON.stringify({ machine: '4'.repeat(64) }) }) })).status, 409);
    }
    assert.equal(db.prepare('SELECT machine FROM organizer_orders').get().machine, '1'.repeat(64));
    db.exec('UPDATE organizer_orders SET payment_id = NULL');
    assert.equal((await deliverOrder(env, orderId)).state, 'unpaid');
    assert.equal((await onRequest({ env, request: new Request('https://example.com/api/organizer?status', { headers: { Authorization: 'Bearer ' + token } }) })).status, 403);
    assert.equal((await onRequest({ env, request: new Request('https://example.com/api/organizer?delivery', { method: 'POST', body: JSON.stringify({ orderId }) }) })).status, 401);
  } finally { globalThis.fetch = priorFetch; db.close(); }
});

test('admin searches by email or order and resends existing access only to the buyer', async () => {
  const { db, env } = await fixture();
  db.exec(readFileSync(new URL('../db/organizer-metrics.sql', import.meta.url), 'utf8'));
  env.FEEDBACK_ADMIN_TOKEN = 'admin-test-credential'.repeat(2);
  const admin = (action, query, token = env.FEEDBACK_ADMIN_TOKEN, origin = 'https://example.com') => manageOrders({
    env, request: new Request('https://example.com/api/organizer-orders', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, Origin: origin },
      body: JSON.stringify({ action, query, email: 'other@example.com' }),
    }),
  });
  const priorFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (url, options) => {
    if (url.includes('/statistics/events')) return Response.json({ events: [{ event: 'delivered' }] });
    sent.push(JSON.parse(options.body));
    return Response.json({ messageId: 'message-' + sent.length }, { status: 201 });
  };
  try {
    await deliverOrder(env, orderId);
    await onRequest({ env, request: new Request('https://example.com/api/organizer', { headers: { Authorization: 'Bearer ' + originalToken } }) });
    assert.equal((await admin('search', orderId, 'wrong')).status, 401);
    assert.equal((await admin('resend', orderId, env.FEEDBACK_ADMIN_TOKEN, 'https://other.example.com')).status, 403);
    for (const query of [orderId, ' BUYER@EXAMPLE.COM ']) {
      const { orders } = await (await admin('search', query)).json();
      assert.deepEqual(orders, [{ id: orderId, email: 'buyer@example.com', payment: 'approved', emailStatus: 'accepted',
        emailSentAt: db.prepare('SELECT sent_at FROM organizer_delivery').get().sent_at, activations: 2, downloads: 1 }]);
    }
    assert.equal((await (await admin('email', orderId)).json()).order.emailStatus, 'delivered');
    assert.equal((await admin('resend', orderId)).status, 429);
    db.exec("UPDATE organizer_delivery SET sent_at = '2020-01-01T00:00:00Z'");
    assert.equal((await admin('resend', orderId)).status, 200);
    assert.equal(sent.length, 2);
    assert.deepEqual(sent[1].to, sent[0].to);
    assert.equal(sent[1].textContent, sent[0].textContent);
    assert.deepEqual({ ...db.prepare('SELECT machine, second_machine FROM organizer_orders').get() },
      { machine: '1'.repeat(64), second_machine: '2'.repeat(64) });
    db.prepare("INSERT INTO organizer_access_blocks VALUES (?, 'refunded', '2020-01-01T00:00:00Z')").run(orderId);
    assert.equal((await (await admin('search', orderId)).json()).orders[0].payment, 'refunded');
    assert.equal((await admin('resend', orderId)).status, 409);
    assert.equal(sent.length, 2);
  } finally { globalThis.fetch = priorFetch; db.close(); }
});

test('provider failure leaves retryable state and does not revoke payment', async () => {
  const { db, env } = await fixture();
  const priorFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(deliverOrder(env, orderId), /provider_http_503/);
    assert.equal(db.prepare('SELECT state FROM organizer_delivery').get().state, 'pending');
    assert.equal(db.prepare('SELECT payment_id FROM organizer_orders').get().payment_id, '123');
    globalThis.fetch = async () => Response.json({ messageId: 'retry-success' }, { status: 201 });
    assert.equal((await deliverOrder(env, orderId)).state, 'sent');
    assert.equal(db.prepare('SELECT attempts FROM organizer_delivery').get().attempts, 2);
  } finally { globalThis.fetch = priorFetch; db.close(); }
});

test('signed webhook: pending sends nothing, approved sends, invalid signature rejected', async () => {
  const { db, env } = await fixture();
  db.exec('UPDATE organizer_orders SET payment_id = NULL');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('id:123;request-id:test;ts:123;'))).toString('hex');
  const request = () => new Request('https://example.com/api/organizer?webhook&data.id=123', { method: 'POST', headers: { 'x-request-id': 'test', 'x-signature': 'ts=123,v1=' + digest } });
  const priorFetch = globalThis.fetch;
  let status = 'pending', emails = 0;
  globalThis.fetch = async url => {
    if (url.includes('mercadopago')) return Response.json({ id: 123, collector_id: 7, live_mode: false, status, payment_method_id: 'pix', currency_id: 'BRL', transaction_amount: 19.90, external_reference: orderId });
    emails++; return Response.json({ messageId: 'webhook-message' }, { status: 201 });
  };
  try {
    assert.equal((await onRequest({ env, request: request() })).status, 200);
    assert.equal(emails, 0);
    status = 'approved';
    assert.equal((await onRequest({ env, request: request() })).status, 200);
    assert.equal(emails, 1);
    await onRequest({ env, request: request() });
    assert.equal(emails, 1);
    status = 'refunded';
    await onRequest({ env, request: request() });
    assert.equal((await onRequest({ env, request: new Request('https://example.com/api/organizer?status', { headers: { Authorization: 'Bearer ' + originalToken } }) })).status, 403);
    assert.equal((await deliverOrder(env, orderId, { resend: true })).state, 'unpaid');
    assert.equal(db.prepare('SELECT machine FROM organizer_orders').get().machine, '1'.repeat(64));
    assert.equal((await onRequest({ env, request: new Request('https://example.com/api/organizer?webhook&data.id=123', { method: 'POST' }) })).status, 401);
  } finally { globalThis.fetch = priorFetch; db.close(); }
});

test('email template never embeds executable or machine-specific fake license', () => {
  const message = deliveryMessage({ id: orderId, buyer_name: 'Cliente', buyer_email: 'buyer@example.com' }, originalToken, 'https://example.com');
  assert.ok(message.textContent.includes('até dois computadores'));
  assert.ok(message.textContent.includes('arquivo de licença é gerado para cada computador'));
  const privateLink = 'https://example.com/produtos/organizador-pro/#pedido=' + originalToken;
  assert.ok(message.textContent.includes(privateLink));
  assert.ok(message.htmlContent.includes('href="' + privateLink + '"'));
  assert.ok(message.htmlContent.includes('Baixar AJ Organizer Pro'));
  assert.ok(message.htmlContent.includes('Acessar com código'));
});

test('recovery sends only to stored buyer, keeps credential and two-PC limit, throttles repeats', async () => {
  const { db, env } = await fixture();
  const oldFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (_url, options) => { sent.push(JSON.parse(options.body)); return Response.json({ messageId: 'recovery-' + sent.length }, { status: 201 }); };
  const pending = [];
  const request = (email, origin = 'https://example.com') => onRequest({ env, waitUntil: p => pending.push(p), request: new Request('https://example.com/api/organizer?recover', {
    method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify({ email, recipient: 'attacker@example.com' }),
  }) });
  try {
    await deliverOrder(env, orderId);
    const before = db.prepare('SELECT * FROM organizer_delivery').get();
    db.exec("UPDATE organizer_delivery SET sent_at = '2020-01-01T00:00:00.000Z'");
    const response = await request('BUYER@example.com');
    assert.equal(response.status, 202);
    const generic = await response.text();
    await Promise.all(pending);
    assert.equal(sent.length, 2);
    assert.equal(sent[1].to[0].email, 'buyer@example.com');
    assert.equal(sent[0].textContent, sent[1].textContent);
    assert.equal(db.prepare('SELECT access_hash FROM organizer_delivery').get().access_hash, before.access_hash);
    assert.equal(db.prepare('SELECT second_machine FROM organizer_orders').get().second_machine, '2'.repeat(64));
    assert.equal(await (await request('missing@example.com')).text(), generic);
    await request('buyer@example.com'); await Promise.all(pending);
    assert.equal(sent.length, 2);
    assert.equal((await request('buyer@example.com', 'https://evil.example')).status, 403);
  } finally { globalThis.fetch = oldFetch; db.close(); }
});

test('provider acceptance is not delivery; delivered and blocked have distinct states', async () => {
  const { db, env } = await fixture();
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ messageId: 'status-message' }, { status: 201 });
    await deliverOrder(env, orderId);
    for (const [event, expected] of [['requests', 'accepted'], ['delivered', 'delivered'], ['hardBounces', 'blocked'], ['deferred', 'deferred']]) {
      db.exec('DELETE FROM organizer_email_status');
      globalThis.fetch = async () => Response.json({ events: [{ event }] });
      assert.equal(await deliveryStatus(env, orderId), expected);
    }
  } finally { globalThis.fetch = oldFetch; db.close(); }
});
