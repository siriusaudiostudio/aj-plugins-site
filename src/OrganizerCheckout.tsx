import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const api = '/api/organizer';
const storageKey = 'aj-organizer-order';

export function OrganizerCheckout() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const recovery = /^#pedido=([a-f0-9]{64})$/.exec(window.location.hash);
    if (recovery) {
      sessionStorage.setItem(storageKey, recovery[1]);
      history.replaceState(null, '', window.location.pathname + '#licenca');
    }
    setToken(sessionStorage.getItem(storageKey) ?? '');
  }, []);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(api + '?checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.get('name'), email: form.get('email') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      sessionStorage.setItem(storageKey, data.token);
      window.location.assign(data.checkout);
    } catch (error) {
      setNotice((error as Error).message);
      setBusy(false);
    }
  }

  async function check(download = false) {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(api + (download ? '' : '?status'), { headers: { Authorization: 'Bearer ' + token } });
      if (response.status === 403) throw new Error('O pagamento ainda não foi confirmado.');
      if (!response.ok) throw new Error('O pedido está temporariamente indisponível.');
      setApproved(true);
      if (download) {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = 'AJ-Organizer-Pro-Setup-0.2.80-x64.exe';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <p><strong>R$ 19,90</strong> · Pagamento único</p>
    {token ? <>
      <button className="button primary" disabled={busy} onClick={() => void check(approved)}>
        {approved ? 'Baixar instalador' : 'Verificar pagamento'}
      </button>
      {approved && <>
        <label>Código de ativação <input readOnly value={token}/></label>
        <label>Link privado do pedido <input readOnly value={window.location.origin + window.location.pathname + '#pedido=' + token}/></label>
      </>}
      <button className="button secondary" disabled={busy} onClick={() => {
        sessionStorage.removeItem(storageKey);
        setToken('');
        setApproved(false);
        setNotice('');
      }}>Novo pedido</button>
    </> : <form className="feedback-form" onSubmit={start}>
      <label>Nome<input name="name" required maxLength={100} autoComplete="name"/></label>
      <label>E-mail<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
      <button className="button primary" disabled={busy}>Pagar com Mercado Pago</button>
    </form>}
    {notice && <p role="status">{notice}</p>}
  </>;
}
