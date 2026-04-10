import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';

const LIMIT = 20;
let _allShows   = [];
let _skip       = 0;
let _total      = 0;
let _contentType = 'show';
let _categoryName = '';
let _observer   = null;

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtRelative(d) {
  if (!d) return '';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "À l'instant";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7)  return `${j}j`;
    return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
  } catch { return ''; }
}

function fmtDur(s) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m/60)}h${m%60 ? m%60+'m':''}` : `${m}min`;
}

function sortByDate(items) {
  return [...items].sort((a,b) => new Date(b.created_at||b.date||0) - new Date(a.created_at||a.date||0));
}

// ─── Carousel premium ────────────────────────────────────────────────────────

function buildCarousel(shows) {
  const slides = shows.slice(0, 5);
  if (!slides.length) return '';

  const slidesHtml = slides.map((s, i) => {
    const img   = s.thumbnail || s.image_url || s.image || '';
    const title = s.title || '';
    const views = s.views != null ? s.views : null;
    const time  = fmtRelative(s.created_at || s.date);
    return `
      <div style="min-width:100%;position:relative;height:240px;flex-shrink:0;cursor:pointer;"
           onclick="window.location.hash='#/show/${esc(s._contentType||_contentType)}/${esc(s.id||s._id)}'">
        <img src="${esc(img)}" alt="" loading="lazy"
             style="width:100%;height:100%;object-fit:cover;display:block;"
             onerror="this.src='https://via.placeholder.com/800x240/111/222?text=BF1'">
        <!-- Gradient overlay -->
        <div style="position:absolute;inset:0;
                    background:linear-gradient(180deg,rgba(0,0,0,0) 20%,rgba(0,0,0,0.9) 100%);"></div>
        <!-- Badge numéro -->
        <div style="position:absolute;top:14px;left:14px;
                    width:28px;height:28px;border-radius:8px;
                    background:rgba(226,62,62,0.9);backdrop-filter:blur(8px);
                    display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-size:12px;font-weight:800;">${i+1}</span>
        </div>
        <!-- Infos bas -->
        <div style="position:absolute;bottom:0;left:0;right:0;padding:14px 16px;">
          <p style="color:#fff;font-size:14px;font-weight:800;margin:0 0 6px;
                    overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                    -webkit-box-orient:vertical;text-shadow:0 2px 8px rgba(0,0,0,0.8);
                    line-height:1.3;">${esc(title)}</p>
          <div style="display:flex;align-items:center;gap:10px;">
            ${views != null ? `<span style="font-size:11px;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:4px;">
              <i class="bi bi-eye-fill" style="font-size:10px;color:#E23E3E;"></i>${esc(String(views))}</span>` : ''}
            ${time ? `<span style="font-size:11px;color:rgba(255,255,255,0.5);">${time}</span>` : ''}
            <!-- Bouton play -->
            <div style="margin-left:auto;
                        width:36px;height:36px;border-radius:50%;
                        background:linear-gradient(135deg,#E23E3E,#FF6B6B);
                        display:flex;align-items:center;justify-content:center;
                        box-shadow:0 4px 16px rgba(226,62,62,0.5);">
              <i class="bi bi-play-fill" style="color:#fff;font-size:16px;margin-left:2px;"></i>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  const dotsHtml = slides.map((_, i) =>
    `<button class="emcat-dot" data-index="${i}" style="
       height:4px;border-radius:2px;cursor:pointer;border:none;padding:0;
       transition:width .35s cubic-bezier(.4,0,.2,1),background .35s ease;
       width:${i===0?'22px':'4px'};
       background:${i===0?'#E23E3E':'rgba(255,255,255,0.28)'};
       margin:0 2px;"></button>`
  ).join('');

  return `
    <div id="emcat-carousel" style="position:relative;overflow:hidden;">
      <div id="emcat-track" style="display:flex;transition:transform .42s cubic-bezier(.4,0,.2,1);">
        ${slidesHtml}
      </div>
      <!-- Dots -->
      <div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
                  display:flex;align-items:center;">
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
    if (track) track.style.transform = `translateX(-${current*100}%)`;
    document.querySelectorAll('.emcat-dot').forEach((dot, i) => {
      dot.style.width      = i===current ? '22px' : '4px';
      dot.style.background = i===current ? '#E23E3E' : 'rgba(255,255,255,0.28)';
    });
  }

  document.querySelectorAll('.emcat-dot').forEach(dot =>
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index, 10)))
  );

  const carousel = document.getElementById('emcat-carousel');
  if (carousel) {
    let tx = 0;
    carousel.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive:true });
    carousel.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    }, { passive:true });
  }

  if (window.__emcatTimer) clearInterval(window.__emcatTimer);
  window.__emcatTimer = setInterval(() => goTo(current + 1), 5000);
}

// ─── Show card ultra-pro ──────────────────────────────────────────────────────

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
         class="emcat-card-pro"
         style="
           display:flex;gap:0;
           background:var(--surface,#141414);
           border-radius:14px;overflow:hidden;cursor:pointer;
           border:1px solid rgba(255,255,255,0.06);
           opacity:0;transform:translateY(14px);
           animation:emcat-fadein .35s ease ${idx*40}ms forwards;
           box-shadow:0 2px 12px rgba(0,0,0,0.3);
         ">

      <!-- Thumbnail -->
      <div style="position:relative;flex-shrink:0;width:120px;height:88px;">
        ${img
          ? `<img src="${esc(img)}" alt="" loading="lazy"
                  style="width:100%;height:100%;object-fit:cover;display:block;"
                  onerror="this.style.display='none'">`
          : `<div style="width:100%;height:100%;background:#1a1a1a;
                          display:flex;align-items:center;justify-content:center;">
               <i class="bi bi-tv" style="font-size:22px;color:#333;"></i>
             </div>`}
        <!-- Overlay gradient -->
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,0.5));"></div>
        <!-- Durée badge -->
        ${dur ? `<div style="position:absolute;bottom:6px;left:6px;
                              background:rgba(0,0,0,0.82);backdrop-filter:blur(4px);
                              color:#fff;font-size:9px;font-weight:700;
                              border-radius:5px;padding:2px 6px;letter-spacing:0.3px;">
                   ${esc(dur)}</div>` : ''}
        <!-- Bouton play central -->
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <div style="
            width:30px;height:30px;
            background:linear-gradient(135deg,rgba(226,62,62,0.9),rgba(255,107,107,0.9));
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 12px rgba(226,62,62,0.5);
            backdrop-filter:blur(4px);
          ">
            <i class="bi bi-play-fill" style="color:#fff;font-size:13px;margin-left:2px;"></i>
          </div>
        </div>
      </div>

      <!-- Contenu -->
      <div style="padding:12px;flex:1;overflow:hidden;
                  display:flex;flex-direction:column;justify-content:space-between;
                  border-left:1px solid rgba(255,255,255,0.04);">
        <div>
          <p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 4px;
                    overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                    -webkit-box-orient:vertical;line-height:1.4;letter-spacing:-0.1px;">${esc(title)}</p>
          ${desc ? `<p style="font-size:11px;color:rgba(255,255,255,0.4);margin:0;
                               overflow:hidden;display:-webkit-box;
                               -webkit-line-clamp:1;-webkit-box-orient:vertical;
                               line-height:1.4;">${esc(desc)}</p>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          ${views != null ? `
            <div style="display:flex;align-items:center;gap:3px;
                         background:rgba(226,62,62,0.1);border-radius:6px;padding:3px 7px;">
              <i class="bi bi-eye-fill" style="font-size:9px;color:#E23E3E;"></i>
              <span style="font-size:10px;color:rgba(255,255,255,0.6);font-weight:600;">${esc(String(views))}</span>
            </div>` : ''}
          ${time ? `
            <div style="display:flex;align-items:center;gap:3px;">
              <i class="bi bi-clock" style="font-size:9px;color:rgba(255,255,255,0.3);"></i>
              <span style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:500;">${time}</span>
            </div>` : ''}
          <!-- Chevron -->
          <div style="margin-left:auto;">
            <i class="bi bi-chevron-right" style="font-size:12px;color:rgba(255,255,255,0.2);"></i>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Skeleton loader premium ──────────────────────────────────────────────────

function buildSkeleton(n = 3) {
  const shimmer = `background:linear-gradient(90deg,#1a1a1a 25%,#242424 50%,#1a1a1a 75%);
                   background-size:200% 100%;animation:emcat-shimmer 1.4s infinite;`;
  return Array(n).fill(null).map(() => `
    <div style="display:flex;gap:0;background:#141414;border-radius:14px;overflow:hidden;
                border:1px solid rgba(255,255,255,0.06);height:88px;">
      <div style="width:120px;height:88px;flex-shrink:0;${shimmer}"></div>
      <div style="flex:1;padding:12px;display:flex;flex-direction:column;gap:8px;justify-content:center;">
        <div style="height:12px;border-radius:6px;width:80%;${shimmer}"></div>
        <div style="height:10px;border-radius:6px;width:50%;${shimmer}"></div>
        <div style="height:8px;border-radius:6px;width:35%;${shimmer}"></div>
      </div>
    </div>`).join('');
}

// ─── Pagination infinie ───────────────────────────────────────────────────────

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

    const skels = document.createElement('div');
    skels.id = 'emcat-skels';
    skels.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    skels.innerHTML = buildSkeleton(3);
    listEl.appendChild(skels);

    try {
      const res = await api.getShowsByCategory(_categoryName, _skip, LIMIT);
      const newItems = res.items || [];
      if (res.total) _total = res.total;
      skels.remove();

      if (newItems.length) {
        _allShows = [..._allShows, ...newItems];
        _skip += newItems.length;

        newItems.forEach((item, i) => {
          const div = document.createElement('div');
          div.innerHTML = buildShowCard(item, i);
          const card = div.firstElementChild;
          listEl.insertBefore(card, sentinel);
        });

        const countEl = document.getElementById('emcat-count');
        if (countEl) countEl.textContent = _allShows.length + (_skip < _total ? '+' : '');
      }

      sentinel.remove();
      if (_skip < _total) setupScrollPagination(listEl);
    } catch (e) {
      console.error('Erreur chargement suite:', e);
      skels?.remove();
    }
  }, { rootMargin:'250px' });

  _observer.observe(sentinel);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function loadEmissionCategory(categoryName) {
  if (window.__emcatTimer) { clearInterval(window.__emcatTimer); window.__emcatTimer = null; }
  if (_observer) { _observer.disconnect(); _observer = null; }

  _categoryName = categoryName || '';
  _allShows = []; _skip = 0; _total = 0;
  _contentType = 'show';

  const titleEl    = document.getElementById('emcat-title');
  const subtitleEl = document.getElementById('emcat-subtitle');
  const container  = document.getElementById('emcat-container');
  if (!container) return;

  if (titleEl) titleEl.textContent = categoryName || 'Émission';
  if (subtitleEl) subtitleEl.textContent = 'Chargement…';

  container.innerHTML = '';
  container.appendChild(createPageSpinner());

  try {
    const res = await api.getShowsByCategory(categoryName, 0, LIMIT).catch(() => ({ items:[], total:0 }));
    const list = res.items || [];
    _total = res.total || 0;
    _contentType = res.contentType || 'show';

    if (subtitleEl) subtitleEl.textContent = `${_total || list.length} vidéo${(_total || list.length) !== 1 ? 's' : ''}`;

    if (!list.length) {
      container.innerHTML = `
        <div style="padding:80px 20px;text-align:center;">
          <div style="
            width:72px;height:72px;border-radius:20px;margin:0 auto 16px;
            background:rgba(226,62,62,0.1);
            display:flex;align-items:center;justify-content:center;
          ">
            <i class="bi bi-tv" style="font-size:2rem;color:rgba(226,62,62,0.6);"></i>
          </div>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 6px;font-weight:600;">
            Aucun contenu disponible
          </p>
          <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;">
            pour <span style="color:#E23E3E;font-weight:700;">${esc(categoryName)}</span>
          </p>
        </div>`;
      return;
    }

    const sorted = sortByDate(list);
    _allShows = sorted;
    _skip = sorted.length;

    // Section liste
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
      <div style="padding:16px 14px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:3px;height:16px;border-radius:2px;
                        background:linear-gradient(180deg,#E23E3E,#FF6B6B);"></div>
            <h2 style="font-size:14px;font-weight:800;color:#fff;margin:0;letter-spacing:-0.2px;">
              Toutes les vidéos
            </h2>
          </div>
          <div style="
            background:rgba(226,62,62,0.12);
            border:1px solid rgba(226,62,62,0.2);
            border-radius:20px;padding:4px 12px;
            display:flex;align-items:center;gap:5px;
          ">
            <i class="bi bi-play-circle-fill" style="font-size:10px;color:#E23E3E;"></i>
            <span id="emcat-count" style="font-size:11px;color:#E23E3E;font-weight:700;">
              ${sorted.length}${_skip < _total ? '+' : ''}
            </span>
          </div>
        </div>
      </div>`;
    container.appendChild(listEl);

    startCarousel(Math.min(sorted.length, 5));
    setupScrollPagination(listEl);

  } catch (err) {
    console.error('Erreur loadEmissionCategory:', err);
    container.innerHTML = `
      <div style="padding:80px 20px;text-align:center;">
        <div style="
          width:72px;height:72px;border-radius:20px;margin:0 auto 16px;
          background:rgba(226,62,62,0.1);
          display:flex;align-items:center;justify-content:center;
        ">
          <i class="bi bi-exclamation-circle" style="font-size:2rem;color:#E23E3E;"></i>
        </div>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 16px;font-weight:600;">
          Erreur lors du chargement
        </p>
        <button onclick="history.back()" style="
          background:linear-gradient(135deg,#E23E3E,#FF6B6B);
          color:#fff;border:none;border-radius:12px;
          padding:11px 24px;cursor:pointer;
          font-size:13px;font-weight:700;letter-spacing:0.2px;
          box-shadow:0 4px 16px rgba(226,62,62,0.4);
          transition:transform 0.2s ease,box-shadow 0.2s ease;
        "
        onmousedown="this.style.transform='scale(0.95)'"
        onmouseup="this.style.transform='scale(1)'">
          <i class="bi bi-arrow-left" style="margin-right:6px;"></i>Retour
        </button>
      </div>`;
  }
}
