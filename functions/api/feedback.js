const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

const fields = 'id, kind, name, message, status, created_at';
const encoder = new TextEncoder();

async function readBody(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let length = 0;
  let data = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 8192) {
      await reader.cancel();
      return null;
    }
    data += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(data + decoder.decode()); }
  catch { return null; }
}

async function isAdmin(request, token) {
  const supplied = request.headers.get('Authorization') ?? '';
  if (!supplied.startsWith('Bearer ') || supplied.length > 256) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const proof = await crypto.subtle.sign('HMAC', key, encoder.encode(token));
  return crypto.subtle.verify('HMAC', key, proof, encoder.encode(supplied.slice(7)));
}

export async function onRequest({ request, env }) {
  if (!env.FEEDBACK_DB || !env.FEEDBACK_ADMIN_TOKEN || env.FEEDBACK_ADMIN_TOKEN.length < 32) {
    return json({ error: 'Comentários temporariamente indisponíveis.' }, 503);
  }
  const db = env.FEEDBACK_DB;
  const url = new URL(request.url);
  const admin = url.searchParams.has('admin');
  if (admin && !await isAdmin(request, env.FEEDBACK_ADMIN_TOKEN)) {
    return json({ error: 'Chave de acesso inválida.' }, 401);
  }
  if (request.method === 'GET') {
    if (admin) {
      const status = url.searchParams.get('status') ?? 'pending';
      if (!['pending', 'approved', 'rejected'].includes(status)) return json({ error: 'Filtro inválido.' }, 400);
      const cursor = url.searchParams.get('before');
      if (cursor && !/^\d{13}:[a-f0-9-]{36}$/.test(cursor)) return json({ error: 'Cursor inválido.' }, 400);
      const [time, id] = cursor?.split(':') ?? [Date.now() + 1, ''];
      const { results } = await db.prepare(
        'SELECT ' + fields + ' FROM feedback WHERE status = ? AND (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 31',
      ).bind(status, Number(time), id).all();
      const items = results.slice(0, 30);
      const last = items.at(-1);
      return json({ items, next: results.length > 30 ? last.created_at + ':' + last.id : null });
    }
    const { results } = await db.prepare(
      "SELECT id, name, message, created_at FROM feedback WHERE status = 'approved' AND kind = 'comment' ORDER BY created_at DESC, id DESC LIMIT 30",
    ).all();
    return json({ items: results });
  }
  if ((admin && request.method !== 'PATCH') || (!admin && request.method !== 'POST')) {
    return json({ error: 'Método inválido.' }, 405);
  }
  if (request.headers.get('Origin') !== url.origin) return json({ error: 'Origem inválida.' }, 403);
  const body = await readBody(request);
  if (admin) {
    const { id, status } = body ?? {};
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id) || !['approved', 'rejected', 'pending'].includes(status)) {
      return json({ error: 'Alteração inválida.' }, 400);
    }
    const { meta } = await db.prepare(
      "UPDATE feedback SET status = ? WHERE id = ? AND (? <> 'approved' OR kind = 'comment')",
    ).bind(status, id, status).run();
    return meta.changes ? json({ ok: true }) : json({ error: 'Este envio não pode ser alterado.' }, 404);
  }
  const kind = body?.kind;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!['comment', 'suggestion'].includes(kind) || !name || name.length > 60 || message.length < 10 || message.length > 1500) {
    return json({ error: 'Confira o nome e escreva uma mensagem de 10 a 1.500 caracteres.' }, 400);
  }
  if (body.website) return json({ ok: true }, 201);
  const now = Date.now();
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.FEEDBACK_ADMIN_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const day = Math.floor(now / 86400000);
  const hash = await crypto.subtle.sign('HMAC', key, encoder.encode(day + ':' + ip));
  const submitter = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  const { meta } = await db.prepare(
    'INSERT INTO feedback (id, kind, name, message, submitter, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT count(*) FROM feedback WHERE submitter = ? AND created_at >= ?) < 5',
  ).bind(crypto.randomUUID(), kind, name, message, submitter, now, submitter, day * 86400000).run();
  return meta.changes ? json({ ok: true }, 201) : json({ error: 'Limite de envios atingido. Tente novamente amanhã.' }, 429);
}

