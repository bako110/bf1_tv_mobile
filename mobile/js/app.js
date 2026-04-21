import { isAuthenticated, getUser, login, register, logout, getUserSettings } from './services/api.js';
import { createPageSpinner } from './utils/snakeLoader.js';
import { themeManager } from './utils/themeManager.js';
import { attachPullToRefresh } from './utils/pullToRefresh.js';
import { initAnimations, animateContainer } from './utils/animations.js';
import { initDeepLinkHandler } from './utils/deepLinkHandler.js';

// ── Toast global (pages détail) ───────────────────────────────────────────────
window._detailToast = function(msg) {
  let t = document.getElementById('_global-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_global-toast';
    t.className = 'bf1-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; }, 2200);
};

// ─── Skeleton shimmer sur toutes les images/vidéos ───────────────────────────
(function _initSkeletonObserver() {

  // ── Images ─────────────────────────────────────────────────
  function _applyImg(img) {
    if (img.dataset.skDone) return;
    img.dataset.skDone = '1';
    if (img.complete && img.naturalWidth > 0) return;
    const parent = img.parentElement;
    if (!parent) return;
    parent.classList.add('bf1-sk-wrap');
    const overlay = document.createElement('span');
    overlay.className = 'bf1-sk-overlay';
    parent.appendChild(overlay);
    const done = () => {
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.remove(); parent.classList.remove('bf1-sk-wrap'); }, 400);
    };
    img.addEventListener('load',  done, { once: true });
    img.addEventListener('error', done, { once: true });
  }

  // ── Vidéos natives ──────────────────────────────────────────
  function _applyVideo(video) {
    if (video.dataset.skDone) return;
    video.dataset.skDone = '1';
    const parent = video.parentElement;
    if (!parent) return;

    // Spinner centré qui disparaît au premier frame
    const spin = document.createElement('div');
    spin.className = 'bf1-vid-spin';
    spin.innerHTML = '<div class="bf1-vid-spin-inner"></div>';
    parent.style.position = parent.style.position || 'relative';
    parent.appendChild(spin);

    const hide = () => {
      spin.style.opacity = '0';
      setTimeout(() => spin.remove(), 350);
    };
    video.addEventListener('canplay',  hide, { once: true });
    video.addEventListener('playing',  hide, { once: true });
    video.addEventListener('error',    hide, { once: true });
    // Rebuffering
    video.addEventListener('waiting', () => { spin.style.opacity = '1'; });
    video.addEventListener('playing', () => { spin.style.opacity = '0'; });
  }

  // ── iFrames YouTube ─────────────────────────────────────────
  function _applyIframe(iframe) {
    if (iframe.dataset.skDone) return;
    iframe.dataset.skDone = '1';
    if (!iframe.src || !iframe.src.includes('youtube')) return;
    const parent = iframe.parentElement;
    if (!parent) return;
    parent.style.position = parent.style.position || 'relative';
    const spin = document.createElement('div');
    spin.className = 'bf1-vid-spin';
    spin.innerHTML = '<div class="bf1-vid-spin-inner"></div>';
    parent.appendChild(spin);
    iframe.addEventListener('load', () => {
      spin.style.opacity = '0';
      setTimeout(() => spin.remove(), 350);
    }, { once: true });
  }

  function _scan(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('img:not([data-sk-done])').forEach(_applyImg);
    root.querySelectorAll('video:not([data-sk-done])').forEach(_applyVideo);
    root.querySelectorAll('iframe:not([data-sk-done])').forEach(_applyIframe);
  }

  const _obs = new MutationObserver(muts => {
    for (const m of muts)
      m.addedNodes.forEach(n => { if (n.nodeType === 1) _scan(n); });
  });

  document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('app-content');
    if (c) _obs.observe(c, { childList: true, subtree: true });
  });
})();

// ─── Gestion du bouton Retour (hardware back Android) ────────────────────────
// MainActivity.java dispatch 'bf1BackButton' → on gère ici sans dépendance popstate

(function _initBackHandler() {
  const ROOT_ROUTES = ['#/home', '#/live', '#/emissions', '#/reels', '#/profile'];

  const _stack = [];
  let _isNavBack = false;
  let _lastBackMs = 0;

  // Enregistrer chaque navigation dans la pile
  window._navRecord = function(route) {
    if (!_isNavBack) {
      if (_stack[_stack.length - 1] !== route) _stack.push(route);
    }
    _isNavBack = false;
  };

  // Écouter l'event natif dispatché par MainActivity.onBackPressed()
  window.addEventListener('bf1BackButton', function() {
    // 1. Fermer le modal connexion si ouvert
    const modal = document.getElementById('_login-modal');
    if (modal && modal.style.display !== 'none') {
      window._closeLoginModal?.();
      return;
    }

    const current = window.location.hash || '#/home';
    const isRoot  = ROOT_ROUTES.includes(current);

    if (isRoot || _stack.length <= 1) {
      // Double-appui pour quitter
      const now = Date.now();
      if (now - _lastBackMs < 2200) {
        _tryExit();
        return;
      }
      _lastBackMs = now;
      _showExitToast('Appuyez encore pour quitter');
    } else {
      // Retour vers la page précédente
      _stack.pop();
      const dest = _stack[_stack.length - 1] || '#/home';
      _isNavBack = true;
      window.location.hash = dest;
    }
  });

  function _tryExit() {
    if (window.AndroidBridge) {
      window.AndroidBridge.exitApp();
    } else {
      try { window.Capacitor?.Plugins?.App?.exitApp?.(); } catch(e) {}
    }
  }

  function _showExitToast(msg) {
    let t = document.getElementById('_bf1-exit-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = '_bf1-exit-toast';
      t.className = 'bf1-exit-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    void t.offsetWidth;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(14px)';
    }, 2100);
  }
})();

// ─── Global login modal ───────────────────────────────────────────────────────

(function _initLoginModal() {
  function _inject() {
    if (document.getElementById('_login-modal')) return;
    const el = document.createElement('div');
    el.id = '_login-modal';
    el.className = 'bf1-login-backdrop';
    el.innerHTML = `
      <div id="_login-sheet" class="bf1-login-sheet">
        <div class="bf1-login-handle"></div>
        <div style="text-align:center;padding:0 28px 32px;">
          <div style="width:64px;height:64px;background:rgba(226,62,62,.12);border-radius:50%;
                      display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <i class="bi bi-lock-fill" style="font-size:28px;color:#E23E3E;"></i>
          </div>
          <h3 class="bf1-login-title">Connexion requise</h3>
          <p id="_login-modal-msg" class="bf1-login-msg">
            Connectez-vous pour accéder à cette fonctionnalité
          </p>
          <button onclick="window.location.hash='#/login';window._closeLoginModal()"
                  style="display:block;width:100%;background:#E23E3E;border:none;
                         border-radius:12px;padding:15px;color:#fff;font-size:15px;
                         font-weight:700;cursor:pointer;margin-bottom:10px;">
            Se connecter
          </button>
          <button onclick="window._closeLoginModal()" class="bf1-login-btn-cancel">
            Continuer sans connexion
          </button>
        </div>
      </div>`;
    el.addEventListener('click', e => { if (e.target === el) window._closeLoginModal(); });
    document.body.appendChild(el);
  }

  window._showLoginModal = function(message) {
    _inject();
    const modal = document.getElementById('_login-modal');
    const msgEl = document.getElementById('_login-modal-msg');
    if (msgEl && message) msgEl.textContent = message;
    else if (msgEl) msgEl.textContent = 'Connectez-vous pour accéder à cette fonctionnalité';
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      const sheet = document.getElementById('_login-sheet');
      if (sheet) sheet.style.transform = 'translateY(0)';
    });
  };

  window._closeLoginModal = function() {
    const sheet = document.getElementById('_login-sheet');
    if (sheet) sheet.style.transform = 'translateY(100%)';
    setTimeout(() => {
      const modal = document.getElementById('_login-modal');
      if (modal) modal.style.display = 'none';
    }, 320);
  };
})();

const routes = {
  '#/home': 'pages/home.html',
  '#/live': 'pages/live.html',
  '#/emissions': 'pages/emissions.html',
  '#/reels': 'pages/reels.html',
  '#/profile': 'pages/profile.html',
  '#/login': 'pages/login.html',
  '#/register': 'pages/register.html',
  '#/forgot-password': 'pages/forgot-password.html',
  '#/news': 'pages/news.html',
  '#/missed': 'pages/missed.html',
  '#/movies': 'pages/movies.html',
  '#/series': 'pages/series.html',
  '#/programs': 'pages/programs.html',
  '#/sports': 'pages/sports.html',
  '#/divertissement': 'pages/divertissement.html',
  '#/reportages': 'pages/reportages.html',
  '#/archive': 'pages/archive.html',
  '#/jtandmag': 'pages/jtandmag.html',
  '#/magazine': 'pages/magazine.html',
  '#/tele-realite': 'pages/tele-realite.html',
  '#/favorites': 'pages/favorites.html',
  '#/notifications': 'pages/notifications.html',
  '#/settings': 'pages/settings.html',
  '#/search': 'pages/search.html',
  '#/support': 'pages/support.html',
  '#/ugc': 'pages/ugc.html',
  '#/about': 'pages/about.html',
  '#/movies': 'pages/movies.html',
  '#/series': 'pages/series.html',
};

const PROTECTED_ROUTES = [
  '#/favorites', '#/notifications', '#/settings', '#/support'
];

// ─── Keep-alive : pages dont le DOM est conservé entre les navigations ────────
// Chaque entrée = { el: HTMLElement, loaded: bool, scrollTop: number }
const _kaPages = new Map();

// Invalider le cache keep-alive après login/logout pour forcer le rechargement
window._invalidateKaCache = function(routes) {
  const targets = routes || [..._kaPages.keys()];
  targets.forEach(r => {
    const p = _kaPages.get(r);
    if (p) {
      p.el.remove();
      _kaPages.delete(r);
    }
  });
  // Aussi vider la page détail si visible
  const detailEl = document.getElementById('_detail-page');
  if (detailEl) detailEl.innerHTML = '';
};

// Routes "détail" (ID dynamique) → jamais keep-alive, toujours reconstruites
const _DETAIL_PREFIXES = ['#/news/', '#/show/', '#/movie/', '#/series-detail/', '#/emission-category/'];

// Routes plein-écran : pas de keep-alive non plus (login, register)
const _FULLSCREEN_ROUTES_KA = new Set(['#/login', '#/register', '#/forgot-password']);

function _isKeepAlive(route) {
  if (_FULLSCREEN_ROUTES_KA.has(route)) return false;
  if (_DETAIL_PREFIXES.some(p => route.startsWith(p))) return false;
  return true;
}

// Conteneur dédié aux pages keep-alive (inséré une fois dans le DOM)
function _getKaContainer() {
  let c = document.getElementById('_ka-container');
  if (!c) {
    c = document.createElement('div');
    c.id = '_ka-container';
    c.style.cssText = 'position:relative;width:100%;height:100%;';
    document.getElementById('app-content').appendChild(c);
  }
  return c;
}

async function renderRoute(route) {
  // #/premium → ouvrir la modal premium sur la page courante
  if (route === '#/premium') {
    const prev = window._prevHash || '#/home';
    history.replaceState(null, '', prev);
    const open = () => window._showPremiumModal && window._showPremiumModal();
    if (window._showPremiumModal) { open(); }
    else {
      import('./components/premiumModal.js')
        .then(m => { m.initPremiumModal(); open(); })
        .catch(() => {});
    }
    return;
  }

  // Vérifier les routes protégées
  if (PROTECTED_ROUTES.includes(route) && !isAuthenticated()) {
    window.location.hash = '#/login';
    return;
  }

  // Résoudre chemin HTML + params
  let pagePath = routes[route];
  let detailParams = null;

  if (!pagePath) {
    if (route.startsWith('#/news/')) {
      pagePath = 'pages/details/news-detail.html';
      detailParams = { id: decodeURIComponent(route.slice(7)), type: 'news' };
    } else if (route.startsWith('#/show/')) {
      const parts = route.slice(7).split('/');
      pagePath = 'pages/details/show-detail.html';
      detailParams = { type: parts[0], id: decodeURIComponent(parts.slice(1).join('/')) };
    } else if (route.startsWith('#/movie/')) {
      pagePath = 'pages/details/show-detail.html';
      detailParams = { type: 'movie', id: decodeURIComponent(route.slice(8)) };
    } else if (route.startsWith('#/series-detail/')) {
      pagePath = 'pages/details/series-detail.html';
      detailParams = { type: 'series', id: decodeURIComponent(route.slice(16)) };
    } else if (route.startsWith('#/emission-category/')) {
      pagePath = 'pages/emission-category.html';
      const rawSlice = route.slice(20);
      const qIdx = rawSlice.indexOf('?');
      const namePart = qIdx !== -1 ? rawSlice.slice(0, qIdx) : rawSlice;
      const qPart = qIdx !== -1 ? rawSlice.slice(qIdx + 1) : '';
      const fpMatch = qPart.match(/(?:^|&)fp=([^&]*)/);
      let filterPath = '';
      if (fpMatch) {
        try { filterPath = decodeURIComponent(escape(atob(fpMatch[1]))); } catch { filterPath = decodeURIComponent(fpMatch[1]); }
      }
      detailParams = { type: 'emission-category', name: decodeURIComponent(namePart), filterPath };
    } else {
      renderNotFound();
      return;
    }
  }

  const appContent = document.getElementById('app-content');
  // Réinitialiser les overrides de style (ex: live)
  appContent.style.overflow = '';
  appContent.style.paddingBottom = '';

  updateBottomNav(route);
  updateTopNav();
  updateShell(route);
  window._navRecord?.(route);

  // ── Pages détail & fullscreen : pas de keep-alive ─────────────────────────
  if (!_isKeepAlive(route)) {
    // Cleanup des vidéos de la page précédente
    try {
      const prevShowDetail = (await import('./pages/details/show-detail.js')).cleanupShowDetail;
      if (prevShowDetail) prevShowDetail();
    } catch (e) {}

    try {
      const prevSeriesDetail = (await import('./pages/details/series-detail.js')).cleanupSeriesDetail;
      if (prevSeriesDetail) prevSeriesDetail();
    } catch (e) {}

    // Purger tous les players YT orphelins (DOM supprimé) pour éviter les fuites
    if (window._ytPlayers) {
      Object.keys(window._ytPlayers).forEach(pid => {
        try {
          const player = window._ytPlayers[pid];
          if (player && typeof player.stopVideo === 'function') player.stopVideo();
        } catch (e) {}
        if (window._ytTimers?.[pid]) {
          clearInterval(window._ytTimers[pid]);
          delete window._ytTimers[pid];
        }
        delete window._ytPlayers[pid];
      });
    }
    // Réinitialiser le flag pour que _setupYTGlobals reconfigure les handlers
    window.__ytSetup = false;

    // Cacher toutes les pages KA
    _kaPages.forEach(p => { p.el.style.display = 'none'; });

    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.innerHTML = '';
      loader.appendChild(createPageSpinner());
      loader.classList.remove('d-none');
    }
    try {
      const res = await fetch(pagePath);
      if (!res.ok) throw new Error('404');
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Zone hors KA : on écrit directement dans app-content
      // (on retire le ka-container temporairement de la vue)
      const kaCont = document.getElementById('_ka-container');
      if (kaCont) kaCont.style.display = 'none';

      // Injecter dans un div temporaire
      let detailEl = document.getElementById('_detail-page');
      if (!detailEl) {
        detailEl = document.createElement('div');
        detailEl.id = '_detail-page';
        detailEl.style.cssText = 'width:100%;';
        appContent.appendChild(detailEl);
      }
      detailEl.innerHTML = doc.body.innerHTML;
      detailEl.style.display = '';

      // Injecter les <link> et <style> du <head> de la sous-page qui manquent
      doc.head.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
        const href = node.href || '';
        // Éviter les doublons
        const alreadyLoaded = href
          ? document.querySelector(`link[href="${href}"]`)
          : false;
        if (!alreadyLoaded) {
          const clone = node.cloneNode(true);
          document.head.appendChild(clone);
        }
      });

      if (loader) { loader.innerHTML = ''; loader.classList.add('d-none'); }
      await loadPageScript(route, detailParams);
      animateContainer(detailEl);
    } catch (err) {
      const loader = document.getElementById('page-loader');
      if (loader) { loader.innerHTML = ''; loader.classList.add('d-none'); }
      if (!navigator.onLine || String(err).includes('fetch')) renderOffline();
      else renderNotFound();
    }
    return;
  }

  // ── Pages keep-alive ──────────────────────────────────────────────────────

  // Cacher la page détail si visible + cleanup vidéos
  const detailEl = document.getElementById('_detail-page');
  if (detailEl && detailEl.style.display !== 'none') {
    try { (await import('./pages/details/show-detail.js')).cleanupShowDetail?.(); } catch (e) {}
    try { (await import('./pages/details/series-detail.js')).cleanupSeriesDetail?.(); } catch (e) {}
    if (window._ytPlayers) {
      Object.keys(window._ytPlayers).forEach(pid => {
        try { window._ytPlayers[pid]?.stopVideo?.(); } catch (e) {}
        if (window._ytTimers?.[pid]) { clearInterval(window._ytTimers[pid]); delete window._ytTimers[pid]; }
        delete window._ytPlayers[pid];
      });
    }
    window.__ytSetup = false;
    detailEl.style.display = 'none';
  } else if (detailEl) {
    detailEl.style.display = 'none';
  }

  // Cleanup de la page home (arrêter le live) si on quitte cette page
  if (window._prevHash === '#/home' && route !== '#/home') {
    try {
      (await import('./pages/home.js')).cleanupHome?.();
    } catch (e) {
      console.warn('Erreur cleanup home:', e);
    }
  }

  // Le mini-player flottant reste visible sur toutes les pages — ne pas le couper

  // S'assurer que le ka-container est visible
  const kaCont = _getKaContainer();
  kaCont.style.display = '';

  // Sauvegarder le scroll de la page actuellement visible
  _kaPages.forEach((p) => {
    if (p.el.style.display !== 'none') {
      p.scrollTop = p.el.scrollTop;
    }
  });

  // Cacher toutes les pages KA
  _kaPages.forEach(p => { p.el.style.display = 'none'; });

  // ── Page déjà montée → juste réafficher (données intactes, scroll restauré) ─
  if (_kaPages.has(route)) {
    const page = _kaPages.get(route);
    page.el.style.display = '';
    requestAnimationFrame(() => { page.el.scrollTop = page.scrollTop || 0; });

    // Au retour sur home : replacer l'iframe sur le player (stream continue)
    if (route === '#/home') {
      import('./pages/home.js').then(m => m.restoreHomeLive?.()).catch(() => {});
    }

    return;
  }

  // ── Première visite : fetch HTML + monter la page ─────────────────────────
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.innerHTML = '';
    loader.appendChild(createPageSpinner());
    loader.classList.remove('d-none');
  }

  try {
    const res = await fetch(pagePath);
    if (!res.ok) throw new Error('404');
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const pageEl = document.createElement('div');
    pageEl.className = 'ka-page';
    pageEl.style.cssText = 'width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;position:relative;';
    pageEl.innerHTML = doc.body.innerHTML;
    kaCont.appendChild(pageEl);

    const pageState = { el: pageEl, loaded: true, scrollTop: 0 };
    _kaPages.set(route, pageState);

    if (loader) { loader.innerHTML = ''; loader.classList.add('d-none'); }

    await loadPageScript(route, detailParams);
    animateContainer(pageEl);

    // ── Pull-to-refresh : glisser vers le bas depuis le top pour rafraîchir ──
    attachPullToRefresh(pageEl, async () => {
      await loadPageScript(route, detailParams);
      animateContainer(pageEl);
    });

  } catch (err) {
    if (loader) { loader.innerHTML = ''; loader.classList.add('d-none'); }
    if (!navigator.onLine || String(err).includes('fetch')) renderOffline();
    else renderNotFound();
  }
}

async function loadPageScript(route, detailParams = null) {
  const pageScripts = {
    '#/home':           () => import('./pages/home.js').then(m => m.loadHome()),
    '#/news':           () => import('./pages/news.js').then(m => m.loadNews()),
    '#/missed':         () => import('./pages/missed.js').then(m => m.loadMissed()),
    '#/jtandmag':       () => import('./pages/jtandmag.js').then(m => m.loadJTandMag()),
    '#/magazine':       () => import('./pages/magazine.js').then(m => m.loadMagazine()),
    '#/sports':         () => import('./pages/sports.js').then(m => m.loadSports()),
    '#/reportages':     () => import('./pages/reportages.js').then(m => m.loadReportages()),
    '#/divertissement': () => import('./pages/divertissement.js').then(m => m.loadDivertissement()),
    '#/archive':        () => import('./pages/archive.js').then(m => m.loadArchive()),
    '#/tele-realite':   () => import('./pages/tele-realite.js').then(m => m.loadTeleRealite()),
    '#/profile':        () => import('./pages/profile.js').then(m => m.loadProfile()),
    '#/live':           () => import('./pages/live.js').then(m => m.loadLive()),
    '#/emissions':      () => import('./pages/emissions.js').then(m => m.loadEmissions()),
    '#/reels':          () => import('./pages/reels.js').then(m => m.loadReels()),
    '#/programs':       () => import('./pages/programs.js').then(m => m.loadPrograms()),
    '#/login':          () => import('./pages/login.js').then(m => m.loadLogin()),
    '#/register':       () => import('./pages/register.js').then(m => m.loadRegister()),
    '#/forgot-password': () => import('./pages/forgot-password.js').then(m => m.loadForgotPassword()),
    '#/movies':         () => import('./pages/movies.js').then(m => m.loadMovies()),
    '#/series':         () => import('./pages/series.js').then(m => m.loadSeries()),
    '#/favorites':      () => import('./pages/favorites.js').then(m => m.loadFavorites()),
    '#/search':         () => import('./pages/search.js').then(m => m.loadSearch()),
    '#/notifications':  () => import('./pages/notifications.js').then(m => m.loadNotifications()),
    '#/settings':       () => import('./pages/settings.js').then(m => m.loadSettings()),
    '#/support':        () => import('./pages/support.js').then(m => m.loadSupport()),
    '#/about':          () => import('./pages/about.js').then(m => m.loadAbout()),
  };

  try {
    if (pageScripts[route]) {
      await pageScripts[route]();
    } else if (detailParams) {
      // Routes paramétrées
      if (route.startsWith('#/news/')) {
        const { loadNewsDetail } = await import('./pages/details/news-detail.js');
        await loadNewsDetail(detailParams.id);
      } else if (route.startsWith('#/show/')) {
        const { loadShowDetail } = await import('./pages/details/show-detail.js');
        await loadShowDetail(detailParams.id, detailParams.type);
      } else if (route.startsWith('#/movie/')) {
        const { loadShowDetail } = await import('./pages/details/show-detail.js');
        await loadShowDetail(detailParams.id, 'movie');
      } else if (route.startsWith('#/series-detail/')) {
        const { loadSeriesDetail } = await import('./pages/details/series-detail.js');
        await loadSeriesDetail(detailParams.id);
      } else if (route.startsWith('#/emission-category/')) {
        const { loadEmissionCategory } = await import('./pages/emission-category.js');
        await loadEmissionCategory(detailParams.name, detailParams.filterPath);
      }
    }
  } catch (error) {
    console.error(`Erreur chargement script page ${route}:`, error);
  }
}

function renderNotFound() {
  const appContent = document.getElementById('app-content');
  appContent.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                min-height:70vh;padding:32px 24px;text-align:center;">
      <div style="width:80px;height:80px;background:rgba(226,62,62,0.12);border-radius:50%;
                  display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <i class="bi bi-map" style="font-size:36px;color:#E23E3E;"></i>
      </div>
      <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;" class="bf1-section-title">Page introuvable</h2>
      <p style="font-size:14px;color:var(--text-3);margin:0 0 28px;line-height:1.6;">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <a href="#/home" style="display:inline-flex;align-items:center;gap:8px;background:#E23E3E;
                              color:#fff;border-radius:10px;padding:12px 28px;font-size:14px;
                              font-weight:600;text-decoration:none;">
        <i class="bi bi-house-fill"></i> Retour à l'accueil
      </a>
    </div>
  `;
  updateBottomNav();
}

function renderOffline() {
  const appContent = document.getElementById('app-content');
  appContent.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                min-height:70vh;padding:32px 24px;text-align:center;">
      <div style="width:80px;height:80px;background:rgba(226,62,62,0.12);border-radius:50%;
                  display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <i class="bi bi-wifi-off" style="font-size:36px;color:#E23E3E;"></i>
      </div>
      <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;" class="bf1-section-title">Pas de connexion</h2>
      <p style="font-size:14px;color:var(--text-3);margin:0 0 28px;line-height:1.6;">
        Vérifie ta connexion internet<br>et réessaie.
      </p>
      <button onclick="window.location.reload()" 
              style="display:inline-flex;align-items:center;gap:8px;background:#E23E3E;
                     color:#fff;border-radius:10px;padding:12px 28px;font-size:14px;
                     font-weight:600;border:none;cursor:pointer;">
        <i class="bi bi-arrow-clockwise"></i> Réessayer
      </button>
    </div>
  `;
  updateBottomNav();
}

function updateBottomNav(route) {
  // Si pas de route passée, utiliser le hash courant
  if (!route) route = window.location.hash || '#/home';

  const tabMap = [
    ['tab-home',      '#/home',      'bi-house',         'bi-house-fill'],
    ['tab-emissions', '#/emissions', 'bi-tv',             'bi-tv-fill'],
    ['tab-reels',     '#/reels',     'bi-play-circle',    'bi-play-circle-fill'],
    ['tab-profile',   '#/profile',   'bi-person-circle',  'bi-person-fill'],        
  ];

  tabMap.forEach(([id, tabRoute, iconOff, iconOn]) => {
    const link = document.getElementById(id);
    if (!link) return;
    const isActive = tabRoute === route;
    link.classList.toggle('active', isActive);
    const icon = link.querySelector('i');
    if (icon) {
      icon.className = 'bi ' + (isActive ? iconOn : iconOff);
    }
  });

  // Live reste toujours gris (sans active)
  const liveBtn = document.getElementById('tab-live');
  if (liveBtn) {
    liveBtn.classList.remove('active');
  }

}

// Routes plein écran : ni header ni footer
const _FULLSCREEN_ROUTES = ['#/login', '#/register'];

function updateShell(route) {
  const header  = document.querySelector('.app-header');
  const footer  = document.querySelector('.bottom-nav');
  const content = document.getElementById('app-content');

  const isFullscreen = _FULLSCREEN_ROUTES.includes(route);
  const isDetail     = _DETAIL_PREFIXES.some(p => route.startsWith(p));

  const showHeader = !isFullscreen && !isDetail;
  const showFooter = !isFullscreen;

  if (header)  header.style.display  = showHeader ? '' : 'none';
  if (footer)  footer.style.display  = showFooter ? '' : 'none';
  if (content) content.style.paddingBottom = showFooter
    ? 'calc(68px + env(safe-area-inset-bottom, 0px))'
    : '0';
}

function updateTopNav() {
  // Met à jour l'icône notif si l'utilisateur est connecté
  const user = getUser();
  const notifIcon = document.getElementById('notif-icon');
  if (notifIcon) {
    notifIcon.title = user ? 'Notifications' : 'Connexion requise';
  }
}

// Formulaires gérés dans leurs pages respectives : login.js, register.js

// ===== SPLASH SCREEN =====
function startSplash() {
  const splash = document.getElementById('splash-screen');
  const textEl = document.getElementById('splash-text');
  const cursor = document.getElementById('splash-cursor');
  if (!splash) return;

  // Typewriter tagline
  const tagline = "La chaîne au cœur de nos défis";
  let i = 0;
  const typeInterval = setInterval(() => {
    if (i <= tagline.length) {
      textEl.textContent = tagline.slice(0, i);
      i++;
    } else {
      clearInterval(typeInterval);
      if (cursor) cursor.style.display = 'none';
    }
  }, 60);
}

function hideSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.add('hiding');
  // Afficher l'app shell (header, contenu, nav)
  document.body.classList.add('splash-hidden');
  setTimeout(() => splash.remove(), 520);
}

// Router
window.addEventListener('hashchange', async (e) => {
  const route = window.location.hash || '#/home';
  // Mémoriser le hash précédent (utile pour #/premium)
  const prev = e.oldURL ? (e.oldURL.split('#')[1] ? '#' + e.oldURL.split('#')[1] : '#/home') : '#/home';
  if (prev !== '#/premium') window._prevHash = prev;

  // Pages qui ont leur propre vidéo — le live doit être en pause pendant ces pages
  const VIDEO_ROUTES = ['#/live', '#/show/', '#/movie/'];
  const prevHasVideo = VIDEO_ROUTES.some(p => prev.startsWith(p));
  const nextHasVideo = VIDEO_ROUTES.some(p => route.startsWith(p));

  // Arrêter le flux HLS si on quitte la page live
  if (prev === '#/live') {
    try {
      const { cleanupLive } = await import('./pages/live.js');
      cleanupLive();
    } catch (e) {}
  }

  // Quitter home → passer le live en mini
  if (prev === '#/home' || prev === '#/') {
    try {
      const { cleanupHome } = await import('./pages/home.js');
      cleanupHome();
    } catch (e) {}
  }

  // Quitter une page avec vidéo → reprendre le live (il est en mini)
  if (prevHasVideo && route !== '#/live') {
    try {
      const { resumeLive } = await import('./pages/home.js');
      resumeLive();
    } catch (e) {}
  }

  // Entrer sur une page avec vidéo → mettre le live en pause
  if (nextHasVideo) {
    try {
      const { pauseLive } = await import('./pages/home.js');
      pauseLive();
    } catch (e) {}
  }

  renderRoute(route);
});

// ─── Gestion de la connexion internet ────────────────────────────────────────
(function _initConnectionHandler() {
  let _isOffline = false;
  let _lastRoute = '#/home';
  let _reconnectTimer = null;

  // Stocker la dernière route valide
  window.addEventListener('hashchange', () => {
    const route = window.location.hash || '#/home';
    if (!route.startsWith('#/')) _lastRoute = '#/home';
    else _lastRoute = route;
  });

  // ── Overlay hors-ligne ────────────────────────────────────────────────────
  function _showOfflineOverlay() {
    let ol = document.getElementById('_bf1-offline-overlay');
    if (ol) { ol.style.display = 'flex'; return; }
    ol = document.createElement('div');
    ol.id = '_bf1-offline-overlay';
    ol.className = 'bf1-offline-overlay';
    ol.innerHTML = `
      <div style="width:90px;height:90px;background:rgba(226,62,62,0.12);border-radius:50%;
                  display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
        <i class="bi bi-wifi-off" style="font-size:42px;color:#E23E3E;"></i>
      </div>
      <h2 class="bf1-offline-title">Pas de connexion</h2>
      <p class="bf1-offline-msg">
        Vérifie ta connexion internet<br>et réessaie.
      </p>
      <p id="_bf1-offline-status" class="bf1-offline-status">
        Tentative de reconnexion…
      </p>
      <button onclick="window._bf1TryReconnectNow()"
              style="display:inline-flex;align-items:center;gap:8px;background:#E23E3E;
                     color:#fff;border-radius:12px;padding:13px 32px;font-size:15px;
                     font-weight:600;border:none;cursor:pointer;">
        <i class="bi bi-arrow-clockwise"></i> Réessayer
      </button>`;
    document.body.appendChild(ol);
  }

  function _hideOfflineOverlay() {
    const ol = document.getElementById('_bf1-offline-overlay');
    if (ol) ol.style.display = 'none';
  }

  window._bf1TryReconnectNow = function() {
    const status = document.getElementById('_bf1-offline-status');
    if (status) status.textContent = 'Vérification…';
    _tryReconnect();
  };

  // Event: Connexion perdue
  window.addEventListener('offline', () => {
    if (_isOffline) return;
    _isOffline = true;
    _showOfflineOverlay();
    if (!_reconnectTimer) {
      _reconnectTimer = setInterval(_tryReconnect, 4000);
    }
  });

  // Event: Connexion rétablie
  window.addEventListener('online', () => {
    if (!_isOffline) return;
    _isOffline = false;
    if (_reconnectTimer) { clearInterval(_reconnectTimer); _reconnectTimer = null; }
    _hideOfflineOverlay();
    _showConnectionToast('Connexion rétablie ✓', false);
    setTimeout(() => renderRoute(_lastRoute), 600);
  });

  // Vérifier la connexion via navigator.onLine
  function _tryReconnect() {
    if (navigator.onLine && !_isOffline) {
      window.dispatchEvent(new Event('online'));
    }
  }

  // Vérifier dès le démarrage si déjà offline
  if (!navigator.onLine) {
    _isOffline = true;
    _showOfflineOverlay();
    _reconnectTimer = setInterval(_tryReconnect, 4000);
  }

  // Toast de notification de connexion
  function _showConnectionToast(msg, isPersistent) {
    let t = document.getElementById('_bf1-conn-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = '_bf1-conn-toast';
      t.className = 'bf1-conn-toast';
      document.body.appendChild(t);
    }
    
    t.textContent = msg;
    void t.offsetWidth;
    t.style.opacity = '1';
    
    if (!isPersistent) {
      clearTimeout(t._timer);
      t._timer = setTimeout(() => {
        t.style.opacity = '0';
      }, 2500);
    }
  }
})();

// Détecter la perte de connexion

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  initAnimations();
  updateBottomNav('#/home');

  // Pré-charger le modal premium
  import('./components/premiumModal.js').then(m => m.initPremiumModal()).catch(() => {});

  // Restaurer le token (toujours, même en cas de rechargement)
  try {
    const token = localStorage.getItem('bf1_token');
    if (token) {
      const { http } = await import('./services/http.js');
      http.setToken(token);
    }
  } catch (err) {
    console.warn('⚠️ Accès localStorage bloqué:', err.message);
  }

  // ┌─ Initialiser le thème ─────────────────────────────────────────────┐
  try {
    // localStorage a la priorité absolue (choix explicite de l'utilisateur)
    // Sans préférence locale → dark par défaut, puis sync serveur en arrière-plan
    const localTheme = localStorage.getItem('bf1_theme_preference');
    if (localTheme) {
      themeManager.init(localTheme);
    } else {
      themeManager.init('dark');
      // Charger les settings serveur en arrière-plan (ne bloque pas le splash)
      if (isAuthenticated()) {
        getUserSettings().then(s => {
          if (s?.theme && s.theme !== 'dark') {
            localStorage.setItem('bf1_theme_preference', s.theme);
            themeManager.init(s.theme);
          }
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('⚠️ Impossible de charger le thème:', err.message);
    themeManager.init(localStorage.getItem('bf1_theme_preference') || 'dark');
  }
  // └────────────────────────────────────────────────────────────────────┘

  // ┌─ Écouteur global pour changement de thème ────────────────────────┐
  // Recharger la page actuelle quand le thème change
  window.addEventListener('themechange', (e) => {
    const currentRoute = window.location.hash || '#/home';
    console.log(`🎨 Thème changé vers: ${e.detail.theme}. Rafraîchir page...`);
    renderRoute(currentRoute);
  });
  // └────────────────────────────────────────────────────────────────────┘

  // Si l'app était déjà initialisée dans cette session → pas de splash, juste recharger la page courante
  if (sessionStorage.getItem('bf1_ready')) {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
    // Afficher l'app shell immédiatement
    document.body.classList.add('splash-hidden');
    const hash = window.location.hash;
    const target = (!hash || hash === '#' || hash === '#/') ? '#/home' : hash;
    history.replaceState(null, '', target);
    await renderRoute(target);
    return;
  }

  // Première ouverture → splash complet
  sessionStorage.setItem('bf1_ready', '1');
  startSplash();
  const splashStart = Date.now();

  // Health check backend en parallèle (timeout 5s)
  // const healthCheck = fetch('https://bf1.fly.dev/api/v1/health', { signal: AbortSignal.timeout(5000) })
  //   .then(() => {}).catch(() => {}); // ne pas bloquer si fail

  // await healthCheck;

  // Minimum 1.8 secondes de splash (juste assez pour le typewriter)
  const elapsed = Date.now() - splashStart;
  const remaining = Math.max(0, 1800 - elapsed);
  await new Promise(r => setTimeout(r, remaining));

  // Initialiser le gestionnaire de deep links
  initDeepLinkHandler();

  // Cacher le splash AVANT de charger la page (pas de blocage par les appels API)
  hideSplash();

  // Charger la page (le contenu se charge avec son propre loader)
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') {
    history.replaceState(null, '', '#/home');
    await renderRoute('#/home');
  } else {
    await renderRoute(hash);
  }
});
