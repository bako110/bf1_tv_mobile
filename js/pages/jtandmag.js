import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

let allShows = [];
let currentMode = 'grid';

export async function loadJTandMag() {
  const listEl = document.getElementById('jtandmag-list');
  const toggleBtn = document.getElementById('jtandmag-toggle-btn');
  if (!listEl) return;

  listEl.innerHTML = '';
  listEl.appendChild(createSnakeLoader(40));

  try {
    const data = await api.getJTandMag().catch(() => []);
    allShows = (Array.isArray(data) ? data : []).sort((a, b) =>
      new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0)
    );

    renderList(listEl);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('jtandmag-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
      });
    }
  } catch (err) {
    console.error('Erreur JT&Mag:', err);
    listEl.innerHTML = emptyState('bi-camera-video', 'Impossible de charger les JT & Mag');
  }
}

function renderList(container) {
  if (!allShows.length) {
    container.innerHTML = emptyState('bi-camera-video', 'Aucun JT ou Mag disponible');
    return;
  }

  if (currentMode === 'grid') {
    container.innerHTML = `<div class="px-3 pt-2 pb-5" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${allShows.map(buildGridCard).join('')}</div>`;
  } else {
    container.innerHTML = `<div class="px-3 pt-2 pb-5">${allShows.map(buildListCard).join('')}</div>`;
  }
}

function buildGridCard(item) {
  const img = item.image_url || item.image || '';
  const title = item.title || 'Sans titre';
  const desc = item.description || '';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const host = item.host || '';

  return `
    <div style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;" onclick="window.location.hash='#/show/jtandmag/${item.id||item._id}'">
      <div style="position:relative;">
        ${img
          ? `<img src="${esc(img)}" alt="" style="width:100%;height:140px;object-fit:cover;display:block;">`
          : placeholder('140px')}
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 20%,rgba(0,0,0,0.9) 100%);"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:8px;">
          <p class="mb-1 fw-semibold" style="font-size:12px;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</p>
          ${desc ? `<p class="mb-1" style="font-size:11px;color:#B0B0B0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(desc)}</p>` : ''}
          <div class="d-flex align-items-center gap-1" style="font-size:10px;color:#888;">
            <i class="bi bi-eye"></i><span>${views}</span>
            ${host ? `<span>•</span><i class="bi bi-person"></i><span>${esc(host)}</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

function buildListCard(item) {
  const img = item.image_url || item.image || '';
  const title = item.title || 'Sans titre';
  const desc = item.description || '';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const host = item.host || '';
  const time = formatTime(item.created_at || item.published_at);

  return `
    <div class="d-flex mb-3" style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;" onclick="window.location.hash='#/show/jtandmag/${item.id||item._id}'">
      <div style="flex-shrink:0;">
        ${img
          ? `<img src="${esc(img)}" alt="" style="width:120px;height:90px;object-fit:cover;">`
          : placeholder('90px', '120px')}
      </div>
      <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
        <div>
          <p class="mb-1 fw-semibold" style="font-size:13px;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</p>
          ${desc ? `<p class="mb-0" style="font-size:12px;color:#B0B0B0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(desc)}</p>` : ''}
        </div>
        <div class="d-flex align-items-center gap-1 mt-1" style="font-size:11px;color:#888;">
          <i class="bi bi-eye"></i><span>${views}</span>
          ${host ? `<span>•</span><i class="bi bi-person"></i><span>${esc(host)}</span>` : ''}
          <span>•</span><i class="bi bi-clock"></i><span>${time}</span>
        </div>
      </div>
    </div>`;
}

function spinner() {
  return `<div class="d-flex justify-content-center align-items-center" style="min-height:200px;"><div class="spinner-border text-danger" role="status"></div></div>`;
}
function emptyState(icon, msg) {
  return `<div class="text-center py-5"><i class="bi ${icon}" style="font-size:3rem;color:#444;"></i><p class="mt-3" style="color:#999;">${msg}</p></div>`;
}
function placeholder(h, w = '100%') {
  return `<div style="width:${w};height:${h};background:#2a2a2a;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image text-secondary"></i></div>`;
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
