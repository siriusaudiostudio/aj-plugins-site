import { useState } from 'react';

type Order = {
  id: string; email: string; payment: string; emailStatus: string;
  emailSentAt: string | null; activations: number; downloads: number;
};

const payments: Record<string, string> = {
  approved: 'Aprovado', unconfirmed: 'Sem aprovação registrada', refunded: 'Reembolsado',
  charged_back: 'Estornado por contestação', cancelled: 'Cancelado',
};
const emails: Record<string, string> = {
  pending: 'Pendente', sending: 'Em envio', accepted: 'Aceito pela Brevo', failed: 'Falha no envio',
  delivered: 'Entrega confirmada pelo provedor', blocked: 'Bloqueado', deferred: 'Entrega adiada', unknown: 'Entrega não confirmada',
};

export function OrganizerOrders({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState('');

  async function run(action: 'search' | 'email' | 'resend', query: string) {
    setBusy(true);
    setNotice('');
    setConfirm('');
    if (action === 'search') { setOrders(null); setMore(false); }
    try {
      const response = await fetch('/api/organizer-orders', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, query }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (action === 'search') { setOrders(body.orders); setMore(body.more); }
      if (action === 'email') setOrders(previous => previous?.map(order => order.id === query ? body.order : order) ?? null);
      if (action === 'resend') {
        setNotice(body.message);
        setOrders(previous => previous?.map(order => order.id === query ? { ...order, emailStatus: 'accepted', emailSentAt: body.sentAt } : order) ?? null);
      }
    } catch (error) {
      setNotice((error as Error).message || 'Não foi possível concluir a operação.');
    } finally { setBusy(false); }
  }

  return <section className="card organizer-metrics organizer-orders" aria-labelledby="organizer-orders-title">
    <h2 id="organizer-orders-title">Buscar pedidos do AJ Organizer Pro</h2>
    <form className="feedback-form" onSubmit={event => {
      event.preventDefault();
      void run('search', String(new FormData(event.currentTarget).get('query') ?? ''));
    }}>
      <label>E-mail da compra ou número do pedido<input name="query" required maxLength={254} autoComplete="off" spellCheck={false}/></label>
      <button className="button secondary" disabled={busy}>Buscar pedido</button>
    </form>
    <p role="status">{busy ? 'Processando…' : notice || (orders?.length === 0 ? 'Nenhum pedido encontrado.' : '')}</p>
    {more && <p>Exibindo 20 pedidos. Para localizar outro pedido deste e-mail, use o número do pedido.</p>}
    {!!orders?.length && <p>Downloads por pedido incluem entregas iniciadas a partir desta atualização, inclusive repetições.</p>}
    {orders?.map(order => <details key={order.id} open={orders.length === 1 || undefined}>
      <summary>{order.id} · {payments[order.payment] ?? 'Acesso bloqueado'}</summary>
      <dl>
        <div><dt>E-mail da compra</dt><dd>{order.email}</dd></div>
        <div><dt>Situação do envio</dt><dd>{emails[order.emailStatus] ?? 'Desconhecida'}</dd></div>
        {order.emailSentAt && <div><dt>Último envio aceito</dt><dd>{new Date(order.emailSentAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</dd></div>}
        <div><dt>Downloads do instalador</dt><dd>{order.downloads}</dd></div>
        <div><dt>Computadores ativados</dt><dd>{order.activations} de 2</dd></div>
      </dl>
      <div className="actions">
        <button className="button secondary" disabled={busy} onClick={() => void run('email', order.id)}>Atualizar situação do e-mail</button>
        {order.payment === 'approved' && confirm !== order.id && <button className="button secondary" disabled={busy} onClick={() => setConfirm(order.id)}>Reenviar acesso</button>}
        {confirm === order.id && <>
          <button className="button primary" disabled={busy} onClick={() => void run('resend', order.id)}>Confirmar reenvio</button>
          <button className="button secondary" onClick={() => setConfirm('')}>Cancelar</button>
        </>}
      </div>
      {confirm === order.id && <p>O acesso será reenviado para {order.email}, com a mesma licença e os computadores já ativados.</p>}
    </details>)}
  </section>;
}
