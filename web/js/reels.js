import * as api from '../../shared/services/api.js';

let reelsData = [];
let currentIndex = 0;
let isLoading = false;
let observer = null;
let currentVideo = null;

export async function loadReelsContent() {
  const container = document.getElementById('reelsContainer');
  
  if (!container) {
    console.error('❌ Container non trouvé');
    return;
  }

  isLoading = true;
  container.innerHTML = `
    <div class="reels-loading">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="mt-3 text-secondary">Chargement des reels...</p>
    </div>
  `;

  try {
    console.log('📡 Appel API getReels()...');
    const response = await api.getReels();
    console.log('📦 Réponse API brute:', response);
    
    // Traiter les données
    let rawData = [];
    
    if (Array.isArray(response)) {
      rawData = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      rawData = response.data;
    } else if (response && response.items && Array.isArray(response.items)) {
      rawData = response.items;
    } else if (response && response.reels && Array.isArray(response.reels)) {
      rawData = response.reels;
    }
    
    // Mapper les données
    reelsData = rawData.map((item, index) => ({
      ...item,
      _id: item._id || item.id || index,
      title: item.title || item.name || 'Sans titre',
      description: item.description || item.content || '',
      video_url: getVideoUrl(item.video_url || item.url || ''),
      thumbnail: getImageUrl(item.thumbnail || item.image_url || item.image),
      views: item.views || item.view_count || 0,
      likes: item.likes || item.like_count || 0,
      duration: item.duration || item.length || '0:15',
      date: item.created_at || item.published_at || new Date(),
      author: item.author || item.created_by || 'BF1',
      avatar: item.avatar || '',
      tags: item.tags || []
    }));
    
    console.log(`✅ ${reelsData.length} reels chargés`);
    
    if (reelsData.length === 0) {
      container.innerHTML = `
        <div class="reels-empty">
          <i class="bi bi-camera-reels-fill"></i>
          <p>Aucun reel disponible pour le moment</p>
        </div>
      `;
      return;
    }
    
    // Créer le conteneur des reels
    container.innerHTML = '<div class="reels-stack" id="reelsStack"></div>';
    const stack = document.getElementById('reelsStack');
    
    // Ajouter les reels
    reelsData.forEach((reel, index) => {
      stack.appendChild(createReelElement(reel, index));
    });
    
    // Configurer l'observateur d'intersection pour la lecture automatique
    setupIntersectionObserver();
    
    // Démarrer le premier reel
    setTimeout(() => {
      const firstReel = document.querySelector('.reel-item');
      if (firstReel) {
        playVideoInReel(firstReel);
      }
    }, 500);
    
    // Ajouter l'écouteur d'événements pour le défilement
    setupScrollListener();

  } catch (error) {
    console.error('❌ Erreur chargement reels:', error);
    container.innerHTML = `
      <div class="reels-error">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <p>Erreur: ${error.message || 'Impossible de charger les reels'}</p>
        <button class="btn btn-outline-danger btn-sm mt-2" onclick="window.location.reload()">
          <i class="bi bi-arrow-clockwise"></i> Réessayer
        </button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

function getVideoUrl(videoPath) {
  if (!videoPath) return '';
  if (videoPath.startsWith('http')) return videoPath;
  return `https://backend-bf1tv.onrender.com${videoPath.startsWith('/') ? videoPath : '/' + videoPath}`;
}

function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-bf1tv.onrender.com${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
}

function createReelElement(reel, index) {
  const div = document.createElement('div');
  div.className = 'reel-item';
  div.setAttribute('data-index', index);
  div.setAttribute('data-id', reel._id);
  
  div.innerHTML = `
    <div class="reel-video-container">
      <video class="reel-video" loop muted playsinline preload="metadata">
        <source src="${reel.video_url}" type="video/mp4">
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
      <div class="reel-overlay">
        <div class="reel-info">
          <div class="reel-author">
            <div class="reel-avatar">
              <img src="${reel.avatar || '/logo.png'}" alt="${escapeHtml(reel.author)}" onerror="this.src='/logo.png'">
            </div>
            <div class="reel-author-name">${escapeHtml(reel.author)}</div>
            <button class="reel-follow-btn">Suivre</button>
          </div>
          <div class="reel-caption">
            <strong>${escapeHtml(reel.author)}</strong> ${escapeHtml(reel.description.substring(0, 100))}${reel.description.length > 100 ? '...' : ''}
          </div>
          <div class="reel-music">
            <i class="bi bi-music-note-beamed"></i> ${escapeHtml(reel.title)}
          </div>
        </div>
        <div class="reel-actions">
          <div class="reel-action like-btn" data-id="${reel._id}">
            <i class="bi bi-heart"></i>
            <span class="like-count">${formatNumber(reel.likes)}</span>
          </div>
          <div class="reel-action comment-btn">
            <i class="bi bi-chat"></i>
            <span>0</span>
          </div>
          <div class="reel-action share-btn">
            <i class="bi bi-share"></i>
            <span>Partager</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Ajouter l'écouteur de like
  const likeBtn = div.querySelector('.like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(likeBtn, reel._id);
    });
  }
  
  return div;
}

function setupIntersectionObserver() {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // La vidéo est visible, la jouer
        playVideoInReel(entry.target);
        // Mettre à jour l'index courant
        currentIndex = parseInt(entry.target.dataset.index);
      } else {
        // La vidéo n'est plus visible, la mettre en pause
        pauseVideoInReel(entry.target);
      }
    });
  }, {
    threshold: 0.6 // 60% de visibilité pour déclencher la lecture
  });
  
  document.querySelectorAll('.reel-item').forEach(reel => {
    observer.observe(reel);
  });
}

function setupScrollListener() {
  let isScrolling = false;
  
  window.addEventListener('scroll', () => {
    if (isScrolling) return;
    isScrolling = true;
    
    requestAnimationFrame(() => {
      isScrolling = false;
    });
  });
}

function playVideoInReel(reelElement) {
  const video = reelElement.querySelector('.reel-video');
  if (video && video.paused) {
    // Arrêter toutes les autres vidéos
    document.querySelectorAll('.reel-video').forEach(v => {
      if (v !== video && !v.paused) {
        v.pause();
      }
    });
    
    // Lire la vidéo courante
    video.play().catch(e => console.log('Lecture automatique bloquée:', e));
    currentVideo = video;
  }
}

function pauseVideoInReel(reelElement) {
  const video = reelElement.querySelector('.reel-video');
  if (video && !video.paused) {
    video.pause();
  }
}

async function toggleLike(btn, reelId) {
  const icon = btn.querySelector('i');
  const countSpan = btn.querySelector('.like-count');
  let currentCount = parseInt(countSpan.textContent) || 0;
  
  if (icon.classList.contains('bi-heart')) {
    icon.classList.remove('bi-heart');
    icon.classList.add('bi-heart-fill');
    icon.style.color = 'var(--red)';
    countSpan.textContent = formatNumber(currentCount + 1);
    
    // Appel API pour liker (optionnel)
    try {
      await api.toggleLike('reel', reelId);
    } catch (error) {
      console.error('Erreur like:', error);
    }
  } else {
    icon.classList.remove('bi-heart-fill');
    icon.classList.add('bi-heart');
    icon.style.color = '';
    countSpan.textContent = formatNumber(Math.max(0, currentCount - 1));
    
    // Appel API pour unliker (optionnel)
    try {
      await api.toggleLike('reel', reelId);
    } catch (error) {
      console.error('Erreur unlike:', error);
    }
  }
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatTime(dateString) {
  if (!dateString) return 'À l\'instant';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return 'Récemment';
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

document.addEventListener('DOMContentLoaded', () => {
  loadReelsContent();
});

window.loadReelsContent = loadReelsContent;