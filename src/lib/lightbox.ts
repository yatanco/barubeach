export function initLightbox() {
  const groups = new Map<string, HTMLImageElement[]>();

  document.querySelectorAll<HTMLElement>('[data-lightbox]').forEach(el => {
    const key = el.dataset.lightbox!;
    const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
    if (!imgs.length) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(...imgs);
  });

  if (!groups.size) return;

  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .22s;pointer-events:none';

  const pic = document.createElement('img');
  pic.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)';

  const mk = (lbl: string, css: string, html: string) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', lbl);
    b.innerHTML = html;
    b.style.cssText = `position:fixed;background:none;border:none;color:#fff;cursor:pointer;line-height:1;${css}`;
    return b;
  };

  const xBtn = mk('Close', 'top:12px;right:16px;font-size:2.5rem;padding:10px;opacity:.8', '&times;');
  const lt   = mk('Previous', 'left:8px;top:50%;transform:translateY(-50%);font-size:3.5rem;padding:12px;opacity:.7', '&#8249;');
  const rt   = mk('Next', 'right:8px;top:50%;transform:translateY(-50%);font-size:3.5rem;padding:12px;opacity:.7', '&#8250;');

  ov.append(pic, xBtn, lt, rt);
  document.body.append(ov);

  let cur: HTMLImageElement[] = [];
  let idx = 0;
  let active = false;
  let tx = 0;

  const show = (i: number) => {
    idx = ((i % cur.length) + cur.length) % cur.length;
    pic.src = cur[idx].src;
    pic.alt = cur[idx].alt;
    lt.style.display = rt.style.display = cur.length > 1 ? '' : 'none';
  };

  const openLb = (imgs: HTMLImageElement[], i: number) => {
    cur = imgs; active = true; show(i);
    ov.style.pointerEvents = 'auto';
    requestAnimationFrame(() => { ov.style.opacity = '1'; });
    document.body.style.overflow = 'hidden';
  };

  const closeLb = () => {
    active = false;
    ov.style.opacity = '0';
    ov.style.pointerEvents = 'none';
    document.body.style.overflow = '';
  };

  groups.forEach(imgs => {
    imgs.forEach((img, i) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => openLb(imgs, i));
    });
  });

  xBtn.addEventListener('click', closeLb);
  lt.addEventListener('click', () => show(idx - 1));
  rt.addEventListener('click', () => show(idx + 1));
  ov.addEventListener('click', e => { if (e.target === ov) closeLb(); });

  document.addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });

  ov.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  ov.addEventListener('touchend', e => {
    if (!active) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
  });
}
