import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

let allNews = [];
let currentCategory = 'Tous';
let currentMode = 'list'; // 'list' | 'grid'

export async function loadNews() {
  const listEl = document.getElementById('news-list');
  const catBar = document.getElementById('news-categories');
  const toggleBtn = document.getElementById('news-toggle-btn');

  if (!listEl || !catBar) return;

  // Afficher spinner
  listEl.innerHTML = '';
  listEl.appendChild(createSnakeLoader(40));

  try {
    const [newsData, categoriesData] = await Promise.all([
      api.getNews().catch(() => []),
      api.getCategories().catch(() => []),
    ]);

    allNews = Array.isArray(newsData) ? newsData : [];

    // Construire la liste de catégories
    let catNames = ['Tous'];
    if (Array.isArray(categoriesData) && categoriesData.length > 0) {
      catNames = ['Tous', ...categoriesData.map(c => c.name).filter(Boolean)];
    } else {
      // Fallback : extraire les catégories uniques depuis les news
      const seen = new Set();
      allNews.forEach(n => {
        const cat = n.category || n.edition;
        if (cat) seen.add(cat);
      });
      if (seen.size > 0) catNames = ['Tous', ...seen];
    }

    renderCategories(catBar, catNames);
    renderNewsList(listEl);

    // Bouton toggle
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'list' ? 'grid' : 'list';
        const icon = document.getElementById('news-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderNewsList(listEl);
      });
    }
  } catch (err) {
    console.error('Erreur chargement news:', err);
    listEl.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-newspaper" style="font-size:3rem;"></i>
        <p class="mt-3">Impossible de charger les actualités</p>
      </div>`;
  }
}

function renderCategories(container, categories) {
  container.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm flex-shrink-0';
    btn.textContent = cat;
    applyCategStyle(btn, cat === currentCategory);

    btn.addEventListener('click', () => {
      currentCategory = cat;
      container.querySelectorAll('button').forEach(b => {
        applyCategStyle(b, b.textContent === currentCategory);
      });
      const listEl = document.getElementById('news-list');
      if (listEl) renderNewsList(listEl);
    });

    container.appendChild(btn);
  });
}

function applyCategStyle(btn, active) {
  if (active) {
    btn.style.cssText = 'background:#E23E3E;color:#fff;border:none;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;white-space:nowrap;';
  } else {
    btn.style.cssText = 'background:#1a1a1a;color:#B0B0B0;border:1px solid #333;border-radius:20px;padding:6px 16px;font-size:13px;white-space:nowrap;';
  }
}

function renderNewsList(container) {
  const filtered = currentCategory === 'Tous'
    ? allNews
    : allNews.filter(n => (n.category || n.edition) === currentCategory);

  // Trier par date (plus récent en premier) 📅
  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.created_at || a.published_at || 0);
    const dateB = new Date(b.created_at || b.published_at || 0);
    return dateB - dateA;
  });

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-newspaper" style="font-size:3.5rem;color:#444;"></i>
        <p class="mt-3 mb-1" style="color:#999;">Aucune actualité disponible</p>
        ${currentCategory !== 'Tous' ? `<p style="font-size:13px;color:#666;">dans la catégorie "${currentCategory}"</p>` : ''}
      </div>`;
    return;
  }

  if (currentMode === 'grid') {
    container.innerHTML = `<div class="px-3 pt-2 pb-3">${sorted.map(buildGridCard).join('')}</div>`;
  } else {
    container.innerHTML = `<div class="px-3 pt-2 pb-3">${sorted.map(buildListCard).join('')}</div>`;
  }
}

function buildListCard(item) {
  const img = item.image_url || item.image || '';
  const cat = item.category || item.edition || 'Actualités';
  const title = item.title || 'Sans titre';
  const desc = item.description || '';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const time = formatTime(item.created_at || item.time);

  return `
    <div class="d-flex mb-3" style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;" onclick="window.location.hash='#/news/${item.id||item._id}'">
      <div style="flex-shrink:0;">
        ${img
          ? `<img src="${escHtml(img)}" alt="" style="width:120px;height:90px;object-fit:cover;">`
          : `<div style="width:120px;height:90px;background:#2a2a2a;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image text-secondary" style="font-size:1.5rem;"></i></div>`}
      </div>
      <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
        <div>
          <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(226,62,62,0.85);color:#fff;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600;margin-bottom:5px;">
            <i class="bi bi-lightning-fill" style="font-size:10px;"></i>${escHtml(cat)}
          </span>
          <p class="mb-1 fw-semibold" style="font-size:13px;color:#fff;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(title)}</p>
          <p class="mb-0" style="font-size:12px;color:#B0B0B0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(desc)}</p>
        </div>
        <div class="d-flex align-items-center gap-1 mt-1" style="font-size:11px;color:#888;">
          <i class="bi bi-eye" style="font-size:11px;"></i>
          <span>${views}</span>
          <span>•</span>
          <i class="bi bi-clock" style="font-size:11px;"></i>
          <span>${time}</span>
        </div>
      </div>
    </div>`;
}

function buildGridCard(item) {
  const img = item.image_url || item.image || '';
  const cat = item.category || item.edition || 'Actualités';
  const title = item.title || 'Sans titre';
  const desc = item.description || '';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const author = item.author || '';
  const time = formatTime(item.created_at || item.time);

  return `
    <div class="mb-3" style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;" onclick="window.location.hash='#/news/${item.id||item._id}'">
      <div style="position:relative;">
        ${img
          ? `<img src="${escHtml(img)}" alt="" style="width:100%;height:200px;object-fit:cover;display:block;">`
          : `<div style="width:100%;height:200px;background:#2a2a2a;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image text-secondary" style="font-size:2rem;"></i></div>`}
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 20%,rgba(0,0,0,0.95) 100%);"></div>
        <div style="position:absolute;top:10px;left:10px;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,0.7);color:#fff;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;">
            <i class="bi bi-lightning-fill" style="font-size:10px;color:#E23E3E;"></i>${escHtml(cat)}
          </span>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:12px;">
          <p class="mb-1 fw-semibold" style="font-size:14px;color:#fff;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(title)}</p>
          <p class="mb-2" style="font-size:12px;color:#B0B0B0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(desc)}</p>
          <div class="d-flex align-items-center gap-1 flex-wrap" style="font-size:11px;color:#888;">
            <i class="bi bi-eye"></i><span>${views}</span>
            ${author ? `<span>•</span><i class="bi bi-person-circle"></i><span>${escHtml(author)}</span>` : ''}
            <span>•</span>
            <i class="bi bi-clock"></i><span>${time}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function formatTime(dateString) {
  if (!dateString) return 'Récemment';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } catch {
    return 'Récemment';
  }
}

function formatViews(count) {
  if (!count) return '0';
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
