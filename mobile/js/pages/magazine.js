import * as api from '../services/api.js';
import { injectCardStyles } from '../utils/cardStyles.js';
import { createPageSpinner } from '../utils/snakeLoader.js';
import { setupInfiniteScroll } from '../utils/infiniteScroll.js';
import { injectSortBar, applySortFilter } from '../utils/sortFilter.js';

const LIMIT = 20;
let allShows = [];
let currentMode = 'grid';
let currentSort = 'recent';
let currentSkip = 0;
let currentTotal = 0;

export async function loadMagazine() {
  const listEl = document.getElementById('magazine-list');
  const toggleBtn = document.getElementById('magazine-toggle-btn');
  if (!listEl) return;

  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const catFilter = hashParams.get('cat') || window._pendingCatFilter || null;
  if (window._pendingCatFilter) window._pendingCatFilter = null;

  allShows = []; currentSkip = 0; currentTotal = 0; currentSort = 'recent';
  listEl.innerHTML = '';
  listEl.appendChild(createPageSpinner());

  const pageTitle = document.querySelector('#magazine-page .page-title');
  if (pageTitle && catFilter) pageTitle.textContent = catFilter;

  injectSortBar('magazine-page', (order) => {
    currentSort = order;
    renderList(listEl);
  });

  try {
    const data = await api.getMagazine(0, LIMIT, catFilter).catch(() => ({ items: [], total: 0 }));
    allShows = data.items || [];
    currentSkip = allShows.length;
    currentTotal = data.total || 0;

    injectCardStyles();
    renderList(listEl);
    setupInfiniteScroll({
      listEl, sentinelId: 'magazine-sentinel',
      fetchFn: (skip, limit) => api.getMagazine(skip, limit),
      renderCard: (item) => currentMode === 'grid' ? buildGridCard(item) : buildListCard(item),
      getSkip: () => currentSkip,
      getTotal: () => currentTotal,
      onNewItems: (items, total) => {
        allShows = [...allShows, ...items];
        currentSkip += items.length;
        if (total) currentTotal = total;
      },
      getMode: () => currentMode,
      gridCols: 2, limit: LIMIT
    });

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('magazine-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
        setupInfiniteScroll({
          listEl, sentinelId: 'magazine-sentinel',
          fetchFn: (skip, limit) => api.getMagazine(skip, limit),
          renderCard: (item) => currentMode === 'grid' ? buildGridCard(item) : buildListCard(item),
          getSkip: () => currentSkip, getTotal: () => currentTotal,
          onNewItems: (items, total) => { allShows = [...allShows, ...items]; currentSkip += items.length; if (total) currentTotal = total; },
          getMode: () => currentMode, gridCols: 2, limit: LIMIT
        });
      });
    }

  } catch (err) {
    console.error('Erreur Magazine:', err);
    listEl.innerHTML = emptyState('bi-journal-richtext', 'Impossible de charger les magazines');
  }
}

function renderList(container) {
  if (!allShows.length) {
    container.innerHTML = emptyState('bi-journal-richtext', 'Aucun magazine disponible');
    return;
  }
  const sorted = applySortFilter(allShows, currentSort, 'created_at', 'published_at');
  const isGrid = currentMode === 'grid';
  const wrapStyle = isGrid ? 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' : '';
  container.innerHTML = `<div class="bf1-cards-wrapper px-3 pt-2 pb-3" style="${wrapStyle}">${sorted.map((item, index) => isGrid ? buildGridCard(item, index) : buildListCard(item, index)).join('')}</div>`;
  
  if (api.isAuthenticated()) {
    allShows.forEach((item, index) => {
      const contentId = item.id || item._id || '';
      if (contentId) {
        api.checkFavorite('magazine', contentId).then(isFavorited => {
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
  const img = item.image_url || item.image || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at || item.published_at);
  const id = item.id || item._id;
  
  const nouveauBadge = '';

  const addButton = `
    <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('magazine','${id}',this)" style="position:absolute;bottom:8px;right:8px;width:36px;height:36px;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;z-index:3;border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
      <i class="bi bi-plus-lg"></i>
    </div>
  `;

  return `
    <a href="#/show/magazine/${id}" class="bf1-content-card" style="--card-index:${index};text-decoration:none;display:block;width:100%;">
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
            <span><i class="bi bi-clock-fill"></i> ${time}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

function buildListCard(item, index = 0) {
  const img = item.image_url || item.image || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at || item.published_at);
  const id = item.id || item._id;
  
  return `
    <a href="#/show/magazine/${id}" class="bf1-list-card-link" style="--card-index:${index};text-decoration:none;display:block;animation:cardFadeIn 0.55s cubic-bezier(0.22,1,0.36,1) both;animation-delay:${index * 70}ms;opacity:0;">
      <div class="d-flex" style="background:#0a0a0a;border-radius:10px;overflow:hidden;cursor:pointer;box-shadow:0 2px 16px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);">
        <div style="flex-shrink:0;">
          ${img ? `<img src="${esc(img)}" alt="" style="width:120px;height:90px;object-fit:cover;transition:transform 0.3s ease;">` : placeholder('90px','120px')}
        </div>
        <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
          <p class="mb-1 fw-semibold" style="font-size:0.85rem;font-weight:700;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${esc(title)}</p>
          <div class="d-flex align-items-center gap-2" style="font-size:0.65rem;color:rgba(255,255,255,0.7);font-weight:500;">
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-eye" style="color:rgba(255,255,255,0.6);"></i>${views}</span>
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-heart-fill" style="color:#E23E3E;"></i>${likes}</span>
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-clock" style="color:rgba(255,255,255,0.6);"></i>${time}</span>
          </div>
        </div>
      </div>
    </a>
  `;
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
    if (m<1) return 'À l\'instant'; if (m<60) return `${m}m`;
    const h = Math.floor(m/60); if (h<24) return `${h}h`;
    const j = Math.floor(h/24); if (j<7) return `${j}j`;
    return new Date(d).toLocaleDateString('fr-FR',{month:'short',day:'numeric'});
  } catch { return 'Récemment'; }
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
