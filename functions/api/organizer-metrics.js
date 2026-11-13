import { isAdmin } from '../../server/admin-auth.js';

const json = (status, body) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});

function dayStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const utc = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) return null;
  // The report uses Brasília time (UTC−03) for both ends of the period.
  return new Date(value + 'T00:00:00-03:00');
}

export async function onRequest({ request, env }) {
  if (!await isAdmin(request, env.FEEDBACK_ADMIN_TOKEN)) return json(401, { error: 'Acesso inválido.' });
  if (request.method !== 'GET') return json(405, { error: 'Método inválido.' });
  if (!env.ORGANIZER_DB) return json(503, { error: 'Métricas indisponíveis.' });

  const { searchParams } = new URL(request.url);
  const from = dayStart(searchParams.get('from') ?? '');
  const to = dayStart(searchParams.get('to') ?? '');
  if (!from || !to || from > to) return json(400, { error: 'Informe um período válido.' });
  to.setUTCDate(to.getUTCDate() + 1);

  try {
    const counts = await env.ORGANIZER_DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM organizer_metric_events WHERE kind = 'sale' AND occurred_at >= ?1 AND occurred_at < ?2) AS sales,
        (SELECT COUNT(*) FROM organizer_metric_events WHERE kind = 'refund' AND occurred_at >= ?1 AND occurred_at < ?2) AS refunds,
        (SELECT COUNT(*) FROM organizer_metric_events WHERE kind = 'download' AND occurred_at >= ?1 AND occurred_at < ?2) AS downloads,
        (SELECT COUNT(*) FROM organizer_orders AS o WHERE o.payment_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM organizer_metric_events AS e WHERE e.kind = 'sale' AND e.event_id = o.id
        )) AS undatedSales
    `).bind(from.toISOString(), to.toISOString()).first();
    return json(200, counts);
  } catch {
    return json(503, { error: 'Não foi possível consultar as métricas.' });
  }
}
