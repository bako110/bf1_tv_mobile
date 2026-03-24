import * as api from '../../shared/services/api.js';

export async function loadNewsDetail() {
  // Récupérer l'ID depuis l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const newsId = urlParams.get('id');

  if (!newsId) {
    showError('ID de l\'actualité manquant');
    return;
  }

  try {
    // Charger les détails de la news
    const news = await api.getNewsById(newsId);
    
    if (!news) {
      showError('Actualité introuvable');
      return;
    }

    // Afficher les détails
    renderNewsDetail(news);

    // Charger les articles similaires
    loadRelatedNews(news.category || 'Actualités', newsId);

  } catch (error) {
    console.error('❌ Erreur chargement détails:', error);
    showError('Impossible de charger l\'actualité');
  }
}

function renderNewsDetail(news) {
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
    </div>
  `;

  // Fonction pour toggle le contenu
  window.toggleReadMore = function() {
    const preview = document.getElementById('contentPreview');
    const full = document.getElementById('contentFull');
    const btn = document.querySelector('.read-more-btn');
    
    if (full.style.display === 'none') {
      preview.style.display = 'none';
      full.style.display = 'block';
      btn.innerHTML = '<span>Lire moins</span><i class="bi bi-chevron-up"></i>';
    } else {
      preview.style.display = 'block';
      full.style.display = 'none';
      btn.innerHTML = '<span>Lire la suite</span><i class="bi bi-chevron-down"></i>';
      document.querySelector('.news-detail-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
}

async function loadRelatedNews(category, excludeId) {
  const container = document.getElementById('relatedNewsContainer');
  
  try {
    // Charger toutes les news
    const allNews = await api.getNews();
    
    if (!allNews || allNews.length === 0) {
      container.innerHTML = '<p class="text-secondary">Aucun article disponible</p>';
      return;
    }

    // Filtrer tous les articles sauf l'article actuel et trier par date
    const related = allNews
      .filter(item => (item.id || item._id) !== excludeId)
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.published_at || 0);
        const dateB = new Date(b.created_at || b.published_at || 0);
        return dateB - dateA; // Plus récent en premier
      })
      .slice(0, 10); // Afficher jusqu'à 10 articles

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
        <div class="related-news-card" onclick="window.location.href='news-detail.html?id=${item.id || item._id}'">
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
  
  // Diviser le contenu en lignes ou par longueur de caractères
  const lines = content.split('\n').filter(line => line.trim());
  
  // Si le contenu est court (3 lignes ou moins de 300 caractères), afficher tout
  if (lines.length <= 3 || content.length <= 300) {
    return { 
      preview: formatContent(content), 
      hasMore: false 
    };
  }
  
  // Prendre les 3 premières lignes et ajouter "..."
  const previewLines = lines.slice(0, 3);
  const previewText = previewLines.join('\n') + '\n...';
  
  return {
    preview: `<p style="white-space: pre-wrap;">${escHtml(previewText)}</p>`,
    hasMore: true
  };
}

// Fonction de debug pour voir le contenu
window.debugContent = function() {
  console.log('Content lines:', document.getElementById('contentPreview')?.textContent.split('\n').length);
};

function formatContent(content) {
  if (!content) return '<p>Contenu non disponible</p>';
  
  // Convertir les retours à la ligne en paragraphes
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

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(message) {
  const container = document.getElementById('newsDetailContainer');
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

// Exporter pour utilisation globale
window.loadNewsDetail = loadNewsDetail;
