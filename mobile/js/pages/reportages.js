import * as api from '../services/api.js';
import { injectCardStyles } from '../utils/cardStyles.js';
import { createPageSpinner } from '../utils/snakeLoader.js';
import { setupInfiniteScroll } from '../utils/infiniteScroll.js';
import { injectSortBar, applySortFilter } from '../utils/sortFilter.js';

const LIMIT = 20;
let allVideos = [];
let currentMode = 'grid';
let currentSort = 'recent';
let currentSkip = 0;
let currentTotal = 0;

export async function loadReportages() {
  const listEl = document.getElementById('reportages-list');
  const toggleBtn = document.getElementById('reportages-toggle-btn');
  if (!listEl) return;

  allVideos = []; currentSkip = 0; currentTotal = 0; currentSort = 'recent';
  listEl.innerHTML = '';
  listEl.appendChild(createPageSpinner());

  injectSortBar('reportages-page', (order) => {
    currentSort = order;
    renderList(listEl);
    attachInfiniteScroll(listEl);
  });

  try {
    const data = await api.getReportages(0, LIMIT).catch(() => ({ items: [], total: 0 }));
    allVideos = (data.items || []).map(v => ({ ...v, image_url: v.thumbnail || v.image_url || v.image }));
    currentSkip = allVideos.length;
    currentTotal = data.total || 0;

    renderList(listEl);
    attachInfiniteScroll(listEl);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('reportages-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
        attachInfiniteScroll(listEl);
      });
    }

    // Injecter les styles des cartes
    injectCardStyles();

  } catch (err) {
    console.error('Erreur Reportages:', err);
    listEl.innerHTML = emptyState('bi-camera-video', 'Impossible de charger les reportages');
  }
}

function attachInfiniteScroll(listEl) {
  setupInfiniteScroll({
    listEl, sentinelId: 'reportages-sentinel',
    fetchFn: async (skip, limit) => {
      const data = await api.getReportages(skip, limit);
      return { ...data, items: (data.items || []).map(v => ({ ...v, image_url: v.thumbnail || v.image_url || v.image })) };
    },
    renderCard: (item) => currentMode === 'grid' ? buildGridCard(item) : buildListCard(item),
    getSkip: () => currentSkip, getTotal: () => currentTotal,
    onNewItems: (items, total) => { allVideos = [...allVideos, ...items]; currentSkip += items.length; if (total) currentTotal = total; },
    getMode: () => currentMode, gridCols: 2, limit: LIMIT
  });
}

function renderList(container) {
  if (!allVideos.length) {
    container.innerHTML = emptyState('bi-camera-video', 'Aucun reportage disponible');
    return;
  }
  const sorted = applySortFilter(allVideos, currentSort, 'created_at', 'aired_at');
  const isGrid = currentMode === 'grid';
  const wrapStyle = isGrid ? 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' : '';
  container.innerHTML = `<div class="bf1-cards-wrapper px-3 pt-2 pb-3" style="${wrapStyle}">${sorted.map((item, index) => currentMode === 'grid' ? buildGridCard(item, index) : buildListCard(item, index)).join('')}</div>`;
  
  // Vérifier l'état des favoris si connecté
  if (api.isAuthenticated()) {
    allVideos.forEach((item, index) => {
      const contentId = item.id || item._id || '';
      if (contentId) {
        api.checkFavorite('reportage', contentId).then(isFavorited => {
          const cards = container.querySelectorAll('.bf1-content-card');
          const card = cards[index];
          if (card && isFavorited) {
            const btn = card.querySelector('[onclick*="toggleFavorite"]');
            if (btn) {
              const icon = btn.querySelector('i');
              if (icon) {
                icon.className = 'bi bi-check-lg';
                btn.style.background = 'rgba(14,122,254,0.9)';
              }
            }
          }
        }).catch(() => {});
      }
    });
  }
}

function buildGridCard(item, index = 0) {
  const img = item.image_url || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views_count || item.views || 0);
  const likes = formatViews(item.likes || 0);
  const date = formatTime(item.aired_at || item.created_at);
  const id = item.id || item._id;

  // Badge "Nouveau" supprimé
  const nouveauBadge = '';

  // Bouton + en bas à droite
  const addButton = `
    <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('reportage','${id}',this)" style="position:absolute;bottom:8px;right:8px;width:36px;height:36px;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;z-index:3;border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
      <i class="bi bi-plus-lg"></i>
    </div>
  `;

  return `
    <a href="#/show/reportage/${id}" class="bf1-content-card" style="--card-index:${index};text-decoration:none;display:block;width:100%;">
      <div class="bf1-card-inner">
        <div class="bf1-card-image-wrapper">
          ${img ? `<img src="${esc(img)}" alt="${esc(title)}" class="bf1-card-image">` : placeholder('320px')}
          ${nouveauBadge}
          ${addButton}
        </div>
        <div class="bf1-card-content">
          <h3 class="bf1-card-title">${esc(title)}</h3>
          <div class="bf1-card-stats">
            <span><i class="bi bi-eye-fill"></i> ${views}</span>
            <span class="bf1-likes"><i class="bi bi-heart-fill"></i> ${likes}</span>
            <span><i class="bi bi-clock-fill"></i> ${date}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

function buildListCard(item, index = 0) {
  const img = item.image_url || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views_count || item.views || 0);
  const likes = formatViews(item.likes || 0);
  const date = formatTime(item.aired_at || item.created_at);
  const id = item.id || item._id;

  return `
    <a href="#/show/reportage/${id}" class="bf1-list-card-link" style="--card-index:${index};text-decoration:none;">
      <div class="d-flex" style="background:#0a0a0a;border-radius:10px;overflow:hidden;cursor:pointer;box-shadow:0 2px 16px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);">
        <div style="flex-shrink:0;">
          ${img ? `<img src="${esc(img)}" alt="" style="width:120px;height:90px;object-fit:cover;transition:transform 0.3s ease;">` : placeholder('90px','120px')}
        </div>
        <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
          <p class="mb-1 fw-semibold" style="font-size:0.85rem;font-weight:700;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${esc(title)}</p>
          <div class="d-flex align-items-center gap-2" style="font-size:0.65rem;color:rgba(255,255,255,0.7);font-weight:500;">
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-eye" style="color:rgba(255,255,255,0.6);"></i>${views}</span>
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-heart-fill" style="color:#E23E3E;"></i>${likes}</span>
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-calendar3" style="color:rgba(255,255,255,0.6);"></i>${date}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

// Styles de cartes gérés par cardStyles.js (importé en haut)

function _removedInjectCardStyles() {
  // SUPPRIMÉ - Utiliser import { injectCardStyles } from '../utils/cardStyles.js'
  const oldStyle = document.getElementById('bf1-card-styles');
  if (oldStyle) oldStyle.remove();
  
  const style = document.createElement('style');
  style.id = 'bf1-card-styles';
  style.textContent = `
    /* ===== CARDS GRID ===== */
    .bf1-content-card {
      flex-shrink: 0;
      text-decoration: none;
      display: block;
      cursor: pointer;
      animation: cardFadeIn 0.5s ease-out forwards;
      animation-delay: calc(var(--card-index) * 0.05s);
      opacity: 0;
    }

    .bf1-card-inner {
      position: relative;
      width: 100%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bf1-content-card:active .bf1-card-inner {
      transform: scale(0.97);
    }

    .bf1-card-image-wrapper {
      position: relative;
      width: 100%;
      height: 240px;
      border-radius: 16px;
      overflow: hidden;
      background: #1a1a1a;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .bf1-card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bf1-content-card:hover .bf1-card-image {
      transform: scale(1.05);
    }

    .bf1-card-content {
      padding: 12px 0 0;
    }

    .bf1-card-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 8px;
      color: white;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      letter-spacing: -0.2px;
    }

    .bf1-card-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 500;
    }

    .bf1-card-stats span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .bf1-card-stats i {
      font-size: 11px;
    }

    .bf1-likes {
      color: #E23E3E !important;
    }

    .bf1-likes i {
      color: #E23E3E !important;
    }

    /* ===== LIST CARDS ===== */
    .bf1-list-card-link {
      display: block;
      margin-bottom: 12px;
      animation: cardFadeIn 0.5s ease-out forwards;
      animation-delay: calc(var(--card-index) * 0.05s);
      opacity: 0;
    }

    .bf1-list-card-link > div:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) !important;
    }

    .bf1-list-card-link > div:hover img {
      transform: scale(1.1) !important;
    }

    .bf1-list-card-link:active > div {
      transform: scale(0.98);
    }

    /* ===== ANIMATIONS ===== */
    @keyframes cardFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ===== EMPTY STATE ===== */
    .bf1-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #999;
    }

    .bf1-empty-state i {
      font-size: 64px;
      color: #333;
      margin-bottom: 16px;
    }

    .bf1-empty-state p {
      font-size: 15px;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}

function formatDuration(d) {
  if (!d) return 'N/A';
  const m = parseInt(d);
  if (isNaN(m)) return 'N/A';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m/60), r = m%60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

function emptyState(icon, msg) { 
  return `<div class="bf1-empty-state"><i class="bi ${icon}"></i><p>${msg}</p></div>`; 
}

function placeholder(h, w='100%') { 
  return `<div style="width:${w};height:${h};background:#2a2a2a;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image" style="font-size:32px;color:#555;"></i></div>`; 
}

function formatViews(n) { 
  if (!n) return '0'; 
  if (n>=1e6) return (n/1e6).toFixed(1)+'M'; 
  if (n>=1e3) return (n/1e3).toFixed(1)+'K'; 
  return String(n); 
}

function formatTime(d) {
  if (!d) return 'Récemment';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff/60000);
    if (m<1) return 'À l\'instant'; 
    if (m<60) return `${m}m`;
    const h = Math.floor(m/60); 
    if (h<24) return `${h}h`;
    const j = Math.floor(h/24); 
    if (j<7) return `${j}j`;
    return new Date(d).toLocaleDateString('fr-FR',{month:'short',day:'numeric'});
  } catch { return 'Récemment'; }
}

function esc(s) { 
  if (!s) return ''; 
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); 
}

window.toggleFavorite = async function(contentType, contentId, btn) {
  if (!api.isAuthenticated()) {
    alert('Connectez-vous pour ajouter aux favoris');
    return;
  }
  const icon = btn.querySelector('i');
  const isFavorited = icon.classList.contains('bi-check-lg');
  icon.className = isFavorited ? 'bi bi-plus-lg' : 'bi bi-check-lg';
  btn.style.background = isFavorited ? 'rgba(0,0,0,0.7)' : 'rgba(14,122,254,0.9)';
  try {
    if (isFavorited) {
      await api.removeFavorite(contentType, contentId);
    } else {
      await api.addFavorite(contentType, contentId);
    }
  } catch(e) {
    console.error('Erreur favori:', e);
    icon.className = isFavorited ? 'bi bi-check-lg' : 'bi bi-plus-lg';
    btn.style.background = isFavorited ? 'rgba(14,122,254,0.9)' : 'rgba(0,0,0,0.7)';
  }
};