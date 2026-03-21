import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

let allVideos = [];
let currentMode = 'grid';

export async function loadReportages() {
  const listEl = document.getElementById('reportages-list');
  const toggleBtn = document.getElementById('reportages-toggle-btn');
  if (!listEl) return;

  listEl.innerHTML = '';
  listEl.appendChild(createSnakeLoader(40));

  try {
    const data = await api.getReportages().catch(() => []);
    allVideos = (Array.isArray(data) ? data : [])
      .map(v => ({ ...v, image_url: v.thumbnail || v.image_url || v.image }))
      .sort((a, b) =>
        new Date(b.created_at || b.aired_at || 0) - new Date(a.created_at || a.aired_at || 0)
      );

    renderList(listEl);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('reportages-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
      });
    }
  } catch (err) {
    console.error('Erreur Reportages:', err);
    listEl.innerHTML = emptyState('bi-camera-video', 'Impossible de charger les reportages');
  }
}

function renderList(container) {
  if (!allVideos.length) {
    container.innerHTML = emptyState('bi-camera-video', 'Aucun reportage disponible');
    return;
  }
  if (currentMode === 'grid') {
    container.innerHTML = `<div class="px-3 pt-2 pb-5">${allVideos.map(buildGridCard).join('')}</div>`;
  } else {
    container.innerHTML = `<div class="px-3 pt-2 pb-5">${allVideos.map(buildListCard).join('')}</div>`;
  }
}

function buildGridCard(item) {
  const img = item.image_url || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views_count || item.views || item.view_count || 0);
  const dur = formatDuration(item.duration || item.duration_minutes);
  const date = formatTime(item.aired_at || item.created_at);

  return `
    <div class="mb-3" style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;" onclick="window.location.hash='#/show/reportage/${item.id||item._id}'">
      <div style="position:relative;">
        ${img
          ? `<img src="${esc(img)}" alt="" style="width:100%;height:200px;object-fit:cover;display:block;">`
          : placeholder('200px')}
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.3) 0%,transparent 30%,transparent 60%,rgba(0,0,0,0.85) 100%);"></div>
        <!-- durée badge top-right -->
        <!-- <div style="position:absolute;top:10px;right:10px;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,0.75);color:#fff;border-radius:4px;padding:3px 7px;font-size:11px;">
            <i class="bi bi-clock" style="font-size:10px;"></i>${esc(dur)}
          </span>
        </div> -->
        <!-- info bas -->
        <div style="position:absolute;bottom:0;left:0;right:0;padding:12px;">
          <p class="mb-1 fw-semibold" style="font-size:14px;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</p>
          <div class="d-flex align-items-center gap-1" style="font-size:11px;color:#B0B0B0;">
            <i class="bi bi-eye"></i><span>${views}</span>
            <span>•</span><i class="bi bi-calendar3"></i><span>${date}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function buildListCard(item) {
  const img = item.image_url || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views_count || item.views || item.view_count || 0);
  const dur = formatDuration(item.duration || item.duration_minutes);
  const date = formatTime(item.aired_at || item.created_at);

  return `
    <div class="d-flex mb-3" style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;" onclick="window.location.hash='#/show/reportage/${item.id||item._id}'">
      <div style="flex-shrink:0;position:relative;">
        ${img
          ? `<img src="${esc(img)}" alt="" style="width:120px;height:90px;object-fit:cover;">`
          : placeholder('90px', '120px')}
        <span style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.8);color:#fff;border-radius:3px;padding:1px 5px;font-size:9px;">
          <i class="bi bi-clock"></i> ${esc(dur)}
        </span>
      </div>
      <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
        <p class="mb-1 fw-semibold" style="font-size:13px;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${esc(title)}</p>
        <div class="d-flex align-items-center gap-1" style="font-size:11px;color:#888;">
          <i class="bi bi-eye"></i><span>${views}</span>
          <span>•</span><i class="bi bi-calendar3"></i><span>${date}</span>
        </div>
      </div>
    </div>`;
}

function formatDuration(d) {
  if (!d) return 'N/A';
  const m = parseInt(d);
  if (isNaN(m)) return 'N/A';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
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
