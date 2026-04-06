import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';

const LIMIT = 20;
let _allShows = [];
let _skip = 0;
let _total = 0;
let _contentType = 'show';
let _categoryName = '';
let _observer = null;

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtRelative(d) {
  if (!d) return '';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `${j}j`;
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

function fmtDur(s) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? m % 60 + 'm' : ''}` : `${m}min`;
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

function buildCarousel(shows) {
  const slides = shows.slice(0, 5);
  if (!slides.length) return '';

  const slidesHtml = slides.map((s) => {
    const img   = s.thumbnail || s.image_url || s.image || '';
    const title = s.title || '';
    return `
      <div style="min-width:100%;position:relative;height:220px;flex-shrink:0;">
        <img src="${esc(img)}" alt="" loading="lazy"
             style="width:100%;height:100%;object-fit:cover;display:block;"
             onerror="this.src='https://via.placeholder.com/800x220/111/222?text=BF1'">
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.72) 100%);"></div>
        <div style="position:absolute;bottom:38px;left:0;right:0;padding:0 16px;">
          <p style="color:#fff;font-size:14px;font-weight:700;margin:0;
                    overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                    -webkit-box-orient:vertical;text-shadow:0 1px 6px rgba(0,0,0,0.9);">${esc(title)}</p>
        </div>
      </div>`;
  }).join('');

  const dotsHtml = slides.map((_, i) =>
    `<div class="emcat-dot" data-index="${i}"
          style="height:5px;border-radius:3px;cursor:pointer;transition:width .3s,background .3s;
                 width:${i === 0 ? '18px' : '5px'};
                 background:${i === 0 ? '#E23E3E' : 'rgba(255,255,255,0.35)'};
                 margin:0 2px;"></div>`
  ).join('');

  return `
    <div id="emcat-carousel"
         style="position:relative;overflow:hidden;border-radius:0 0 14px 14px;">
      <div id="emcat-track"
           style="display:flex;transition:transform .42s cubic-bezier(.4,0,.2,1);">
        ${slidesHtml}
      </div>
      <div style="position:absolute;bottom:14px;left:0;right:0;
                  display:flex;justify-content:center;align-items:center;">
        ${dotsHtml}
      </div>
    </div>`;
}

function startCarousel(total) {
  if (total < 2) return;
  let current = 0;

  function goTo(idx) {
    current = ((idx % total) + total) % total;
    const track = document.getElementById('emcat-track');
    if (track) track.style.transform = `translateX(-${current * 100}%)`;
    document.querySelectorAll('.emcat-dot').forEach((dot, i) => {
      const active = i === current;
      dot.style.width      = active ? '18px' : '5px';
      dot.style.background = active ? '#E23E3E' : 'rgba(255,255,255,0.35)';
    });
  }

  document.querySelectorAll('.emcat-dot').forEach(dot =>
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index, 10)))
  );

  const carousel = document.getElementById('emcat-carousel');
  if (carousel) {
    let tx = 0;
    carousel.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  if (window.__emcatTimer) clearInterval(window.__emcatTimer);
  window.__emcatTimer = setInterval(() => goTo(current + 1), 5000);
}

// ─── Show card ────────────────────────────────────────────────────────────────

function buildShowCard(show, idx = 0) {
  const id          = show.id || show._id;
  const contentType = show._contentType || _contentType || 'show';
  const img         = show.thumbnail || show.image_url || show.image || '';
  const title       = show.title || 'Sans titre';
  const dur         = show.duration ? fmtDur(show.duration) : null;
  const time        = fmtRelative(show.created_at || show.date);
  const views       = show.views != null ? show.views : null;
  const desc        = show.description || '';

  return `
    <div onclick="window.location.hash='#/show/${esc(contentType)}/${esc(id)}'"
         style="display:flex;gap:12px;
                background:var(--surface,#141414);
                border-radius:12px;overflow:hidden;cursor:pointer;
                border:1px solid var(--divider,#1e1e1e);
                opacity:0;transform:translateY(16px);
                transition:opacity .3s ease ${idx * 50}ms, transform .3s ease ${idx * 50}ms;"
         class="emcat-card">
      <div style="position:relative;flex-shrink:0;width:130px;height:90px;">
        ${img
          ? `<img src="${esc(img)}" alt="" loading="lazy"
                  style="width:100%;height:100%;object-fit:cover;display:block;"
                  onerror="this.style.display='none'">`
          : `<div style="width:100%;height:100%;background:var(--bg,#222);
                          display:flex;align-items:center;justify-content:center;">
               <i class="bi bi-tv" style="font-size:24px;color:var(--text-3,#555);"></i>
             </div>`}
        ${dur ? `<span style="position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.82);
                               color:#fff;font-size:9px;border-radius:4px;padding:1px 5px;">
                   ${esc(dur)}</span>` : ''}
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <div style="width:32px;height:32px;background:rgba(226,62,62,0.88);border-radius:50%;
                      display:flex;align-items:center;justify-content:center;
                      box-shadow:0 2px 10px rgba(226,62,62,.45);">
            <i class="bi bi-play-fill" style="color:#fff;font-size:14px;margin-left:2px;"></i>
          </div>
        </div>
      </div>
      <div style="padding:10px 10px 10px 0;flex:1;overflow:hidden;
                  display:flex;flex-direction:column;justify-content:space-between;">
        <p style="font-size:13px;font-weight:700;color:var(--text,#fff);margin:0 0 4px;
                  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                  -webkit-box-orient:vertical;line-height:1.35;">${esc(title)}</p>
        ${desc ? `<p style="font-size:11px;color:var(--text-2,#888);margin:0 0 6px;
                             overflow:hidden;display:-webkit-box;
                             -webkit-line-clamp:1;-webkit-box-orient:vertical;
                             line-height:1.4;">${esc(desc)}</p>` : ''}
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          ${views != null ? `<span style="font-size:10px;color:var(--text-3,#666);display:flex;align-items:center;gap:3px;">
            <i class="bi bi-eye" style="color:#E23E3E;font-size:10px;"></i>${esc(String(views))}</span>` : ''}
          ${time ? `<span style="font-size:10px;color:var(--text-3,#666);display:flex;align-items:center;gap:3px;">
            <i class="bi bi-clock" style="font-size:10px;"></i>${time}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function animateCards() {
  requestAnimationFrame(() => {
    document.querySelectorAll('.emcat-card').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
}

// ─── Infinite scroll ──────────────────────────────────────────────────────────

function setupScrollPagination(listEl) {
  if (_observer) _observer.disconnect();

  const existing = document.getElementById('emcat-sentinel');
  if (existing) existing.remove();

  if (_skip >= _total) return;

  const sentinel = document.createElement('div');
  sentinel.id = 'emcat-sentinel';
  sentinel.style.cssText = 'height:1px;';
  listEl.appendChild(sentinel);

  _observer = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting) return;
    if (_skip >= _total) { _observer.disconnect(); return; }

    _observer.disconnect();

    // Skeleton
    const skels = document.createElement('div');
    skels.id = 'emcat-skels';
    skels.style.cssText = 'display:flex;flex-direction:column;gap:10px;padding:0 14px;';
    skels.innerHTML = [0,1,2].map(() => `
      <div style="display:flex;gap:12px;background:var(--surface,#141414);border-radius:12px;overflow:hidden;height:90px;border:1px solid var(--divider,#1e1e1e);">
        <div style="width:130px;height:90px;background:var(--surface,#1e1e1e);animation:bf1-pulse 1.4s ease-in-out infinite;flex-shrink:0;"></div>
        <div style="flex:1;padding:10px 10px 10px 0;display:flex;flex-direction:column;gap:8px;justify-content:center;">
          <div style="height:12px;background:var(--surface,#1e1e1e);border-radius:4px;width:80%;animation:bf1-pulse 1.4s ease-in-out infinite;"></div>
          <div style="height:10px;background:var(--surface,#1e1e1e);border-radius:4px;width:50%;animation:bf1-pulse 1.4s ease-in-out infinite;"></div>
        </div>
      </div>`).join('');
    listEl.appendChild(skels);

    try {
      const res = await api.getShowsByCategory(_categoryName, _skip, LIMIT);
      const newItems = res.items || [];
      if (res.total) _total = res.total;

      skels.remove();

      if (newItems.length) {
        const startIdx = _allShows.length;
        _allShows = [..._allShows, ...newItems];
        _skip += newItems.length;

        newItems.forEach((item, i) => {
          const div = document.createElement('div');
          div.innerHTML = buildShowCard(item, i);
          const card = div.firstElementChild;
          listEl.insertBefore(card, sentinel);
          requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        });

        // Mettre à jour le compteur
        const countEl = document.getElementById('emcat-count');
        if (countEl) countEl.textContent = _allShows.length + (_skip < _total ? '+' : '');
      }

      sentinel.remove();
      if (_skip < _total) setupScrollPagination(listEl);

    } catch (e) {
      console.error('Erreur chargement suite:', e);
      skels?.remove();
    }
  }, { rootMargin: '250px' });

  _observer.observe(sentinel);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function loadEmissionCategory(categoryName) {
  if (window.__emcatTimer) { clearInterval(window.__emcatTimer); window.__emcatTimer = null; }
  if (_observer) { _observer.disconnect(); _observer = null; }

  _categoryName = categoryName || '';
  _allShows = []; _skip = 0; _total = 0; _contentType = 'show';

  // Inject pulse keyframe once
  if (!document.getElementById('emcat-pulse-style')) {
    const st = document.createElement('style');
    st.id = 'emcat-pulse-style';
    st.textContent = '@keyframes bf1-pulse{0%,100%{opacity:1}50%{opacity:.4}}';
    document.head.appendChild(st);
  }

  const container = document.getElementById('emcat-container');
  const titleEl   = document.getElementById('emcat-title');
  if (!container) return;

  if (titleEl) titleEl.textContent = categoryName || 'Émission';

  container.innerHTML = '';
  container.appendChild(createPageSpinner());

  try {
    const res = await api.getShowsByCategory(categoryName, 0, LIMIT).catch(() => ({ items: [], total: 0 }));
    const list = res.items || [];
    _total = res.total || 0;
    _contentType = res.contentType || 'show';

    if (!list.length) {
      container.innerHTML = `
        <div class="text-center" style="padding:60px 20px;">
          <i class="bi bi-tv" style="font-size:3rem;color:var(--text-3,#555);"></i>
          <p style="color:var(--text-2,#888);margin-top:12px;font-size:14px;">Aucun contenu disponible pour
            <strong style="color:#E23E3E;">${esc(categoryName)}</strong></p>
        </div>`;
      return;
    }

    const sorted = list.sort((a, b) =>
      new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0)
    );
    _allShows = sorted;
    _skip = sorted.length;

    const listEl = document.createElement('div');
    listEl.id = 'emcat-list';
    listEl.style.cssText = 'display:flex;flex-direction:column;gap:10px;padding:0 14px 80px;';
    sorted.forEach((item, i) => {
      const div = document.createElement('div');
      div.innerHTML = buildShowCard(item, i);
      listEl.appendChild(div.firstElementChild);
    });

    container.innerHTML = `
      ${buildCarousel(sorted)}
      <div style="padding:16px 14px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <h2 style="font-size:15px;font-weight:700;color:var(--text,#fff);margin:0;">Toutes les émissions</h2>
          <span id="emcat-count" style="font-size:11px;color:var(--text-3,#777);
                       background:var(--surface,#1a1a1a);border-radius:20px;
                       padding:3px 10px;border:1px solid var(--divider,#252525);">
            ${sorted.length}${_skip < _total ? '+' : ''}
          </span>
        </div>
      </div>`;
    container.appendChild(listEl);

    animateCards();
    startCarousel(Math.min(sorted.length, 5));
    setupScrollPagination(listEl);

  } catch (err) {
    console.error('Erreur loadEmissionCategory:', err);
    container.innerHTML = `
      <div class="text-center" style="padding:60px 20px;">
        <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:#E23E3E;"></i>
        <p style="color:var(--text-2,#888);margin-top:10px;font-size:14px;">Erreur lors du chargement</p>
        <button onclick="history.back()"
                style="background:#E23E3E;color:#fff;border:none;border-radius:8px;
                       padding:8px 18px;margin-top:8px;cursor:pointer;font-size:13px;">
          Retour
        </button>
      </div>`;
  }
}
