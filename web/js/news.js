import * as api from '../../shared/services/api.js';
import { getNewsDetailUrl } from '/shared/utils/slug-utils.js';

let flashInfoData = [];
let currentFilter = 'Tous';
let isLoading = false;

// Variables de pagination
let currentPage = 1;
let itemsPerPage = 12;
let totalPages = 1;

export async function loadFlashInfo() {
  const container = document.querySelector('.flash-layout > div:first-child');
  const filterContainer = document.querySelector('.filter-pills');
  
  if (!container) return;

  // Afficher loader
  isLoading = true;
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="mt-3 text-secondary">Chargement des flash infos...</p>
    </div>
  `;

  try {
    // Charger TOUTES les news depuis l'API (comme le mobile)
    const newsData = await api.getNews();
    
    // Garder TOUTES les news, pas seulement les flash infos
    flashInfoData = Array.isArray(newsData) ? newsData : [];

    // Construire les filtres dynamiquement
    if (filterContainer) {
      renderFilters(filterContainer);
    }

    // Afficher les news
    // Afficher les flash infos
    renderFlashInfoList(container);

  } catch (error) {
    console.error('❌ Erreur chargement flash info:', error);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-lightning-charge" style="font-size:3rem;color:#666;"></i>
        <p class="mt-3 text-secondary">Impossible de charger les flash infos</p>
        <button class="btn btn-outline-danger btn-sm mt-2" onclick="loadFlashInfo()">
          <i class="bi bi-arrow-clockwise"></i> Réessayer
        </button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

function renderFilters(container) {
  // Extraire les catégories uniques depuis les données réelles
  const categories = ['Tous'];
  const seen = new Set();
  
  flashInfoData.forEach(item => {
    const cat = item.category || item.edition || 'Flash Info';
    if (!seen.has(cat)) {
      seen.add(cat);
      categories.push(cat);
    }
  });

  // Garder les filtres existants s'il y a des données réelles
  if (flashInfoData.length > 0) {
    container.innerHTML = '';
    
    categories.forEach(category => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-pill';
      if (category === currentFilter) {
        btn.classList.add('active');
      }
      btn.innerHTML = `<i class="bi bi-grid-fill"></i>${category}`;
      
      btn.addEventListener('click', () => {
        currentFilter = category;
        currentPage = 1; // Réinitialiser à la page 1 quand on change de filtre
        container.querySelectorAll('.filter-pill').forEach(b => {
          b.classList.toggle('active', b.textContent.includes(category));
        });
        const mainContainer = document.querySelector('.flash-layout > div:first-child');
        if (mainContainer) renderFlashInfoList(mainContainer);
      });

      container.appendChild(btn);
    });
  }
  // Sinon garder les filtres par défaut
}

function renderFlashInfoList(container) {
  // Filtrer par catégorie
  let filtered = flashInfoData;
  
  if (currentFilter !== 'Tous') {
    filtered = filtered.filter(item => 
      (item.category || item.edition) === currentFilter
    );
  }

  // Trier par date (plus récent en premier)
  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.created_at || a.published_at || 0);
    const dateB = new Date(b.created_at || b.published_at || 0);
    return dateB - dateA;
  });

  // Calculer la pagination
  totalPages = Math.ceil(sorted.length / itemsPerPage);
  
  // S'assurer que currentPage est valide
  if (currentPage > totalPages) currentPage = 1;
  if (currentPage < 1) currentPage = 1;

  // Calculer les indices pour la page actuelle
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = sorted.slice(startIndex, endIndex);

  // Si on a des données réelles, les afficher
  if (sorted.length > 0) {
    // Afficher les articles de la page actuelle
    const articlesHTML = pageItems.map((item, index) => buildFlashInfoCard(item, startIndex + index)).join('');
    
    // Ajouter les contrôles de pagination
    const paginationHTML = renderPagination();
    
    container.innerHTML = `
      ${articlesHTML}
      ${paginationHTML}
    `;
    
    updateTrendsSection(sorted);
  } else {
    // Sinon garder le contenu par défaut (les données fictives)
    // Ne rien faire, le HTML par défaut reste
  }
}

function renderPagination() {
  if (totalPages <= 1) return '';

  let paginationHTML = '<div class="pagination-container">';
  
  // Bouton Précédent
  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  paginationHTML += `
    <button class="pagination-btn ${prevDisabled}" onclick="changePage(${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i> Précédent
    </button>
  `;
  
  // Numéros de pages
  paginationHTML += '<div class="pagination-numbers">';
  
  // Logique pour afficher les numéros de pages
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  
  // Ajuster si on est près du début ou de la fin
  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  }
  if (currentPage >= totalPages - 2) {
    startPage = Math.max(1, totalPages - 4);
  }
  
  // Page 1 si pas dans la plage
  if (startPage > 1) {
    paginationHTML += `<button class="pagination-number" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
  }
  
  // Pages dans la plage
  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === currentPage ? 'active' : '';
    paginationHTML += `<button class="pagination-number ${activeClass}" onclick="changePage(${i})">${i}</button>`;
  }
  
  // Dernière page si pas dans la plage
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
    paginationHTML += `<button class="pagination-number" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }
  
  paginationHTML += '</div>';
  
  // Bouton Suivant
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';
  paginationHTML += `
    <button class="pagination-btn ${nextDisabled}" onclick="changePage(${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>
      Suivant <i class="bi bi-chevron-right"></i>
    </button>
  `;
  
  paginationHTML += '</div>';
  
  // Info sur la pagination
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, flashInfoData.length);
  paginationHTML += `
    <div class="pagination-info">
      Affichage de ${startItem} à ${endItem} sur ${flashInfoData.length} articles
    </div>
  `;
  
  return paginationHTML;
}

// Fonction globale pour changer de page
window.changePage = function(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  const mainContainer = document.querySelector('.flash-layout > div:first-child');
  if (mainContainer) renderFlashInfoList(mainContainer);
  
  // Scroll vers le haut
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function buildFlashInfoCard(item, index) {
  // Gestion des images comme dans le mobile
  const img = item.image_url || item.image || item.thumbnail || '';
  const category = item.category || item.edition || 'Actualités';
  const title = item.title || 'Sans titre';
  const description = item.description || item.content || '';
  const author = item.author || 'Rédaction';
  const time = formatTime(item.created_at || item.published_at || item.time);
  const isUrgent = item.priority === 'urgent' || item.is_breaking_news;

  // Construire l'URL de l'image avec le backend si nécessaire
  let imageUrl = img;
  if (img && !img.startsWith('http') && !img.startsWith('data:')) {
    imageUrl = `https://backend-bf1tv.onrender.com${img.startsWith('/') ? img : '/' + img}`;
  }

  return `
    <div class="news-item anim-up d${(index % 6) + 1} ${isUrgent ? 'urgent-flash' : ''}" 
         onclick="window.location.href='${getNewsDetailUrl(item.title, item.id || item._id)}'">
      <img class="news-thumb" src="${imageUrl || '/logo.png'}" 
           alt="${escHtml(title)}" 
           onerror="this.src='/logo.png'"/>
      <div>
        <span class="news-cat">
          <i class="bi bi-lightning-fill"></i>${escHtml(category)}
          ${isUrgent ? '<span class="ms-1">⚡</span>' : ''}
        </span>
        <div class="news-title">${escHtml(title)}</div>
        <div class="news-excerpt">${escHtml(description)}</div>
        <div class="news-meta">${escHtml(author)} · ${time}</div>
      </div>
    </div>
  `;
}

function updateTrendsSection(allFlashInfo) {
  // Prendre les 3 flash infos les plus vues ou les plus récents
  const trends = [...allFlashInfo]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3);

  if (trends.length > 0) {
    const trendsHTML = trends.map((item, index) => {
      const img = item.image_url || item.image || '';
      const category = item.category || item.edition || 'Flash Info';
      const title = item.title || 'Sans titre';
      
      return `
        <div class="news-item" style="padding:10px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid var(--border);cursor:pointer;transition:all var(--transition)"
             onclick="window.location.href='${getNewsDetailUrl(item.title, item.id || item._id)}'">
          <img class="news-thumb" src="${img || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=120&q=60'}" 
               alt="${escHtml(title)}" 
               style="width:70px;height:50px;border-radius:var(--radius-sm)"
               onerror="this.src='https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=120&q=60'"/>
          <div>
            <span class="news-cat" style="font-size:0.6rem;padding:2px 6px">
              <i class="bi bi-lightning-fill"></i>${escHtml(category)}
            </span>
            <div class="news-title" style="font-size:0.8rem">${escHtml(title)}</div>
          </div>
        </div>
      `;
    }).join('');

    // Mettre à jour le conteneur des tendances si on a des données
    const trendsContainer = document.querySelector('.flash-layout > div:last-child div[style*="flex-direction"]');
    if (trendsContainer && trendsHTML) {
      trendsContainer.innerHTML = trendsHTML;
    }
  }
  // Sinon garder les tendances par défaut
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
    
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } catch {
    return 'Récemment';
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Auto-refresh toutes les 30 secondes pour les flash infos urgents
setInterval(() => {
  if (!isLoading) {
    loadFlashInfo();
  }
}, 30000);

// Exporter pour utilisation globale
window.loadFlashInfo = loadFlashInfo;