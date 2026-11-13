import { isAdmin } from '../../server/admin-auth.js';
import { deliverOrder } from '../../server/organizer-email.js';
import { deliveryStatus } from '../../server/organizer-recovery.js';

const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const orderPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const selectOrders = `
  SELECT o.id, o.buyer_email AS email,
    COALESCE(b.reason, CASE WHEN o.payment_id IS NULL THEN 'unconfirmed' ELSE 'approved' END) AS payment,
    CASE WHEN d.state = 'sent' THEN COALESCE(s.state, 'accepted')
         WHEN d.last_error IS NOT NULL THEN 'failed' ELSE COALESCE(d.state, 'pending') END AS emailStatus,
    d.sent_at AS emailSentAt,
    (o.machine IS NOT NULL) + (o.second_machine IS NOT NULL) AS activations,
    (SELECT COUNT(*) FROM organizer_metric_events e WHERE e.kind = 'download'
      AND e.event_id >= o.id || ':' AND e.event_id < o.id || ':~') AS downloads
  FROM organizer_orders o
  LEFT JOIN organizer_access_blocks b ON b.order_id = o.id
  LEFT JOIN organizer_delivery d ON d.order_id = o.id
  LEFT JOIN organizer_email_status s ON s.order_id = o.id AND s.provider_id = d.provider_id
`;

export async function onRequest({ request, env }) {
  if (!await isAdmin(request, env.FEEDBACK_ADMIN_TOKEN)) return json(401, { error: 'Acesso inválido.' });
  if (request.method !== 'POST') return json(405, { error: 'Método inválido.' });
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json(403, { error: 'Origem inválida.' });
  if (!env.ORGANIZER_DB) return json(503, { error: 'Pedidos indisponíveis.' });

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === 'string' ? body.query.trim().toLowerCase() : '';
  const byId = orderPattern.test(query);
  const db = env.ORGANIZER_DB;

  try {
    if (body?.action === 'search') {
      if (!byId && (query.length > 254 || !emailPattern.test(query))) {
        return json(400, { error: 'Informe o e-mail completo da compra ou o número do pedido.' });
      }
      const { results } = await db.prepare(selectOrders + (byId ? ' WHERE o.id = ?' : ' WHERE lower(o.buyer_email) = ?') +
        ' ORDER BY (o.payment_id IS NOT NULL) DESC, o.rowid DESC LIMIT 21').bind(query).all();
      return json(200, { orders: results.slice(0, 20), more: results.length > 20 });
    }
    if (!byId || !['email', 'resend'].includes(body?.action)) return json(400, { error: 'Operação inválida.' });
    if (body.action === 'email') {
      const order = await db.prepare(selectOrders + ' WHERE o.id = ?').bind(query).first();
      if (!order) return json(404, { error: 'Pedido não encontrado.' });
      if (order.emailSentAt && ['accepted', 'blocked', 'deferred', 'delivered', 'unknown'].includes(order.emailStatus)) {
        order.emailStatus = await deliveryStatus(env, query);
      }
      return json(200, { order });
    }
    const { state, sentAt } = await deliverOrder(env, query, { resend: true });
    if (state === 'unpaid') return json(409, { error: 'O acesso só pode ser reenviado para um pedido aprovado e sem bloqueio.' });
    if (state === 'cooldown') return json(429, { error: 'Aguarde 15 minutos a partir do último envio.' });
    if (state === 'disabled') return json(503, { error: 'O envio de e-mail está indisponível.' });
    return json(200, { sentAt, message: 'A Brevo aceitou o envio ao e-mail da compra. Consulte a situação para confirmar a entrega.' });
  } catch (error) {
    if (error.message === 'delivery_busy') return json(409, { error: 'Há um envio em andamento. Tente novamente em alguns instantes.' });
    return json(503, { error: body?.action === 'resend' ? 'Não foi possível reenviar o acesso.' : 'Não foi possível consultar o pedido.' });
  }
}
