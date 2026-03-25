// js/films.js
import * as api from '../../shared/services/api.js';

// État actuel
let currentFilter = 'trending';
let currentGenre = 'all';
let currentYear = 'all';
let currentSearch = '';
let allFilms = [];
let filteredFilms = [];

// Éléments DOM
let filmsGrid;
let searchInput;
let genreSelect;
let yearSelect;
let filterPills;
let heroStatsEl;

// Nombre d'éléments par page
const ITEMS_PER_PAGE = 12;
let currentPage = 1;

// Fonction de thème
window.toggleTheme = function() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  
  try {
    localStorage.setItem('bf1_theme', newTheme);
  } catch (err) {
    console.warn('Impossible de sauvegarder le thème:', err);
  }
  
  const themeBtn = document.querySelector('.theme-toggle i');
  if (themeBtn) {
    themeBtn.className = newTheme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
  }
};

function loadSavedTheme() {
  try {
    const savedTheme = localStorage.getItem('bf1_theme');
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      const themeBtn = document.querySelector('.theme-toggle i');
      if (themeBtn) {
        themeBtn.className = savedTheme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
      }
    }
  } catch (err) {
    console.warn('Impossible de charger le thème:', err);
  }
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-bf1tv.onrender.com${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// Vérifier si l'utilisateur a accès au film payant
async function checkFilmAccess(film) {
  if (!film.is_premium) return true;
  
  try {
    const user = api.getUser();
    if (!user) return false;
    
    // Vérifier l'abonnement de l'utilisateur
    const subscription = await api.getMySubscription();
    if (subscription && subscription.status === 'active') return true;
    
    // Vérifier si le film a été acheté individuellement
    const favorites = await api.getMyFavorites('movie');
    return favorites.some(f => f.content_id === film.id);
  } catch {
    return false;
  }
}

// Charger tous les films
async function loadAllFilms() {
  try {
    console.log('📡 Chargement des films...');
    
    const movies = await api.getMovies();
    console.log('📡 Réponse API films:', movies);
    
    const allData = [];
    const moviesList = Array.isArray(movies) ? movies : (movies?.movies || movies?.items || []);
    
    moviesList.forEach(item => {
      allData.push({
        id: item._id || item.id,
        title: item.title,
        original_title: item.original_title,
        description: item.description || item.synopsis || '',
        genre: item.genre || item.category || 'Drame',
        year: item.year || (item.release_date ? new Date(item.release_date).getFullYear() : 2024),
        duration: item.duration_minutes || item.duration || 90,
        rating: item.rating || item.note || 0,
        director: item.director || item.realisateur,
        actors: item.actors || item.casting || [],
        image: getImageUrl(item.poster || item.image_url || item.image || item.thumbnail),
        backdrop: getImageUrl(item.backdrop || item.background),
        trailer_url: item.trailer_url,
        video_url: item.video_url,
        is_premium: item.is_premium || item.is_paid || false,
        price: item.price || 0,
        views: item.views || Math.floor(Math.random() * 50000) + 1000,
        likes: item.likes || Math.floor(Math.random() * 5000) + 100,
        release_date: item.release_date || item.created_at,
        created_at: item.created_at
      });
    });
    
    // Trier par date (plus récent en premier)
    allData.sort((a, b) => {
      const dateA = new Date(a.release_date || a.created_at || 0);
      const dateB = new Date(b.release_date || b.created_at || 0);
      return dateB - dateA;
    });
    
    allFilms = allData;
    filteredFilms = [...allFilms];
    
    console.log(`✅ ${allFilms.length} films chargés`);
    console.log(`   - Films premium: ${allFilms.filter(f => f.is_premium).length}`);
    console.log(`   - Films gratuits: ${allFilms.filter(f => !f.is_premium).length}`);
    
    // Mettre à jour les stats
    updateHeroStats();
    
    return allFilms;
  } catch (error) {
    console.error('❌ Erreur chargement des films:', error);
    return [];
  }
}

// Mettre à jour les statistiques du hero
function updateHeroStats() {
  const totalEl = document.getElementById('totalFilms');
  const freeEl = document.getElementById('freeFilms');
  const premiumEl = document.getElementById('premiumFilms');
  
  if (totalEl) totalEl.textContent = formatNumber(allFilms.length);
  if (freeEl) freeEl.textContent = formatNumber(allFilms.filter(f => !f.is_premium).length);
  if (premiumEl) premiumEl.textContent = formatNumber(allFilms.filter(f => f.is_premium).length);
}

// Filtrer les films
function filterFilms() {
  let filtered = [...allFilms];
  
  // Filtre par recherche
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    filtered = filtered.filter(f => 
      f.title.toLowerCase().includes(searchLower) ||
      (f.original_title && f.original_title.toLowerCase().includes(searchLower)) ||
      (f.description && f.description.toLowerCase().includes(searchLower)) ||
      f.director?.toLowerCase().includes(searchLower)
    );
  }
  
  // Filtre par genre
  if (currentGenre !== 'all') {
    filtered = filtered.filter(f => f.genre === currentGenre);
  }
  
  // Filtre par année
  if (currentYear !== 'all') {
    filtered = filtered.filter(f => f.year === parseInt(currentYear));
  }
  
  // Tri
  switch (currentFilter) {
    case 'trending':
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'recent':
      filtered.sort((a, b) => {
        const dateA = new Date(a.release_date || a.created_at || 0);
        const dateB = new Date(b.release_date || b.created_at || 0);
        return dateB - dateA;
      });
      break;
    case 'popular':
      filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      break;
    case 'rating':
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    default:
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
  }
  
  filteredFilms = filtered;
  currentPage = 1;
  renderFilms();
}

// Rendre les films
function renderFilms() {
  if (!filmsGrid) {
    filmsGrid = document.querySelector('.films-grid');
    if (!filmsGrid) return;
  }
  
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageFilms = filteredFilms.slice(start, end);
  
  if (pageFilms.length === 0) {
    filmsGrid.innerHTML = `
      <div class="text-center py-5" style="grid-column: 1/-1;">
        <i class="bi bi-film" style="font-size: 3rem; color: var(--text-secondary);"></i>
        <p class="mt-3 text-secondary">Aucun film trouvé</p>
      </div>
    `;
    return;
  }
  
  filmsGrid.innerHTML = pageFilms.map((film, index) => `
    <div class="film-card anim-up d${(index % 6) + 1}" data-id="${film.id}">
      <div class="card-thumb">
        ${film.image ? `<img src="${film.image}" alt="${escapeHtml(film.title)}" loading="lazy"/>` : 
          `<div class="card-thumb-placeholder"><i class="bi bi-film"></i></div>`}
        ${film.is_premium ? '<div class="premium-badge"><i class="bi bi-gem"></i> PREMIUM</div>' : '<div class="free-badge"><i class="bi bi-star-fill"></i> GRATUIT</div>'}
        <div class="card-duration">${formatDuration(film.duration)}</div>
        <div class="card-rating"><i class="bi bi-star-fill"></i> ${film.rating || 'N/A'}</div>
        <div class="card-overlay">
          <div class="card-play">
            <i class="bi bi-play-fill"></i>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(film.title)}</div>
        <div class="card-meta">
          <span class="film-year"><i class="bi bi-calendar3"></i> ${film.year}</span>
          <span class="film-genre"><i class="bi bi-tag"></i> ${escapeHtml(film.genre)}</span>
          <span class="film-duration"><i class="bi bi-clock"></i> ${formatDuration(film.duration)}</span>
        </div>
        <div class="card-description">${escapeHtml((film.description || '').substring(0, 100))}${(film.description || '').length > 100 ? '...' : ''}</div>
        <div class="card-stats">
          <span class="card-stat"><i class="bi bi-eye-fill"></i> ${formatNumber(film.views)}</span>
          <span class="card-stat"><i class="bi bi-heart-fill"></i> ${formatNumber(film.likes)}</span>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn-watch watch-btn" data-id="${film.id}" data-premium="${film.is_premium}">
          <i class="bi ${film.is_premium ? 'bi-gem' : 'bi-play-fill'}"></i>
          ${film.is_premium ? 'Accéder au film' : 'Regarder'}
        </button>
      </div>
    </div>
  `).join('');
  
  // Ajouter les événements de clic
  document.querySelectorAll('.film-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.watch-btn')) return;
      const id = card.dataset.id;
      redirectToFilmDetail(id);
    });
  });
  
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const isPremium = btn.dataset.premium === 'true';
      
      if (isPremium) {
        const hasAccess = await checkPremiumAccess(id);
        if (hasAccess) {
          redirectToFilmDetail(id);
        } else {
          showPremiumModal(id);
        }
      } else {
        redirectToFilmDetail(id);
      }
    });
  });
}

// Vérifier l'accès premium
async function checkPremiumAccess(filmId) {
  try {
    const user = api.getUser();
    if (!user) {
      showLoginModal();
      return false;
    }
    
    const subscription = await api.getMySubscription();
    if (subscription && subscription.status === 'active') return true;
    
    const favorites = await api.getMyFavorites('movie');
    return favorites.some(f => f.content_id === filmId);
  } catch {
    return false;
  }
}

// Afficher la modale premium
function showPremiumModal(filmId) {
  const modalHtml = `
    <div class="premium-modal-overlay" id="premiumModal">
      <div class="premium-modal">
        <button class="premium-modal-close"><i class="bi bi-x-lg"></i></button>
        <div class="premium-modal-icon"><i class="bi bi-gem"></i></div>
        <h3>Film Premium</h3>
        <p>Ce film est réservé aux abonnés BF1 Premium.</p>
        <p class="premium-modal-price">À partir de <strong>3 500 FCFA/mois</strong></p>
        <div class="premium-modal-buttons">
          <button class="btn-outline" id="closeModalBtn">Plus tard</button>
          <button class="btn-red" id="subscribeBtn">S'abonner</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById('premiumModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const subscribeBtn = document.getElementById('subscribeBtn');
  
  const closeModal = () => modal.remove();
  closeBtn?.addEventListener('click', closeModal);
  subscribeBtn?.addEventListener('click', () => {
    window.location.href = 'subscription.html';
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// Afficher la modale de connexion
function showLoginModal() {
  const modalHtml = `
    <div class="premium-modal-overlay" id="loginModal">
      <div class="premium-modal">
        <button class="premium-modal-close"><i class="bi bi-x-lg"></i></button>
        <div class="premium-modal-icon"><i class="bi bi-person-circle"></i></div>
        <h3>Connexion requise</h3>
        <p>Connectez-vous pour accéder à ce film.</p>
        <div class="premium-modal-buttons">
          <button class="btn-outline" id="closeModalBtn">Plus tard</button>
          <button class="btn-red" id="loginBtn">Se connecter</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById('loginModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const loginBtn = document.getElementById('loginBtn');
  
  const closeModal = () => modal.remove();
  closeBtn?.addEventListener('click', closeModal);
  loginBtn?.addEventListener('click', () => {
    window.location.href = 'login.html';
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// Rediriger vers la page détail du film
function redirectToFilmDetail(filmId) {
  window.location.href = `detail-contenu.html?id=${filmId}&type=film`;
}

// Charger les genres uniques
function loadGenres() {
  const genres = [...new Set(allFilms.map(f => f.genre).filter(Boolean))];
  genres.sort();
  
  if (genreSelect) {
    genreSelect.innerHTML = '<option value="all">Tous les genres</option>' + 
      genres.map(g => `<option value="${g}">${g}</option>`).join('');
  }
}

// Charger les années uniques
function loadYears() {
  const years = [...new Set(allFilms.map(f => f.year).filter(Boolean))];
  years.sort((a, b) => b - a);
  
  if (yearSelect) {
    yearSelect.innerHTML = '<option value="all">Toutes les années</option>' + 
      years.map(y => `<option value="${y}">${y}</option>`).join('');
  }
}

// Initialiser les événements
function initEventListeners() {
  // Filtres
  filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      filterFilms();
    });
  });
  
  // Recherche
  searchInput = document.querySelector('.search-bar-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      filterFilms();
    });
  }
  
  // Filtre genre
  genreSelect = document.querySelector('.genre-select');
  if (genreSelect) {
    genreSelect.addEventListener('change', (e) => {
      currentGenre = e.target.value;
      filterFilms();
    });
  }
  
  // Filtre année
  yearSelect = document.querySelector('.year-select');
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      currentYear = e.target.value;
      filterFilms();
    });
  }
  
  // Bouton filtrer
  const filterBtn = document.querySelector('.btn-red');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      filterFilms();
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Initialisation
async function init() {
  console.log('🚀 Initialisation de la page Films...');
  
  loadSavedTheme();
  
  // Récupérer les conteneurs
  filmsGrid = document.querySelector('.films-grid');
  
  await loadAllFilms();
  
  // Charger les filtres
  loadGenres();
  loadYears();
  filterFilms();
  initEventListeners();
  
  console.log(`✅ Page Films initialisée - ${allFilms.length} films disponibles`);
}

// Démarrer l'initialisation
init();