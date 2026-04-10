import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';

const LIMIT = 20;
let allNews = [];
let currentCategory = 'Tous';
let currentMode = 'list';
let currentSkip = 0;
let totalNews = 0;
let isLoadingMore = false;
let observer = null;

export async function loadNews() {
  const listEl = document.getElementById('news-list');
  const catBar = document.getElementById('news-categories');
  const toggleBtn = document.getElementById('news-toggle-btn');
  if (!listEl || !catBar) return;

  // Reset state
  allNews = [];
  currentSkip = 0;
  totalNews = 0;
  currentCategory = 'Tous';
  if (observer) { observer.disconnect(); observer = null; }

  listEl.innerHTML = '';
  listEl.appendChild(createPageSpinner());

  try {
    const newsData = await api.getNews(0, LIMIT).catch(() => ({ items: [] }));

    allNews = newsData.items || [];
    totalNews = newsData.total || 0;
    currentSkip = allNews.length;

    // Catégories extraites uniquement depuis les articles chargés
    const seen = new Set();
    allNews.forEach(n => { const cat = n.category || n.edition; if (cat) seen.add(cat); });
    const catNames = ['Tous', ...seen];

    renderCategories(catBar, catNames);
    renderNewsList(listEl);
    setupInfiniteScroll(listEl);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'list' ? 'grid' : 'list';
        const icon = document.getElementById('news-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderNewsList(listEl);
        setupInfiniteScroll(listEl);
      });
    }
  } catch (err) {
    console.error('Erreur chargement news:', err);
    listEl.innerHTML = `
      <div class="text-center py-5" style="color: var(--text-secondary, #A0A0A0);">
        <i class="bi bi-newspaper" style="font-size:3rem;"></i>
        <p class="mt-3">Impossible de charger les actualités</p>
      </div>`;
  }
}

function setupInfiniteScroll(listEl) {
  if (observer) observer.disconnect();
  // Sentinel existant
  const old = document.getElementById('news-sentinel');
  if (old) old.remove();

  if (currentSkip >= totalNews) return; // Plus rien à charger

  const sentinel = document.createElement('div');
  sentinel.id = 'news-sentinel';
  sentinel.style.height = '1px';
  listEl.appendChild(sentinel);

  observer = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting || isLoadingMore || currentSkip >= totalNews) return;
    await loadMoreNews(listEl);
  }, { rootMargin: '200px' });

  observer.observe(sentinel);
}

async function loadMoreNews(listEl) {
  isLoadingMore = true;

  // Skeleton loader animé
  const skeleton = buildSkeleton();
  const sentinel = document.getElementById('news-sentinel');
  listEl.insertBefore(skeleton, sentinel);

  try {
    const data = await api.getNews(currentSkip, LIMIT);
    const newItems = data.items || [];
    totalNews = data.total || totalNews;
    currentSkip += newItems.length;

    skeleton.remove();

    allNews = [...allNews, ...newItems];

    // Mettre à jour les catégories si de nouvelles apparaissent
    const catBar = document.getElementById('news-categories');
    if (catBar) {
      const existingCats = new Set([...catBar.querySelectorAll('button')].map(b => b.textContent));
      newItems.forEach(n => {
        const cat = n.category || n.edition;
        if (cat && !existingCats.has(cat)) {
          existingCats.add(cat);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-sm flex-shrink-0';
          btn.textContent = cat;
          applyCategStyle(btn, false);
          btn.addEventListener('click', () => {
            currentCategory = cat;
            catBar.querySelectorAll('button').forEach(b => applyCategStyle(b, b.textContent === currentCategory));
            const el = document.getElementById('news-list');
            if (el) renderNewsList(el);
          });
          catBar.appendChild(btn);
        }
      });
    }

    // Filtrer selon catégorie active
    const filtered = currentCategory === 'Tous'
      ? newItems
      : newItems.filter(n => (n.category || n.edition) === currentCategory);

    // Injecter les nouvelles cartes avec animation
    const wrapper = listEl.querySelector('.news-cards-wrapper');
    filtered.forEach((item, i) => {
      const card = document.createElement('div');
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = `opacity 0.3s ease ${i * 60}ms, transform 0.3s ease ${i * 60}ms`;
      card.innerHTML = currentMode === 'grid' ? buildGridCard(item) : buildListCard(item);
      wrapper.appendChild(card);
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    });

    // Re-setup sentinel si encore des items
    if (currentSkip < totalNews) {
      setupInfiniteScroll(listEl);
    } else {
      const old = document.getElementById('news-sentinel');
      if (old) old.remove();
      const end = document.createElement('div');
      end.style.cssText = 'text-align:center;padding:16px;font-size:12px;color:#666;';
      end.textContent = 'Tout est chargé';
      listEl.appendChild(end);
    }
  } catch (e) {
    skeleton.remove();
  }
  isLoadingMore = false;
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
      container.querySelectorAll('button').forEach(b => applyCategStyle(b, b.textContent === currentCategory));
      const listEl = document.getElementById('news-list');
      if (listEl) renderNewsList(listEl);
    });
    container.appendChild(btn);
  });
}

function applyCategStyle(btn, active) {
  if (active) {
    btn.style.cssText = 'background: var(--primary, #E23E3E); color: #fff; border: none; border-radius: 20px; padding: 6px 16px; font-size: 13px; font-weight: 600; white-space: nowrap;';
  } else {
    btn.style.cssText = 'background: var(--card-bg, #1a1a1a); color: var(--text-secondary, #B0B0B0); border: 1px solid var(--border, #333); border-radius: 20px; padding: 6px 16px; font-size: 13px; white-space: nowrap;';
  }
}

function renderNewsList(container) {
  const filtered = currentCategory === 'Tous'
    ? allNews
    : allNews.filter(n => (n.category || n.edition) === currentCategory);

  const sorted = [...filtered].sort((a, b) =>
    new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0)
  );

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5" style="color: var(--text-secondary, #A0A0A0);">
        <i class="bi bi-newspaper" style="font-size:3.5rem;"></i>
        <p class="mt-3 mb-1">Aucune actualité disponible</p>
        ${currentCategory !== 'Tous' ? `<p style="font-size:13px;color:var(--text-muted,#666);">dans la catégorie "${escHtml(currentCategory)}"</p>` : ''}
      </div>`;
    return;
  }

  const cards = sorted.map(currentMode === 'grid' ? buildGridCard : buildListCard).join('');
  container.innerHTML = `<div class="news-cards-wrapper px-3 pt-2 pb-3">${cards}</div>`;
  
  // Vérifier l'état des favoris si connecté
  if (api.isAuthenticated()) {
    sorted.forEach((item, index) => {
      const contentId = item.id || item._id || '';
      if (contentId) {
        api.checkFavorite('news', contentId).then(isFavorited => {
          const wrapper = container.querySelector('.news-cards-wrapper');
          if (wrapper) {
            const cards = wrapper.querySelectorAll('.news-card-link, .bf1-content-card');
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
          }
        }).catch(() => {});
      }
    });
  }
}

function buildSkeleton() {
  const wrap = document.createElement('div');
  wrap.className = 'px-3';
  const pulse = `
    @keyframes bf1-pulse {
      0%,100%{opacity:0.4} 50%{opacity:0.8}
    }`;
  if (!document.getElementById('bf1-skeleton-style')) {
    const s = document.createElement('style');
    s.id = 'bf1-skeleton-style';
    s.textContent = pulse;
    document.head.appendChild(s);
  }
  wrap.innerHTML = [1,2,3].map(() => `
    <div style="display:flex;gap:10px;margin-bottom:12px;animation:bf1-pulse 1.2s infinite;">
      <div style="width:120px;height:90px;border-radius:8px;background:#2a2a2a;flex-shrink:0;"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center;">
        <div style="height:12px;border-radius:6px;background:#2a2a2a;width:80%;"></div>
        <div style="height:10px;border-radius:6px;background:#2a2a2a;width:60%;"></div>
        <div style="height:10px;border-radius:6px;background:#2a2a2a;width:40%;"></div>
      </div>
    </div>`).join('');
  return wrap;
}

function buildListCard(item) {
  const img = item.image_url || item.image || '';
  const cat = item.category || item.edition || 'Actualités';
  const title = item.title || 'Sans titre';
  const desc = item.description || '';
  const views = formatViews(item.views || 0);
  const likes = formatViews(item.likes || 0);
  const time = formatTime(item.created_at || item.time);
  return `
    <div class="d-flex mb-3" style="background:var(--card-bg,#1a1a1a);border-radius:10px;overflow:hidden;cursor:pointer;" onclick="window.location.hash='#/news/${item.id||item._id}'">
      <div style="flex-shrink:0;">
        ${img ? `<img src="${escHtml(img)}" alt="" style="width:120px;height:90px;object-fit:cover;">`
               : `<div style="width:120px;height:90px;background:var(--border,#2a2a2a);display:flex;align-items:center;justify-content:center;"><i class="bi bi-image" style="font-size:1.5rem;color:#888;"></i></div>`}
      </div>
      <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
        <div>
          <span style="display:inline-flex;align-items:center;gap:4px;background:var(--primary,#E23E3E);color:#fff;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600;margin-bottom:5px;">
            <i class="bi bi-lightning-fill" style="font-size:10px;"></i>${escHtml(cat)}
          </span>
          <p class="mb-1 fw-semibold" style="font-size:13px;color:var(--heading-color,#fff);line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(title)}</p>
          <p class="mb-0" style="font-size:12px;color:var(--description-color,#B0B0B0);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(desc)}</p>
        </div>
        <div class="d-flex align-items-center gap-1 mt-1" style="font-size:11px;color:var(--description-secondary,#888);">
          <i class="bi bi-eye"></i><span>${views}</span><span>•</span>
          <i class="bi bi-heart-fill" style="color:#E23E3E;font-size:9px;"></i><span>${likes}</span><span>•</span>
          <i class="bi bi-clock"></i><span>${time}</span>
        </div>
      </div>
    </div>`;
}

function buildGridCard(item) {
  const img = item.image_url || item.image || '';
  const cat = item.category || item.edition || 'Actualités';
  const title = item.title || 'Sans titre';
  const desc = item.description || '';
  const views = formatViews(item.views || 0);
  const likes = formatViews(item.likes || 0);
  const author = item.author || '';
  const time = formatTime(item.created_at || item.time);
  return `
    <div class="mb-3" style="background:var(--card-bg,#1a1a1a);border-radius:10px;overflow:hidden;cursor:pointer;position:relative;" onclick="window.location.hash='#/news/${item.id||item._id}'">
      <div style="position:relative;">
        ${img ? `<img src="${escHtml(img)}" alt="" style="width:100%;height:200px;object-fit:cover;display:block;">`
               : `<div style="width:100%;height:200px;background:var(--border,#2a2a2a);display:flex;align-items:center;justify-content:center;"><i class="bi bi-image" style="font-size:2rem;color:#888;"></i></div>`}
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 20%,var(--bg-1,#000) 100%);"></div>
        <div style="position:absolute;top:10px;left:10px;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,0.7);color:#fff;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;">
            <i class="bi bi-lightning-fill" style="font-size:10px;color:var(--primary,#E23E3E);"></i>${escHtml(cat)}
          </span>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:12px;">
          <p class="mb-1 fw-semibold" style="font-size:14px;color:#fff;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(title)}</p>
          <p class="mb-2" style="font-size:12px;color:#ddd;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(desc)}</p>
          <div class="d-flex align-items-center gap-1 flex-wrap" style="font-size:11px;color:#888;">
            <i class="bi bi-eye"></i><span>${views}</span>
            <span>•</span><i class="bi bi-heart-fill" style="color:#E23E3E;font-size:9px;"></i><span>${likes}</span>
            ${author ? `<span>•</span><i class="bi bi-person-circle"></i><span>${escHtml(author)}</span>` : ''}
            <span>•</span><i class="bi bi-clock"></i><span>${time}</span>
          </div>
        </div>
      </div>
    </div>`;
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

function formatViews(n) {
  if (!n) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
