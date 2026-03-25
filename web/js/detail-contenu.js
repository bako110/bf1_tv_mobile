// js/contenu-detail.js
import * as api from '../../shared/services/api.js';

// Récupérer les paramètres de l'URL
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get('id'),
    type: params.get('type')
  };
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatRelative(dateString) {
  if (!dateString) return 'Récemment';
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}j`;
    return formatDate(dateString);
  } catch {
    return 'Récemment';
  }
}

function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-bf1tv.onrender.com${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
}

// Configuration par type
const TYPE_CONFIG = {
  sport: { label: 'Sport', icon: 'bi-trophy-fill', color: '#f59e0b', bgGradient: 'linear-gradient(135deg, #f59e0b20, #f59e0b40)' },
  jtandmag: { label: 'JT & Magazine', icon: 'bi-newspaper', color: '#e8222a', bgGradient: 'linear-gradient(135deg, #e8222a20, #e8222a40)' },
  divertissement: { label: 'Divertissement', icon: 'bi-emoji-smile-fill', color: '#10b981', bgGradient: 'linear-gradient(135deg, #10b98120, #10b98140)' },
  reportage: { label: 'Reportage', icon: 'bi-camera-fill', color: '#3b82f6', bgGradient: 'linear-gradient(135deg, #3b82f620, #3b82f640)' },
  archive: { label: 'Archive', icon: 'bi-archive-fill', color: '#6b7280', bgGradient: 'linear-gradient(135deg, #6b728020, #6b728040)' },
  movie: { label: 'Film', icon: 'bi-film', color: '#e8222a', bgGradient: 'linear-gradient(135deg, #e8222a20, #e8222a40)' },
  default: { label: 'Contenu', icon: 'bi-play-circle', color: '#e8222a', bgGradient: 'linear-gradient(135deg, #e8222a20, #e8222a40)' }
};

// Variables globales
let currentContent = null;
let currentType = null;
let currentId = null;
let currentUser = null;

// ==================== FONCTION DE REDIRECTION ====================
function redirectToDetail(id, type) {
  let page = '';
  
  switch (type) {
    case 'sport':
      page = `detail-contenu.html?id=${id}&type=sport`;
      break;
    case 'jtandmag':
      page = `detail-contenu.html?id=${id}&type=jtandmag`;
      break;
    case 'divertissement':
      page = `detail-contenu.html?id=${id}&type=divertissement`;
      break;
    case 'reportage':
      page = `detail-contenu.html?id=${id}&type=reportage`;
      break;
    case 'archive':
      page = `detail-contenu.html?id=${id}&type=archive`;
      break;
    case 'movie':
      page = `detail-contenu.html?id=${id}&type=movie`;
      break;
    default:
      page = `detail-contenu.html?id=${id}&type=${type}`;
  }
  
  window.location.href = page;
}

// Rendre la fonction accessible globalement
window.redirectToDetail = redirectToDetail;
// ================================================================

// Afficher l'erreur d'accès
function showAccessDenied(message, isLoggedIn = true) {
  const container = document.getElementById('detail-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="access-denied text-center py-5">
      <div class="access-denied-icon">
        <i class="bi bi-lock-fill"></i>
      </div>
      <h3>Accès restreint</h3>
      <p>${escapeHtml(message)}</p>
      <div class="access-denied-buttons">
        <button onclick="history.back()" class="btn-outline">Retour</button>
        ${!isLoggedIn ? '<button onclick="window.location.href=\'connexion.html\'" class="btn-red">Se connecter</button>' : 
                        '<button onclick="window.location.href=\'subscription.html\'" class="btn-red">Voir les offres</button>'}
      </div>
    </div>
  `;
}

// Charger et afficher le contenu
async function loadContentDetail() {
  const { id, type } = getUrlParams();
  
  if (!id || !type) {
    showError('Paramètres manquants');
    return;
  }
  
  currentId = id;
  currentType = type;
  
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.default;
  
  try {
    console.log(`📡 Chargement du contenu: ${type}/${id}`);
    
    // Récupérer le contenu
    let content = null;
    let accessError = null;
    
    try {
      content = await api.getShowById(id, type);
    } catch (err) {
      accessError = err;
      console.error('Erreur API:', err);
    }
    
    if (!content) {
      const status = accessError?.status;
      const isLoggedIn = api.isAuthenticated();
      
      if (status === 401) {
        showAccessDenied('Connectez-vous pour accéder à ce contenu', false);
        return;
      }
      if (status === 403) {
        showAccessDenied('Abonnement requis pour accéder à ce contenu', true);
        return;
      }
      showError('Contenu non trouvé');
      return;
    }
    
    currentContent = content;
    currentUser = api.getUser();
    
    // Récupérer les données supplémentaires
    const [related, comments, likesCount] = await Promise.all([
      api.getRelatedByType(type, id).catch(() => []),
      api.getComments(type, id).catch(() => []),
      api.getLikesCount(type, id).catch(() => 0)
    ]);
    
    // Vérifier les likes et favoris
    let userLiked = false;
    let userFavorited = false;
    if (currentUser) {
      [userLiked, userFavorited] = await Promise.all([
        api.checkLiked(type, id).catch(() => false),
        api.checkFavorite(type, id).catch(() => false)
      ]);
    }
    
    // Rendre le HTML
    renderContent(content, cfg, related, comments, likesCount, userLiked, userFavorited);
    
    // Initialiser les événements
    initEvents(type, id, comments.length, userLiked, userFavorited, likesCount);
    
  } catch (error) {
    console.error('❌ Erreur chargement:', error);
    showError('Erreur lors du chargement du contenu');
  }
}

// Rendre le contenu
function renderContent(content, cfg, related, comments, likesCount, userLiked, userFavorited) {
  const container = document.getElementById('detail-container');
  if (!container) return;
  
  const title = content.title || 'Sans titre';
  const description = content.description || content.content || '';
  const image = getImageUrl(content.image_url || content.image || content.thumbnail || content.poster);
  const videoUrl = content.video_url || content.stream_url || '';
  const date = formatDate(content.created_at || content.date || content.published_at);
  const duration = content.duration_minutes || content.duration;
  const channel = content.channel_name || content.channel;
  const category = content.category || content.genre;
  
  // Déterminer si c'est une vidéo YouTube
  const isYoutube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
  
  container.innerHTML = `
    <div class="detail-layout">
      <!-- Colonne principale -->
      <div class="detail-main">
        <!-- Player vidéo -->
        <div class="video-player-container" id="video-player-container">
          ${videoUrl ? `
            ${isYoutube ? renderYoutubePlayer(videoUrl, image) : renderVideoPlayer(videoUrl, image)}
          ` : image ? `
            <div class="image-placeholder">
              <img src="${image}" alt="${escapeHtml(title)}" class="w-100">
              <div class="image-overlay">
                <i class="bi bi-camera-video-fill"></i>
                <p>Vidéo non disponible</p>
              </div>
            </div>
          ` : `
            <div class="no-media">
              <i class="bi bi-camera-video-off-fill"></i>
              <p>Média non disponible</p>
            </div>
          `}
        </div>
        
        <!-- Infos du contenu -->
        <div class="content-info">
          <div class="content-header">
            <span class="content-badge" style="background: ${cfg.color}">
              <i class="bi ${cfg.icon}"></i> ${cfg.label}
            </span>
            ${date ? `<span class="content-date"><i class="bi bi-calendar3"></i> ${date}</span>` : ''}
            ${duration ? `<span class="content-duration"><i class="bi bi-clock"></i> ${formatDuration(duration)}</span>` : ''}
          </div>
          
          <h1 class="content-title">${escapeHtml(title)}</h1>
          
          ${channel ? `
            <div class="content-channel">
              <i class="bi bi-tv-fill"></i> ${escapeHtml(channel)}
            </div>
          ` : ''}
          
          ${category ? `
            <div class="content-category">
              <i class="bi bi-tag-fill"></i> ${escapeHtml(category)}
            </div>
          ` : ''}
          
          <!-- Actions -->
          <div class="content-actions">
            <button class="action-btn like-btn ${userLiked ? 'active' : ''}" id="like-btn">
              <i class="bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
              <span id="like-count">${formatNumber(likesCount)}</span>
            </button>
            <button class="action-btn comment-btn" id="comment-btn">
              <i class="bi bi-chat-dots"></i>
              <span id="comment-count">${comments.length}</span>
            </button>
            <button class="action-btn favorite-btn ${userFavorited ? 'active' : ''}" id="favorite-btn">
              <i class="bi ${userFavorited ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
              <span>Favoris</span>
            </button>
            <button class="action-btn share-btn" id="share-btn">
              <i class="bi bi-share-fill"></i>
              <span>Partager</span>
            </button>
          </div>
          
          <!-- Description -->
          ${description ? `
            <div class="content-description" id="description-container">
              <div class="description-text ${description.length > 400 ? 'collapsed' : ''}" id="description-text">
                ${escapeHtml(description)}
              </div>
              ${description.length > 400 ? `
                <button class="read-more-btn" id="read-more-btn">
                  Lire la suite <i class="bi bi-chevron-down"></i>
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <!-- Commentaires -->
        <div class="comments-section" id="comments-section">
          <div class="comments-header">
            <h3><i class="bi bi-chat-dots-fill"></i> Commentaires <span id="comments-count">(${comments.length})</span></h3>
          </div>
          <div class="comments-list" id="comments-list">
            ${renderComments(comments, currentUser)}
          </div>
          ${currentUser ? `
            <div class="comment-form">
              <textarea id="comment-input" placeholder="Ajouter un commentaire..." maxlength="1000" rows="2"></textarea>
              <button id="submit-comment" class="btn-red">Envoyer</button>
            </div>
          ` : `
            <div class="comment-login-prompt">
              <p><a href="connexion.html">Connectez-vous</a> pour laisser un commentaire</p>
            </div>
          `}
        </div>
      </div>
      
      <!-- Colonne latérale - Contenus similaires -->
      ${related.length > 0 ? `
        <div class="detail-sidebar">
          <h3 class="sidebar-title"><i class="bi bi-grid-3x3-gap-fill"></i> Vous aimerez aussi</h3>
          <div class="related-list">
            ${related.map(item => renderRelatedItem(item, currentType)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Rendre le player YouTube
function renderYoutubePlayer(videoUrl, poster) {
  const videoId = extractYoutubeId(videoUrl);
  if (!videoId) return renderVideoPlayer(videoUrl, poster);
  
  return `
    <div class="youtube-player-wrapper" data-video-id="${videoId}" data-poster="${poster}">
      <div class="youtube-poster" style="background-image: url('${poster || 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg'}')">
        <div class="play-button">
          <i class="bi bi-play-fill"></i>
        </div>
      </div>
    </div>
  `;
}

// Rendre le player vidéo standard
function renderVideoPlayer(videoUrl, poster) {
  return `
    <video controls autoplay playsinline poster="${poster || ''}" class="video-player">
      <source src="${videoUrl}" type="video/mp4">
      Votre navigateur ne supporte pas la lecture vidéo.
    </video>
  `;
}

// Extraire l'ID YouTube
function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Rendre un commentaire
function renderComments(comments, user) {
  if (!comments.length) {
    return `<p class="no-comments">Aucun commentaire pour l'instant. Soyez le premier !</p>`;
  }
  
  return comments.map(c => {
    const isOwn = user && String(c.user_id) === String(user.id);
    const username = c.username || c.user?.username || 'Utilisateur';
    const avatar = (username[0] || 'U').toUpperCase();
    
    return `
      <div class="comment-item" data-id="${c.id || c._id}">
        <div class="comment-avatar" style="background: var(--red);">${escapeHtml(avatar)}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(username)}</span>
            <span class="comment-date">${formatRelative(c.created_at)}</span>
            ${isOwn ? `
              <div class="comment-actions">
                <button class="edit-comment" data-id="${c.id || c._id}"><i class="bi bi-pencil"></i></button>
                <button class="delete-comment" data-id="${c.id || c._id}"><i class="bi bi-trash"></i></button>
              </div>
            ` : ''}
          </div>
          <p class="comment-text">${escapeHtml(c.text)}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Rendre un élément similaire
function renderRelatedItem(item, currentType) {
  const title = item.title || 'Sans titre';
  const image = getImageUrl(item.image_url || item.image || item.thumbnail);
  const duration = item.duration_minutes || item.duration;
  const id = item.id || item._id;
  const type = item._contentType || currentType;
  
  return `
    <div class="related-item" onclick="redirectToDetail('${id}', '${type}')">
      <div class="related-thumb">
        ${image ? `<img src="${image}" alt="${escapeHtml(title)}">` : `<div class="related-placeholder"><i class="bi bi-camera-video-fill"></i></div>`}
        ${duration ? `<span class="related-duration">${formatDuration(duration)}</span>` : ''}
      </div>
      <div class="related-info">
        <div class="related-title">${escapeHtml(title)}</div>
        <div class="related-date">${formatRelative(item.created_at || item.date)}</div>
      </div>
    </div>
  `;
}

// Initialiser les événements
function initEvents(type, id, commentsCount, userLiked, userFavorited, likesCount) {
  let currentLiked = userLiked;
  let currentFavorited = userFavorited;
  let currentLikesCount = likesCount;
  let currentCommentsCount = commentsCount;
  
  // Like
  const likeBtn = document.getElementById('like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', async () => {
      if (!api.isAuthenticated()) {
        showToast('Connectez-vous pour liker ce contenu', 'error');
        setTimeout(() => window.location.href = 'connexion.html', 1500);
        return;
      }
      
      likeBtn.disabled = true;
      try {
        const res = await api.toggleLike(type, id);
        currentLiked = res?.liked ?? !currentLiked;
        currentLikesCount = res?.count ?? (currentLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1));
        
        const icon = likeBtn.querySelector('i');
        const countSpan = likeBtn.querySelector('#like-count');
        
        if (icon) icon.className = currentLiked ? 'bi bi-heart-fill' : 'bi bi-heart';
        likeBtn.classList.toggle('active', currentLiked);
        if (countSpan) countSpan.textContent = formatNumber(currentLikesCount);
      } catch (err) {
        console.error('Erreur like:', err);
      }
      likeBtn.disabled = false;
    });
  }
  
  // Favori
  const favBtn = document.getElementById('favorite-btn');
  if (favBtn) {
    favBtn.addEventListener('click', async () => {
      if (!api.isAuthenticated()) {
        showToast('Connectez-vous pour ajouter aux favoris', 'error');
        setTimeout(() => window.location.href = 'connexion.html', 1500);
        return;
      }
      
      favBtn.disabled = true;
      try {
        if (currentFavorited) {
          await api.removeFavorite(type, id);
          currentFavorited = false;
        } else {
          await api.addFavorite(type, id);
          currentFavorited = true;
        }
        
        const icon = favBtn.querySelector('i');
        icon.className = currentFavorited ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
        favBtn.classList.toggle('active', currentFavorited);
        showToast(currentFavorited ? 'Ajouté aux favoris' : 'Retiré des favoris', 'success');
      } catch (err) {
        console.error('Erreur favori:', err);
      }
      favBtn.disabled = false;
    });
  }
  
  // Commentaires
  const commentBtn = document.getElementById('comment-btn');
  if (commentBtn) {
    commentBtn.addEventListener('click', () => {
      document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
  
  // Partager
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          url: window.location.href
        }).catch(() => copyToClipboard());
      } else {
        copyToClipboard();
      }
    });
  }
  
  // Envoi de commentaire
  const submitBtn = document.getElementById('submit-comment');
  const commentInput = document.getElementById('comment-input');
  if (submitBtn && commentInput) {
    submitBtn.addEventListener('click', async () => {
      const text = commentInput.value.trim();
      if (!text) return;
      
      if (!api.isAuthenticated()) {
        showToast('Connectez-vous pour commenter', 'error');
        setTimeout(() => window.location.href = 'connexion.html', 1500);
        return;
      }
      
      submitBtn.disabled = true;
      try {
        await api.addComment(type, id, text);
        commentInput.value = '';
        
        const comments = await api.getComments(type, id);
        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
          commentsList.innerHTML = renderComments(comments, currentUser);
        }
        
        currentCommentsCount = comments.length;
        const commentCountSpan = document.getElementById('comment-count');
        const commentsCountSpan = document.getElementById('comments-count');
        if (commentCountSpan) commentCountSpan.textContent = currentCommentsCount;
        if (commentsCountSpan) commentsCountSpan.textContent = `(${currentCommentsCount})`;
        
        showToast('Commentaire ajouté', 'success');
      } catch (err) {
        console.error('Erreur commentaire:', err);
        showToast('Erreur lors de l\'envoi', 'error');
      }
      submitBtn.disabled = false;
    });
  }
  
  // Lire la suite
  const readMoreBtn = document.getElementById('read-more-btn');
  if (readMoreBtn) {
    readMoreBtn.addEventListener('click', () => {
      const descText = document.getElementById('description-text');
      if (descText) {
        descText.classList.toggle('collapsed');
        readMoreBtn.innerHTML = descText.classList.contains('collapsed') 
          ? 'Lire la suite <i class="bi bi-chevron-down"></i>' 
          : 'Réduire <i class="bi bi-chevron-up"></i>';
      }
    });
  }
  
  // YouTube player
  initYoutubePlayers();
}

// Initialiser les lecteurs YouTube
function initYoutubePlayers() {
  const players = document.querySelectorAll('.youtube-player-wrapper');
  players.forEach(wrapper => {
    const poster = wrapper.querySelector('.youtube-poster');
    if (!poster) return;
    
    poster.addEventListener('click', () => {
      const videoId = wrapper.dataset.videoId;
      if (!videoId) return;
      
      wrapper.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      `;
    });
  });
}

// Copier dans le presse-papier
function copyToClipboard() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('Lien copié dans le presse-papier', 'success');
  }).catch(() => {
    showToast('Erreur lors de la copie', 'error');
  });
}

// Afficher un toast
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}"></i>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Afficher une erreur
function showError(message) {
  const container = document.getElementById('detail-container');
  if (container) {
    container.innerHTML = `
      <div class="error-container text-center py-5">
        <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: var(--red);"></i>
        <h3 class="mt-3">Erreur</h3>
        <p>${escapeHtml(message)}</p>
        <button onclick="history.back()" class="btn-outline mt-3">Retour</button>
      </div>
    `;
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  loadContentDetail();
});