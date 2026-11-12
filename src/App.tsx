import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, Check, ChevronDown, CircleHelp, Menu, X } from 'lucide-react';
import { commerce, faq, products, release, site } from './config';
import { Feedback, Moderation } from './Feedback';
import { ScreenshotGallery } from './ScreenshotGallery';

const browser = products[0];
type CatalogProduct = (typeof products)[number];
const productPath = (product: CatalogProduct) => '/produtos/' + product.slug + '/';
const nav = [['Início', '/'], ['Produtos', '/produtos/'], ['Sobre', '/sobre/'], ['Suporte', '/suporte/']];
export const pages = [
  { path: '/', title: site.slogan, description: site.description },
  { path: '/produtos/', title: 'Produtos', description: 'Explore o AJ Plugin Browser e o AJ Organizer Pro para REAPER.' },
  ...products.map(product => ({ path: productPath(product), title: product.name, description: product.description })),
  { path: '/sobre/', title: 'Sobre', description: 'Conheça a AJ Plugins e suas ferramentas para REAPER.' },
  { path: '/suporte/', title: 'Suporte', description: 'Instalação, atualizações, requisitos e ajuda para ferramentas AJ Plugins.' },
  { path: '/moderacao/', title: 'Moderação', description: 'Área privada de moderação.' },
  { path: '/404.html', title: 'Página não encontrada', description: 'Encontre os produtos e o suporte da AJ Plugins.' },
];

type PublishedRelease = { tag_name: string; published_at: string; body: string | null };
type ReleaseState = { loading: boolean; url: string; downloads: number | null; history: PublishedRelease[] };
const configured = release.enabled && /^[\w.-]+\/[\w.-]+$/.test(release.repository) && Boolean(release.asset);
const initial: ReleaseState = { loading: configured, url: '', downloads: null, history: [] };

function useRelease(active: boolean) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    if (!active || !configured) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const prefix = 'https://api.github.com/repos/' + release.repository + '/releases';
    const read = async (suffix: string) => {
      const response = await fetch(prefix + suffix, { signal: controller.signal });
      if (!response.ok) throw new Error('GitHub Releases indisponível');
      return response.json();
    };
    async function load() {
      try {
        const latest = await read('/latest');
        const expected = 'https://github.com/' + release.repository + '/releases/download/' +
          encodeURIComponent(latest.tag_name) + '/' + encodeURIComponent(release.asset);
        const asset = latest.assets?.find((item: { name: string; state: string; size: number; download_count?: number; browser_download_url: string }) =>
          item.name === release.asset && item.state === 'uploaded' && item.size > 0 && item.browser_download_url === expected);
        const history = !latest.draft && !latest.prerelease && latest.published_at ? [latest] : [];
        const url = history.length && asset ? expected : '';
        const count = asset?.download_count;
        const downloads = url && typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : null;
        setState({ loading: false, url, downloads, history });
        const entries = await read('?per_page=10').catch(() => []);
        setState(previous => ({ ...previous, history: [...history, ...entries.filter(
          (entry: PublishedRelease & { draft: boolean; prerelease: boolean }) =>
            !entry.draft && !entry.prerelease && entry.published_at && entry.tag_name !== latest.tag_name)] }));
      } catch {
        setState({ ...initial, loading: false });
      } finally {
        clearTimeout(timer);
      }
    }
    void load();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [active]);
  return state;
}

function Brand() {
  return <a href="/" className="brand"><img src="/marca.svg" alt="" width="40" height="40" /><span>AJ <strong>Plugins</strong></span></a>;
}

function Header({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  return <header className="header" onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      document.getElementById('menu-button')?.focus();
    }
  }}>
    <div className="wrap header-inner">
      <Brand />
      <button id="menu-button" className="menu" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-controls="navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav id="navigation" aria-label="Navegação principal" className={open ? 'open' : ''}>
        {nav.map(([label, href]) => <a key={href} href={href} aria-current={path === href ? 'page' : undefined} className={path.startsWith(href) && href !== '/' ? 'active' : undefined}>{label}</a>)}
      </nav>
      <a className="header-link" href={productPath(browser)}>AJ Plugin Browser <ArrowUpRight size={15} /></a>
    </div>
  </header>;
}

function Download({ state }: { state: ReleaseState }) {
  return state.url ? <a className="button primary" href={state.url}><ArrowDownToLine size={17} /> Download gratuito</a> :
    <span className="button unavailable" role="status"><ArrowDownToLine size={17} />{state.loading ? 'Consultando versões…' : 'Download em breve'}</span>;
}

function Intro({ label, title, description }: { label: string; title: string; description: string }) {
  return <div className="intro"><span className="eyebrow">{label}</span><h1>{title}</h1><p>{description}</p></div>;
}

function Catalog({ state, home = false }: { state: ReleaseState; home?: boolean }) {
  return <section className={home ? 'catalog section-line' : 'catalog'} id="ferramentas">
    <div className="wrap">
      {home ? <div className="section-head"><div><span className="eyebrow">CATÁLOGO</span><h2>Ferramentas para o seu workflow</h2></div><a className="text-link" href="/produtos/">Ver todos os produtos <ArrowRight size={17}/></a></div> :
        <Intro label="CATÁLOGO" title="Produtos" description="Conheça as ferramentas da AJ Plugins para o seu fluxo de trabalho no REAPER." />}
      <div className="cards">{products.map(product => <article key={product.slug} className="card">
        <div className="card-top"><span className="product-icon"><product.icon size={23}/></span><span className={'badge ' + (product === browser ? 'free' : '')}>{product.status}</span></div>
        <h3>{product.name}</h3><p>{product.description}</p>
        {product === browser ? <><p className="card-highlight">{browser.highlight}</p><ScreenshotGallery variant="cover"/></> :
          <ul className="features">{commerce.model.map(item => <li key={item}><Check size={15}/>{item}</li>)}</ul>}
        <div className="card-actions">{product === browser && <Download state={state}/>}
        <a className={product === browser ? 'text-link' : 'button secondary'} href={productPath(product)}>{product.action} <ArrowRight size={16}/></a></div>
      </article>)}</div>
    </div>
  </section>;
}

function Home({ state }: { state: ReleaseState }) {
  return <>
    <section className="wrap hero">
      <div className="hero-copy"><span className="eyebrow pill"><span/> SCRIPTS E FERRAMENTAS PARA REAPER</span>
        <h1>Seus plugins. Seu workflow. <em>Sem complicação.</em></h1>
        <p>Ferramentas inteligentes para organizar seus plugins, acelerar tarefas e transformar sua experiência no REAPER.</p>
        <div className="actions"><a className="button primary" href="#ferramentas">Explorar ferramentas <ArrowRight size={17}/></a>
          <a className="button secondary" href={productPath(browser)}>Conhecer o AJ Plugin Browser <ArrowUpRight size={16}/></a></div>
      </div>
      <ScreenshotGallery variant="compact"/>
    </section>
    <Catalog state={state} home/>
    <section className="wrap support-strip"><CircleHelp size={26}/><div><h2>Precisa de ajuda?</h2><p>Consulte orientações de instalação, atualização e solução de problemas.</p></div><a className="text-link" href="/suporte/">Acessar suporte <ArrowRight size={17}/></a></section>
  </>;
}

function safeLink(value: string, mail = false) {
  try { const url = new URL(value); return url.protocol === (mail ? 'mailto:' : 'https:') ? url.href : ''; }
  catch { return ''; }
}

function Product({ product, state }: { product: CatalogProduct; state: ReleaseState }) {
  const isBrowser = product === browser;
  const latest = state.history[0];
  const manual = safeLink(release.manual);
  const documentation = safeLink(commerce.documentationUrl);
  return <div className="wrap interior">
    <nav className="actions" aria-label="Navegação do produto">
      <a className="text-link" href="/produtos/"><ArrowLeft size={16}/> Todos os produtos</a>
      {product.slug === 'organizador-pro' && <a className="text-link" href="#recursos">Recursos</a>}
      <a className="text-link" href="#comentarios">Comentários e sugestões</a>
    </nav>
    <section className="product-intro">
      <div><Intro label={product.category.toUpperCase() + ' · ' + product.status.toUpperCase()} title={product.name} description={product.description}/>
        {isBrowser && <Download state={state}/>}
        {isBrowser && state.downloads !== null && <p className="muted">
          {state.downloads.toLocaleString('pt-BR')} {state.downloads === 1 ? 'download' : 'downloads'} do instalador desta versão no GitHub
        </p>}
        {isBrowser && release.platform && <p className="muted">Sistema operacional: {release.platform}</p>}
        {product.slug === 'organizador-pro' && <p className="muted">Versão {product.version} · {product.requirements}</p>}
      </div>
    </section>
    {isBrowser && <section className="interface-section" aria-labelledby="interface-title">
      <div><span className="eyebrow">VISÃO DO PRODUTO</span><h2 id="interface-title">Explore o AJ Plugin Browser</h2>
        <p>Conheça a interface do AJ Plugin Browser e descubra uma maneira mais prática de visualizar, pesquisar e organizar seus plugins no REAPER.</p>
        <ul className="features">{browser.features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul>
      </div>
      <ScreenshotGallery/>
    </section>}
    {isBrowser && <section className="workflow" aria-labelledby="workflow-title"><h2 id="workflow-title">Como funciona</h2>
      <ol className="steps">{browser.steps.map((step, index) => <li key={step}><span aria-hidden="true">0{index + 1}</span>{step}</li>)}</ol>
    </section>}
    {product.slug === 'organizador-pro' && <section className="workflow" aria-labelledby="organizer-workflow">
      <h2 id="organizer-workflow">Da pasta de stems à sessão de VS</h2>
      <ul className="steps">{product.highlights.map(feature => <li key={feature.title}>
        <strong>{feature.title}</strong>
        {feature.description}
      </li>)}</ul>
    </section>}
    {product.slug === 'organizador-pro' && <section className="workflow" id="recursos" aria-labelledby="organizer-features">
      <h2 id="organizer-features">Recursos do AJ Organizer Pro</h2>
      <div className="info-grid">{product.features.map(group => <section className="card" key={group.title}>
        <h3>{group.title}</h3>
        <ul className="features">{group.items.map(item => <li key={item}><Check size={16} aria-hidden="true"/>{item}</li>)}</ul>
      </section>)}</div>
    </section>}
    <div className="product-resources">
      {isBrowser ? <section className="card"><h2>Requisitos e instalação</h2>
        <ul className="features">{release.requirements.map(requirement => <li key={requirement}><Check size={16}/>{requirement}</li>)}</ul>
        {manual ? <a className="text-link" href={manual}>Manual de instalação <ArrowUpRight size={16}/></a> : <p>Manual de instalação em preparação.</p>}
        <a className="text-link" href="/suporte/#instalacao">Orientações para instalar ReaScripts <ArrowRight size={16}/></a>
      </section> : <section className="card"><h2>Modelo comercial planejado</h2>
        <ul className="features">{commerce.model.map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul>
        <p>Informações sobre compra, entrega e ativação serão divulgadas com a disponibilidade do produto.</p>
        {documentation && <a className="text-link" href={documentation}>Documentação <ArrowUpRight size={16}/></a>}
      </section>}
    </div>
    <section className="card history"><span className="eyebrow">VERSÕES</span><h2>Histórico de atualizações</h2>
      {isBrowser && latest ? <><p>Versão pública: <strong>{latest.tag_name}</strong></p>{state.history.map(entry => <details key={entry.tag_name}>
        <summary>{entry.tag_name} · {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(entry.published_at))}<ChevronDown size={17}/></summary>
        <p className="release-notes">{entry.body || 'Sem notas de atualização.'}</p></details>)}</> :
        <p>{isBrowser && state.loading ? 'Consultando versões…' : 'O histórico ficará disponível com as versões publicadas.'}</p>}
    </section>
    <Feedback product={product.slug} productName={product.name}/>
  </div>;
}

function Support() {
  const contacts = Object.entries(site.contacts).flatMap(([label, value]) => {
    const href = safeLink(value, label === 'E-mail');
    return href ? [{ label, href }] : [];
  });
  return <div className="wrap interior">
    <Intro label="CENTRAL DE AJUDA" title="Suporte" description="Orientações para instalar, atualizar e usar as ferramentas da AJ Plugins no REAPER."/>
    <div className="info-grid">
      <section className="card" id="instalacao"><h2>Perguntas frequentes</h2>{faq.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18}/></summary><p>{answer}</p></details>)}</section>
      <section className="card"><h2>Contato e relato de bugs</h2><p>Ao relatar um problema, inclua as versões do produto e do REAPER, o sistema operacional e os passos para reproduzi-lo.</p>
        {contacts.length ? <ul className="features">{contacts.map(({label, href}) => <li key={label}><a className="text-link" href={href}>{label}<ArrowUpRight size={16}/></a></li>)}</ul> : <p>Os canais de atendimento ainda estão em preparação.</p>}
      </section>
    </div>
  </div>;
}

export function App({ path }: { path: string }) {
  const product = products.find(item => productPath(item) === path);
  const state = useRelease(path === '/' || path === '/produtos/' || product === browser);
  return <>
    <a className="skip" href="#conteudo">Ir para o conteúdo</a><Header path={path}/>
    <main id="conteudo" tabIndex={-1}>
      {path === '/' ? <Home state={state}/> : path === '/produtos/' ? <Catalog state={state}/> :
        product ? <Product product={product} state={state}/> : path === '/moderacao/' ? <Moderation/> : path === '/suporte/' ? <Support/> :
        path === '/sobre/' ? <section className="wrap interior"><Intro label="AJ PLUGINS" title="Sobre a AJ Plugins" description="Desenvolvemos scripts e ferramentas para quem produz, edita, mixa e masteriza áudio no REAPER."/>
          <div className="card about"><AudioLines size={30}/><h2>Menos tarefas repetitivas no REAPER</h2><p>O AJ Plugin Browser é dedicado à busca e à organização de plugins. O AJ Organizer Pro está em desenvolvimento para ajudar na preparação de sessões, com foco na organização de faixas e arquivos de áudio.</p><a className="text-link" href="/produtos/">Explorar produtos <ArrowRight size={17}/></a></div>
        </section> : <section className="wrap interior"><Intro label="ERRO 404" title="Página não encontrada" description="O endereço solicitado pode ter mudado ou estar incorreto."/><a className="button primary" href="/"><ArrowLeft size={16}/> Voltar ao início</a></section>}
    </main>
    <footer className="footer"><div className="wrap footer-inner"><div><Brand/><p>{site.slogan}</p></div><nav aria-label="Navegação do rodapé">{nav.slice(1).map(([label, href]) => <a href={href} key={href}>{label}</a>)}</nav><small>© AJ Plugins</small></div></footer>
  </>;
}

