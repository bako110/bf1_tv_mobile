import * as api from '../../shared/services/api.js';
import { getNewsBySlug, getNewsById, getNewsDetailUrl } from '/js/slugUtils.js';

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

let currentUser = null;
let currentNewsId = null;

export async function loadNewsDetail() {
  // Récupérer le slug ou l'ID depuis l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const newsSlug = urlParams.get('slug');
  const newsId = urlParams.get('id');

  if (!newsSlug && !newsId) {
    showError('ID ou slug de l\'actualité manquant');
    return;
  }

  try {
    // Charger les détails de la news par slug ou ID
    const news = newsSlug 
      ? await getNewsBySlug(newsSlug)
      : await getNewsById(newsId);
    
    if (!news) {
      showError('Actualité introuvable');
      return;
    }

    currentNewsId = news._id || news.id;
    currentUser = api.getUser();

    // Charger les commentaires et likes
    const [comments, likesCount] = await Promise.all([
      api.getComments('breaking_news', currentNewsId).catch(() => []),
      api.getLikesCount('breaking_news', currentNewsId).catch(() => 0)
    ]);

    // Vérifier les likes et favoris de l'utilisateur
    let userLiked = false;
    let userFavorited = false;
    if (api.isAuthenticated()) {
      [userLiked, userFavorited] = await Promise.all([
        api.checkLiked('breaking_news', currentNewsId).catch(() => false),
        api.checkFavorite('breaking_news', currentNewsId).catch(() => false)
      ]);
    }

    // Afficher les détails
    renderNewsDetail(news, comments, likesCount, userLiked, userFavorited);

    // Initialiser les événements
    initNewsEvents(currentNewsId, comments, userLiked, userFavorited, likesCount);

    // Charger les articles similaires
    loadRelatedNews(news.category || 'Actualités', currentNewsId);

  } catch (error) {
    console.error('❌ Erreur chargement détails:', error);
    showError('Impossible de charger l\'actualité');
  }
}

function renderNewsDetail(news, comments = [], likesCount = 0, userLiked = false, userFavorited = false) {
  const container = document.getElementById('newsDetailContainer');
  
  // Construire l'URL de l'image
  let imageUrl = news.image_url || news.image || news.thumbnail || '';
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    imageUrl = `https://backend-bf1tv.onrender.com${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  }

  const category = news.category || news.edition || 'Actualités';
  const title = news.title || 'Sans titre';
  const content = news.content || news.description || '';
  const author = news.author || 'Rédaction BF1';
  const publishedDate = formatDate(news.created_at || news.published_at);
  const views = news.views || 0;

  // Mettre à jour les méta Open Graph / Twitter dynamiquement
  updatePageMeta(title, content, imageUrl || 'https://bf1-tv-mobile.onrender.com/logo.png');

  // Créer l'aperçu du contenu (5 lignes max)
  const contentPreview = createContentPreview(content);

  container.innerHTML = `
    <div class="news-detail-hero">
      <img src="${imageUrl || '/logo.png'}" 
           alt="${escHtml(title)}"
           onerror="this.src='/logo.png'"/>
      <div class="news-detail-hero-content">
        <span class="news-detail-category">
          <i class="bi bi-lightning-fill"></i> ${escHtml(category)}
        </span>
        <h1 class="news-detail-title">${escHtml(title)}</h1>
        <div class="news-detail-meta">
          <span><i class="bi bi-person-fill"></i>${escHtml(author)}</span>
          <span><i class="bi bi-calendar3"></i>${publishedDate}</span>
          <span><i class="bi bi-eye-fill"></i>${formatNumber(views)} vues</span>
        </div>
      </div>
    </div>

    <div class="news-detail-content">
      <div id="contentPreview" class="content-preview">
        ${contentPreview.preview}
      </div>
      ${contentPreview.hasMore ? `
        <div id="contentFull" class="content-full" style="display: none;">
          ${formatContent(content)}
        </div>
        <button class="read-more-btn" onclick="toggleReadMore()">
          <span>Lire la suite</span>
          <i class="bi bi-chevron-down"></i>
        </button>
      ` : ''}

      <!-- Actions (Like, Favoris, Commentaires) -->
      <div class="news-actions">
        <button class="action-btn like-btn ${userLiked ? 'active' : ''}" id="like-btn">
          <i class="bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
          <span id="like-count">${formatNumber(likesCount)}</span>
        </button>
        <button class="action-btn favorite-btn ${userFavorited ? 'active' : ''}" id="favorite-btn">
          <i class="bi ${userFavorited ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
          <span>Favoris</span>
        </button>
        ${news.allow_comments === false ? `
          <button class="action-btn comment-btn-disabled" id="comment-btn-disabled" title="Commentaires désactivés" style="background: #eee; cursor: pointer;">
            <i class="bi bi-lock-fill" style="color: #b0b0b0;"></i>
          </button>
        ` : `
          <button class="action-btn comment-btn" id="comment-btn">
            <i class="bi bi-chat-dots"></i>
            <span id="comment-count">${comments.length}</span>
          </button>
        `}
      </div>

      <!-- Commentaires -->
      ${(news.allow_comments === false) ? `
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
  `;

  // Gestion du clic sur l'icône commentaire désactivé (avec toast au lieu d'alert)
  if (news.allow_comments === false) {
    const btnDisabled = document.getElementById('comment-btn-disabled');
    if (btnDisabled) {
      btnDisabled.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Les commentaires sont désactivés pour cette actualité.', 'info');
      });
    }
  }

  // Fonction pour toggle le contenu
  window.toggleReadMore = function() {
    const preview = document.getElementById('contentPreview');
    const full = document.getElementById('contentFull');
    const btn = document.querySelector('.read-more-btn');
    
    if (full && preview && btn) {
      if (full.style.display === 'none') {
        preview.style.display = 'none';
        full.style.display = 'block';
        btn.innerHTML = '<span>Lire moins</span><i class="bi bi-chevron-up"></i>';
      } else {
        preview.style.display = 'block';
        full.style.display = 'none';
        btn.innerHTML = '<span>Lire la suite</span><i class="bi bi-chevron-down"></i>';
      }
    }
  };
}

async function loadRelatedNews(category, excludeId) {
  const container = document.getElementById('relatedNewsContainer');
  
  try {
    const allNews = await api.getNews();
    
    if (!allNews || allNews.length === 0) {
      container.innerHTML = '<p class="text-secondary">Aucun article disponible</p>';
      return;
    }

    const related = allNews
      .filter(item => (item.id || item._id) !== excludeId)
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.published_at || 0);
        const dateB = new Date(b.created_at || b.published_at || 0);
        return dateB - dateA;
      })
      .slice(0, 10);

    if (related.length === 0) {
      container.innerHTML = '<p class="text-secondary">Aucun article disponible</p>';
      return;
    }

    container.innerHTML = related.map(item => {
      let imageUrl = item.image_url || item.image || item.thumbnail || '';
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        imageUrl = `https://backend-bf1tv.onrender.com${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
      }

      const title = item.title || 'Sans titre';
      const category = item.category || item.edition || 'Actualités';
      const date = formatDate(item.created_at || item.published_at);
      const views = item.views || 0;

      return `
        <div class="related-news-card" onclick="window.location.href='${getNewsDetailUrl(item.title, item.id || item._id)}'">
          <div class="related-news-image">
            <img src="${imageUrl || '/logo.png'}" 
                 alt="${escHtml(title)}"
                 onerror="this.src='/logo.png'"/>
            <div class="related-news-overlay">
              <i class="bi bi-arrow-right-circle"></i>
            </div>
          </div>
          <div class="related-news-body">
            <span class="related-news-category">
              <i class="bi bi-lightning-fill"></i> ${escHtml(category)}
            </span>
            <h3 class="related-news-title">${escHtml(title)}</h3>
            <div class="related-news-footer">
              <span><i class="bi bi-calendar3"></i> ${date}</span>
              <span><i class="bi bi-eye"></i> ${formatNumber(views)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Erreur chargement articles similaires:', error);
    container.innerHTML = '<p class="text-secondary">Impossible de charger les articles similaires</p>';
  }
}

function createContentPreview(content) {
  if (!content) return { preview: '<p>Contenu non disponible</p>', hasMore: false };
  
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length <= 3 || content.length <= 300) {
    return { 
      preview: formatContent(content), 
      hasMore: false 
    };
  }
  
  const previewLines = lines.slice(0, 3);
  const previewText = previewLines.join('\n') + '\n...';
  
  return {
    preview: `<p style="white-space: pre-wrap;">${escHtml(previewText)}</p>`,
    hasMore: true
  };
}

function formatContent(content) {
  if (!content) return '<p>Contenu non disponible</p>';
  
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map(p => `<p>${escHtml(p.trim())}</p>`).join('');
}

function formatDate(dateString) {
  if (!dateString) return 'Date inconnue';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Date inconnue';
  }
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatRelative(dateString) {
  if (!dateString) return 'À l\'instant';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}j`;
    
    return formatDate(dateString);
  } catch {
    return 'Date inconnue';
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderComments(comments, user) {
  if (!comments || !comments.length) {
    return `<p class="no-comments">Aucun commentaire pour l'instant. Soyez le premier !</p>`;
  }
  
  return comments.map(c => {
    const isOwn = user && String(c.user_id) === String(user.id);
    const username = c.username || c.user?.username || 'Utilisateur';
    const avatar = (username[0] || 'U').toUpperCase();
    
    return `
      <div class="comment-item" data-id="${c.id || c._id}">
        <div class="comment-avatar" style="background: var(--primary, #e8222a);">${escHtml(avatar)}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${escHtml(username)}</span>
            <span class="comment-date">${formatRelative(c.created_at)}</span>
            ${isOwn ? `
              <div class="comment-actions">
                <button class="edit-comment" data-id="${c.id || c._id}"><i class="bi bi-pencil"></i></button>
                <button class="delete-comment" data-id="${c.id || c._id}"><i class="bi bi-trash"></i></button>
              </div>
            ` : ''}
          </div>
          <p class="comment-text">${escHtml(c.text)}</p>
        </div>
      </div>
    `;
  }).join('');
}

function initNewsEvents(newsId, comments, userLiked, userFavorited, likesCount) {
  let currentLiked = userLiked;
  let currentFavorited = userFavorited;
  let currentLikesCount = likesCount;
  let currentCommentsCount = (comments || []).length;

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
        const res = await api.toggleLike('breaking_news', newsId);
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

  // Favoris
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
          await api.removeFavorite('breaking_news', newsId);
          currentFavorited = false;
        } else {
          await api.addFavorite('breaking_news', newsId);
          currentFavorited = true;
        }
        
        const icon = favBtn.querySelector('i');
        icon.className = currentFavorited ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
        favBtn.classList.toggle('active', currentFavorited);
        showToast(currentFavorited ? 'Ajouté aux favoris' : 'Retiré des favoris', 'success');
      } catch (err) {
        console.error('Erreur favoris:', err);
        showToast('Erreur lors de l\'ajout aux favoris', 'error');
      }
      favBtn.disabled = false;
    });
  }

  // Commentaires - Scroll vers la section
  const commentBtn = document.getElementById('comment-btn');
  if (commentBtn) {
    commentBtn.addEventListener('click', () => {
      const commentsSection = document.getElementById('comments-section');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Envoi de commentaire avec spinner
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
      
      // Afficher le spinner
      const btnText = submitBtn.querySelector('.btn-text');
      const btnSpinner = submitBtn.querySelector('.btn-spinner');
      if (btnText) btnText.style.display = 'none';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      submitBtn.disabled = true;
      commentInput.disabled = true;
      
      try {
        await api.addComment('breaking_news', newsId, text);
        commentInput.value = '';
        
        const newComments = await api.getComments('breaking_news', newsId);
        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
          commentsList.innerHTML = renderComments(newComments, currentUser);
        }
        
        currentCommentsCount = newComments.length;
        const commentCountSpan = document.getElementById('comment-count');
        const commentsCountSpan = document.getElementById('comments-count');
        if (commentCountSpan) commentCountSpan.textContent = currentCommentsCount;
        if (commentsCountSpan) commentsCountSpan.textContent = `(${currentCommentsCount})`;
        
        showToast('Commentaire ajouté', 'success');
      } catch (err) {
        console.error('Erreur commentaire:', err);
        showToast('Erreur lors de l\'envoi', 'error');
      } finally {
        // Restaurer l'état
        if (btnText) btnText.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
        submitBtn.disabled = false;
        commentInput.disabled = false;
        commentInput.focus();
      }
    });
  }

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
              const newComments = await api.getComments('breaking_news', newsId);
              commentsList.innerHTML = renderComments(newComments, currentUser);
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
              const newComments = await api.getComments('breaking_news', newsId);
              commentsList.innerHTML = renderComments(newComments, currentUser);
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
        <textarea id="edit-comment-textarea" rows="4" placeholder="Votre commentaire...">${escHtml(oldText)}</textarea>
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
        <p>${escHtml(message)}</p>
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

function showError(message) {
  const container = document.getElementById('newsDetailContainer');
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-triangle" style="font-size: 4rem; color: var(--red);"></i>
        <h2 class="mt-3">${escHtml(message)}</h2>
        <a href="/pages/flashinfo.html" class="btn btn-outline-danger mt-3">
          <i class="bi bi-arrow-left"></i> Retour aux Flash Infos
        </a>
      </div>
    `;
  }
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
      <span>${escHtml(message)}</span>
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

// Initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNewsDetail);
} else {
  loadNewsDetail();
}

// Exporter pour utilisation globale
window.loadNewsDetail = loadNewsDetail;