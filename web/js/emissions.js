// js/emissions.js
import * as api from '../../shared/services/api.js';
import { slugify } from '/js/slugUtils.js';

// État actuel
let currentFilter = 'trending';
let currentCategory = 'all';
let currentSearch = '';
let allEmissions = [];
let filteredEmissions = [];

// Éléments DOM
let emissionsGrid;
let searchInput;

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

function getChannelIcon(channelName) {
  const icons = {
    'BF1 National': 'bi-tv-fill',
    'BF1 Sport': 'bi-trophy-fill',
    'BF1 Culture': 'bi-music-note-fill',
    'BF1 Info': 'bi-mic-fill',
    'BF1 Musique': 'bi-music-note-beamed',
    'BF1 Divertissement': 'bi-emoji-smile-fill',
    'BF1 Reportage': 'bi-camera-fill',
    'BF1 Archives': 'bi-archive-fill'
  };
  return icons[channelName] || 'bi-tv-fill';
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
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

// ── Skeleton / loading helpers ──────────────────────────
function showSkeletons(count = 12) {
  if (!emissionsGrid) return;
  const skeletonHTML = Array.from({ length: count }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>
  `).join('');
  emissionsGrid.innerHTML = skeletonHTML;
  document.querySelector('.em-filters')?.classList.add('is-loading');
  document.getElementById('emPagination').innerHTML = '';
}

function hideSkeletons() {
  document.querySelector('.em-filters')?.classList.remove('is-loading');
}

function showErrorState() {
  if (!emissionsGrid) return;
  emissionsGrid.innerHTML = `
    <div class="em-error-banner">
      <i class="bi bi-wifi-off"></i>
      <p>Impossible de charger les émissions.<br>Vérifiez votre connexion internet.</p>
      <button onclick="window.location.reload()"><i class="bi bi-arrow-clockwise me-2"></i>Réessayer</button>
    </div>
  `;
  hideSkeletons();
}

// Charger toutes les émissions
async function loadAllEmissions() {
  showSkeletons(12);
  try {
    console.log('📡 Chargement des émissions...');
    
    const [sports, divertissement, reportages, jtandmag] = await Promise.all([
      api.getSports(),
      api.getDivertissement(),
      api.getReportages(),
      api.getJTandMag()
    ]);

    const allData = [];
    
    // SPORT
    const sportsList = (sports && sports.sports) ? sports.sports : (Array.isArray(sports) ? sports : []);
    for (const item of sportsList) {
      const itemId = item._id || item.id;
      let realViews = item.views || 0;
      let realLikes = item.likes || 0;
      
      try {
        const viewsCount = await api.getViewsCount('sport', itemId).catch(() => null);
        if (viewsCount !== null) realViews = viewsCount;
        
        // Récupérer les likes réels avec await
        const likesCount = await api.getLikesCount('sport', itemId);
        realLikes = likesCount;
        console.log(`🏆 SPORT - "${item.title}" - Likes réels: ${realLikes}`);
      } catch (e) {
        console.warn(`Impossible de récupérer les stats pour ${item.title}:`, e);
      }
      
      allData.push({
        id: itemId,
        title: item.title,
        description: item.description || '',
        channel: 'BF1 Sport',
        channelIcon: 'bi-trophy-fill',
        category: 'sport',
        type: 'sport',
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        views: realViews,
        likes: realLikes,
        duration: item.duration_minutes || 90,
        date: item.created_at || item.published_at,
        isLive: item.is_live || false,
        hasReplay: item.has_replay !== false
      });
    }
    
    // DIVERTISSEMENT
    const divertissementList = Array.isArray(divertissement) ? divertissement : [];
    console.log(`🎬 Traitement de ${divertissementList.length} divertissements...`);
    
    for (const item of divertissementList) {
      const itemId = item._id || item.id;
      let realViews = item.views || 0;
      
      try {
        const viewsCount = await api.getViewsCount('divertissement', itemId).catch(() => null);
        if (viewsCount !== null) realViews = viewsCount;
      } catch (e) {
        console.warn(`Impossible de récupérer les vues pour ${item.title}:`, e);
      }
      
      // Récupérer les likes réels avec await (uniquement pour les likes)
      const realLikes = await api.getLikesCount('divertissement', itemId);
      console.log(`🎬 DIVERTISSEMENT - "${item.title}" - Likes réels: ${realLikes}`);
      
      allData.push({
        id: itemId,
        title: item.title,
        description: item.description || '',
        channel: 'BF1 Divertissement',
        channelIcon: 'bi-emoji-smile-fill',
        category: 'divertissement',
        type: 'divertissement',
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        views: realViews,
        likes: realLikes,  // Utilise les likes réels de l'API
        duration: item.duration_minutes || 60,
        date: item.created_at || item.published_at,
        isLive: item.is_live || false,
        hasReplay: item.has_replay !== false
      });
    }
    
    // REPORTAGE
    const reportagesList = Array.isArray(reportages) ? reportages : [];
    for (const item of reportagesList) {
      const itemId = item._id || item.id;
      let realViews = item.views || 0;
      
      try {
        const viewsCount = await api.getViewsCount('reportage', itemId).catch(() => null);
        if (viewsCount !== null) realViews = viewsCount;
      } catch (e) {
        console.warn(`Impossible de récupérer les vues pour ${item.title}:`, e);
      }
      
      // Récupérer les likes réels avec await
      const realLikes = await api.getLikesCount('reportage', itemId);
      
      allData.push({
        id: itemId,
        title: item.title,
        description: item.description || '',
        channel: 'BF1 Reportage',
        channelIcon: 'bi-camera-fill',
        category: 'reportage',
        type: 'reportage',
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        views: realViews,
        likes: realLikes,
        duration: item.duration_minutes || 52,
        date: item.created_at || item.published_at,
        isLive: false,
        hasReplay: true
      });
    }
    
    // JOURNAL & MAGAZINE
    const jtandmagList = Array.isArray(jtandmag) ? jtandmag : [];
    for (const item of jtandmagList) {
      const itemId = item._id || item.id;
      let realViews = item.views || 0;
      
      try {
        const viewsCount = await api.getViewsCount('jtandmag', itemId).catch(() => null);
        if (viewsCount !== null) realViews = viewsCount;
      } catch (e) {
        console.warn(`Impossible de récupérer les vues pour ${item.title}:`, e);
      }
      
      // Récupérer les likes réels avec await
      const realLikes = await api.getLikesCount('jtandmag', itemId);
      
      allData.push({
        id: itemId,
        title: item.title,
        description: item.description || '',
        channel: 'BF1 Info',
        channelIcon: 'bi-mic-fill',
        category: 'journal',
        type: 'jtandmag',
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        views: realViews,
        likes: realLikes,
        duration: item.duration_minutes || 70,
        date: item.created_at || item.published_at,
        isLive: item.is_live || false,
        hasReplay: true
      });
    }
    
    // Trier par date (plus récent en premier)
    allData.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });
    
    allEmissions = allData;
    filteredEmissions = [...allEmissions];
    
    // Récapitulatif des divertissements avec leurs likes réels
    const divertissementsFinal = allEmissions.filter(e => e.category === 'divertissement');
    console.log(`\n✅ ${allEmissions.length} émissions chargées`);
    console.log(`   - Divertissement: ${divertissementsFinal.length}`);
    if (divertissementsFinal.length > 0) {
      console.log('📺 Détail des divertissements avec leurs LIKES RÉELS:');
      divertissementsFinal.forEach((div, idx) => {
        console.log(`   ${idx + 1}. "${div.title}" - ${div.views} vues, ${div.likes} likes (depuis API /likes/content/)`);
      });
    }
    
    // Mettre à jour les stats
    updateHeroStats();
    hideSkeletons();
    
    return allEmissions;
  } catch (error) {
    console.error('❌ Erreur chargement des émissions:', error);
    showErrorState();
    return [];
  }
}

// Mettre à jour les statistiques du hero
function updateHeroStats() {
  const totalEl = document.getElementById('totalEmissions');
  const categoriesCount = 4; // Sport, Divertissement, Reportage, Journal
  
  if (totalEl) totalEl.textContent = formatNumber(allEmissions.length);
  
  const statBoxes = document.querySelectorAll('.replays-stat-box');
  if (statBoxes.length >= 2) {
    statBoxes[1].querySelector('.replays-stat-num').textContent = categoriesCount;
  }
}

// Filtrer les émissions
function filterEmissions() {
  let filtered = [...allEmissions];
  
  // Filtre par recherche
  if (currentSearch) {
    const searchLower = currentSearch.toLowerCase();
    filtered = filtered.filter(e => 
      e.title.toLowerCase().includes(searchLower) ||
      (e.description && e.description.toLowerCase().includes(searchLower))
    );
  }
  
  // Filtre par catégorie
  if (currentCategory !== 'all') {
    filtered = filtered.filter(e => e.category === currentCategory);
  }

  // Tri avec vues réelles
  switch (currentFilter) {
    case 'trending':
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'recent':
      filtered.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      break;
    case 'popular':
      filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      break;
    default:
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
  }
  
  filteredEmissions = filtered;
  currentPage = 1;
  updateResultsCount();
  renderEmissions();
  renderEmissionsPagination();
}

// Rendre les émissions
function renderEmissions() {
  if (!emissionsGrid) {
    emissionsGrid = document.querySelector('.videos-grid');
    if (!emissionsGrid) {
      console.warn('Conteneur emissionsGrid non trouvé');
      return;
    }
  }
  
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageEmissions = filteredEmissions.slice(start, end);
  
  if (pageEmissions.length === 0) {
    emissionsGrid.innerHTML = `
      <div class="text-center py-5" style="grid-column: 1/-1;">
        <i class="bi bi-inbox" style="font-size: 3rem; color: var(--text-secondary);"></i>
        <p class="mt-3 text-secondary">Aucune émission trouvée</p>
      </div>
    `;
    return;
  }
  
  emissionsGrid.innerHTML = pageEmissions.map((item, index) => `
    <div class="video-card anim-up d${(index % 6) + 1}" data-id="${item.id}" data-type="${item.type}" data-title="${escapeHtml(item.title)}">
      <div class="card-thumb">
        ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy"/>` : 
          `<div class="card-thumb-placeholder"><i class="bi bi-camera-video-fill"></i></div>`}
        <div class="card-badge">
          ${item.hasReplay ? '<span class="badge-replay">REPLAY</span>' : '<span class="badge-live">LIVE</span>'}
        </div>
        <div class="card-duration">${formatDuration(item.duration)}</div>
        <div class="card-overlay">
          <div class="card-play">
            <i class="bi bi-play-fill"></i>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-channel">
          <div class="channel-avatar">
            <i class="bi ${item.channelIcon}"></i>
          </div>
          <span class="channel-name">${escapeHtml(item.channel)}</span>
        </div>
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-description">${escapeHtml((item.description || '').substring(0, 80))}${(item.description || '').length > 80 ? '...' : ''}</div>
        <div class="card-meta">
          <div class="card-stats">
            <span class="card-stat"><i class="bi bi-eye-fill"></i>${formatNumber(item.views)}</span>
            <span class="card-stat"><i class="bi bi-heart-fill" style="color:var(--red)"></i>${formatNumber(item.likes)}</span>
          </div>
          <span class="card-date"><i class="bi bi-calendar3"></i> ${formatDate(item.date)}</span>
        </div>
      </div>
      <div style="padding:0 16px 14px">
        <button class="btn-outline w-100 justify-content-center watch-btn" data-id="${item.id}" data-type="${item.type}" style="font-size:0.82rem;padding:8px">
          <i class="bi bi-play-fill"></i>Regarder
        </button>
      </div>
    </div>
  `).join('');
  
  // Ajouter les événements de clic
  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.watch-btn')) return;
      const id = card.dataset.id;
      const type = card.dataset.type;
      const title = card.dataset.title;
      redirectToDetail(id, type, title);
    });
  });
  
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      const title = btn.closest('.video-card')?.dataset.title;
      redirectToDetail(id, type, title);
    });
  });

  renderEmissionsPagination();
}

// Rendu de la pagination
function renderEmissionsPagination() {
  const container = document.getElementById('emPagination');
  if (!container) return;

  const totalItems = filteredEmissions.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  if (currentPage <= 3) endPage = Math.min(5, totalPages);
  if (currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4);

  let numbersHTML = '';
  if (startPage > 1) {
    numbersHTML += `<button class="pagination-number" onclick="window.changeEmissionsPage(1)">1</button>`;
    if (startPage > 2) numbersHTML += '<span class="pagination-dots">...</span>';
  }
  for (let i = startPage; i <= endPage; i++) {
    numbersHTML += `<button class="pagination-number ${i === currentPage ? 'active' : ''}" onclick="window.changeEmissionsPage(${i})">${i}</button>`;
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) numbersHTML += '<span class="pagination-dots">...</span>';
    numbersHTML += `<button class="pagination-number" onclick="window.changeEmissionsPage(${totalPages})">${totalPages}</button>`;
  }

  container.innerHTML = `
    <div class="pagination-container">
      <button class="pagination-btn ${prevDisabled}" onclick="window.changeEmissionsPage(${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>
        <i class="bi bi-chevron-left"></i> Précédent
      </button>
      <div class="pagination-numbers">${numbersHTML}</div>
      <button class="pagination-btn ${nextDisabled}" onclick="window.changeEmissionsPage(${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>
        Suivant <i class="bi bi-chevron-right"></i>
      </button>
    </div>
    <div class="pagination-info">Affichage de ${startItem} à ${endItem} sur ${totalItems} émissions</div>
  `;
}

window.changeEmissionsPage = function(page) {
  const totalPages = Math.ceil(filteredEmissions.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderEmissions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Rediriger vers la page de détail
function redirectToDetail(id, type, title = '') {
  const slug = title ? slugify(title) : '';
  const query = slug ? `slug=${slug}&type=${type}` : `id=${id}&type=${type}`;
  const page = `detail-contenu.html?${query}`;
  window.location.href = page;
}

// Charger les catégories populaires
function loadPopularCategories() {
  const categoriesContainer = document.querySelector('.videos-grid.mb-5');
  if (!categoriesContainer) {
    console.warn('Conteneur catégories non trouvé');
    return;
  }
  
  // 4 catégories: Sport, Divertissement, Reportage, Journal & Magazine
  const categories = [
    { name: 'Sport', key: 'sport', count: 0, icon: 'bi-trophy-fill', color: '#f59e0b' },
    { name: 'Divertissement', key: 'divertissement', count: 0, icon: 'bi-emoji-smile-fill', color: '#10b981' },
    { name: 'Reportage', key: 'reportage', count: 0, icon: 'bi-camera-fill', color: '#3b82f6' },
    { name: 'Journal & Magazine', key: 'journal', count: 0, icon: 'bi-newspaper', color: '#e8222a' }
  ];
  
  allEmissions.forEach(emission => {
    if (emission.category === 'sport') categories[0].count++;
    else if (emission.category === 'divertissement') categories[1].count++;
    else if (emission.category === 'reportage') categories[2].count++;
    else if (emission.category === 'journal') categories[3].count++;
  });
  
  categoriesContainer.innerHTML = categories.map(cat => `
    <div class="category-card" data-category="${cat.key}">
      <div style="width:100%;height:100%;background:linear-gradient(135deg, ${cat.color}20, ${cat.color}40); display:flex;align-items:center;justify-content:center;">
        <i class="bi ${cat.icon}" style="font-size: 3rem; color: ${cat.color};"></i>
      </div>
      <div class="category-card-overlay"></div>
      <div class="category-card-info">
        <div class="category-card-name">${cat.name}</div>
        <div class="category-card-count">${cat.count} émissions</div>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      currentCategory = category;
      currentSearch = '';
      currentFilter = 'trending';
      
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      document.querySelector('.filter-pill[data-filter="trending"]')?.classList.add('active');
      document.querySelectorAll('.em-cat-tab').forEach(t => t.classList.remove('active'));
      document.querySelector(`.em-cat-tab[data-cat="${category}"]`)?.classList.add('active');
      
      filterEmissions();
    });
  });
}

// Charger les données de continuation (historique local)
function loadContinueWatching() {
  const continueContainer = document.querySelector('.continue-cards');
  if (!continueContainer) {
    console.warn('Conteneur continue-cards non trouvé');
    return;
  }
  
  try {
    const history = JSON.parse(localStorage.getItem('bf1_watch_history') || '[]');
    const recentHistory = history.slice(0, 4);
    
    if (recentHistory.length === 0) {
      continueContainer.innerHTML = '<div class="text-center py-4" style="grid-column:1/-1">Aucun historique de visionnage</div>';
      return;
    }
    
    continueContainer.innerHTML = recentHistory.map(item => `
      <div class="continue-card" data-id="${item.id}" data-type="${item.type}" data-title="${escapeHtml(item.title)}">
        <div class="continue-card-thumb">
          ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.title)}"/>` :
            `<div style="width:100%;height:100%;background:var(--bg-3);display:flex;align-items:center;justify-content:center;"><i class="bi bi-camera-video-fill"></i></div>`}
          <div class="card-progress">
            <div class="card-progress-bar" style="width:${item.progress || 0}%"></div>
          </div>
        </div>
        <div class="continue-card-body">
          <div class="continue-card-title">${escapeHtml(item.title)}</div>
          <div class="continue-card-channel">${escapeHtml(item.channel)} · <span class="continue-pct">${item.progress || 0}% visionné</span></div>
        </div>
      </div>
    `).join('');
    
    document.querySelectorAll('.continue-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const type = card.dataset.type;
        const title = card.dataset.title;
        redirectToDetail(id, type, title);
      });
    });
  } catch (err) {
    console.warn('Erreur chargement historique:', err);
  }
}

// Mettre à jour le compteur de résultats
function updateResultsCount() {
  const el = document.getElementById('emResultsCount');
  if (el) {
    el.textContent = filteredEmissions.length > 0
      ? `${filteredEmissions.length} résultat${filteredEmissions.length > 1 ? 's' : ''}`
      : '';
  }
}

// Initialiser les événements
function initEventListeners() {
  // Sort tabs
  document.querySelectorAll('.em-sort-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.em-sort-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.sort;
      filterEmissions();
    });
  });

  // Category tabs
  document.querySelectorAll('.em-cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.em-cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.cat;
      filterEmissions();
    });
  });

  // Recherche live
  searchInput = document.querySelector('.em-search-input');
  const clearBtn = document.getElementById('searchClear');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      if (clearBtn) clearBtn.classList.toggle('visible', currentSearch.length > 0);
      filterEmissions();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        currentSearch = '';
        clearBtn.classList.remove('visible');
        searchInput.focus();
        filterEmissions();
      }
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
  console.log('🚀 Initialisation de la page Émissions...');
  
  loadSavedTheme();
  
  // Récupérer les conteneurs après chargement du DOM
  emissionsGrid = document.querySelector('.videos-grid');
  
  await loadAllEmissions();

  // Charger les composants
  filterEmissions();
  initEventListeners();
  loadPopularCategories();
  loadContinueWatching();
  
  console.log(`✅ Page Émissions initialisée - ${allEmissions.length} émissions disponibles`);
}

// Démarrer l'initialisation
init();