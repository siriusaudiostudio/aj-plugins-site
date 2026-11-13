import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { organizerPrice } from './config';
import { WindowsIcon } from './WindowsIcon';

const api = '/api/organizer';
const storageKey = 'aj-organizer-order';

export function OrganizerCheckout() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [notice, setNotice] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [orderId, setOrderId] = useState('');

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch(api + '?recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('recoveryEmail') }) });
      const data = await response.json();
      setNotice(response.ok ? data.message : (data.error || 'Não foi possível solicitar a recuperação.'));
    } catch { setNotice('Não foi possível conectar. Tente novamente em alguns minutos.'); }
    finally { setBusy(false); }
  }

  function saveAccess() {
    const text = `AJ VS Organizer Pro — acesso privado\nPedido: ${orderId}\nCódigo de ativação: ${token}\nLink: ${window.location.origin + window.location.pathname}#pedido=${token}\nLicença vitalícia para até dois computadores. Não compartilhe este arquivo.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'AJ-VS-Organizer-Pro-meu-acesso.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    const recovery = /^#pedido=([a-f0-9]{64})$/.exec(window.location.hash);
    if (recovery) {
      sessionStorage.setItem(storageKey, recovery[1]);
      history.replaceState(null, '', window.location.pathname + '#licenca');
    }
    setToken(sessionStorage.getItem(storageKey) ?? '');
  }, []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void fetch(api + '?status', { headers: { Authorization: 'Bearer ' + token }, signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const data = await response.json();
        if (controller.signal.aborted) return;
        setOrderId(data.orderId);
        setApproved(true);
      }).catch(() => { /* The customer can retry using Verificar pagamento. */ });
    return () => controller.abort();
  }, [token]);

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
      if (!download) {
        const data = await response.json();
        setOrderId(data.orderId);
        setEmailStatus(({ delivered: 'O servidor de e-mail do destinatário confirmou o recebimento. Confira também o spam.', accepted: 'A Brevo aceitou o envio, mas ainda não confirmou a entrega.', pending: 'O envio do e-mail está pendente. Seu acesso já está disponível abaixo.', blocked: 'O provedor informou um bloqueio na entrega. Salve seu acesso e fale com o suporte.', deferred: 'O provedor está adiando a entrega do e-mail.', unknown: 'Não foi possível consultar a entrega do e-mail agora.' } as Record<string, string>)[data.emailStatus] || 'Entrega do e-mail ainda não confirmada.');
      }
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
    <div className="organizer-price"><strong>{organizerPrice}</strong><span>Pagamento único · Até dois computadores</span></div>
    {token ? <>
      <button className="button primary" disabled={busy} onClick={() => void check(approved)}>
        {approved && <WindowsIcon/>}
        {busy ? (approved ? 'Processando…' : 'Verificando…') : approved ? 'Download para Windows' : 'Verificar pagamento'}
      </button>
      {approved && <>
        <p role="status">{emailStatus}</p>
        <label>Código de ativação <input readOnly value={token}/></label>
        <label>Link privado do pedido <input readOnly value={window.location.origin + window.location.pathname + '#pedido=' + token}/></label>
        <button className="button secondary" onClick={saveAccess}>Salvar meu acesso</button>
        <button className="button secondary" disabled={busy} onClick={() => void check()}>Atualizar situação do e-mail</button>
        <p>Guarde o arquivo de acesso em um local privado. Ele permite recuperar seu download e ativar a mesma licença em até dois computadores.</p>
      </>}
      <button className="button secondary" disabled={busy} onClick={() => {
        sessionStorage.removeItem(storageKey);
        setToken('');
        setApproved(false);
        setNotice('');
      }}>Novo pedido</button>
    </> : <form className="feedback-form" onSubmit={start}>
      <p>Pague com Pix ou cartão no Mercado Pago. Após a aprovação, você pode baixar o instalador nesta página e recebe o acesso por e-mail.</p>
      <label>Nome<input name="name" required maxLength={100} autoComplete="name"/></label>
      <label>E-mail<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
      <button className="button primary" disabled={busy}>{busy ? 'Aguarde…' : 'Ir para o pagamento'}</button>
    </form>}
    <details>
      <summary>Já comprei</summary>
      <form className="feedback-form" onSubmit={event => {
        event.preventDefault();
        const code = String(new FormData(event.currentTarget).get('accessCode') ?? '').trim().toLowerCase();
        if (!/^[a-f0-9]{64}$/.test(code)) {
          setNotice('Confira o código de ativação informado no e-mail.');
          return;
        }
        sessionStorage.setItem(storageKey, code);
        setApproved(false);
        setEmailStatus('');
        setNotice(code === token ? 'Use Verificar pagamento para consultar este pedido novamente.' : '');
        setToken(code);
      }}>
        <label>Código recebido por e-mail<input name="accessCode" required autoComplete="off" spellCheck={false}/></label>
        <button className="button secondary" disabled={busy}>Acessar com código</button>
      </form>
      <p>Use o mesmo e-mail informado na compra. O reenvio mantém sua licença e os computadores já ativados.</p>
      <form className="feedback-form" onSubmit={recover}>
        <label>E-mail da compra<input name="recoveryEmail" type="email" required maxLength={254} autoComplete="email"/></label>
        <button className="button secondary" disabled={busy}>Reenviar acesso por e-mail</button>
      </form>
      <p>Se você salvou o link privado, abra-o para acessar seu pedido. Se o e-mail não chegar, entre em contato pelo <a href="/suporte/">suporte</a> com o comprovante. Não envie sua chave de ativação em comentários públicos.</p>
    </details>
    {notice && <p role="status">{notice}</p>}
  </>;
}
