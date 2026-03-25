// js/accueil.js
import * as api from '../../shared/services/api.js';

// État actuel
let currentCategory = 'all';
let currentGridMode = 3;
let allVideosData = [];

// Nombre d'éléments à afficher par défaut
const ITEMS_PER_PAGE = 8;

// Mapping des catégories vers les URLs des pages "Voir plus"
const categoryUrls = {
  'all': 'flashinfo.html',
  'actualites': 'flashinfo.html',
  'sport': 'sport.html',
  'culture': 'culture.html',
  'divertissement': 'divertissement.html',
  'musique': 'musique.html',
  'documentaire': 'documentaire.html',
  'reportage': 'reportage.html',
  'archive': 'archive.html',
  'jtandmag': 'journal-magazine.html'
};

// Noms d'affichage des catégories
const categoryNames = {
  'all': 'Tous les contenus',
  'actualites': 'Actualités',
  'sport': 'Sport',
  'culture': 'Culture',
  'divertissement': 'Divertissement',
  'musique': 'Musique',
  'documentaire': 'Documentaire',
  'reportage': 'Reportage',
  'archive': 'Archive',
  'jtandmag': 'Journal et Magazine'
};

// ===== FONCTIONS DE THÈME =====
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  
  // Sauvegarder la préférence dans localStorage
  try {
    localStorage.setItem('bf1_theme', newTheme);
  } catch (err) {
    console.warn('Impossible de sauvegarder le thème:', err);
  }
  
  // Changer l'icône du bouton
  const themeBtn = document.querySelector('.theme-toggle i');
  if (themeBtn) {
    if (newTheme === 'dark') {
      themeBtn.className = 'bi bi-sun-fill';
    } else {
      themeBtn.className = 'bi bi-moon-fill';
    }
  }
}

function loadSavedTheme() {
  try {
    const savedTheme = localStorage.getItem('bf1_theme');
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      
      // Mettre à jour l'icône du bouton
      const themeBtn = document.querySelector('.theme-toggle i');
      if (themeBtn) {
        if (savedTheme === 'dark') {
          themeBtn.className = 'bi bi-sun-fill';
        } else {
          themeBtn.className = 'bi bi-moon-fill';
        }
      }
    }
  } catch (err) {
    console.warn('Impossible de charger le thème:', err);
  }
}
// ===== FIN FONCTIONS DE THÈME =====

// Fonction pour obtenir l'URL complète de l'image
function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-bf1tv.onrender.com${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
}

// Formater les nombres
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Formater la date
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

// Obtenir l'icône du canal
function getChannelIcon(channelName) {
  const icons = {
    'BF1 Info': 'bi-info-circle-fill',
    'BF1 Sport': 'bi-trophy-fill',
    'BF1 Culture': 'bi-palette-fill',
    'BF1 Divertissement': 'bi-emoji-smile-fill',
    'BF1 Musique': 'bi-music-note-fill',
    'BF1 Reportage': 'bi-camera-fill',
    'BF1 Archives': 'bi-archive-fill'
  };
  return icons[channelName] || 'bi-tv-fill';
}

// Rediriger vers la page de détail d'un élément
function redirectToDetail(item, category) {
  const id = item._id || item.id;
  let page = '';
  switch (category) {
    case 'sport':
      page = `detail-contenu.html?id=${id}&type=sport`;
      break;
    case 'culture':
      page = `detail-contenu.html?id=${id}&type=culture`;
      break;
    case 'divertissement':
      page = `detail-contenu.html?id=${id}&type=divertissement`;
      break;
    case 'musique':
      page = `detail-contenu.html?id=${id}&type=musique`;
      break;
    case 'reportage':
      page = `detail-contenu.html?id=${id}&type=reportage`;
      break;
    case 'archive':
      page = `detail-contenu.html?id=${id}&type=archive`;
      break;
    case 'jtandmag':
      page = `detail-contenu.html?id=${id}&type=jtandmag`;
      break;
    default:
      page = `news-detail.html?id=${id}`;
  }
  window.location.href = page;
}

// Charger toutes les données depuis l'API
async function loadAllData() {
  try {
    console.log('📡 Chargement des données depuis l\'API...');
    
    const [news, sports, categories, divertissement, reportages, archives, jtandmag] = await Promise.all([
      api.getNews(),
      api.getSports(),
      api.getCategories(),
      api.getDivertissement(),
      api.getReportages(),
      api.getArchive(),
      api.getJTandMag()
    ]);

    const allData = [];

    // Actualités
    (news || []).forEach(item => {
      allData.push({
        ...item,
        _contentType: 'news',
        channel: 'BF1 Info',
        category: 'actualites',
        views: formatNumber(item.views || 0),
        likes: formatNumber(item.likes || 0),
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        live: item.live || false,
        date: item.created_at || item.published_at
      });
    });

    // Sports
    const sportsList = (sports && sports.sports) ? sports.sports : (Array.isArray(sports) ? sports : []);
    sportsList.forEach(item => {
      allData.push({
        ...item,
        _contentType: 'sport',
        channel: 'BF1 Sport',
        category: 'sport',
        views: formatNumber(item.views || 0),
        likes: formatNumber(item.likes || 0),
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        live: item.live || false,
        date: item.created_at || item.published_at
      });
    });

    // Culture
    (categories || []).forEach(item => {
      allData.push({
        ...item,
        _contentType: 'culture',
        channel: 'BF1 Culture',
        category: 'culture',
        views: formatNumber(item.views || 0),
        likes: formatNumber(item.likes || 0),
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        live: false,
        date: item.created_at || item.published_at
      });
    });

    // Divertissement
    (divertissement || []).forEach(item => {
      allData.push({
        ...item,
        _contentType: 'divertissement',
        channel: 'BF1 Divertissement',
        category: 'divertissement',
        views: formatNumber(item.views || 0),
        likes: formatNumber(item.likes || 0),
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        live: false,
        date: item.created_at || item.published_at
      });
    });

    // Reportages
    (reportages || []).forEach(item => {
      allData.push({
        ...item,
        _contentType: 'reportage',
        channel: 'BF1 Reportage',
        category: 'reportage',
        views: formatNumber(item.views || 0),
        likes: formatNumber(item.likes || 0),
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        live: false,
        date: item.created_at || item.published_at
      });
    });

    // Archives
    (archives || []).forEach(item => {
      allData.push({
        ...item,
        _contentType: 'archive',
        channel: 'BF1 Archives',
        category: 'archive',
        views: formatNumber(item.views || 0),
        likes: formatNumber(item.likes || 0),
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        live: false,
        date: item.created_at || item.published_at
      });
    });

    // JT et Magazines
    (jtandmag || []).forEach(item => {
      allData.push({
        ...item,
        _contentType: 'jtandmag',
        channel: 'BF1 Info',
        category: 'jtandmag',
        views: formatNumber(item.views || 0),
        likes: formatNumber(item.likes || 0),
        image: getImageUrl(item.image_url || item.image || item.thumbnail),
        live: item.live || false,
        date: item.created_at || item.published_at
      });
    });

    // Trier par date (plus récent en premier)
    allData.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });

    allVideosData = allData;
    console.log(`✅ ${allData.length} contenus chargés`);
    console.log(`📅 Les ${ITEMS_PER_PAGE} derniers contenus:`, allData.slice(0, ITEMS_PER_PAGE).map(item => ({ title: item.title, date: item.date })));

    return allData;
  } catch (error) {
    console.error('❌ Erreur chargement des données:', error);
    return [];
  }
}

// Rendre les cartes vidéo
function renderVideos(category) {
  const container = document.getElementById('videosGrid');
  if (!container) return;

  let videos = [];
  
  if (category === 'all') {
    videos = allVideosData.slice(0, ITEMS_PER_PAGE);
  } else {
    const filtered = allVideosData.filter(v => v.category === category);
    videos = filtered.slice(0, ITEMS_PER_PAGE);
  }

  if (videos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5" style="grid-column: 1/-1;">
        <i class="bi bi-inbox" style="font-size: 3rem; color: var(--text-secondary);"></i>
        <p class="mt-3 text-secondary">Aucun contenu disponible dans cette catégorie</p>
      </div>
      <div class="text-center mt-4" style="grid-column: 1/-1;">
        <a href="${categoryUrls[category]}" class="btn btn-outline-danger">
          <i class="bi bi-arrow-right-circle-fill"></i>
          Voir plus dans ${categoryNames[category] || 'cette catégorie'}
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = videos.map((video, index) => `
    <div class="video-card anim-up d${(index % 8) + 1}" data-id="${video._id || video.id}" data-category="${video.category}">
      <div class="card-thumb">
        ${video.image ? `<img src="${video.image}" alt="${escapeHtml(video.title)}" loading="lazy"/>` : 
          `<div class="card-thumb-placeholder"><i class="bi bi-camera-video-fill"></i></div>`}
        <div class="card-badge">
          ${video.live ? '<span class="badge-live">LIVE</span>' : '<span class="badge-replay">REPLAY</span>'}
        </div>
        <div class="card-viewers">
          <i class="bi bi-eye-fill"></i> ${video.views}
        </div>
        <div class="card-overlay">
          <div class="card-play">
            <i class="bi bi-play-fill"></i>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-channel">
          <div class="channel-avatar">
            <i class="bi ${getChannelIcon(video.channel)}"></i>
          </div>
          <span class="channel-name">${escapeHtml(video.channel)}</span>
        </div>
        <div class="card-title">${escapeHtml(video.title)}</div>
        <div class="card-description">${escapeHtml((video.description || video.content || '').substring(0, 80))}${(video.description || video.content || '').length > 80 ? '...' : ''}</div>
        <div class="card-meta">
          <div class="card-stats">
            <span class="card-stat"><i class="bi bi-heart-fill" style="color:var(--red)"></i>${video.likes}</span>
            <span class="card-stat"><i class="bi bi-eye-fill"></i>${video.views}</span>
          </div>
          <span class="card-date"><i class="bi bi-calendar3"></i> ${formatDate(video.date)}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Ajouter le bouton "Voir plus" après les cartes
  const seeMoreHtml = `
    <div class="text-center mt-4" style="grid-column: 1/-1;">
      <a href="${categoryUrls[category] || 'flashinfo.html'}?category=${category === 'all' ? '' : category}" class="btn-see-more">
        <i class="bi bi-arrow-right-circle-fill"></i>
        Voir plus dans ${categoryNames[category] || 'cette catégorie'}
      </a>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', seeMoreHtml);

  // Ajouter les événements de clic sur les cartes
  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn')) return;
      const videoId = card.dataset.id;
      const category = card.dataset.category;
      const video = allVideosData.find(v => (v._id || v.id) === videoId);
      if (video) redirectToDetail(video, category);
    });
  });
}

// Changer la catégorie active
function setActiveCategory(category) {
  currentCategory = category;
  
  document.querySelectorAll('.filter-pill').forEach(pill => {
    if (pill.dataset.category === category) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
  
  renderVideos(category);
}

// Changer le mode d'affichage
function setGridMode(mode) {
  currentGridMode = mode;
  const grid = document.querySelector('.videos-grid');
  if (grid) {
    if (mode === 2) grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    else if (mode === 3) grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    else if (mode === 4) grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  }
  
  document.querySelectorAll('.display-btn').forEach(btn => {
    if (parseInt(btn.dataset.mode) === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
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
  console.log('🚀 Initialisation de la page accueil...');
  
  // Charger le thème sauvegardé
  loadSavedTheme();
  
  await loadAllData();
  
  // Ajouter les événements aux filtres
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const category = pill.dataset.category;
      if (category) setActiveCategory(category);
    });
  });
  
  // Ajouter les événements aux boutons d'affichage
  document.querySelectorAll('.display-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = parseInt(btn.dataset.mode);
      setGridMode(mode);
    });
  });
  
  setGridMode(3);
  renderVideos('all');
  
  console.log(`✅ Page accueil initialisée - Affichage des ${ITEMS_PER_PAGE} derniers contenus`);
}



// Rendre la fonction toggleTheme accessible globalement
window.toggleTheme = toggleTheme;

document.addEventListener('DOMContentLoaded', init);