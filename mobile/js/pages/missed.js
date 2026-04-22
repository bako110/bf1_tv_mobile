import * as api from '../services/api.js';
import { injectCardStyles } from '../utils/cardStyles.js';
import { createPageSpinner } from '../utils/snakeLoader.js';
import { setupInfiniteScroll } from '../utils/infiniteScroll.js';
import { injectSortBar, applySortFilter } from '../utils/sortFilter.js';

const LIMIT = 20;
let allItems = [];
let currentMode = 'grid';
let currentSort = 'recent';
let currentSkip = 0;
let currentTotal = 0;

export async function loadMissed() {
  const listEl = document.getElementById('missed-list');
  const toggleBtn = document.getElementById('missed-toggle-btn');
  if (!listEl) return;

  allItems = []; currentSkip = 0; currentTotal = 0; currentSort = 'recent';
  listEl.innerHTML = '';
  listEl.appendChild(createPageSpinner());

  injectSortBar('missed-page', (order) => {
    currentSort = order;
    renderList(listEl);
    attachInfiniteScroll(listEl);
  });

  try {
    const data = await api.getMissed(0, LIMIT).catch(() => ({ items: [], total: 0 }));
    allItems = data.items || [];
    currentSkip = allItems.length;
    currentTotal = data.total || 0;

    injectCardStyles();
    renderList(listEl);
    attachInfiniteScroll(listEl);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('missed-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
        attachInfiniteScroll(listEl);
      });
    }

  } catch (err) {
    console.error('Erreur Rattrapage:', err);
    listEl.innerHTML = emptyState('bi-clock-history', 'Impossible de charger les contenus');
  }
}

function attachInfiniteScroll(listEl) {
  setupInfiniteScroll({
    listEl, sentinelId: 'missed-sentinel',
    fetchFn: (skip, limit) => api.getMissed(skip, limit),
    renderCard: (item) => currentMode === 'grid' ? buildGridCard(item) : buildListCard(item),
    getSkip: () => currentSkip, getTotal: () => currentTotal,
    onNewItems: (items, total) => {
      allItems = [...allItems, ...items];
      currentSkip += items.length;
      if (total) currentTotal = total;
    },
    getMode: () => currentMode, gridCols: 2, limit: LIMIT
  });
}

function renderList(container) {
  if (!allItems.length) {
    container.innerHTML = emptyState('bi-clock-history', 'Aucun contenu disponible');
    return;
  }
  const sorted = applySortFilter(allItems, currentSort, 'created_at', 'aired_at', 'published_at');
  const isGrid = currentMode === 'grid';
  const wrapStyle = isGrid ? 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' : '';
  container.innerHTML = `<div class="bf1-cards-wrapper px-3 pt-2 pb-3" style="${wrapStyle}">${sorted.map((item, index) => isGrid ? buildGridCard(item, index) : buildListCard(item, index)).join('')}</div>`;
  
  if (api.isAuthenticated()) {
    allItems.forEach((item, index) => {
      const contentId = item.id || item._id || '';
      if (contentId) {
        api.checkFavorite('missed', contentId).then(isFavorited => {
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
  const img = item.image_url || item.thumbnail || item.image || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at || item.aired_at);
  const id = item.id || item._id;

  const nouveauBadge = '';

  const addButton = `
    <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('missed','${id}',this)" style="position:absolute;bottom:8px;right:8px;width:36px;height:36px;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;z-index:3;border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
      <i class="bi bi-plus-lg"></i>
    </div>
  `;

  return `
    <a href="#/show/missed/${id}" class="bf1-content-card" style="--card-index:${index};text-decoration:none;display:block;width:100%;">
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
  const img = item.image_url || item.thumbnail || item.image || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at || item.aired_at);
  const id = item.id || item._id;

  return `
    <a href="#/show/missed/${id}" class="bf1-content-card" style="--card-index:${index};text-decoration:none;display:flex;gap:12px;width:100%;">
      <div style="width:120px;height:90px;flex-shrink:0;position:relative;border-radius:8px;overflow:hidden;">
        ${img ? `<img src="${esc(img)}" alt="${esc(title)}" style="width:100%;height:100%;object-fit:cover;">` : placeholder('120px')}
        <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('missed','${id}',this)" style="position:absolute;bottom:4px;right:4px;width:28px;height:28px;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;z-index:3;border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
          <i class="bi bi-plus-lg"></i>
        </div>
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;">
        <h3 style="font-size:14px;font-weight:600;margin:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:var(--text,#fff);">${esc(title)}</h3>
        <div style="display:flex;gap:12px;font-size:11px;color:var(--text-2,#888);">
          <span><i class="bi bi-eye-fill"></i> ${views}</span>
          <span><i class="bi bi-heart-fill"></i> ${likes}</span>
          <span><i class="bi bi-clock-fill"></i> ${time}</span>
        </div>
      </div>
    </a>
  `;
}

function emptyState(icon, msg) {
  return `<div style="text-align:center;padding:60px 20px;color:var(--text-2,#888);">
    <i class="bi ${icon}" style="font-size:3.5rem;opacity:0.5;"></i>
    <p style="margin-top:16px;font-size:15px;">${msg}</p>
  </div>`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function placeholder(h) {
  return `<div style="width:100%;height:${h};background:linear-gradient(135deg,#1a1a1a,#2a2a2a);display:flex;align-items:center;justify-content:center;color:#666;font-size:12px;">BF1</div>`;
}

function formatTime(dateString) {
  if (!dateString) return 'Récemment';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return 'Récemment';
  }
}

function formatViews(views) {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

window.toggleFavorite = async function(contentType, contentId, btn) {
  if (!api.isAuthenticated()) {
    if (window._showLoginModal) window._showLoginModal('Connectez-vous pour ajouter aux favoris');
    else alert('Connectez-vous pour ajouter aux favoris');
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
