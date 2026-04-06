import * as api from '../../shared/services/api.js';
import { slugify } from '/js/slugUtils.js';

let teleRealiteData = [];
let currentFilter = 'Tous';
let isLoading = false;
let currentPage = 1;
const itemsPerPage = 9;
let totalItems = 0;
let totalPages = 1;

async function fetchAndRender(page) {
  if (isLoading) return;
  const container = document.getElementById('teleRealiteArticles');
  if (!container) return;

  isLoading = true;
  const skip = (page - 1) * itemsPerPage;

  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
    </div>
  `;

  try {
    const res = await api.getTeleRealite(skip, itemsPerPage);
    const items = res.items || (Array.isArray(res) ? res : []);
    totalItems = res.total ?? items.length;
    totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    currentPage = page;

    teleRealiteData = items.map(item => ({
      ...item,
      _id: item._id || item.id,
      title: item.title || 'Sans titre',
      description: item.description || '',
      image: getImageUrl(item.image_url || item.image || item.thumbnail || item.poster),
      category: item.subcategory || item.type || item.category || 'Télé Réalité',
      author: item.author || item.host || item.created_by || 'BF1 TV',
      views: item.views || 0,
      likes: item.likes || 0,
      date: item.created_at || item.published_at || item.date || new Date(),
      tags: item.tags || [],
    }));

    if (teleRealiteData.length > 0) {
      const articlesHTML = teleRealiteData.map((item, i) => buildCard(item, i)).join('');
      const paginationHTML = renderPagination();
      container.innerHTML = `<div class="tele-realite-grid">${articlesHTML}</div>${paginationHTML}
        <div class="tele-realite-stats"><i class="bi bi-camera-video-fill"></i> ${totalItems} émission${totalItems > 1 ? 's' : ''} au total</div>`;
      updateTrendsSection(teleRealiteData);
    } else {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-camera-video-fill" style="font-size:3rem;color:#666;"></i>
          <p class="mt-3 text-secondary">Aucun contenu Télé Réalité disponible</p>
        </div>`;
    }
  } catch (error) {
    console.error('❌ Erreur chargement Télé Réalité:', error);
    container.innerHTML = `
      <div class="text-center py-5">
        <p class="mt-3 text-secondary">Erreur: ${error.message || 'Impossible de charger le contenu'}</p>
        <button class="btn btn-outline-danger btn-sm mt-2" onclick="window.loadTeleRealiteContent()">
          <i class="bi bi-arrow-clockwise"></i> Réessayer
        </button>
      </div>`;
  } finally {
    isLoading = false;
  }
}

export async function loadTeleRealiteContent() {
  const filterContainer = document.querySelector('.filter-pills');
  if (filterContainer) renderFilters(filterContainer);
  await fetchAndRender(1);
}

function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-bf1tv.onrender.com${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
}

function renderFilters(container) {
  const subcategories = new Set(['Tous']);
  teleRealiteData.forEach(item => {
    const subcat = item.subcategory || item.type || item.category;
    if (subcat && subcat !== 'Télé Réalité' && subcat !== 'tele_realite') {
      subcategories.add(subcat);
    }
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => { if (tag) subcategories.add(tag); });
    }
  });

  let categories = Array.from(subcategories);
  if (categories.length <= 1) {
    categories = ['Tous', 'Reality Show', 'Télé-crochet', 'Événement', 'Compétition', 'Documentaire'];
  }

  container.innerHTML = '';
  categories.forEach(category => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-pill' + (category === currentFilter ? ' active' : '');
    btn.innerHTML = `<i class="bi bi-camera-video-fill"></i>${category}`;
    btn.addEventListener('click', () => {
      currentFilter = category;
      currentPage = 1;
      container.querySelectorAll('.filter-pill').forEach(b => {
        b.classList.toggle('active', b.textContent.trim().includes(category));
      });
      fetchAndRender(1);
    });
    container.appendChild(btn);
  });
}

function buildCard(item, index) {
  const imageUrl = item.image || '';
  const category = item.category || 'Télé Réalité';
  const title = item.title || 'Sans titre';
  const description = item.description || '';
  const author = item.author || 'BF1 TV';
  const time = formatTime(item.date);
  const views = item.views || 0;
  const likes = item.likes || 0;

  return `
    <div class="tele-realite-card anim-up d${(index % 9) + 1}"
         onclick="window.location.href='detail-contenu.html?slug=${slugify(title)}&type=tele_realite'">
      <div class="tele-realite-card-image">
        <img src="${imageUrl || '/logo.png'}" alt="${escapeHtml(title)}" onerror="this.src='/logo.png'"/>
        <div class="tele-realite-card-overlay">
          <div class="card-play"><i class="bi bi-play-fill"></i></div>
        </div>
      </div>
      <div class="tele-realite-card-content">
        <div class="tele-realite-card-category">
          <i class="bi bi-camera-video-fill"></i> ${escapeHtml(category)}
        </div>
        <h3 class="tele-realite-card-title">${escapeHtml(title)}</h3>
        <p class="tele-realite-card-description">${escapeHtml(description.substring(0, 120))}${description.length > 120 ? '...' : ''}</p>
        <div class="tele-realite-card-meta">
          <span><i class="bi bi-person-fill"></i> ${escapeHtml(author)}</span>
          <span><i class="bi bi-clock-fill"></i> ${time}</span>
          <span><i class="bi bi-heart-fill"></i> ${formatNumber(likes)}</span>
          <span><i class="bi bi-eye-fill"></i> ${formatNumber(views)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderPagination() {
  if (totalPages <= 1) return '';

  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  if (currentPage <= 3) endPage = Math.min(5, totalPages);
  if (currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4);

  let nums = '';
  if (startPage > 1) {
    nums += `<button class="pagination-number" onclick="window.changeTeleRealitenPage(1)">1</button>`;
    if (startPage > 2) nums += '<span class="pagination-dots">...</span>';
  }
  for (let i = startPage; i <= endPage; i++) {
    nums += `<button class="pagination-number ${i === currentPage ? 'active' : ''}" onclick="window.changeTeleRealitenPage(${i})">${i}</button>`;
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) nums += '<span class="pagination-dots">...</span>';
    nums += `<button class="pagination-number" onclick="window.changeTeleRealitenPage(${totalPages})">${totalPages}</button>`;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return `
    <div class="pagination-container">
      <button class="pagination-btn ${prevDisabled}" onclick="window.changeTeleRealitenPage(${currentPage - 1})" ${prevDisabled}>
        <i class="bi bi-chevron-left"></i> Précédent
      </button>
      <div class="pagination-numbers">${nums}</div>
      <button class="pagination-btn ${nextDisabled}" onclick="window.changeTeleRealitenPage(${currentPage + 1})" ${nextDisabled}>
        Suivant <i class="bi bi-chevron-right"></i>
      </button>
    </div>
    <div class="pagination-info">Affichage de ${startItem} à ${endItem} sur ${totalItems} émissions</div>
  `;
}

function updateTrendsSection(allData) {
  const trendsContainer = document.querySelector('.flash-layout > div:last-child div[style*="flex-direction"]');
  if (!trendsContainer) return;

  const trends = [...allData].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  if (trends.length > 0) {
    trendsContainer.innerHTML = trends.map(item => {
      const img = item.image_url || item.image || item.thumbnail || '';
      const title = item.title || 'Sans titre';
      const views = item.views || 0;
      return `
        <div class="news-item" style="padding:10px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid var(--border);cursor:pointer;transition:all var(--transition)"
             onclick="window.location.href='detail-contenu.html?slug=${slugify(title)}&type=tele_realite'">
          <img class="news-thumb" src="${img || '/logo.png'}" alt="${escapeHtml(title)}"
               style="width:70px;height:50px;border-radius:var(--radius-sm);object-fit:cover"
               onerror="this.src='/logo.png'"/>
          <div>
            <span class="news-cat" style="font-size:0.6rem;padding:2px 6px">
              <i class="bi bi-eye-fill"></i> ${formatNumber(views)} vues
            </span>
            <div class="news-title" style="font-size:0.8rem">${escapeHtml(title)}</div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    trendsContainer.innerHTML = `
      <div class="text-center text-secondary py-3">
        <i class="bi bi-bar-chart-line" style="font-size:1.5rem;"></i>
        <p class="mt-2 small">Pas assez de données</p>
      </div>`;
  }
}

window.changeTeleRealitenPage = function(page) {
  if (page < 1 || page > totalPages) return;
  fetchAndRender(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

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
  } catch { return 'Récemment'; }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.loadTeleRealiteContent = loadTeleRealiteContent;
