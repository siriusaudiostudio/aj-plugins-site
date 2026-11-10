import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { products } from './config';

const browser = products[0];
const captures = [...browser.screenshots].sort((a, b) => a.order - b.order);

export function ScreenshotGallery({ variant = 'full' }: { variant?: 'full' | 'compact' | 'cover' }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const slides = variant === 'cover' ? captures.slice(0, 1) : captures;
  const shot = slides[index];

  function move(offset: number) {
    setIndex(current => (current + offset + slides.length) % slides.length);
  }

  function handleKeys(event: KeyboardEvent<HTMLElement>) {
    if (slides.length < 2 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }

  function arrows() {
    return <>
      <button type="button" className="gallery-button" aria-label="Captura anterior" onClick={() => move(-1)}><ChevronLeft size={19}/></button>
      <button type="button" className="gallery-button" aria-label="Próxima captura" onClick={() => move(1)}><ChevronRight size={19}/></button>
    </>;
  }

  return <div className={'screenshot-gallery gallery-' + variant} role="group" aria-label="Capturas do AJ Plugin Browser" onKeyDown={handleKeys}>
    <figure className="preview">
      <a className="preview-trigger" href={shot.src} aria-label={'Ampliar captura: ' + shot.title} onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !dialog.current?.showModal) return;
        event.preventDefault();
        dialog.current.showModal();
        closeButton.current?.focus();
        setExpanded(true);
      }}>
        <img key={shot.display} className="product-image" src={shot.display} alt={shot.alt} width={shot.width} height={shot.height}
          loading={variant === 'cover' ? 'lazy' : 'eager'} decoding="async"/>
        <span className="preview-caption">
          <span>Captura da versão {browser.captureVersion}</span>
          <span><Maximize2 size={15}/> Ampliar</span>
        </span>
      </a>
    </figure>
    {slides.length > 1 && <>
      <div className="gallery-controls">
        <div className="gallery-caption" aria-live="polite" aria-atomic="true">
          <span className="gallery-count">{index + 1} / {slides.length}</span>
          <strong>{shot.title}</strong>
          {variant === 'full' && <p>{shot.description}</p>}
        </div>
        <div className="gallery-arrows">{arrows()}</div>
      </div>
      <div className="gallery-thumbnails" role="group" aria-label="Selecionar captura">
        {slides.map((item, position) => <button key={item.src} type="button" className="gallery-thumbnail"
          aria-label={item.title} aria-pressed={index === position} title={item.title} onClick={() => setIndex(position)}>
          <img src={item.thumbnail} alt="" width={176} height={134} loading="lazy" decoding="async"/>
          {variant === 'full' && <span>{item.title}</span>}
        </button>)}
      </div>
    </>}
    <dialog className="image-dialog" ref={dialog} aria-labelledby={titleId} onClose={() => setExpanded(false)}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="dialog-content">
        <div className="dialog-toolbar">
          <div><strong id={titleId}>{shot.title}</strong><small aria-live="polite">{index + 1} / {slides.length} · Captura da versão {browser.captureVersion}</small></div>
          <div className="gallery-arrows">
            {slides.length > 1 && arrows()}
            <button type="button" className="gallery-button" aria-label="Fechar captura ampliada" ref={closeButton} onClick={() => dialog.current?.close()}><X size={20}/></button>
          </div>
        </div>
        {expanded && <div className="dialog-image" key={shot.display}>
          <img src={shot.display} alt={shot.alt} width={shot.width} height={shot.height}/>
        </div>}
      </div>
    </dialog>
  </div>;
}
