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
        // Charger les commentaires du premier reel
        const firstReelId = firstReel.dataset.id;
        if (firstReelId) {
          loadComments(firstReelId);
        }
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
      
      <!-- Section commentaires à gauche (desktop) -->
      <div class="reel-comments-section" id="comments-${reel._id}">
        <div class="reel-comments-header">
          <span>Commentaires</span>
          <span class="comment-count">${formatNumber(reel.comments || 0)}</span>
        </div>
        <div class="reel-comments-list" id="comments-list-${reel._id}">
          <!-- Les commentaires seront chargés ici -->
        </div>
        <div class="reel-comment-input-wrapper">
          <input type="text" class="reel-comment-input" placeholder="Ajouter un commentaire..." 
                 id="comment-input-${reel._id}" maxlength="200">
          <button class="reel-comment-send" onclick="submitComment('${reel._id}')">
            <i class="bi bi-send-fill"></i>
          </button>
        </div>
      </div>
      
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
          <div class="reel-action comment-btn" data-id="${reel._id}">
            <i class="bi bi-chat"></i>
            <span class="comment-count">${formatNumber(reel.comments || 0)}</span>
          </div>
          <div class="reel-action share-btn" data-id="${reel._id}" data-title="${escapeHtml(reel.title)}">
            <i class="bi bi-share"></i>
            <span>Partager</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Ajouter les écouteurs d'événements
  const likeBtn = div.querySelector('.like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(likeBtn, reel._id);
    });
  }
  
  const commentBtn = div.querySelector('.comment-btn');
  if (commentBtn) {
    commentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openComments(reel._id);
    });
  }
  
  const shareBtn = div.querySelector('.share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      shareReel(reel._id, reel.title);
    });
  }
  
  // Écouteur pour l'input de commentaire
  const commentInput = div.querySelector('.reel-comment-input');
  if (commentInput) {
    commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitComment(reel._id);
      }
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
  let startY = 0;
  let endY = 0;
  
  // Navigation desktop avec clavier
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateToReel(currentIndex - 1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      navigateToReel(currentIndex + 1);
    } else if (e.key === ' ') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFullscreen();
    }
  });
  
  // Navigation mobile avec swipe
  const stack = document.getElementById('reelsStack');
  if (stack) {
    stack.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    stack.addEventListener('touchend', (e) => {
      endY = e.changedTouches[0].clientY;
      const diff = startY - endY;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          navigateToReel(currentIndex + 1);
        } else {
          navigateToReel(currentIndex - 1);
        }
      }
    }, { passive: true });
  }
  
  // Navigation desktop avec scroll wheel
  window.addEventListener('wheel', (e) => {
    if (isScrolling) return;
    isScrolling = true;
    
    if (e.deltaY > 0) {
      navigateToReel(currentIndex + 1);
    } else {
      navigateToReel(currentIndex - 1);
    }
    
    setTimeout(() => {
      isScrolling = false;
    }, 100);
  }, { passive: true });
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

// Navigation TikTok Web
function navigateToReel(index) {
  if (index < 0 || index >= reelsData.length) return;
  
  const reels = document.querySelectorAll('.reel-item');
  const targetReel = reels[index];
  
  if (targetReel) {
    // Mettre à jour les classes pour les animations desktop
    reels.forEach((reel, i) => {
      reel.classList.remove('active', 'prev', 'next');
      if (i === index) {
        reel.classList.add('active');
      } else if (i < index) {
        reel.classList.add('prev');
      } else {
        reel.classList.add('next');
      }
    });
    
    // Scroll vers le reel cible
    targetReel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Mettre à jour l'index
    currentIndex = index;
    
    // Démarrer la vidéo
    setTimeout(() => {
      playVideoInReel(targetReel);
    }, 300);
  }
}

function togglePlayPause() {
  if (currentVideo) {
    if (currentVideo.paused) {
      currentVideo.play();
      currentVideo.parentElement.classList.remove('paused');
    } else {
      currentVideo.pause();
      currentVideo.parentElement.classList.add('paused');
    }
  }
}

function toggleFullscreen() {
  const container = document.getElementById('reelsContainer');
  if (!document.fullscreenElement) {
    container.requestFullscreen().then(() => {
      container.classList.add('reels-fullscreen');
    });
  } else {
    document.exitFullscreen().then(() => {
      container.classList.remove('reels-fullscreen');
    });
  }
}

// Ajouter la navigation avec les boutons fléchés pour desktop
function addDesktopNavigation() {
  const container = document.getElementById('reelsContainer');
  if (!container) return;
  
  // Créer les boutons de navigation
  const navHTML = `
    <div class="reels-nav">
      <button class="reel-nav-btn" onclick="navigateToReel(currentIndex - 1)">
        <i class="bi bi-chevron-up"></i>
      </button>
      <button class="reel-nav-btn" onclick="navigateToReel(currentIndex + 1)">
        <i class="bi bi-chevron-down"></i>
      </button>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', navHTML);
}

// Ajouter les indicateurs de progression
function addProgressIndicators() {
  const reels = document.querySelectorAll('.reel-item');
  reels.forEach((reel, index) => {
    const progressHTML = `
      <div class="reel-progress">
        <div class="reel-progress-bar" id="progress-${index}"></div>
      </div>
    `;
    reel.insertAdjacentHTML('afterbegin', progressHTML);
  });
}

// Mettre à jour la barre de progression
function updateProgress() {
  if (currentVideo && currentVideo.duration) {
    const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
    const progressBar = document.getElementById(`progress-${currentIndex}`);
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }
}

// Animation de like améliorée
function animateLike(btn) {
  btn.classList.add('liking');
  setTimeout(() => {
    btn.classList.remove('liking');
  }, 600);
}

document.addEventListener('DOMContentLoaded', () => {
  loadReelsContent();
  
  // Ajouter la navigation desktop après le chargement
  setTimeout(() => {
    addDesktopNavigation();
    addProgressIndicators();
    
    // Mettre à jour la progression toutes les 100ms
    setInterval(updateProgress, 100);
  }, 1000);
});

window.loadReelsContent = loadReelsContent;
window.navigateToReel = navigateToReel;
window.togglePlayPause = togglePlayPause;
window.toggleFullscreen = toggleFullscreen;

// Fonctions de commentaires et partage inspirées du mobile
async function submitComment(reelId) {
  const input = document.getElementById(`comment-input-${reelId}`);
  const text = input?.value?.trim();
  
  if (!text) return;
  
  try {
    // Appel API pour poster le commentaire
    await api.postComment('reel', reelId, text);
    
    // Vider l'input
    input.value = '';
    
    // Recharger les commentaires
    loadComments(reelId);
    
    // Mettre à jour le compteur
    updateCommentCount(reelId, 1);
    
  } catch (error) {
    console.error('Erreur commentaire:', error);
    // Afficher une notification d'erreur
    showNotification('Erreur lors de l\'envoi du commentaire', 'error');
  }
}

async function loadComments(reelId) {
  const commentsList = document.getElementById(`comments-list-${reelId}`);
  if (!commentsList) return;
  
  try {
    const comments = await api.getComments('reel', reelId);
    
    if (comments.length === 0) {
      commentsList.innerHTML = `
        <div class="reel-comments-empty" style="display: flex; justify-content: center; align-items: center; height: 100%; font-size: 1.2rem; color: #ccc;">
          <i class="bi bi-chat-dots" style="font-size: 2rem; margin-bottom: 10px;"></i>
          Soyez le premier à commenter !
        </div>
      `;
      return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
      <div class="reel-comment-item">
        <div class="reel-comment-avatar">${(comment.author?.name || 'U')[0].toUpperCase()}</div>
        <div class="reel-comment-content">
          <div class="reel-comment-author">${escapeHtml(comment.author?.name || 'Anonyme')}</div>
          <div class="reel-comment-text">${escapeHtml(comment.text)}</div>
          <div class="reel-comment-time">${timeAgo(comment.created_at)}</div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Erreur chargement commentaires:', error);
    commentsList.innerHTML = `
      <div class="reel-comments-empty" style="display: flex; justify-content: center; align-items: center; height: 100%; font-size: 1.2rem; color: #ccc;">
        Impossible de charger les commentaires
      </div>
    `;
  }
}

function openComments(reelId) {
  // Sur mobile, ouvrir le drawer
  if (window.innerWidth <= 768) {
    injectCommentDrawer();
    openCommentDrawer(reelId);
  } else {
    // Sur desktop, scroller vers la section commentaires
    const commentsSection = document.getElementById(`comments-${reelId}`);
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus sur l'input
      const input = document.getElementById(`comment-input-${reelId}`);
      if (input) input.focus();
    }
  }
}

function updateCommentCount(reelId, delta) {
  // Mettre à jour tous les compteurs de commentaires pour ce reel
  document.querySelectorAll(`[data-id="${reelId}"] .comment-count`).forEach(el => {
    const current = parseInt(el.textContent) || 0;
    el.textContent = formatNumber(Math.max(0, current + delta));
  });
  
  // Mettre à jour le header de la section commentaires
  const headerCount = document.querySelector(`#comments-${reelId} .comment-count`);
  if (headerCount) {
    const current = parseInt(headerCount.textContent) || 0;
    headerCount.textContent = formatNumber(Math.max(0, current + delta));
  }
}

function shareReel(reelId, title) {
  const url = `${window.location.origin}/pages/reels.html?reel=${reelId}`;
  
  if (navigator.share) {
    // API Web Share native
    navigator.share({
      title: title || 'Reel BF1 TV',
      text: `Découvrez ce reel sur BF1 TV !`,
      url: url
    }).catch(err => console.log('Share annulé:', err));
  } else {
    // Fallback : copier dans le presse-papiers
    navigator.clipboard.writeText(url).then(() => {
      showNotification('Lien copié dans le presse-papiers !', 'success');
    }).catch(() => {
      // Dernier fallback : afficher une popup
      showSharePopup(url, title);
    });
  }
}

function showSharePopup(url, title) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 90%;
  `;
  
  popup.innerHTML = `
    <h3 style="margin:0 0 15px;color:var(--text-primary);">Partager ce reel</h3>
    <p style="margin:0 0 15px;color:var(--text-secondary);font-size:0.9rem;">${escapeHtml(title || 'Reel BF1 TV')}</p>
    <div style="display:flex;gap:10px;margin-bottom:15px;">
      <input type="text" value="${url}" readonly style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:0.85rem;">
      <button onclick="navigator.clipboard.writeText('${url}').then(() => this.textContent='Copié!')" style="padding:8px 15px;background:var(--red);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;">Copier</button>
    </div>
    <button onclick="this.parentElement.remove()" style="width:100%;padding:8px;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;cursor:pointer;">Fermer</button>
  `;
  
  document.body.appendChild(popup);
  
  // Sélectionner automatiquement le texte
  const input = popup.querySelector('input');
  if (input) {
    input.select();
    input.setSelectionRange(0, 99999);
  }
  
  // Fermer automatiquement après 10 secondes
  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove();
    }
  }, 10000);
}

// Drawer de commentaires (mobile)
function injectCommentDrawer() {
  if (document.getElementById('reels-comment-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'reels-comment-overlay';
  overlay.className = 'reels-comment-overlay';
  overlay.onclick = closeCommentDrawer;
  
  const drawer = document.createElement('div');
  drawer.id = 'reels-comment-drawer';
  drawer.className = 'reels-comment-drawer';
  drawer.innerHTML = `
    <div class="reels-comment-handle"></div>
    <div class="reels-comment-header">
      <span class="reels-comment-title">Commentaires</span>
      <button class="reels-comment-close" onclick="closeCommentDrawer()">✕</button>
    </div>
    <div class="reels-comment-list" id="reels-comment-list"></div>
    <div class="reels-comment-input-area">
      <input type="text" class="reels-comment-input-field" id="reels-comment-input" placeholder="Écrire un commentaire..." maxlength="200">
      <button class="reels-comment-send-btn" onclick="submitDrawerComment()">
        <i class="bi bi-send-fill"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
  
  // Écouteur Enter pour l'input
  const input = drawer.querySelector('.reels-comment-input-field');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitDrawerComment();
      }
    });
  }
}

function openCommentDrawer(reelId) {
  const overlay = document.getElementById('reels-comment-overlay');
  const drawer = document.getElementById('reels-comment-drawer');
  
  if (overlay && drawer) {
    overlay.style.display = 'block';
    drawer.classList.add('open');
    
    // Charger les commentaires
    loadDrawerComments(reelId);
    
    // Stocker l'ID du reel courant
    drawer.dataset.reelId = reelId;
  }
}

function closeCommentDrawer() {
  const overlay = document.getElementById('reels-comment-overlay');
  const drawer = document.getElementById('reels-comment-drawer');
  
  if (overlay && drawer) {
    drawer.classList.remove('open');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  }
}

async function loadDrawerComments(reelId) {
  const list = document.getElementById('reels-comment-list');
  if (!list) return;
  
  try {
    const comments = await api.getComments('reel', reelId);
    
    if (comments.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;color:var(--text-secondary);padding:40px 20px;">
          <i class="bi bi-chat-dots" style="font-size:2rem;margin-bottom:10px;display:block;"></i>
          <p>Soyez le premier à commenter !</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = comments.map(comment => `
      <div style="padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;gap:12px;">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-weight:600;">
            ${(comment.author?.name || 'U')[0].toUpperCase()}
          </div>
          <div style="flex:1;">
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">${escapeHtml(comment.author?.name || 'Anonyme')}</div>
            <div style="color:var(--text-primary);line-height:1.4;margin-bottom:4px;">${escapeHtml(comment.text)}</div>
            <div style="color:var(--text-secondary);font-size:0.8rem;">${timeAgo(comment.created_at)}</div>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Erreur chargement commentaires drawer:', error);
    list.innerHTML = `
      <div style="text-align:center;color:var(--text-secondary);padding:40px 20px;">
        <p>Impossible de charger les commentaires</p>
      </div>
    `;
  }
}

async function submitDrawerComment() {
  const drawer = document.getElementById('reels-comment-drawer');
  const input = document.getElementById('reels-comment-input');
  const reelId = drawer?.dataset.reelId;
  
  const text = input?.value?.trim();
  if (!text || !reelId) return;
  
  try {
    await api.postComment('reel', reelId, text);
    input.value = '';
    loadDrawerComments(reelId);
    updateCommentCount(reelId, 1);
  } catch (error) {
    console.error('Erreur commentaire drawer:', error);
    showNotification('Erreur lors de l\'envoi du commentaire', 'error');
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-size: 0.9rem;
    max-width: 300px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'all 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

window.loadReelsContent = loadReelsContent;
window.navigateToReel = navigateToReel;
window.togglePlayPause = togglePlayPause;
window.toggleFullscreen = toggleFullscreen;
window.submitComment = submitComment;
window.shareReel = shareReel;
window.openComments = openComments;
window.closeCommentDrawer = closeCommentDrawer;
window.submitDrawerComment = submitDrawerComment;