// js/contenu-detail.js
import * as api from '../../shared/services/api.js';
import { slugify, getContentBySlug } from '/js/slugUtils.js';

// Mise à jour dynamique des méta Open Graph / Twitter pour le partage
function updatePageMeta(title, description, image) {
  const BASE = 'https://bf1-tv-mobile.onrender.com';
  const fullTitle = title ? `${title} — BF1 TV` : 'BF1 TV';
  const desc = description ? description.substring(0, 200).replace(/<[^>]+>/g, '') : 'Découvrez ce contenu sur BF1 TV.';
  const url = window.location.href;

  document.title = fullTitle;
  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute('content', val); };
  setMeta('meta[name="description"]', desc);
  setMeta('meta[property="og:title"]', fullTitle);
  setMeta('meta[property="og:description"]', desc);
  setMeta('meta[property="og:image"]', image || `${BASE}/logo.png`);
  setMeta('meta[property="og:url"]', url);
  setMeta('meta[name="twitter:title"]', fullTitle);
  setMeta('meta[name="twitter:description"]', desc);
  setMeta('meta[name="twitter:image"]', image || `${BASE}/logo.png`);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', url);
}

// Récupérer les paramètres de l'URL
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    slug: params.get('slug'),
    id: params.get('id'),
    type: params.get('type')
  };
}

// Normaliser le type pour l'API
function normalizeApiType(type) {
  if (!type) return 'default';
  const lowerType = type.toLowerCase();
  if (lowerType === 'archive' || lowerType === 'archives') return 'archive';
  return lowerType;
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
  sport:          { label: 'Sport',           icon: 'bi-trophy-fill',            color: '#f59e0b' },
  jtandmag:       { label: 'JT & Magazine',   icon: 'bi-newspaper',              color: '#e8222a' },
  divertissement: { label: 'Divertissement',  icon: 'bi-emoji-smile-fill',       color: '#10b981' },
  reportage:      { label: 'Reportage',       icon: 'bi-camera-fill',            color: '#3b82f6' },
  archive:        { label: 'Archive',         icon: 'bi-archive-fill',           color: '#6b7280' },
  movie:          { label: 'Film',            icon: 'bi-film',                   color: '#e8222a' },
  show:           { label: 'Émission',        icon: 'bi-tv-fill',                color: '#8b5cf6' },
  series:         { label: 'Série',           icon: 'bi-collection-play-fill',   color: '#8b5cf6' },
  reel:           { label: 'Reel',            icon: 'bi-play-circle-fill',       color: '#ec4899' },
  breaking_news:  { label: 'Flash Info',      icon: 'bi-lightning-fill',         color: '#e8222a' },
  emission_category: { label: 'Émission',     icon: 'bi-tv-fill',                color: '#10b981' },
  popular_program: { label: 'Programme',      icon: 'bi-star-fill',              color: '#f59e0b' },
  program:        { label: 'Programme',       icon: 'bi-star-fill',              color: '#f59e0b' },
  default:        { label: 'Contenu',         icon: 'bi-play-circle',            color: '#e8222a' }
};

// Variables globales
let currentContent = null;
let currentType = null;
let currentId = null;
let currentUser = null;

// ==================== FONCTION DE REDIRECTION ====================
function redirectToDetail(id, type, title = '') {
  const slug = slugify(title);
  const query = slug ? `slug=${slug}&type=${type}` : `id=${id}&type=${type}`;
  window.location.href = `detail-contenu.html?${query}`;
}

window.redirectToDetail = redirectToDetail;
// ================================================================

// Charger et afficher le contenu
async function loadContentDetail() {
  const { slug, id, type } = getUrlParams();
  
  if ((!slug && !id) || !type) {
    showError('Paramètres manquants');
    return;
  }
  
  const apiType = normalizeApiType(type);
  currentType = apiType;
  
  const cfg = TYPE_CONFIG[apiType] || TYPE_CONFIG.default;
  
  try {
    console.log(`📡 Chargement du contenu: ${apiType}/${slug || id}`);
    
    let content = null;
    let accessError = null;
    
    try {
      if (slug) {
        content = await getContentBySlug(slug, apiType);
      } else {
        content = await api.getShowById(id, apiType);
      }
      currentId = content?._id || content?.id;
    } catch (err) {
      accessError = err;
      console.error('Erreur API:', err);
    }

    if (!content) {
      const status = accessError?.status;
      if (status === 401) {
        showError('Vous devez être connecté pour accéder à ce contenu.');
        return;
      }
      if (status === 403) {
        showError('Vous n\'avez pas accès à ce contenu (abonnement requis ou accès restreint).');
        return;
      }
      showError('Contenu non trouvé ou inaccessible.');
      return;
    }
    
    currentContent = content;
    currentUser = api.getUser();
    
    const [related, comments, likesCount] = await Promise.all([
      api.getRelatedByType(apiType, currentId).catch(() => []),
      api.getComments(apiType, currentId).catch(() => []),
      api.getLikesCount(apiType, currentId).catch(() => 0)
    ]);

    let userLiked = false;
    let userFavorited = false;
    if (currentUser) {
      [userLiked, userFavorited] = await Promise.all([
        api.checkLiked(apiType, currentId).catch(() => false),
        api.checkFavorite(apiType, currentId).catch(() => false)
      ]);
    }
    
    renderContent(content, cfg, related, comments, likesCount, userLiked, userFavorited);
    initEvents(apiType, currentId, comments.length, userLiked, userFavorited, likesCount);
    
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

  updatePageMeta(title, description, image || 'https://bf1-tv-mobile.onrender.com/logo.png');

  const isYoutube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
  
  container.innerHTML = `
    <div class="detail-layout">
      <div class="detail-main">
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
          
          <div class="content-actions">
            <button class="action-btn like-btn ${userLiked ? 'active' : ''}" id="like-btn">
              <i class="bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
              <span id="like-count">${formatNumber(likesCount)}</span>
            </button>
            ${content.allow_comments === false ? `
              <button class="action-btn comment-btn-disabled" id="comment-btn-disabled" title="Commentaires désactivés">
                <i class="bi bi-lock-fill"></i>
              </button>
            ` : `
              <button class="action-btn comment-btn" id="comment-btn">
                <i class="bi bi-chat-dots"></i>
                <span id="comment-count">${comments.length}</span>
              </button>
            `}
            <button class="action-btn favorite-btn ${userFavorited ? 'active' : ''}" id="favorite-btn">
              <i class="bi ${userFavorited ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
              <span>Favoris</span>
            </button>
            <button class="action-btn share-btn" id="share-btn">
              <i class="bi bi-share-fill"></i>
              <span>Partager</span>
            </button>
          </div>
          
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
        
        ${(content.allow_comments === false) ? `
          <div class="comments-section comments-disabled" id="comments-section-disabled" style="text-align:center; color:#b0b0b0; padding:2rem 0;">
            <i class="bi bi-lock-fill" style="font-size:2rem;"></i>
            <div style="margin-top:10px; font-size:1rem;">Les commentaires sont désactivés pour cette actualité.</div>
          </div>
        ` : `
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
                <button id="submit-comment" class="btn-red">
                  <span class="btn-text">Envoyer</span>
                  <span class="btn-spinner" style="display: none;">
                    <i class="bi bi-hourglass-split"></i>
                  </span>
                </button>
              </div>
            ` : `
              <div class="comment-login-prompt">
                <p><a href="connexion.html">Connectez-vous</a> pour laisser un commentaire</p>
              </div>
            `}
          </div>
        `}
      </div>
      
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

  // Gestion du clic sur le bouton commentaire désactivé (avec toast)
  if (content.allow_comments === false) {
    const btnDisabled = document.getElementById('comment-btn-disabled');
    if (btnDisabled) {
      btnDisabled.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Les commentaires sont désactivés pour cette actualité.', 'info');
      });
    }
  }
}

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

function renderVideoPlayer(videoUrl, poster) {
  return `
    <video controls autoplay playsinline poster="${poster || ''}" class="video-player">
      <source src="${videoUrl}" type="video/mp4">
      Votre navigateur ne supporte pas la lecture vidéo.
    </video>
  `;
}

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function renderComments(comments, user) {
  if (!comments.length) {
    return `<p class="no-comments">Aucun commentaire pour l'instant. Soyez le premier !</p>`;
  }
  
  return comments.map(c => {
    const isOwn = user && String(c.user_id) === String(user.id);
    const username = c.username || c.user?.username || 'Utilisateur';
    const avatar = (username[0] || 'U').toUpperCase();
    
    return `
      <div class="comment-item" data-id="${c.id || c._id}" data-text="${escapeHtml(c.text)}">
        <div class="comment-avatar" style="background: var(--primary, #e8222a);">${escapeHtml(avatar)}</div>
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

function renderRelatedItem(item, currentType) {
  const title = item.title || 'Sans titre';
  const image = getImageUrl(item.image_url || item.image || item.thumbnail);
  const duration = item.duration_minutes || item.duration;
  const id = item.id || item._id;
  let type = item._contentType || currentType;
  type = normalizeApiType(type);
  
  return `
    <div class="related-item" onclick="redirectToDetail('${id}', '${type}', '${escapeHtml(title)}')">
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
function initEvents(apiType, contentId, commentsCount, userLiked, userFavorited, likesCount) {
  let currentLiked = userLiked;
  let currentFavorited = userFavorited;
  let currentLikesCount = likesCount;
  let currentCommentsCount = commentsCount;
  
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
        const res = await api.toggleLike(apiType, contentId);
        currentLiked = res?.liked ?? !currentLiked;
        currentLikesCount = res?.count ?? (currentLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1));
        const icon = likeBtn.querySelector('i');
        const countSpan = likeBtn.querySelector('#like-count');
        if (icon) icon.className = currentLiked ? 'bi bi-heart-fill' : 'bi bi-heart';
        likeBtn.classList.toggle('active', currentLiked);
        if (countSpan) countSpan.textContent = formatNumber(currentLikesCount);
        showToast(currentLiked ? 'Like ajouté' : 'Like retiré', 'success');
      } catch (err) {
        console.error('Erreur like:', err);
        showToast('Erreur lors du like', 'error');
      }
      likeBtn.disabled = false;
    });
  }

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
          await api.removeFavorite(apiType, contentId);
          currentFavorited = false;
        } else {
          await api.addFavorite(apiType, contentId);
          currentFavorited = true;
        }
        const icon = favBtn.querySelector('i');
        icon.className = currentFavorited ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
        favBtn.classList.toggle('active', currentFavorited);
        showToast(currentFavorited ? 'Ajouté aux favoris' : 'Retiré des favoris', 'success');
      } catch (err) {
        console.error('Erreur favori:', err);
        showToast('Erreur lors de l\'ajout aux favoris', 'error');
      }
      favBtn.disabled = false;
    });
  }
  
  const commentBtn = document.getElementById('comment-btn');
  if (commentBtn) {
    commentBtn.addEventListener('click', () => {
      document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
  
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
      
      // Afficher le spinner et désactiver le bouton
      const btnText = submitBtn.querySelector('.btn-text');
      const btnSpinner = submitBtn.querySelector('.btn-spinner');
      if (btnText) btnText.style.display = 'none';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      submitBtn.disabled = true;
      commentInput.disabled = true;
      
      try {
        await api.addComment(apiType, contentId, text);
        commentInput.value = '';
        const comments = await api.getComments(apiType, contentId);
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
      } finally {
        // Restaurer l'état du bouton
        if (btnText) btnText.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
        submitBtn.disabled = false;
        commentInput.disabled = false;
        commentInput.focus();
      }
    });
  }
  
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
  
  initYoutubePlayers();
  
  // Gestion des actions sur les commentaires (edit/suppr) avec modals personnalisés
  const commentsList = document.getElementById('comments-list');
  if (commentsList) {
    commentsList.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.edit-comment');
      const deleteBtn = e.target.closest('.delete-comment');
      if (editBtn) {
        const commentId = editBtn.dataset.id;
        const commentItem = editBtn.closest('.comment-item');
        const commentTextElem = commentItem.querySelector('.comment-text');
        const oldText = commentTextElem ? commentTextElem.textContent : '';
        showEditModal(oldText, async (newText) => {
          if (newText && newText.trim() && newText !== oldText) {
            try {
              await api.updateComment(commentId, newText.trim());
              const comments = await api.getComments(apiType, contentId);
              commentsList.innerHTML = renderComments(comments, currentUser);
              showToast('Commentaire modifié', 'success');
            } catch (err) {
              showToast('Erreur lors de la modification', 'error');
            }
          }
        });
      } else if (deleteBtn) {
        const commentId = deleteBtn.dataset.id;
        showConfirmModal('Supprimer ce commentaire ?', async (confirmed) => {
          if (confirmed) {
            try {
              await api.deleteComment(commentId);
              const comments = await api.getComments(apiType, contentId);
              commentsList.innerHTML = renderComments(comments, currentUser);
              showToast('Commentaire supprimé', 'success');
            } catch (err) {
              showToast('Erreur lors de la suppression', 'error');
            }
          }
        });
      }
    });
  }
}

// Modal personnalisé pour l'édition
function showEditModal(oldText, onSave) {
  removeExistingModals();
  
  const modal = document.createElement('div');
  modal.className = 'custom-modal-overlay';
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="custom-modal-header">
        <h3><i class="bi bi-pencil-square"></i> Modifier le commentaire</h3>
        <button class="custom-modal-close">&times;</button>
      </div>
      <div class="custom-modal-body">
        <textarea id="edit-comment-textarea" rows="4" placeholder="Votre commentaire...">${escapeHtml(oldText)}</textarea>
      </div>
      <div class="custom-modal-footer">
        <button class="btn-cancel">Annuler</button>
        <button class="btn-save">Enregistrer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const textarea = modal.querySelector('#edit-comment-textarea');
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  
  modal.querySelector('.custom-modal-close').onclick = () => modal.remove();
  modal.querySelector('.btn-cancel').onclick = () => modal.remove();
  modal.querySelector('.btn-save').onclick = () => {
    const newText = textarea.value.trim();
    modal.remove();
    onSave(newText);
  };
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Modal personnalisé pour la confirmation
function showConfirmModal(message, onConfirm) {
  removeExistingModals();
  
  const modal = document.createElement('div');
  modal.className = 'custom-modal-overlay';
  modal.innerHTML = `
    <div class="custom-modal custom-modal-confirm">
      <div class="custom-modal-header">
        <h3><i class="bi bi-question-circle-fill"></i> Confirmation</h3>
        <button class="custom-modal-close">&times;</button>
      </div>
      <div class="custom-modal-body">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="custom-modal-footer">
        <button class="btn-cancel">Annuler</button>
        <button class="btn-confirm">Oui, supprimer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  modal.querySelector('.custom-modal-close').onclick = () => {
    modal.remove();
    onConfirm(false);
  };
  modal.querySelector('.btn-cancel').onclick = () => {
    modal.remove();
    onConfirm(false);
  };
  modal.querySelector('.btn-confirm').onclick = () => {
    modal.remove();
    onConfirm(true);
  };
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      onConfirm(false);
    }
  });
}

function removeExistingModals() {
  const existingModals = document.querySelectorAll('.custom-modal-overlay');
  existingModals.forEach(modal => modal.remove());
}

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

function copyToClipboard() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('Lien copié dans le presse-papier', 'success');
  }).catch(() => {
    showToast('Erreur lors de la copie', 'error');
  });
}

function showToast(message, type = 'info') {
  // Supprimer les toasts existants
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}"></i>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    min-width: 200px;
    max-width: 80%;
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(message) {
  const container = document.getElementById('detail-container');
  if (container) {
    container.innerHTML = `
      <div class="error-container text-center py-5">
        <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: var(--primary, #e8222a);"></i>
        <h3 class="mt-3">Erreur</h3>
        <p>${escapeHtml(message)}</p>
        <button onclick="history.back()" class="btn-outline mt-3">Retour</button>
      </div>
    `;
  }
}

// Initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadContentDetail();
  });
} else {
  loadContentDetail();
}