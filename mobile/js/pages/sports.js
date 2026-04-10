import * as api from '../services/api.js';
import { injectCardStyles } from '../utils/cardStyles.js';
import { createPageSpinner } from '../utils/snakeLoader.js';
import { setupInfiniteScroll } from '../utils/infiniteScroll.js';
import { injectSortBar, applySortFilter } from '../utils/sortFilter.js';

const LIMIT = 20;
let allSports = [];
let currentMode = 'grid';
let currentSort = 'recent';
let currentType = 'all';
let sportTypes = ['all'];
let currentSkip = 0;
let currentTotal = 0;

export async function loadSports() {
  const listEl = document.getElementById('sports-list');
  const catBar = document.getElementById('sports-categories');
  const toggleBtn = document.getElementById('sports-toggle-btn');
  if (!listEl) return;

  allSports = []; currentSkip = 0; currentTotal = 0; currentSort = 'recent';
  listEl.innerHTML = '';
  listEl.appendChild(createPageSpinner());

  injectSortBar('sports-page', (order) => {
    currentSort = order;
    renderList(listEl);
    attachInfiniteScroll(listEl);
  });

  try {
    const data = await api.getSports(0, LIMIT).catch(() => ({ items: [], total: 0 }));
    allSports = data.items || [];
    currentSkip = allSports.length;
    currentTotal = data.total || 0;

    // Extraire les types de sport uniques
    const seen = new Set();
    sportTypes = ['all'];
    allSports.forEach(s => { if (s.sport_type) seen.add(s.sport_type); });
    sportTypes = ['all', ...seen];

    if (catBar) renderCategories(catBar);
    renderList(listEl);
    attachInfiniteScroll(listEl);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('sports-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
        attachInfiniteScroll(listEl);
      });
    }

    // Injecter les styles des cartes
    injectCardStyles();

  } catch (err) {
    console.error('Erreur Sports:', err);
    listEl.innerHTML = emptyState('bi-basketball', 'Impossible de charger les sports');
  }
}

function attachInfiniteScroll(listEl) {
  setupInfiniteScroll({
    listEl, sentinelId: 'sports-sentinel',
    fetchFn: (skip, limit) => api.getSports(skip, limit),
    renderCard: (item) => currentMode === 'grid' ? buildGridCard(item) : buildListCard(item),
    getSkip: () => currentSkip, getTotal: () => currentTotal,
    onNewItems: (items, total) => {
      allSports = [...allSports, ...items];
      currentSkip += items.length;
      if (total) currentTotal = total;
      // Mettre à jour les types de sport
      items.forEach(s => { if (s.sport_type && !sportTypes.includes(s.sport_type)) sportTypes.push(s.sport_type); });
    },
    getMode: () => currentMode, gridCols: 2, limit: LIMIT
  });
}

function renderCategories(container) {
  container.innerHTML = '';
  sportTypes.forEach(type => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = type === 'all' ? 'Tous' : type.charAt(0).toUpperCase() + type.slice(1);
    applyBtnStyle(btn, type === currentType);
    btn.addEventListener('click', () => {
      currentType = type;
      container.querySelectorAll('button').forEach(b => applyBtnStyle(b, b.dataset.type === currentType));
      renderList(document.getElementById('sports-list'));
    });
    btn.dataset.type = type;
    container.appendChild(btn);
  });
}

function applyBtnStyle(btn, active) {
  btn.style.cssText = active
    ? 'background:#E23E3E;color:#fff;border:none;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;white-space:nowrap;flex-shrink:0;'
    : 'background:#1a1a1a;color:#B0B0B0;border:1px solid #333;border-radius:20px;padding:6px 16px;font-size:13px;white-space:nowrap;flex-shrink:0;';
}

function renderList(container) {
  const base = currentType === 'all' ? allSports : allSports.filter(s => s.sport_type === currentType);
  const filtered = applySortFilter(base, currentSort, 'created_at', 'date');

  if (!filtered.length) {
    container.innerHTML = emptyState('bi-basketball', 'Aucun sport disponible');
    return;
  }

  const isGrid = currentMode === 'grid';
  const wrapStyle = isGrid ? 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' : '';
  container.innerHTML = `<div class="bf1-cards-wrapper px-3 pt-2 pb-3" style="${wrapStyle}">${filtered.map((item, index) => isGrid ? buildGridCard(item, index) : buildListCard(item, index)).join('')}</div>`;
  
  // Vérifier l'état des favoris si connecté
  if (api.isAuthenticated()) {
    filtered.forEach((item, index) => {
      const contentId = item.id || item._id || '';
      if (contentId) {
        api.checkFavorite('sport', contentId).then(isFavorited => {
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
  const img = item.image || item.image_url || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at || item.date);
  const id = item.id || item._id;

  // Badge "Nouveau" supprimé
  const nouveauBadge = '';

  // Bouton + en bas à droite
  const addButton = `
    <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('sport','${id}',this)" style="position:absolute;bottom:8px;right:8px;width:36px;height:36px;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;z-index:3;border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
      <i class="bi bi-plus-lg"></i>
    </div>
  `;

  return `
    <a href="#/show/sport/${id}" class="bf1-content-card" style="--card-index:${index};text-decoration:none;display:block;width:100%;">
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
  const img = item.image || item.image_url || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at || item.date);
  const id = item.id || item._id;

  return `
    <a href="#/show/sport/${id}" class="bf1-list-card-link" style="--card-index:${index};text-decoration:none;">
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

// Les styles de cartes sont maintenant gérés par cardStyles.js (importé en haut)

function spinner() {
  return `<div class="d-flex justify-content-center align-items-center" style="min-height:200px;"><div class="spinner-border text-danger" role="status"></div></div>`;
}

function emptyState(icon, msg) {
  return `<div class="bf1-empty-state"><i class="bi ${icon}"></i><p>${msg}</p></div>`;
}

function placeholder(h, w = '100%') {
  return `<div style="width:${w};height:${h};background:#2a2a2a;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image" style="font-size:32px;color:#555;"></i></div>`;
}

function formatViews(n) {
  if (!n) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function formatTime(d) {
  if (!d) return 'Récemment';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'À l\'instant';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `${j}j`;
    return new Date(d).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } catch { return 'Récemment'; }
}

function esc(s) {
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