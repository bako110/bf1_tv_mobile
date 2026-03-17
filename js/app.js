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

  const pagePath = routes[route];
  if (!pagePath) {
    renderNotFound();
    return;
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
    await loadPageScript(route);

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

async function loadPageScript(route) {
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
  };

  try {
    if (pageScripts[route]) {
      await pageScripts[route]();
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
  // Mapping: route → [id_tab, icône_inactive, icône_active]
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

// Router
window.addEventListener('hashchange', () => {
  const route = window.location.hash || '#/home';
  renderRoute(route);
});

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const token = localStorage.getItem('bf1_token');
    if (token) {
      const { http } = await import('./services/http.js');
      http.setToken(token);
    }
  } catch (err) {
    console.warn('⚠️ Accès localStorage bloqué (tracking prevention):', err.message);
  }

  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') {
    history.replaceState(null, '', '#/home');
    renderRoute('#/home');
  } else {
    renderRoute(hash);
  }
});
