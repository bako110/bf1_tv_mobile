import { ROUTES, TAB_ROUTES } from './config/routes.js';
import { isAuthenticated, getUser, login, register, logout } from './services/api.js';
import { createSnakeLoader } from './utils/snakeLoader.js';

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

  // Masquer la nav uniquement sur les pages d'authentification
  const AUTH_ROUTES = ['#/login', '#/register'];
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = AUTH_ROUTES.includes(route) ? 'none' : 'flex';
  }
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
window.addEventListener('hashchange', () => {
  const route = window.location.hash || '#/home';
  renderRoute(route);
});

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  // Marquer Accueil actif immédiatement (avant le splash)
  updateBottomNav('#/home');

  // Démarrer le splash immédiatement
  startSplash();
  const splashStart = Date.now();

  // Restaurer le token
  try {
    const token = localStorage.getItem('bf1_token');
    if (token) {
      const { http } = await import('./services/http.js');
      http.setToken(token);
    }
  } catch (err) {
    console.warn('⚠️ Accès localStorage bloqué (tracking prevention):', err.message);
  }

  // Health check backend en parallèle (timeout 5s)
  let backendReady = false;
  const healthCheck = fetch('https://bf1.fly.dev/api/v1/health', { signal: AbortSignal.timeout(5000) })
    .then(() => { backendReady = true; })
    .catch(() => { backendReady = true; }); // ne pas bloquer si fail

  await healthCheck;

  // Minimum 3 secondes de splash (comme React Native)
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
