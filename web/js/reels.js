import * as api from '../../shared/services/api.js';
import { showConfirmModal } from './ui-helpers.js';

// Page immersive : bloquer le scroll body et cacher le footer
document.documentElement.style.overflow = 'hidden';
document.body.style.overflow = 'hidden';
const _footerEl = document.getElementById('footer-placeholder');
if (_footerEl) _footerEl.style.display = 'none';
// Cacher aussi le footer quand il se charge dynamiquement
const _footerObserver = new MutationObserver(() => {
  const fp = document.getElementById('footer-placeholder');
  if (fp && fp.innerHTML) fp.style.display = 'none';
});
_footerObserver.observe(document.body, { childList: true, subtree: false });

let reelsData = [];
let currentIndex = 0;
let isLoading = false;
let observer = null;
let currentVideo = null;
let likedReelIds = new Set();

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
    
    // Charger les likes de l'utilisateur pour initialiser l'état des cœurs
    try {
      const myLikes = await api.getMyLikes('reel');
      likedReelIds = new Set(myLikes.map(l => String(l.content_id)));
    } catch (e) { likedReelIds = new Set(); }

    // Ajouter les reels
    reelsData.forEach((reel, index) => {
      stack.appendChild(createReelElement(reel, index));
    });
    
    // Configurer l'observateur d'intersection pour la lecture automatique
    setupIntersectionObserver();
    
    // Démarrer le premier reel
    setTimeout(() => {
      navigateToReel(0);
      const firstReel = document.querySelector('.reel-item');
      if (firstReel) {
        const firstReelId = firstReel.dataset.id;
        if (firstReelId) loadComments(firstReelId);
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
    <div class="reel-layout">

      <!-- GAUCHE : Panel commentaires (TikTok style) -->
      <div class="reel-comments-panel" id="comments-panel-${reel._id}">
        <div class="reel-comments-header">
          <span class="reel-comments-title">
            <i class="bi bi-chat-fill" style="color:var(--red,#E23E3E);margin-right:6px;"></i>
            Commentaires
            <span class="reel-comments-count" id="ccount-${reel._id}">${formatNumber(reel.comments || 0)}</span>
          </span>
          <button class="reel-comments-close-btn" onclick="window.closeCommentPanel('${reel._id}')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="reel-comments-list" id="comments-list-${reel._id}">
          <div class="reel-comments-empty">
            <i class="bi bi-chat-dots"></i>
            <p>Chargement...</p>
          </div>
        </div>
        <div class="reel-comments-input-row">
          <input type="text" class="reel-comment-input"
                 id="comment-input-${reel._id}"
                 placeholder="Ajouter un commentaire..."
                 maxlength="200">
          <button class="reel-comment-send-btn" onclick="submitComment('${reel._id}')">
            <i class="bi bi-send-fill"></i>
          </button>
        </div>
      </div>

      <!-- CENTRE : Vidéo -->
      <div class="reel-video-wrapper">
        <video class="reel-video" loop playsinline preload="metadata">
          <source src="${reel.video_url}" type="video/mp4">
        </video>
        <!-- Bouton son -->
        <button class="reel-sound-btn" title="Son" aria-label="Activer/désactiver le son">
          <i class="bi bi-volume-up-fill"></i>
        </button>
        <div class="reel-video-overlay">
          <div class="reel-author-bar">
            <div class="reel-avatar">
              <img src="${reel.avatar || '/logo.png'}" alt="${escapeHtml(reel.author)}" onerror="this.src='/logo.png'">
            </div>
            <span class="reel-author-name">${escapeHtml(reel.author)}</span>
          </div>
          <p class="reel-caption">${escapeHtml(reel.description.substring(0, 120))}${reel.description.length > 120 ? '...' : ''}</p>
          <div class="reel-music">
            <i class="bi bi-music-note-beamed"></i>
            <span>${escapeHtml(reel.title)}</span>
          </div>
          <div class="reel-download-links">
            <a href="https://play.google.com/store/apps/details?id=com.bf1tv.app" target="_blank" rel="noopener" class="reel-dl-btn reel-dl-android">
              <i class="bi bi-google-play"></i><span>Google Play</span>
            </a>
            <a href="https://apps.apple.com/app/bf1-tv/id6741638571" target="_blank" rel="noopener" class="reel-dl-btn reel-dl-ios">
              <i class="bi bi-apple"></i><span>App Store</span>
            </a>
          </div>
        </div>
      </div>

      <!-- DROITE : Actions TikTok (desktop) -->
      <div class="reel-side-actions">
        <div class="reel-side-action like-btn" data-id="${reel._id}">
          <div class="reel-side-action-icon"><i class="bi ${likedReelIds.has(String(reel._id)) ? 'bi-heart-fill' : 'bi-heart'}" style="${likedReelIds.has(String(reel._id)) ? 'color:var(--red)' : ''}"></i></div>
          <span class="like-count">${formatNumber(reel.likes)}</span>
        </div>
        <div class="reel-side-action comment-btn" data-id="${reel._id}">
          <div class="reel-side-action-icon"><i class="bi bi-chat-fill"></i></div>
          <span class="comment-count">${formatNumber(reel.comments || 0)}</span>
        </div>
        <div class="reel-side-action share-btn" data-id="${reel._id}" data-title="${escapeHtml(reel.title)}">
          <div class="reel-side-action-icon"><i class="bi bi-share-fill"></i></div>
          <span>Partager</span>
        </div>
      </div>

      <!-- ACTIONS MOBILES (overlay droite sur la vidéo) -->
      <div class="reel-mobile-actions">
        <div class="reel-mobile-action like-btn" data-id="${reel._id}">
          <div class="reel-mobile-action-icon"><i class="bi ${likedReelIds.has(String(reel._id)) ? 'bi-heart-fill' : 'bi-heart'}" style="${likedReelIds.has(String(reel._id)) ? 'color:var(--red)' : ''}"></i></div>
          <span class="like-count">${formatNumber(reel.likes)}</span>
        </div>
        <div class="reel-mobile-action comment-btn" data-id="${reel._id}">
          <div class="reel-mobile-action-icon"><i class="bi bi-chat-fill"></i></div>
          <span class="comment-count">${formatNumber(reel.comments || 0)}</span>
        </div>
        <div class="reel-mobile-action share-btn" data-id="${reel._id}" data-title="${escapeHtml(reel.title)}">
          <div class="reel-mobile-action-icon"><i class="bi bi-share-fill"></i></div>
          <span>Partager</span>
        </div>
      </div>

    </div>
  `;

  // Événements desktop + mobile (les deux sélecteurs .like-btn, .comment-btn, .share-btn)
  div.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleLike(btn, reel._id); });
  });

  div.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openComments(reel._id); });
  });

  div.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); shareReel(reel._id, reel.title); });
  });

  const commentInput = div.querySelector('.reel-comment-input');
  if (commentInput) commentInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(reel._id); }
  });

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

// État son global — son activé par défaut, muted seulement si le navigateur bloque l'autoplay
let globalMuted = false;

function updateSoundButtons() {
  document.querySelectorAll('.reel-sound-btn i').forEach(icon => {
    icon.className = globalMuted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
  });
  document.querySelectorAll('.reel-video').forEach(v => {
    v.muted = globalMuted;
  });
}

function playVideoInReel(reelElement) {
  const video = reelElement.querySelector('.reel-video');
  if (!video) return;
  video.muted = globalMuted;
  // Arrêter toutes les autres vidéos
  document.querySelectorAll('.reel-video').forEach(v => {
    if (v !== video && !v.paused) v.pause();
  });
  if (video.paused) {
    video.play().catch(() => {
      // Le navigateur bloque l'autoplay avec son → repasser en muet
      globalMuted = true;
      video.muted = true;
      video.play().catch(e => console.log('Lecture bloquée:', e));
      updateSoundButtons();
    });
  }
  currentVideo = video;

  // Lier le bouton son de ce reel
  const soundBtn = reelElement.querySelector('.reel-sound-btn');
  if (soundBtn && !soundBtn._bound) {
    soundBtn._bound = true;
    soundBtn.addEventListener('click', e => {
      e.stopPropagation();
      globalMuted = !globalMuted;
      updateSoundButtons();
    });
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
  const liked = icon.classList.contains('bi-heart-fill');

  // Optimistic update
  if (liked) {
    icon.classList.replace('bi-heart-fill', 'bi-heart');
    icon.style.color = '';
    countSpan.textContent = formatNumber(Math.max(0, currentCount - 1));
    likedReelIds.delete(String(reelId));
  } else {
    icon.classList.replace('bi-heart', 'bi-heart-fill');
    icon.style.color = 'var(--red)';
    countSpan.textContent = formatNumber(currentCount + 1);
    likedReelIds.add(String(reelId));
  }

  btn.style.pointerEvents = 'none';
  try {
    await api.toggleLike('reel', reelId);
  } catch (error) {
    console.error('Erreur like:', error);
    // Rollback
    if (liked) {
      icon.classList.replace('bi-heart', 'bi-heart-fill');
      icon.style.color = 'var(--red)';
      countSpan.textContent = formatNumber(currentCount);
      likedReelIds.add(String(reelId));
    } else {
      icon.classList.replace('bi-heart-fill', 'bi-heart');
      icon.style.color = '';
      countSpan.textContent = formatNumber(currentCount);
      likedReelIds.delete(String(reelId));
    }
  } finally {
    btn.style.pointerEvents = '';
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
  reels.forEach((reel, i) => {
    reel.classList.remove('active', 'prev', 'next');
    if (i === index) reel.classList.add('active');
    else if (i < index) reel.classList.add('prev');
    else reel.classList.add('next');
  });

  currentIndex = index;

  setTimeout(() => {
    playVideoInReel(reels[index]);
  }, 50);
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
  // Navigation gérée par scroll/wheel/keyboard — pas de boutons flottants
  // qui bloqueraient les clics sur les actions like/commentaire
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
    await api.addComment('reel', reelId, text);
    
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
    const [comments, myCommentLikes] = await Promise.all([
      api.getComments('reel', reelId),
      api.getMyLikes('comment').catch(() => [])
    ]);
    const likedCids = new Set(myCommentLikes.map(l => String(l.content_id)));
    const me = JSON.parse(localStorage.getItem('bf1_user') || 'null');
    const myId = me?.id || me?._id || me?.user_id;

    if (!comments.length) {
      commentsList.innerHTML = `
        <div class="reel-comments-empty">
          <i class="bi bi-chat-dots"></i>
          <p>Soyez le premier à commenter !</p>
        </div>`;
      return;
    }

    commentsList.innerHTML = comments.map(comment => {
      const cid = comment.id || comment._id;
      const authorName = comment.username || comment.author?.name || 'Anonyme';
      const authorInitial = authorName[0].toUpperCase();
      const isOwner = myId && comment.user_id && String(myId) === String(comment.user_id);
      const alreadyLiked = likedCids.has(String(cid));
      return `
      <div class="reel-comment-item" id="comment-row-${cid}" data-reelid="${reelId}">
        <div class="reel-comment-avatar">${authorInitial}</div>
        <div class="reel-comment-content">
          <div class="reel-comment-author">${escapeHtml(authorName)}</div>
          <div class="reel-comment-text" id="comment-text-${cid}">${escapeHtml(comment.text)}</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
            <span class="reel-comment-time">${timeAgo(comment.created_at)}</span>
            <button class="rc-action-btn rc-like" id="clbtn-${cid}" onclick="window.likeReelComment('${cid}',this)" title="J'aime">
              <i class="bi ${alreadyLiked ? 'bi-heart-fill' : 'bi-heart'}" style="${alreadyLiked ? 'color:#ff4d4d' : ''}"></i>
              <span class="rc-like-count">0</span>
            </button>
            ${isOwner ? `
              <button class="rc-action-btn" onclick="window.editComment('${cid}','${reelId}')" title="Modifier">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="rc-action-btn rc-del" onclick="window.deleteReelComment('${cid}','${reelId}')" title="Supprimer">
                <i class="bi bi-trash3"></i>
              </button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

  } catch (e) {
    console.error('Erreur chargement commentaires:', e);
    commentsList.innerHTML = `<div class="reel-comments-empty"><i class="bi bi-exclamation-circle"></i><p>Impossible de charger</p></div>`;
  }
}

window.editComment = function(commentId, reelId) {
  const textEl = document.getElementById(`comment-text-${commentId}`);
  if (!textEl) return;
  const currentText = textEl.textContent;
  textEl.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
      <input id="edit-input-${commentId}" value="${escapeHtml(currentText)}"
        style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);
               border-radius:8px;padding:5px 10px;color:#fff;font-size:13px;outline:none;"
        maxlength="200"/>
      <button onclick="window.confirmEditComment('${commentId}','${reelId}')"
        style="background:#E23E3E;border:none;border-radius:6px;color:#fff;padding:5px 10px;cursor:pointer;font-size:12px;">
        OK
      </button>
      <button onclick="window.cancelEdit('${commentId}','${escapeHtml(currentText).replace(/'/g,"\\'")}','${reelId}')"
        style="background:rgba(255,255,255,0.1);border:none;border-radius:6px;color:#aaa;padding:5px 10px;cursor:pointer;font-size:12px;">
        ✕
      </button>
    </div>`;
  document.getElementById(`edit-input-${commentId}`)?.focus();
};

window.cancelEdit = function(commentId, originalText, reelId) {
  const textEl = document.getElementById(`comment-text-${commentId}`);
  if (textEl) textEl.innerHTML = escapeHtml(originalText);
};

window.confirmEditComment = async function(commentId, reelId) {
  const input = document.getElementById(`edit-input-${commentId}`);
  const newText = input?.value?.trim();
  if (!newText) return;
  try {
    await api.updateComment(commentId, newText);
    const textEl = document.getElementById(`comment-text-${commentId}`);
    if (textEl) textEl.innerHTML = escapeHtml(newText);
    showNotification('Commentaire modifié', 'success');
  } catch (e) {
    console.error(e);
    showNotification('Erreur lors de la modification', 'error');
  }
};

window.deleteReelComment = async function(commentId, reelId) {
  const row = document.getElementById(`comment-row-${commentId}`);
  const ok = await showConfirmModal({
    message: 'Supprimer ce commentaire ? Cette action est irréversible.',
    title: 'Supprimer le commentaire',
    confirmText: 'Supprimer',
    variant: 'danger',
  });
  if (!ok) return;
  if (row) { row.style.opacity = '0.4'; row.style.pointerEvents = 'none'; }
  try {
    await api.deleteComment(commentId);
    row?.remove();
    updateCommentCount(reelId, -1);
    showNotification('Commentaire supprimé', 'success');
  } catch (e) {
    console.error(e);
    if (row) { row.style.opacity = '1'; row.style.pointerEvents = ''; }
    showNotification('Erreur lors de la suppression', 'error');
  }
};

window.likeReelComment = async function(commentId, btn) {
  const icon = btn.querySelector('i');
  const countSpan = btn.querySelector('.rc-like-count');
  const liked = icon.classList.contains('bi-heart-fill');
  const current = parseInt(countSpan.textContent) || 0;

  // Optimistic update
  if (liked) {
    icon.classList.replace('bi-heart-fill', 'bi-heart');
    icon.style.color = '';
    countSpan.textContent = Math.max(0, current - 1);
  } else {
    icon.classList.replace('bi-heart', 'bi-heart-fill');
    icon.style.color = '#ff4d4d';
    countSpan.textContent = current + 1;
  }
  btn.disabled = true;
  try {
    await api.toggleLike('comment', commentId);
  } catch (e) {
    // Rollback on error
    if (liked) {
      icon.classList.replace('bi-heart', 'bi-heart-fill');
      icon.style.color = '#ff4d4d';
      countSpan.textContent = current;
    } else {
      icon.classList.replace('bi-heart-fill', 'bi-heart');
      icon.style.color = '';
      countSpan.textContent = current;
    }
    console.error('Erreur like commentaire:', e);
  } finally {
    btn.disabled = false;
  }
};

function openComments(reelId) {
  if (window.innerWidth <= 768) {
    injectCommentDrawer();
    openCommentDrawer(reelId);
  } else {
    const panel = document.getElementById(`comments-panel-${reelId}`);
    if (!panel) return;
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
    } else {
      panel.classList.add('open');
      loadComments(reelId);
      setTimeout(() => {
        const input = document.getElementById(`comment-input-${reelId}`);
        if (input) input.focus();
      }, 380);
    }
  }
}

function closeCommentPanel(reelId) {
  const panel = document.getElementById(`comments-panel-${reelId}`);
  if (panel) panel.classList.remove('open');
}
window.closeCommentPanel = closeCommentPanel;

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
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 90%;
  `;
  
  popup.innerHTML = `
    <h3 style="margin:0 0 15px;color:var(--text-1);">Partager ce reel</h3>
    <p style="margin:0 0 15px;color:var(--text-2);font-size:0.9rem;">${escapeHtml(title || 'Reel BF1 TV')}</p>
    <div style="display:flex;gap:10px;margin-bottom:15px;">
      <input type="text" value="${url}" readonly style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-3);color:var(--text-1);font-size:0.85rem;">
      <button onclick="navigator.clipboard.writeText('${url}').then(() => this.textContent='Copié!')" style="padding:8px 15px;background:var(--red);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;">Copier</button>
    </div>
    <button onclick="this.parentElement.remove()" style="width:100%;padding:8px;background:var(--bg-3);color:var(--text-1);border:1px solid var(--border);border-radius:6px;cursor:pointer;">Fermer</button>
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
    const [comments, myCommentLikes] = await Promise.all([
      api.getComments('reel', reelId),
      api.getMyLikes('comment').catch(() => [])
    ]);
    const likedCids = new Set(myCommentLikes.map(l => String(l.content_id)));
    const me = JSON.parse(localStorage.getItem('bf1_user') || 'null');
    const myId = me?.id || me?._id || me?.user_id;

    if (!comments.length) {
      list.innerHTML = `
        <div style="text-align:center;color:var(--text-3);padding:40px 20px;">
          <i class="bi bi-chat-dots" style="font-size:2rem;margin-bottom:10px;display:block;"></i>
          <p>Soyez le premier à commenter !</p>
        </div>`;
      return;
    }

    list.innerHTML = comments.map(comment => {
      const cid = comment.id || comment._id;
      const authorName = comment.username || comment.author?.name || 'Anonyme';
      const authorInitial = authorName[0].toUpperCase();
      const isOwner = myId && comment.user_id && String(myId) === String(comment.user_id);
      const alreadyLiked = likedCids.has(String(cid));
      return `
      <div id="comment-row-${cid}" style="padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--bg-3);display:flex;align-items:center;justify-content:center;color:var(--text-1);font-weight:600;flex-shrink:0;">
            ${authorInitial}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;color:var(--text-1);margin-bottom:4px;">${escapeHtml(authorName)}</div>
            <div id="comment-text-${cid}" style="color:var(--text-2);line-height:1.4;margin-bottom:4px;">${escapeHtml(comment.text)}</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="color:var(--text-secondary);font-size:0.8rem;">${timeAgo(comment.created_at)}</span>
              <button class="rc-action-btn rc-like" id="clbtn-${cid}" onclick="window.likeReelComment('${cid}',this)" title="J'aime" style="display:flex;align-items:center;gap:3px;">
                <i class="bi ${alreadyLiked ? 'bi-heart-fill' : 'bi-heart'}" style="${alreadyLiked ? 'color:#ff4d4d' : ''}"></i>
                <span class="rc-like-count">0</span>
              </button>
              ${isOwner ? `
                <button class="rc-action-btn" onclick="window.editComment('${cid}','${reelId}')" title="Modifier">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="rc-action-btn rc-del" onclick="window.deleteReelComment('${cid}','${reelId}')" title="Supprimer">
                  <i class="bi bi-trash3"></i>
                </button>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

  } catch (error) {
    console.error('Erreur chargement commentaires drawer:', error);
    list.innerHTML = `
      <div style="text-align:center;color:var(--text-secondary);padding:40px 20px;">
        <p>Impossible de charger les commentaires</p>
      </div>`;
  }
}

async function submitDrawerComment() {
  const drawer = document.getElementById('reels-comment-drawer');
  const input = document.getElementById('reels-comment-input');
  const reelId = drawer?.dataset.reelId;
  
  const text = input?.value?.trim();
  if (!text || !reelId) return;
  
  try {
    await api.addComment('reel', reelId, text);
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