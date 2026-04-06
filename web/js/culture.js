import * as api from '../../shared/services/api.js';
import { getNewsDetailUrl } from '/js/slugUtils.js';

let cultureData = [];
let currentFilter = 'Tous';
let isLoading = false;
let currentPage = 1;
let itemsPerPage = 12;
let totalPages = 1;

export async function loadCultureContent() {
  const container = document.querySelector('.flash-layout > div:first-child');
  const filterContainer = document.querySelector('.filter-pills');
  
  if (!container) return;

  isLoading = true;
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="mt-3 text-secondary">Chargement de la culture...</p>
    </div>
  `;

  try {
    const newsData = await api.getNews(200);
    cultureData = Array.isArray(newsData) ? newsData.filter(item => 
      (item.category === 'Culture' || item.edition === 'Culture')
    ) : [];

    if (filterContainer) {
      renderFilters(filterContainer);
    }
    renderCultureList(container);

  } catch (error) {
    console.error('❌ Erreur chargement culture:', error);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-palette-fill" style="font-size:3rem;color:#666;"></i>
        <p class="mt-3 text-secondary">Impossible de charger la culture</p>
        <button class="btn btn-outline-danger btn-sm mt-2" onclick="loadCultureContent()">
          <i class="bi bi-arrow-clockwise"></i> Réessayer
        </button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

function renderFilters(container) {
  const categories = ['Tous', 'Arts', 'Festivals', 'Traditions', 'Littérature', 'Cinéma'];
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
      currentPage = 1;
      container.querySelectorAll('.filter-pill').forEach(b => {
        b.classList.toggle('active', b.textContent.includes(category));
      });
      const mainContainer = document.querySelector('.flash-layout > div:first-child');
      if (mainContainer) renderCultureList(mainContainer);
    });

    container.appendChild(btn);
  });
}

function renderCultureList(container) {
  let filtered = cultureData;
  
  if (currentFilter !== 'Tous') {
    filtered = filtered.filter(item => 
      (item.subcategory || item.tags || '').toLowerCase().includes(currentFilter.toLowerCase())
    );
  }

  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.created_at || a.published_at || 0);
    const dateB = new Date(b.created_at || b.published_at || 0);
    return dateB - dateA;
  });

  totalPages = Math.ceil(sorted.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = 1;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = sorted.slice(startIndex, endIndex);

  if (sorted.length > 0) {
    const articlesHTML = pageItems.map((item, index) => buildCultureCard(item, startIndex + index)).join('');
    const paginationHTML = renderPagination();
    
    container.innerHTML = `${articlesHTML}${paginationHTML}`;
    updateTrendsSection(sorted);
  } else {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-palette-fill" style="font-size:3rem;color:#666;"></i>
        <p class="mt-3 text-secondary">Aucun contenu culturel disponible</p>
      </div>
    `;
  }
}

function buildCultureCard(item, index) {
  const img = item.image_url || item.image || item.thumbnail || '';
  const category = item.category || item.edition || 'Culture';
  const title = item.title || 'Sans titre';
  const description = item.description || item.content || '';
  const author = item.author || 'BF1 Culture';
  const time = formatTime(item.created_at || item.published_at || item.time);

  let imageUrl = img;
  if (img && !img.startsWith('http') && !img.startsWith('data:')) {
    imageUrl = `https://backend-bf1tv.onrender.com${img.startsWith('/') ? img : '/' + img}`;
  }

  return `
    <div class="news-item anim-up d${(index % 6) + 1}" 
         onclick="window.location.href='${getNewsDetailUrl(item.title, item.id || item._id)}'">
      <img class="news-thumb" src="${imageUrl || '/logo.png'}" 
           alt="${escHtml(title)}" 
           onerror="this.src='/logo.png'"/>
      <div>
        <span class="news-cat">
          <i class="bi bi-palette-fill"></i>${escHtml(category)}
        </span>
        <div class="news-title">${escHtml(title)}</div>
        <div class="news-excerpt">${escHtml(description)}</div>
        <div class="news-meta">${escHtml(author)} · ${time}</div>
      </div>
    </div>
  `;
}

function renderPagination() {
  if (totalPages <= 1) return '';
  let paginationHTML = '<div class="pagination-container">';
  
  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  paginationHTML += `<button class="pagination-btn ${prevDisabled}" onclick="changePage(${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}><i class="bi bi-chevron-left"></i> Précédent</button>`;
  
  paginationHTML += '<div class="pagination-numbers">';
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === currentPage ? 'active' : '';
    paginationHTML += `<button class="pagination-number ${activeClass}" onclick="changePage(${i})">${i}</button>`;
  }
  
  paginationHTML += '</div>';
  
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';
  paginationHTML += `<button class="pagination-btn ${nextDisabled}" onclick="changePage(${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>Suivant <i class="bi bi-chevron-right"></i></button>`;
  paginationHTML += '</div>';
  
  return paginationHTML;
}

function updateTrendsSection(allData) {
  const trends = [...allData].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
  if (trends.length > 0) {
    const trendsHTML = trends.map((item) => {
      const img = item.image_url || item.image || '';
      const title = item.title || 'Sans titre';
      return `
        <div class="news-item" style="padding:10px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid var(--border);cursor:pointer;transition:all var(--transition)"
             onclick="window.location.href='${getNewsDetailUrl(item.title, item.id || item._id)}'">
          <img class="news-thumb" src="${img || 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=120&q=60'}" 
               alt="${escHtml(title)}" style="width:70px;height:50px;border-radius:var(--radius-sm)"/>
          <div>
            <span class="news-cat" style="font-size:0.6rem;padding:2px 6px">
              <i class="bi bi-palette-fill"></i>Culture
            </span>
            <div class="news-title" style="font-size:0.8rem">${escHtml(title)}</div>
          </div>
        </div>
      `;
    }).join('');
    const trendsContainer = document.querySelector('.flash-layout > div:last-child div[style*="flex-direction"]');
    if (trendsContainer) trendsContainer.innerHTML = trendsHTML;
  }
}

window.changePage = function(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  const mainContainer = document.querySelector('.flash-layout > div:first-child');
  if (mainContainer) renderCultureList(mainContainer);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

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

window.loadCultureContent = loadCultureContent;
