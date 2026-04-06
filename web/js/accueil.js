// js/accueil.js
import * as api from '../../shared/services/api.js';
import { slugify, getNewsDetailUrl, getContentDetailUrl } from '/js/slugUtils.js';

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

// Normaliser un tableau d'items vers le format d'affichage uniforme
function normalizeItems(items, contentType, channel, category) {
  return (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    _contentType: contentType,
    channel,
    category,
    views: formatNumber(item.views || 0),
    likes: formatNumber(item.likes || 0),
    image: getImageUrl(item.image_url || item.image || item.thumbnail),
    live: item.live || false,
    date: item.created_at || item.published_at
  }));
}

// Phase 1 : charger les actualités (affichées immédiatement)
// Limite faible : on n'affiche que 8 cartes sur l'accueil
async function loadPhase1() {
  const newsRes = await api.getNews(0, 20).catch(() => ({}));
  const news = newsRes.items || (Array.isArray(newsRes) ? newsRes : []);
  const normalized = normalizeItems(news, 'news', 'BF1 Info', 'actualites');
  normalized.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  allVideosData = normalized;
  renderVideos(currentCategory);
}

// Phase 2 : charger le reste en arrière-plan et mettre à jour silencieusement
// Limite modérée : assez pour alimenter les cartes catégories + filtre, sans surcharger
async function loadPhase2() {
  const [sportsRes, divertissementRes, reportagesRes, archivesRes, jtandmagRes] = await Promise.all([
    api.getSports(0, 30).catch(() => ({})),
    api.getDivertissement(0, 30).catch(() => ({})),
    api.getReportages(0, 30).catch(() => ({})),
    api.getArchive(0, 30).catch(() => ({})),
    api.getJTandMag(0, 30).catch(() => ({})),
  ]);

  const extract = (res) => res?.items || res?.sports || (Array.isArray(res) ? res : []);

  const extra = [
    ...normalizeItems(extract(sportsRes), 'sport', 'BF1 Sport', 'sport'),
    ...normalizeItems(extract(divertissementRes), 'divertissement', 'BF1 Divertissement', 'divertissement'),
    ...normalizeItems(extract(reportagesRes), 'reportage', 'BF1 Reportage', 'reportage'),
    ...normalizeItems(extract(archivesRes), 'archive', 'BF1 Archives', 'archive'),
    ...normalizeItems(extract(jtandmagRes), 'jtandmag', 'BF1 Info', 'jtandmag'),
  ];

  allVideosData = [...allVideosData, ...extra];
  allVideosData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Mettre à jour la grille et les cartes catégories discrètement
  renderVideos(currentCategory);
  updateCategoryCards();
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
  
  const track = document.getElementById('track-categories');
  
  if (!track) {
    return;
  }

  const cards = track.querySelectorAll('.bpc');

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
    
    if (!cards[idx]) {
      return;
    }

    // Trouver le premier item de cette catégorie
    const item = allVideosData.find(v => v.category === cat.name);
    
    if (!item) {
      return;
    }

    const title = item.title || item.name || 'Sans titre';
    const imageUrl = item.image || 'https://via.placeholder.com/260x390';
    const views = item.views || Math.floor(Math.random() * 200000);


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
  
}

// ==================== CAROUSEL HERO (jusqu'à 24 images - AUTO SCROLL) ====================
let carouselImages = [];
let carouselCurrentIndex = 0;
let carouselAutoScrollInterval = null;
const CAROUSEL_AUTO_SCROLL_INTERVAL = 5000; // 5 secondes

async function fetchCarouselImages() {
  try {

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
        return images.slice(0, 24);
      }
    } catch (err) {
    }

    // Fallback: utiliser les contenus déjà chargés
    if (typeof allVideosData !== 'undefined' && allVideosData.length > 0) {
      const images = allVideosData.slice(0, 24).map(item => ({
        image_url: item.image || 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80',
        title: item.title || '',
        description: item.description || item.content || '',
        views: item.views
      }));
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
    return;
  }
  
  if (carouselImages.length === 0) {
    return;
  }
  
  
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
  
}

function startAutoScroll() {
  if (carouselAutoScrollInterval) {
    clearInterval(carouselAutoScrollInterval);
  }
  
  carouselAutoScrollInterval = setInterval(() => {
    slideCarousel(1);
  }, CAROUSEL_AUTO_SCROLL_INTERVAL);
  
}

function stopAutoScroll() {
  if (carouselAutoScrollInterval) {
    clearInterval(carouselAutoScrollInterval);
    carouselAutoScrollInterval = null;
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
  return 'https://bf1.fly.dev/api/v1/livestream/stream-proxy';
}

/**
 * Initialise le lecteur vidéo HLS dans le hero-preview
 */
async function setupLiveVideoPlayer() {
  const previewThumb = document.querySelector('.hero-preview-thumb');
  
  if (!previewThumb) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const retryThumb = document.querySelector('.hero-preview-thumb');
    if (!retryThumb) {
      console.error('❌ IMPOSSIBLE de trouver .hero-preview-thumb après retry');
      return;
    }
    return setupLiveVideoPlayer(); // Relancer avec le bon élément
  }
  
  try {
    // Récupérer l'URL du flux HLS
    const hlsUrl = await fetchLiveStreamUrl();
    if (!hlsUrl) {
      return;
    }
    
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
    
    
    // Insérer la vidéo AU DÉBUT du preview-thumb (avant le play-pulse)
    previewThumb.insertBefore(videoElement, previewThumb.firstChild);
    
    // Ajouter position: relative au preview-thumb si nécessaire
    if (getComputedStyle(previewThumb).position === 'static') {
      previewThumb.style.position = 'relative';
    }
    
    // Stocker l'URL dans sessionStorage pour direct.html
    sessionStorage.setItem('liveStreamUrl', hlsUrl);
    
    // Initialiser le lecteur HLS
    
    if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Support natif HLS (Safari, etc.)
      videoElement.src = hlsUrl;
    } 
    else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      // Utiliser HLS.js pour les navigateurs Chromium
      const hls = new Hls({ enableWorker: true, autoStartLoad: true, debug: true });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ Erreur HLS:', data);
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
      });
    } 
    else {
      // Fallback: Aucun support HLS - enlever la vidéo et garder le play-pulse
      videoElement.remove();
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
  
  // Sélectionner tous les boutons de navigation
  const navButtons = document.querySelectorAll('.brs-nav');
  
  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const trackAttribute = button.getAttribute('data-track');
      const track = document.getElementById(trackAttribute);
      
      if (!track) {
        return;
      }
      
      const isNextButton = button.classList.contains('brs-nav-next');
      const scrollAmount = 300; // Largeur d'une carte (260px) + gap (24px) + buffer
      
      if (isNextButton) {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    });
  });
  
}

// ==================== FIN NAVIGATION CATÉGORIES ====================

// Initialisation
async function init() {
  // Ajouter les événements aux filtres et boutons d'affichage
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const category = pill.dataset.category;
      if (category) setActiveCategory(category);
    });
  });
  document.querySelectorAll('.display-btn').forEach(btn => {
    btn.addEventListener('click', () => setGridMode(parseInt(btn.dataset.mode)));
  });
  setupCategoryNavigation();
  setGridMode(3);

  // Phase 1 : news + carousel + live en parallèle → affichage immédiat
  const [carouselData] = await Promise.all([
    fetchCarouselImages(),
    loadPhase1(),
    setupLiveVideoPlayer(),
  ]);
  carouselImages = carouselData;
  initHeroCarousel();

  // Phase 2 : reste des contenus en arrière-plan
  loadPhase2();
}



// Rendre la fonction toggleTheme accessible globalement
// toggleTheme exposé par theme.js


// Vérifier si le DOM est déjà chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}