// js/accueil.js
import * as api from '../../shared/services/api.js';
import { slugify, getNewsDetailUrl, getContentDetailUrl } from '/shared/utils/slug-utils.js';

// État actuel
let currentCategory = 'all';
let currentGridMode = 3;
let allVideosData = [];

// Nombre d'éléments à afficher par défaut
const ITEMS_PER_PAGE = 8;

// Mapping des catégories vers les URLs des pages "Voir plus"
const categoryUrls = {
  'all': 'emissions.html',
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

// Thème géré par theme.js (auto-init)

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
  const title = item.title || '';
  let page = '';
  switch (category) {
    case 'sport':
      page = `detail-contenu.html?slug=${slugify(title)}&type=sport` || `detail-contenu.html?id=${id}&type=sport`;
      break;
    case 'culture':
      page = `detail-contenu.html?slug=${slugify(title)}&type=culture` || `detail-contenu.html?id=${id}&type=culture`;
      break;
    case 'divertissement':
      page = `detail-contenu.html?slug=${slugify(title)}&type=divertissement` || `detail-contenu.html?id=${id}&type=divertissement`;
      break;
    case 'musique':
      page = `detail-contenu.html?slug=${slugify(title)}&type=musique` || `detail-contenu.html?id=${id}&type=musique`;
      break;
    case 'reportage':
      page = `detail-contenu.html?slug=${slugify(title)}&type=reportage` || `detail-contenu.html?id=${id}&type=reportage`;
      break;
    case 'archive':
      page = `detail-contenu.html?slug=${slugify(title)}&type=archive` || `detail-contenu.html?id=${id}&type=archive`;
      break;
    case 'jtandmag':
      page = `detail-contenu.html?slug=${slugify(title)}&type=jtandmag` || `detail-contenu.html?id=${id}&type=jtandmag`;
      break;
    default:
      page = getNewsDetailUrl(title, id);
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

/**
 * Mettre à jour les 6 cartes de catégories avec les vraies données
 */
function updateCategoryCards() {
  console.log('🎬 updateCategoryCards() appelée');
  console.log('📊 allVideosData length:', allVideosData.length);
  
  const track = document.getElementById('track-categories');
  console.log('🔍 track-categories trouvé?', !!track);
  
  if (!track) {
    console.warn('⚠️ Track-categories non trouvé');
    return;
  }

  const cards = track.querySelectorAll('.bpc');
  console.log('📇 Nombre de cartes trouvées:', cards.length);

  // Mapping: carte → catégorie → premiere donnée
  const categories = [
    { name: 'sport', link: 'sport.html', title: 'SPORT', accent: 'FOOTBALL' },
    { name: 'divertissement', link: 'divertissement.html', title: 'DIVERTISSEMENT', accent: 'SPECTACLE' },
    { name: 'reportage', link: 'reportage.html', title: 'REPORTAGE', accent: 'DÉCOUVERTE' },
    { name: 'archive', link: 'archive.html', title: 'ARCHIVE', accent: 'HISTOIRE' },
    { name: 'jtandmag', link: 'journal-magazine.html', title: 'JOURNAL', accent: 'MAGAZINE' },
    { name: 'actualites', link: 'flashinfo.html', title: 'FLASHINFO', accent: 'EN DIRECT' }
  ];

  categories.forEach((cat, idx) => {
    console.log(`\n🔄 Traitement catégorie ${idx}: ${cat.name}`);
    
    if (!cards[idx]) {
      console.warn(`⚠️ Pas de carte à l'index ${idx}`);
      return;
    }

    // Trouver le premier item de cette catégorie
    const item = allVideosData.find(v => v.category === cat.name);
    console.log(`🔎 Item trouvé pour ${cat.name}?`, !!item);
    
    if (!item) {
      console.warn(`⚠️ Pas d'item trouvé pour ${cat.name}`);
      return;
    }

    const title = item.title || item.name || 'Sans titre';
    const imageUrl = item.image || 'https://via.placeholder.com/260x390';
    const views = item.views || Math.floor(Math.random() * 200000);

    console.log(`✅ Mise à jour carte ${idx}: "${title}"`);

    // Remplacer le contenu de la carte
    cards[idx].innerHTML = `
      <div class="bp-thumb bp-thumb--category" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center; cursor: pointer;" onclick="window.location.href='${cat.link}';">
        <img src="${imageUrl}" alt="${title}" style="display:none;"/>
        <div class="bp-gradient"></div>
        <div class="bp-label-overlay">
          <span class="bp-label-title">${cat.title}</span>
          <span class="bp-label-accent">${cat.accent}</span>
        </div>
        <div class="bp-hover-veil">
          <div class="bp-hover-content">
            <div class="bp-hover-title">${escapeHtml(title)}</div>
            <div class="bp-hover-meta">
              ${cat.accent.toLowerCase()}
              <span class="mx-2">·</span>
              ${typeof views === 'string' ? views : formatNumber(views)} vues
            </div>
            <div class="bp-hover-desc">${item.description || item.desc || 'Découvrez ce contenu exclusif sur BF1 TV.'}</div>
            <button class="bp-hover-btn">
              Voir plus
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  console.log('✅ updateCategoryCards() terminée');
}

// ==================== CAROUSEL HERO (jusqu'à 24 images - AUTO SCROLL) ====================
let carouselImages = [];
let carouselCurrentIndex = 0;
let carouselAutoScrollInterval = null;
const CAROUSEL_AUTO_SCROLL_INTERVAL = 5000; // 5 secondes

async function fetchCarouselImages() {
  try {
    console.log('📸 Récupération des images du carousel...');

    // Utiliser le service partagé api.getCarousel() → GET /api/v1/carousel
    try {
      const data = await api.getCarousel();
      let images = Array.isArray(data) ? data : [];
      // Filtrer actifs, trier par order, fallback image si manquante
      images = images
        .filter(img => img && img.is_active !== false && (img.image_url || img.image || img.thumbnail))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(img => ({
          ...img,
          image_url: img.image_url || img.image || img.thumbnail || 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80',
          title: img.title || '',
          description: img.description || '',
        }));
      if (images.length > 0) {
        console.log(`✅ Carousel API: ${images.length} slides`);
        return images.slice(0, 24);
      }
    } catch (err) {
      console.log('⚠️ Carousel API non disponible, utilisation des données alternatives');
    }

    // Fallback: utiliser les contenus déjà chargés
    if (typeof allVideosData !== 'undefined' && allVideosData.length > 0) {
      const images = allVideosData.slice(0, 24).map(item => ({
        image_url: item.image || 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80',
        title: item.title || '',
        description: item.description || item.content || '',
        views: item.views
      }));
      console.log(`✅ Fallback: ${images.length} images depuis contenu`);
      return images;
    }

    // Fallback ultime : 1 slide par défaut
    return [{
      image_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80',
      title: 'Bienvenue sur BF1 TV',
      description: 'Profitez de la TV, des émissions et du direct !',
    }];
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du carousel:', error);
    return [{
      image_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80',
      title: 'Erreur de chargement',
      description: 'Impossible de charger le carrousel.',
    }];
  }
}

function initHeroCarousel() {
  const container = document.getElementById('heroCarousel');
  const dotsContainer = document.getElementById('heroCarouselDots');
  const prevBtn = document.getElementById('heroCarouselPrev');
  const nextBtn = document.getElementById('heroCarouselNext');
  
  if (!container) {
    console.log('⚠️ Container carousel non trouvé');
    return;
  }
  
  if (carouselImages.length === 0) {
    console.log('ℹ️ Pas d\'images pour le carousel');
    return;
  }
  
  console.log(`🎬 Initialisation du carousel avec ${carouselImages.length} images (AUTO-SCROLL 5s)`);
  
  // Remplir le container avec les slides (style RTI Play)
  container.innerHTML = '';
  carouselImages.forEach((img, index) => {
    const imageUrl = getImageUrl(img.image_url || img.image || img.thumbnail);
    const title = img.title || '';
    const description = img.description || '';
    const div = document.createElement('div');
    div.className = `hero-carousel-item ${index === 0 ? 'active' : ''}`;
    div.style.backgroundImage = `url('${imageUrl}')`;
    div.innerHTML = `
      <div class="hero-slide-overlay">
        <div class="hero-slide-content">
          <div class="hero-slide-badge">
            <img src="../logo.png" alt="BF1 TV" class="hero-slide-logo" onerror="this.style.display='none'">
          </div>
          ${title ? `<h2 class="hero-slide-title">${title}</h2>` : ''}
          ${description ? `<p class="hero-slide-desc">${description}</p>` : ''}
        </div>
      </div>
    `;
    container.appendChild(div);
  });
  
  // Créer les points de pagination
  dotsContainer.innerHTML = '';
  carouselImages.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = `hero-carousel-dot ${index === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Diapositif ${index + 1}`);
    dot.addEventListener('click', () => {
      stopAutoScroll();
      scrollCarouselTo(index);
      startAutoScroll();
    });
    dotsContainer.appendChild(dot);
  });
  
  // Événements: Prev/Next (arrête l'auto-scroll temporairement)
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      stopAutoScroll();
      slideCarousel(-1);
      startAutoScroll();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      stopAutoScroll();
      slideCarousel(1);
      startAutoScroll();
    });
  }
  
  // Sync active dot/item on native scroll (swipe or momentum)
  container.addEventListener('scroll', () => {
    const itemWidth = container.clientWidth;
    if (!itemWidth) return;
    const idx = Math.round(container.scrollLeft / itemWidth);
    if (idx !== carouselCurrentIndex) {
      updateCarouselUI(idx);
    }
  }, { passive: true });

  // Support du swipe sur mobile (arrête l'auto-scroll pendant le swipe)
  setupCarouselSwipe(container);
  
  // Démarrer l'auto-scroll
  startAutoScroll();
  
  console.log('✅ Carousel initialisé avec auto-scroll');
}

function startAutoScroll() {
  if (carouselAutoScrollInterval) {
    clearInterval(carouselAutoScrollInterval);
  }
  
  carouselAutoScrollInterval = setInterval(() => {
    slideCarousel(1);
  }, CAROUSEL_AUTO_SCROLL_INTERVAL);
  
  console.log('▶️ Auto-scroll démarré (5s)');
}

function stopAutoScroll() {
  if (carouselAutoScrollInterval) {
    clearInterval(carouselAutoScrollInterval);
    carouselAutoScrollInterval = null;
    console.log('⏸️ Auto-scroll arrêté');
  }
}

function slideCarousel(direction) {
  const container = document.getElementById('heroCarousel');
  if (!container) return;
  
  const itemWidth = container.children[0]?.offsetWidth || 0;
  if (itemWidth === 0) return;
  
  // Calculer l'index suivant
  let nextIndex = carouselCurrentIndex + direction;
  
  // Boucler aux extrémités
  if (nextIndex >= carouselImages.length) {
    nextIndex = 0;
  } else if (nextIndex < 0) {
    nextIndex = carouselImages.length - 1;
  }
  
  scrollCarouselTo(nextIndex);
}

function scrollCarouselTo(index) {
  const container = document.getElementById('heroCarousel');
  if (!container || index < 0 || index >= carouselImages.length) return;
  
  const itemWidth = container.clientWidth;
  container.scrollTo({ left: index * itemWidth, behavior: 'smooth' });
  updateCarouselUI(index);
}

function updateCarouselUI(index) {
  if (index < 0 || index >= carouselImages.length) return;
  
  carouselCurrentIndex = index;
  
  // Mettre à jour les items actifs
  const container = document.getElementById('heroCarousel');
  if (container) {
    container.querySelectorAll('.hero-carousel-item').forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
  }
  
  // Mettre à jour les dots
  const dotsContainer = document.getElementById('heroCarouselDots');
  if (dotsContainer) {
    dotsContainer.querySelectorAll('.hero-carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }
}

function setupCarouselSwipe(container) {
  let touchStartX = 0;
  let touchEndX = 0;
  
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        slideCarousel(1); // Swipe left → suivant
      } else {
        slideCarousel(-1); // Swipe right → précédent
      }
    }
  }
}

// ==================== FIN CAROUSEL ====================

// ==================== HLS VIDEO PLAYER ====================

/**
 * Récupère l'URL du flux HLS depuis l'API
 */
async function fetchLiveStreamUrl() {
  // Tenter via l'API protégée (JWT) — URL jamais dans le code source
  try {
    const url = await api.getLiveStreamUrl();
    if (url) return url;
  } catch {
    // Utilisateur non connecté ou endpoint indisponible
  }

  // Fallback : endpoints legacy
  const endpoints = [
    'https://backend-bf1tv.onrender.com/api/live',
    'https://backend-bf1tv.onrender.com/api/stream',
    'https://backend-bf1tv.onrender.com/api/programs/live'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        const url = data.stream_url || data.hls_url || data.url || data.video_url;
        if (url && url !== '[protégé]') {
          console.log(`✅ URL HLS trouvée via: ${endpoint}`);
          return url;
        }
      }
    } catch (err) {
      console.log(`⚠️ Endpoint non disponible: ${endpoint}`);
    }
  }

  console.log('⚠️ Flux non disponible pour les utilisateurs non connectés');
  return null;
}

/**
 * Initialise le lecteur vidéo HLS dans le hero-preview
 */
async function setupLiveVideoPlayer() {
  console.log('🔍 Recherche de .hero-preview-thumb...');
  const previewThumb = document.querySelector('.hero-preview-thumb');
  console.log('🔍 previewThumb trouvé?', !!previewThumb);
  
  if (!previewThumb) {
    console.warn('⚠️ hero-preview-thumb non trouvé - Attente 500ms et nouvelle tentative');
    await new Promise(resolve => setTimeout(resolve, 500));
    const retryThumb = document.querySelector('.hero-preview-thumb');
    if (!retryThumb) {
      console.error('❌ IMPOSSIBLE de trouver .hero-preview-thumb après retry');
      return;
    }
    console.log('✅ .hero-preview-thumb trouvé au retry');
    return setupLiveVideoPlayer(); // Relancer avec le bon élément
  }
  
  try {
    // Récupérer l'URL du flux HLS
    console.log('🌐 Récupération de l\'URL du flux HLS...');
    const hlsUrl = await fetchLiveStreamUrl();
    if (!hlsUrl) {
      console.log('ℹ️ Flux non disponible (utilisateur non connecté)');
      return;
    }
    console.log('✅ URL HLS reçue:', hlsUrl.substring(0, 50) + '...');
    console.log('📺 Configuration du lecteur vidéo en direct');
    
    // Créer l'élément vidéo DIRECTEMENT (pas de container wrapper)
    const videoElement = document.createElement('video');
    videoElement.id = 'heroLiveVideo';
    videoElement.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      z-index: 5;
      background: #000;
    `;
    videoElement.setAttribute('controls', 'true');
    videoElement.setAttribute('autoplay', 'true');
    videoElement.setAttribute('playsinline', 'true');
    videoElement.muted = true;
    
    console.log('🔨 Élément vidéo créé:', videoElement);
    
    // Insérer la vidéo AU DÉBUT du preview-thumb (avant le play-pulse)
    previewThumb.insertBefore(videoElement, previewThumb.firstChild);
    console.log('✅ Vidéo injectée dans le DOM');
    console.log('📐 Taille du preview:', previewThumb.offsetWidth, 'x', previewThumb.offsetHeight);
    
    // Ajouter position: relative au preview-thumb si nécessaire
    if (getComputedStyle(previewThumb).position === 'static') {
      previewThumb.style.position = 'relative';
      console.log('🔧 Position relative appliquée au preview-thumb');
    }
    
    // Stocker l'URL dans sessionStorage pour direct.html
    sessionStorage.setItem('liveStreamUrl', hlsUrl);
    
    // Initialiser le lecteur HLS
    console.log('🎬 Vérification du support HLS...');
    console.log('📊 canPlayType HLS natif?', videoElement.canPlayType('application/vnd.apple.mpegurl'));
    console.log('📊 Hls disponible?', typeof Hls !== 'undefined');
    console.log('📊 Hls.isSupported()?', typeof Hls !== 'undefined' ? Hls.isSupported() : 'N/A');
    
    if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Support natif HLS (Safari, etc.)
      console.log('🔧 Utilisation du lecteur HLS NATIF');
      videoElement.src = hlsUrl;
      videoElement.play().catch(e => console.log('⚠️ Auto-play bloqué:', e));
      console.log('✅ Lecteur HLS natif utilisé');
    } 
    else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      // Utiliser HLS.js pour les navigateurs Chromium
      console.log('🔧 Utilisation de HLS.js');
      const hls = new Hls({ enableWorker: true, autoStartLoad: true, debug: true });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ Erreur HLS:', data);
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ Manifest HLS parsé, démarrage de la lecture');
        videoElement.play().catch(e => console.log('⚠️ Auto-play bloqué:', e));
      });
      console.log('✅ Lecteur HLS.js utilisé');
    } 
    else {
      // Fallback: Aucun support HLS - enlever la vidéo et garder le play-pulse
      console.warn('❌ Aucun support HLS détecté');
      videoElement.remove();
      console.warn('❌ Aucun lecteur HLS disponible');
    }
    
  } catch (error) {
    console.error('❌ Erreur installation lecteur vidéo:', error);
    // Le play-pulse reste visible par défaut
  }
}

// ==================== FIN HLS VIDEO PLAYER ====================

// ==================== NAVIGATION CATÉGORIES ====================

/**
 * Configure la navigation des boutons précédent/suivant pour les catégories
 */
function setupCategoryNavigation() {
  console.log('🔧 Configuration de la navigation des catégories');
  
  // Sélectionner tous les boutons de navigation
  const navButtons = document.querySelectorAll('.brs-nav');
  
  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const trackAttribute = button.getAttribute('data-track');
      const track = document.getElementById(trackAttribute);
      
      if (!track) {
        console.warn(`⚠️ Track non trouvée: ${trackAttribute}`);
        return;
      }
      
      const isNextButton = button.classList.contains('brs-nav-next');
      const scrollAmount = 300; // Largeur d'une carte (260px) + gap (24px) + buffer
      
      if (isNextButton) {
        console.log('➡️ Scroll suivant');
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        console.log('⬅️ Scroll précédent');
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    });
  });
  
  console.log('✅ Navigation des catégories configurée');
}

// ==================== FIN NAVIGATION CATÉGORIES ====================

// Initialisation
async function init() {
  console.log('🚀 Initialisation de la page accueil - START');
  console.log('📄 document.readyState:', document.readyState);
  
  // Petit délai pour s'assurer que le DOM est bien chargé
  console.log('⏳ Attente de 100ms pour stabiliser le DOM...');
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Initialiser le lecteur vidéo HLS pour le preview en direct
  console.log('📺 Initialisation du lecteur vidéo en direct...');
  await setupLiveVideoPlayer();
  console.log('✅ Lecteur vidéo prêt');
  
  console.log('📡 Appel loadAllData()...');
  await loadAllData();
  console.log('✅ LoadAllData() terminé');
  
  // Petit délai pour laisser les données se mettre en place
  setTimeout(async () => {
    console.log('🎬 MAINTENANT on appelle updateCategoryCards()');
    console.log('allVideosData.length:', allVideosData.length);
    updateCategoryCards();
    console.log('✅ updateCategoryCards() TERMINÉE');
    
    // Initialiser le carousel
    console.log('📸 Initialisation du carousel...');
    carouselImages = await fetchCarouselImages();
    initHeroCarousel();
    console.log('✅ Carousel prêt');
    
    // Configurer la navigation des catégories
    setupCategoryNavigation();
  }, 100);
  
  // Ajouter les événements aux filtres
  console.log('🔘 Setup des filter pills...');
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
// toggleTheme exposé par theme.js

console.log('🔧 accueil.js chargé');

// Vérifier si le DOM est déjà chargé
if (document.readyState === 'loading') {
  console.log('⏳ DOM pas encore chargé, attente...');
  document.addEventListener('DOMContentLoaded', init);
} else {
  console.log('✅ DOM déjà chargé, appel direct init()');
  init();
}