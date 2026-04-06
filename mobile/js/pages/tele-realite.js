import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';
import { setupInfiniteScroll } from '../utils/infiniteScroll.js';

const LIMIT = 20;
let allItems = [];
let currentMode = 'grid';
let currentSkip = 0;
let currentTotal = 0;

export async function loadTeleRealite() {
  const listEl = document.getElementById('tele-realite-list');
  const toggleBtn = document.getElementById('tele-realite-toggle-btn');
  if (!listEl) return;

  allItems = []; currentSkip = 0; currentTotal = 0;
  listEl.innerHTML = '';
  listEl.appendChild(createPageSpinner());

  try {
    const data = await api.getTeleRealite(0, LIMIT).catch(() => ({ items: [], total: 0 }));
    allItems = (data.items || []).sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
    currentSkip = allItems.length;
    currentTotal = data.total || 0;

    renderList(listEl);
    attachInfiniteScroll(listEl);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('tele-realite-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
        attachInfiniteScroll(listEl);
      });
    }
  } catch (err) {
    console.error('Erreur Télé Réalité:', err);
    listEl.innerHTML = emptyState('bi-camera-video', 'Impossible de charger les contenus');
  }
}

function attachInfiniteScroll(listEl) {
  setupInfiniteScroll({
    listEl, sentinelId: 'tele-realite-sentinel',
    fetchFn: (skip, limit) => api.getTeleRealite(skip, limit),
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
    container.innerHTML = emptyState('bi-camera-video', 'Aucun contenu disponible');
    return;
  }
  const isGrid = currentMode === 'grid';
  const wrapStyle = isGrid ? 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' : '';
  container.innerHTML = `<div class="bf1-cards-wrapper px-3 pt-2 pb-3" style="${wrapStyle}">${allItems.map(isGrid ? buildGridCard : buildListCard).join('')}</div>`;
}

function buildGridCard(item) {
  const img = item.image_url || item.image || item.thumbnail || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at);
  const host = item.host || '';
  return `
    <div style="background:var(--surface,#1a1a1a);border-radius:10px;overflow:hidden;cursor:pointer;position:relative;"
         onclick="window.location.hash='#/show/tele_realite/${item.id||item._id}'">
      <div style="position:relative;">
        ${img ? `<img src="${esc(img)}" alt="" style="width:100%;height:140px;object-fit:cover;display:block;">` : placeholder('140px')}
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 20%,rgba(0,0,0,0.9) 100%);"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:8px;">
          <p class="mb-1 fw-semibold" style="font-size:12px;color:var(--description-grid-color,#fff);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</p>
          <div class="d-flex align-items-center gap-1" style="font-size:10px;color:var(--text-3,#888);">
            <i class="bi bi-eye"></i><span>${views}</span>
            <span>•</span><i class="bi bi-heart-fill" style="color:#E23E3E;"></i><span>${likes}</span>
            ${host ? `<span>•</span><i class="bi bi-person"></i><span>${esc(host)}</span>` : `<span>•</span><i class="bi bi-clock"></i><span>${time}</span>`}
          </div>
        </div>
      </div>
    </div>`;
}

function buildListCard(item) {
  const img = item.image_url || item.image || item.thumbnail || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at);
  const host = item.host || '';
  return `
    <div class="d-flex mb-3" style="background:var(--surface,#1a1a1a);border-radius:10px;overflow:hidden;cursor:pointer;"
         onclick="window.location.hash='#/show/tele_realite/${item.id||item._id}'">
      <div style="flex-shrink:0;">
        ${img ? `<img src="${esc(img)}" alt="" style="width:120px;height:90px;object-fit:cover;">` : placeholder('90px','120px')}
      </div>
      <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
        <div>
          <span style="display:inline-flex;align-items:center;gap:3px;background:rgba(226,62,62,0.85);color:#fff;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;margin-bottom:4px;">
            <i class="bi bi-camera-video-fill" style="font-size:9px;"></i>Télé Réalité
          </span>
          <p class="mb-0" style="font-size:13px;color:var(--description-list-color,#fff);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</p>
        </div>
        <div class="d-flex align-items-center gap-1" style="font-size:11px;color:var(--text-3,#888);">
          <i class="bi bi-eye"></i><span>${views}</span>
          <span>•</span><i class="bi bi-heart-fill" style="color:#E23E3E;font-size:9px;"></i><span>${likes}</span>
          ${host ? `<span>•</span><i class="bi bi-person"></i><span>${esc(host)}</span>` : ''}
          <span>•</span><i class="bi bi-clock"></i><span>${time}</span>
        </div>
      </div>
    </div>`;
}

function emptyState(icon, msg) { return `<div class="text-center py-5"><i class="bi ${icon}" style="font-size:3rem;color:#444;"></i><p class="mt-3" style="color:#999;">${msg}</p></div>`; }
function placeholder(h, w='100%') { return `<div style="width:${w};height:${h};background:#2a2a2a;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image text-secondary"></i></div>`; }
function formatViews(n) { if (!n) return '0'; if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n); }
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
function esc(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
