import { ROUTES, TAB_ROUTES } from './config/routes.js';
import { isAuthenticated, getUser, login, register, logout, getUserSettings } from './services/api.js';
import { createSnakeLoader } from './utils/snakeLoader.js';
import { themeManager } from './utils/themeManager.js';

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
      t.style.cssText =
        'position:fixed;bottom:calc(74px + env(safe-area-inset-bottom,0px));' +
        'left:50%;transform:translateX(-50%) translateY(14px);' +
        'background:#1e1e1e;color:#fff;padding:11px 22px;border-radius:20px;' +
        'font-size:14px;z-index:99999;opacity:0;' +
        'transition:opacity .22s,transform .22s;pointer-events:none;' +
        'white-space:nowrap;border:1px solid #2a2a2a;' +
        'box-shadow:0 4px 20px rgba(0,0,0,.65);';
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
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:99999;' +
                       'align-items:flex-end;justify-content:center;';
    el.innerHTML = `
      <div id="_login-sheet"
           style="background:#111;border-radius:20px 20px 0 0;
                  padding:0 0 env(safe-area-inset-bottom,16px);
                  width:100%;max-width:480px;margin:0 auto;
                  transform:translateY(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);">
        <div style="width:40px;height:4px;background:#2a2a2a;border-radius:2px;
                    margin:12px auto 24px;"></div>
        <div style="text-align:center;padding:0 28px 32px;">
          <div style="width:64px;height:64px;background:rgba(226,62,62,.12);border-radius:50%;
                      display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <i class="bi bi-lock-fill" style="font-size:28px;color:#E23E3E;"></i>
          </div>
          <h3 style="color:#fff;font-size:18px;font-weight:700;margin:0 0 8px;">Connexion requise</h3>
          <p id="_login-modal-msg"
             style="color:#888;font-size:14px;line-height:1.5;margin:0 0 28px;
                    max-width:280px;margin-left:auto;margin-right:auto;">
            Connectez-vous pour accéder à cette fonctionnalité
          </p>
          <button onclick="window.location.hash='#/login';window._closeLoginModal()"
                  style="display:block;width:100%;background:#E23E3E;border:none;
                         border-radius:12px;padding:15px;color:#fff;font-size:15px;
                         font-weight:700;cursor:pointer;margin-bottom:10px;">
            Se connecter
          </button>
          <button onclick="window._closeLoginModal()"
                  style="display:block;width:100%;background:transparent;border:1px solid #252525;
                         border-radius:12px;padding:14px;color:#888;font-size:14px;
                         cursor:pointer;">
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
  '#/news': 'pages/news.html',
  '#/movies': 'pages/movies.html',
  '#/series': 'pages/series.html',
  '#/programs': 'pages/programs.html',
  '#/sports': 'pages/sports.html',
  '#/divertissement': 'pages/divertissement.html',
  '#/reportages': 'pages/reportages.html',
  '#/archive': 'pages/archive.html',
  '#/jtandmag': 'pages/jtandmag.html',
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

  // Résoudre chemin HTML + params des routes paramétrées
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
      detailParams = { type: 'emission-category', name: decodeURIComponent(route.slice(20)) };
    } else {
      renderNotFound();
      return;
    }
  }

  const appContent = document.getElementById('app-content');

  // Réinitialiser les styles que certaines pages (ex: live) peuvent avoir overridés
  if (appContent) {
    appContent.style.overflow = '';
    appContent.style.paddingBottom = '';
  }

  // Afficher le loader avec snakeLoader
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.innerHTML = '';
    loader.appendChild(createSnakeLoader(50));
    loader.classList.remove('d-none');
  }

  try {
    // Charger et parser le HTML
    const response = await fetch(pagePath);
    if (!response.ok) throw new Error('404');

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extraire le contenu du body
    const content = doc.body.innerHTML;
    appContent.innerHTML = content;

    // Mettre à jour la nav inférieure
    updateBottomNav(route);
    updateTopNav();
    updateShell(route);

    // Enregistrer dans la pile de navigation (gestion bouton retour)
    window._navRecord?.(route);

    // Charger le script spécifique de la page
    await loadPageScript(route, detailParams);

    // Cacher le loader
    if (loader) {
      loader.innerHTML = '';
      loader.classList.add('d-none');
    }

  } catch (error) {
    console.error('Erreur chargement page:', error);
    if (loader) {
      loader.innerHTML = '';
      loader.classList.add('d-none');
    }
    renderNotFound();
  }
}

async function loadPageScript(route, detailParams = null) {
  const pageScripts = {
    '#/home':           () => import('./pages/home.js').then(m => m.loadHome()),
    '#/news':           () => import('./pages/news.js').then(m => m.loadNews()),
    '#/jtandmag':       () => import('./pages/jtandmag.js').then(m => m.loadJTandMag()),
    '#/sports':         () => import('./pages/sports.js').then(m => m.loadSports()),
    '#/reportages':     () => import('./pages/reportages.js').then(m => m.loadReportages()),
    '#/divertissement': () => import('./pages/divertissement.js').then(m => m.loadDivertissement()),
    '#/archive':        () => import('./pages/archive.js').then(m => m.loadArchive()),
    '#/profile':        () => import('./pages/profile.js').then(m => m.loadProfile()),
    '#/live':           () => import('./pages/live.js').then(m => m.loadLive()),
    '#/emissions':      () => import('./pages/emissions.js').then(m => m.loadEmissions()),
    '#/reels':          () => import('./pages/reels.js').then(m => m.loadReels()),
    '#/programs':       () => import('./pages/programs.js').then(m => m.loadPrograms()),
    '#/login':          () => import('./pages/login.js').then(m => m.loadLogin()),
    '#/register':       () => import('./pages/register.js').then(m => m.loadRegister()),
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
        await loadEmissionCategory(detailParams.name);
      }
    }
  } catch (error) {
    console.error(`Erreur chargement script page ${route}:`, error);
  }
}

function renderNotFound() {
  const appContent = document.getElementById('app-content');
  appContent.innerHTML = `
    <div class="text-center py-5">
      <i class="bi bi-exclamation-circle text-danger" style="font-size: 3rem;"></i>
      <h1 class="h2 mt-3 mb-4">Page non trouvée</h1>
      <p class="text-muted mb-4">La page que tu cherches n'existe pas</p>
      <a href="#/home" class="btn btn-danger">Retour à l'accueil</a>
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

// Routes dont les pages ont leur propre header (retour + titre) → masquer le header principal
const _DETAIL_PREFIXES = ['#/show/', '#/news/', '#/series-detail/', '#/movie/', '#/emission-category/'];
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

// Gestion des formulaires
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'login-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await login(fd.get('identifier'), fd.get('password'));
      window.location.hash = '#/profile';
    } catch (err) {
      alert('Erreur connexion: ' + err.message);
    }
  }

  if (e.target.id === 'register-form') {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await register(fd.get('username'), fd.get('email'), fd.get('password'));
      window.location.hash = '#/profile';
    } catch (err) {
      alert('Erreur inscription: ' + err.message);
    }
  }
});

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
  setTimeout(() => splash.remove(), 520);
}

// Router
window.addEventListener('hashchange', (e) => {
  const route = window.location.hash || '#/home';
  // Mémoriser le hash précédent (utile pour #/premium)
  const prev = e.oldURL ? (e.oldURL.split('#')[1] ? '#' + e.oldURL.split('#')[1] : '#/home') : '#/home';
  if (prev !== '#/premium') window._prevHash = prev;
  renderRoute(route);
});

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
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
    // Sans préférence locale ET connecté → interroger le serveur
    // Sans préférence locale ET non connecté → dark par défaut
    const localTheme = localStorage.getItem('bf1_theme_preference');
    if (localTheme) {
      themeManager.init(localTheme);
    } else if (isAuthenticated()) {
      const userSettings = await getUserSettings().catch(() => null);
      const savedTheme = userSettings?.theme || 'dark';
      themeManager.init(savedTheme);
    } else {
      themeManager.init('dark');
    }
  } catch (err) {
    console.warn('⚠️ Impossible de charger le thème:', err.message);
    themeManager.init(localStorage.getItem('bf1_theme_preference') || 'dark');
  }
  // └────────────────────────────────────────────────────────────────────┘

  // Si l'app était déjà initialisée dans cette session → pas de splash, juste recharger la page courante
  if (sessionStorage.getItem('bf1_ready')) {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
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
  const healthCheck = fetch('https://bf1.fly.dev/api/v1/health', { signal: AbortSignal.timeout(5000) })
    .then(() => {}).catch(() => {}); // ne pas bloquer si fail

  await healthCheck;

  // Minimum 3 secondes de splash
  const elapsed = Date.now() - splashStart;
  const remaining = Math.max(0, 3000 - elapsed);
  await new Promise(r => setTimeout(r, remaining));

  // Charger la page puis cacher le splash
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') {
    history.replaceState(null, '', '#/home');
    await renderRoute('#/home');
  } else {
    await renderRoute(hash);
  }

  hideSplash();
});
