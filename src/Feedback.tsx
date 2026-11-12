import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type Status = 'pending' | 'approved' | 'rejected';
type Comment = { id: string; name: string; message: string; created_at: number };
type Submission = Comment & { kind: 'comment' | 'suggestion'; status: Status };
const labels: Record<Status, string> = { pending: 'Pendentes', approved: 'Publicados', rejected: 'Arquivados' };

async function feedback<T>(query = '', options?: RequestInit): Promise<T> {
  const response = await fetch('/api/feedback' + query, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data !== 'object' || data === null || !Object.keys(data).length) {
    throw new Error(data?.error || 'O serviço de comentários está indisponível.');
  }
  return data;
}

export function Feedback() {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    feedback<{ items: Comment[] }>('', { signal: controller.signal }).then(({ items }) => {
      setComments(items);
      setAvailable(true);
    }).catch(() => { if (!controller.signal.aborted) setAvailable(false); });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setNotice('');
    setBusy(true);
    try {
      await feedback('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: data.get('kind'), name: data.get('name'), message: data.get('message'), website: data.get('website') }),
      });
      form.reset();
      setNotice('Mensagem recebida. Comentários aparecem após aprovação. Sugestões são privadas.');
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="feedback" id="comentarios" aria-labelledby="feedback-title">
    <h2 id="feedback-title">Comentários e sugestões</h2>
    <p>Conte como você usa as ferramentas da AJ Plugins ou envie uma sugestão de melhoria.</p>
    {available === null && <p role="status">Carregando comentários…</p>}
    {available === false && <p role="status">Comentários e sugestões temporariamente indisponíveis.</p>}
    {available && <div className="info-grid">
      <form className="card feedback-form" onSubmit={submit}>
        <h3>Enviar mensagem</h3>
        <label>Tipo de mensagem<select name="kind"><option value="comment">Comentário público após aprovação</option><option value="suggestion">Sugestão privada</option></select></label>
        <label>Nome de exibição<input name="name" required maxLength={60} autoComplete="nickname"/></label>
        <label>Mensagem<textarea name="message" required minLength={10} maxLength={1500} rows={5}/></label>
        <div hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
        <p>Evite incluir e-mail, telefone ou outros dados pessoais. Comentários aprovados exibem o nome e a mensagem.</p>
        <button className="button primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar mensagem'}</button>
        {notice && <p role="status">{notice}</p>}
      </form>
      <section className="card"><h3>Comentários da comunidade</h3>
        {comments?.length ? <ul className="feedback-list">{comments.map(comment =>
          <li key={comment.id}><strong>{comment.name}</strong><p>{comment.message}</p></li>)}</ul> :
          <p>Ainda não há comentários publicados.</p>}
      </section>
    </div>}
  </section>;
}

export function Moderation() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status>('pending');
  const [items, setItems] = useState<Submission[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const headers = (key: string) => ({ Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' });

  async function load(key: string, filter: Status, before?: string) {
    setBusy(true);
    setNotice('');
    try {
      const page = await feedback<{ items: Submission[]; next: string | null }>(
        '?admin&status=' + filter + (before ? '&before=' + encodeURIComponent(before) : ''), { headers: headers(key) });
      setToken(key);
      setStatus(filter);
      setItems(previous => before ? [...previous, ...page.items] : page.items);
      setNext(page.next);
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }

  async function moderate(item: Submission, target: Status) {
    setBusy(true);
    setNotice('');
    try {
      await feedback('?admin', { method: 'PATCH', headers: headers(token), body: JSON.stringify({ id: item.id, status: target }) });
      setItems(previous => previous.filter(entry => entry.id !== item.id));
      setNotice(target === 'approved' ? 'Comentário publicado.' : target === 'rejected' ? 'Envio arquivado.' : 'Envio voltou para revisão.');
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="wrap interior moderation">
    <h1>Moderação</h1>
    {!token ? <form className="card feedback-form" onSubmit={event => {
      event.preventDefault();
      const form = event.currentTarget;
      const key = String(new FormData(form).get('token')).trim();
      form.reset();
      void load(key, 'pending');
    }}>
      <label>Chave de acesso<input name="token" type="password" required autoComplete="current-password"/></label>
      <button className="button primary" disabled={busy}>{busy ? 'Verificando…' : 'Entrar'}</button>
    </form> : <>
      <div className="actions">
        {(Object.keys(labels) as Status[]).map(filter => <button key={filter} className="button secondary" type="button" aria-pressed={status === filter} disabled={busy} onClick={() => void load(token, filter)}>{labels[filter]}</button>)}
        <button className="button secondary" type="button" disabled={busy} onClick={() => { setToken(''); setItems([]); setNext(null); setNotice(''); }}>Sair</button>
      </div>
      {items.length ? <ul className="feedback-list">{items.map(item => <li key={item.id} className="card">
        <strong>{item.name}</strong> <span className="muted">· {item.kind === 'comment' ? 'Comentário' : 'Sugestão privada'} · {new Date(item.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
        <p>{item.message}</p>
        <div className="actions">
          {item.kind === 'comment' && status !== 'approved' && <button className="button primary" disabled={busy} onClick={() => void moderate(item, 'approved')}>Aprovar e publicar</button>}
          {status !== 'rejected' && <button className="button secondary" disabled={busy} onClick={() => void moderate(item, 'rejected')}>{status === 'approved' ? 'Retirar do site' : 'Arquivar'}</button>}
          {status === 'rejected' && <button className="button secondary" disabled={busy} onClick={() => void moderate(item, 'pending')}>Voltar para revisão</button>}
        </div>
      </li>)}</ul> : <p>Nenhum envio nesta lista.</p>}
      {next && <button className="button secondary" disabled={busy} onClick={() => void load(token, status, next)}>Carregar mais</button>}
    </>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}

