import { useEffect, useState } from 'react';

type Counts = { sales: number; refunds: number; downloads: number; undatedSales: number };

const localDate = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

export function OrganizerMetrics({ token }: { token: string }) {
  const [period, setPeriod] = useState(() => ({
    from: localDate(new Date(Date.now() - 29 * 86400000)), to: localDate(new Date()),
  }));
  const [result, setResult] = useState<Counts | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setResult(null);
    setError('');
    async function load() {
      try {
        const response = await fetch('/api/organizer-metrics?' + new URLSearchParams(period), {
          headers: { Authorization: 'Bearer ' + token }, signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (!controller.signal.aborted) setResult(body);
      } catch (error) {
        if (!controller.signal.aborted) setError((error as Error).message || 'Falha ao consultar métricas.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [period, token]);

  return <section className="card organizer-metrics" aria-labelledby="organizer-metrics-title">
    <h2 id="organizer-metrics-title">Vendas e downloads do AJ Organizer Pro</h2>
    <form className="actions" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setPeriod({ from: String(form.get('from')), to: String(form.get('to')) });
    }}>
      <label>De <input type="date" name="from" defaultValue={period.from} required/></label>
      <label>Até <input type="date" name="to" defaultValue={period.to} required/></label>
      <button className="button secondary">Aplicar período</button>
    </form>
    <p>Datas no horário de Brasília.</p>
    <div aria-live="polite">
      {loading && <p>Carregando métricas…</p>}
      {error && <p role="alert">{error}</p>}
      {result && <>
        <dl className="organizer-metrics-counts">
          <div><dt>Vendas aprovadas</dt><dd>{result.sales}</dd></div>
          <div><dt>Reembolsos</dt><dd>{result.refunds}</dd></div>
          <div><dt>Downloads do instalador</dt><dd>{result.downloads}</dd></div>
        </dl>
        <p>Downloads contam entregas iniciadas desde a ativação da medição, incluindo repetições.</p>
        {result.undatedSales > 0 && <p>{result.undatedSales} vendas anteriores sem data registrada ficam fora do filtro.</p>}
      </>}
    </div>
  </section>;
}
