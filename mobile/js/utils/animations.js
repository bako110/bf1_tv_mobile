/**
 * BF1 Animation System — Netflix / Disney+ level
 * GPU-only (transform + opacity), zéro layout thrashing
 */

const CSS = `
/* ════════════════════════════════════════════════
   BF1 ANIMATION SYSTEM — ultra-pro
   GPU-only : transform + opacity uniquement
   ════════════════════════════════════════════════ */

/* ── Base scroll-reveal ── */
.bf1-anim {
  opacity: 0;
  will-change: transform, opacity;
  transition: opacity 0.52s cubic-bezier(.22,1,.36,1),
              transform 0.52s cubic-bezier(.22,1,.36,1);
}
.bf1-anim.visible {
  opacity: 1 !important;
  transform: none !important;
  will-change: auto;
}

/* ── Variantes d'entrée ── */
.bf1-fade-up    { transform: translateY(32px); }
.bf1-fade-down  { transform: translateY(-20px); }
.bf1-fade-left  { transform: translateX(36px); }
.bf1-fade-right { transform: translateX(-36px); }
.bf1-scale-up   { transform: scale(0.86); }
.bf1-zoom-in    { transform: scale(0.80) translateY(20px); }

/* ── Délais cascade ── */
.bf1-d1  { transition-delay: 0.04s; }
.bf1-d2  { transition-delay: 0.09s; }
.bf1-d3  { transition-delay: 0.15s; }
.bf1-d4  { transition-delay: 0.21s; }
.bf1-d5  { transition-delay: 0.28s; }
.bf1-d6  { transition-delay: 0.35s; }
.bf1-d7  { transition-delay: 0.42s; }
.bf1-d8  { transition-delay: 0.50s; }

/* ── Section title ── */
.bf1-section-anim {
  opacity: 0;
  transform: translateX(-18px);
  transition: opacity 0.42s ease, transform 0.42s cubic-bezier(.22,1,.36,1);
}
.bf1-section-anim.visible { opacity: 1; transform: none; }

/* ── Stagger enfants ── */
.bf1-stagger > * {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.44s cubic-bezier(.22,1,.36,1),
              transform 0.44s cubic-bezier(.22,1,.36,1);
}
.bf1-stagger.visible > *:nth-child(1)  { opacity:1;transform:none;transition-delay:0.00s; }
.bf1-stagger.visible > *:nth-child(2)  { opacity:1;transform:none;transition-delay:0.06s; }
.bf1-stagger.visible > *:nth-child(3)  { opacity:1;transform:none;transition-delay:0.12s; }
.bf1-stagger.visible > *:nth-child(4)  { opacity:1;transform:none;transition-delay:0.18s; }
.bf1-stagger.visible > *:nth-child(5)  { opacity:1;transform:none;transition-delay:0.24s; }
.bf1-stagger.visible > *:nth-child(6)  { opacity:1;transform:none;transition-delay:0.30s; }
.bf1-stagger.visible > *:nth-child(n+7){ opacity:1;transform:none;transition-delay:0.36s; }

/* ════════════════════════
   PAGE DÉTAIL — hero cinéma
   ════════════════════════ */

/* Entrée page entière depuis la droite (comme une app native) */
@keyframes bf1PageEnter {
  from { opacity:0; transform: translateX(100%); }
  to   { opacity:1; transform: translateX(0); }
}
.bf1-page-enter {
  animation: bf1PageEnter 0.38s cubic-bezier(.32,0,.08,1) both;
}

/* Hero (image/player en haut) — parallax fade */
@keyframes bf1HeroReveal {
  from { opacity:0; transform: scale(1.06) translateY(-8px); filter: blur(6px); }
  to   { opacity:1; transform: scale(1)    translateY(0);    filter: blur(0); }
}
.bf1-hero-anim {
  animation: bf1HeroReveal 0.62s cubic-bezier(.22,1,.36,1) both;
}

/* Play button pulse */
@keyframes bf1PlayPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(226,62,62,0.55); }
  50%       { box-shadow: 0 0 0 14px rgba(226,62,62,0); }
}
.bf1-play-pulse {
  animation: bf1PlayPulse 2.2s ease infinite;
}

/* Titre slide-up avec blur */
@keyframes bf1TitleReveal {
  from { opacity:0; transform: translateY(24px); filter: blur(4px); }
  to   { opacity:1; transform: translateY(0);    filter: blur(0); }
}
.bf1-title-anim {
  animation: bf1TitleReveal 0.55s cubic-bezier(.22,1,.36,1) 0.18s both;
}

/* Badges / meta info — fade in gauche */
@keyframes bf1BadgeIn {
  from { opacity:0; transform: translateX(-12px); }
  to   { opacity:1; transform: translateX(0); }
}
.bf1-badge-anim {
  animation: bf1BadgeIn 0.4s ease 0.30s both;
}

/* Boutons action — stagger pop */
@keyframes bf1BtnPop {
  0%   { opacity:0; transform: scale(0.75) translateY(10px); }
  70%  { transform: scale(1.06) translateY(-2px); }
  100% { opacity:1; transform: scale(1) translateY(0); }
}
.bf1-btn-anim  { animation: bf1BtnPop 0.38s cubic-bezier(.34,1.56,.64,1) both; }
.bf1-btn-anim-1{ animation-delay: 0.32s; }
.bf1-btn-anim-2{ animation-delay: 0.40s; }
.bf1-btn-anim-3{ animation-delay: 0.48s; }
.bf1-btn-anim-4{ animation-delay: 0.56s; }

/* Description fade-up */
@keyframes bf1DescIn {
  from { opacity:0; transform: translateY(16px); }
  to   { opacity:1; transform: translateY(0); }
}
.bf1-desc-anim {
  animation: bf1DescIn 0.45s ease 0.42s both;
}

/* Section "Contenu similaire" */
.bf1-related-anim {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.5s cubic-bezier(.22,1,.36,1),
              transform 0.5s cubic-bezier(.22,1,.36,1);
}
.bf1-related-anim.visible { opacity:1; transform:none; }

/* ════════════════════════
   LECTEUR VIDEO
   ════════════════════════ */

/* Entrée player : zoom depuis le centre */
@keyframes bf1PlayerReveal {
  from { opacity:0; transform: scale(0.94); }
  to   { opacity:1; transform: scale(1); }
}
.bf1-player-anim {
  animation: bf1PlayerReveal 0.5s cubic-bezier(.22,1,.36,1) both;
}

/* Contrôles player slide-up */
@keyframes bf1CtrlsIn {
  from { opacity:0; transform: translateY(100%); }
  to   { opacity:1; transform: translateY(0); }
}
.bf1-ctrls-anim {
  animation: bf1CtrlsIn 0.38s cubic-bezier(.22,1,.36,1) 0.25s both;
}

/* Barre de progression pulse au démarrage */
@keyframes bf1ProgPulse {
  0%,100% { transform: scaleX(1); }
  50%      { transform: scaleX(1.008); }
}
.bf1-prog-pulse {
  animation: bf1ProgPulse 2s ease infinite;
  transform-origin: left center;
}

/* ════════════════════════
   PRESS + RIPPLE + HOVER
   ════════════════════════ */

.bf1-press {
  transition: transform 0.13s cubic-bezier(.22,1,.36,1),
              box-shadow 0.13s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
}
.bf1-press:active {
  transform: scale(0.955) !important;
  box-shadow: 0 1px 8px rgba(0,0,0,0.4) !important;
}
@media (hover: hover) {
  .bf1-press:hover {
    transform: translateY(-4px) scale(1.022) !important;
    box-shadow: 0 10px 28px rgba(0,0,0,0.5) !important;
  }
}

/* Ripple */
.bf1-ripple-wrap { position:relative; overflow:hidden; }
@keyframes bf1Ripple {
  0%   { transform:scale(0); opacity:0.45; }
  100% { transform:scale(4); opacity:0; }
}
.bf1-ripple-dot {
  position:absolute; border-radius:50%;
  background:rgba(226,62,62,0.22);
  width:70px; height:70px;
  margin-left:-35px; margin-top:-35px;
  animation: bf1Ripple 0.6s ease-out forwards;
  pointer-events:none; z-index:99;
}

/* Shimmer skeleton */
@keyframes bf1Shimmer {
  0%   { background-position:-200% 0; }
  100% { background-position: 200% 0; }
}
.bf1-skeleton {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.11) 50%,
    rgba(255,255,255,0.04) 75%);
  background-size:200% 100%;
  animation: bf1Shimmer 1.5s ease infinite;
  border-radius: inherit;
}
`;

function _injectCSS() {
  if (document.getElementById('_bf1-anim-css')) return;
  const s = document.createElement('style');
  s.id = '_bf1-anim-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Observer principal ────────────────────────────────────────────────────────
let _observer = null;

function _getObserver() {
  if (_observer) return _observer;
  _observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        _observer.unobserve(entry.target); // une seule fois
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  return _observer;
}

// ── Observer les éléments bf1-anim dans un conteneur ─────────────────────────
export function observeAnimations(root = document) {
  const obs = _getObserver();
  root.querySelectorAll('.bf1-anim, .bf1-section-anim, .bf1-stagger, .bf1-player-anim').forEach(el => {
    if (!el.dataset.animObs) {
      el.dataset.animObs = '1';
      obs.observe(el);
    }
  });
}

// ── Ajouter classe + observer sur un élément ─────────────────────────────────
export function animateEl(el, variant = 'bf1-fade-up', delay = '') {
  if (!el) return;
  el.classList.add('bf1-anim', variant);
  if (delay) el.classList.add(delay);
  _getObserver().observe(el);
}

// ── Ajouter ripple tap sur un élément cliquable ───────────────────────────────
export function addRipple(el) {
  if (!el || el._rippleAttached) return;
  el._rippleAttached = true;
  el.classList.add('bf1-ripple-wrap');
  el.addEventListener('pointerdown', (e) => {
    const rect = el.getBoundingClientRect();
    const dot  = document.createElement('div');
    dot.className = 'bf1-ripple-dot';
    dot.style.left = (e.clientX - rect.left) + 'px';
    dot.style.top  = (e.clientY - rect.top)  + 'px';
    el.appendChild(dot);
    setTimeout(() => dot.remove(), 560);
  }, { passive: true });
}

// ── Appliquer press + ripple sur toutes les cartes d'un conteneur ────────────
export function applyCardEffects(root = document) {
  const sel = [
    '[onclick]',
    '.reel-item', '.reel-slide',
    'button:not(.reel-action-btn)',
    'a[href]',
  ].join(',');

  root.querySelectorAll(sel).forEach(el => {
    if (el.dataset.cardFx) return;
    el.dataset.cardFx = '1';

    // Press uniquement sur les vraies cartes (pas les petits boutons)
    const tag  = el.tagName;
    const isCard = el.style.borderRadius || el.classList.contains('reel-slide');
    if (isCard || tag === 'A') {
      el.classList.add('bf1-press');
    }
    addRipple(el);
  });
}

// ── Animer une page détail (hero + titre + boutons + desc + related) ──────────
export function animateDetailPage(container) {
  if (!container) return;

  // 1. Page entière : slide depuis la droite
  container.classList.add('bf1-page-enter');

  // 2. Hero (image ou player en haut)
  const hero = container.querySelector(
    'video, iframe, [style*="padding-bottom:56"], [style*="max-height:260"], [style*="max-height:280"]'
  );
  if (hero) {
    const wrap = hero.closest('div') || hero;
    wrap.classList.add('bf1-hero-anim');

    // Pulse sur le bouton play si présent
    container.querySelectorAll('[style*="border-radius:50%"][style*="bi-play"], [style*="bi bi-play"]').forEach(btn => {
      const circle = btn.closest('[style*="border-radius:50%"]');
      if (circle) circle.classList.add('bf1-play-pulse');
    });
    // Pulse play via icône
    container.querySelectorAll('.bi-play-fill').forEach(i => {
      const circle = i.closest('[style*="50%"]');
      if (circle) circle.classList.add('bf1-play-pulse');
    });

    // Contrôles player
    container.querySelectorAll('[style*="padding:8px 14px"][style*="display:flex"]').forEach(el => {
      if (el.querySelector('button')) el.classList.add('bf1-ctrls-anim');
    });
  }

  // 3. Titre h1
  const h1 = container.querySelector('h1');
  if (h1) h1.classList.add('bf1-title-anim');

  // 4. Badges / meta (spans colorés)
  container.querySelectorAll('[style*="border-radius:4px"][style*="font-size:12"], [style*="border-radius:4px"][style*="font-weight:600"]').forEach(el => {
    if (!el.dataset.animObs) el.classList.add('bf1-badge-anim');
  });

  // 5. Boutons action (like, comment, fav, share)
  const actionBtns = container.querySelectorAll(
    '#sd-like-btn, #nd-like-btn, #sd-fav-btn, #nd-fav-btn, [onclick*="openSdComments"], [onclick*="openNdComments"], [onclick*="toggleSd"], [onclick*="toggleNd"]'
  );
  actionBtns.forEach((btn, i) => {
    btn.classList.add('bf1-btn-anim', `bf1-btn-anim-${Math.min(i + 1, 4)}`);
  });

  // 6. Description
  const desc = container.querySelector('#sd-desc-wrap, #nd-desc-wrap, [id*="desc"]');
  if (desc) desc.classList.add('bf1-desc-anim');

  // 7. Sections "similaire / related"
  container.querySelectorAll('[id*="related"], [id*="similar"], [class*="related"]').forEach(el => {
    el.classList.add('bf1-related-anim');
  });

  // Observer les éléments scroll-based
  observeAnimations(container);

  // Press + ripple sur tout
  applyCardEffects(container);
}

// ── Animer un conteneur générique (pages liste) ───────────────────────────────
export function animateContainer(container) {
  if (!container) return;

  // Détecter si c'est une page détail
  const isDetail = !!(
    container.querySelector('#sd-container, #nd-container, [id$="-container"] h1') ||
    container.querySelector('h1') && container.querySelector('video, iframe')
  );
  if (isDetail) { animateDetailPage(container); return; }

  // Titres de section
  container.querySelectorAll('h2, h3, .bf1-section-title, [class*="section-title"]').forEach(el => {
    if (!el.dataset.animObs) el.classList.add('bf1-section-anim');
  });

  // Grilles Bootstrap → stagger
  container.querySelectorAll('.row, .d-grid').forEach(el => {
    if (!el.dataset.animObs) el.classList.add('bf1-stagger');
  });

  // Cartes cliquables → fade-up en cascade
  container.querySelectorAll(
    '[onclick*="location.hash"], [onclick*="detail"], [onclick*="movie"], [onclick*="serie"]'
  ).forEach((el, i) => {
    if (!el.dataset.animObs) {
      el.classList.add('bf1-anim', 'bf1-fade-up', `bf1-d${Math.min((i % 8) + 1, 8)}`);
    }
  });

  // Players dans les listes
  container.querySelectorAll('video, iframe').forEach(el => {
    const wrap = el.parentElement;
    if (wrap && !wrap.dataset.animObs) wrap.classList.add('bf1-player-anim');
  });

  observeAnimations(container);
  applyCardEffects(container);
}

// ── Init global : observe le app-content ─────────────────────────────────────
export function initAnimations() {
  _injectCSS();

  // MutationObserver sur app-content pour animer le nouveau contenu injecté
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  const mo = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        // Petit délai pour laisser le DOM se stabiliser
        requestAnimationFrame(() => animateContainer(node));
      });
    });
  });

  mo.observe(appContent, { childList: true, subtree: false });

  // Animer le contenu déjà présent
  animateContainer(appContent);
}
