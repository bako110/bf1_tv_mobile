import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';

const LIMIT = 20;
let _allShows  = [];
let _skip      = 0;
let _total     = 0;
let _contentType = 'show';
let _categoryName = '';
let _filterPath   = '';
let _observer  = null;
let _activeTab = 0;

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return 'Publiée le ' + new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' })
      + ' - ' + new Date(d).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  } catch { return ''; }
}

function fmtDur(s) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m/60)}h${m%60 ? m%60+'m':''}` : `${m}min`;
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function buildHero(cat, firstItemImg) {
  const img      = cat?.image_main || cat?.image_url || cat?.image || firstItemImg || '';
  const name     = cat?.name || _categoryName || '';
  const schedule = cat?.schedule || cat?.broadcast_time || '';

  return `
    <div id="emcat-hero">
      ${img
        ? `<img id="emcat-hero-img" src="${esc(img)}" alt="${esc(name)}" onerror="this.style.display='none'">`
        : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);
                        display:flex;align-items:center;justify-content:center;">
             <i class="bi bi-tv-fill" style="font-size:64px;color:rgba(255,255,255,.12);"></i>
           </div>`}
      <div id="emcat-hero-gradient"></div>
      <div id="emcat-hero-content">
        <h1 id="emcat-hero-title">${esc(name)}</h1>
        ${schedule ? `<p id="emcat-hero-schedule">${esc(schedule)}</p>` : ''}
      </div>
    </div>

    <div id="emcat-tabs">
      <button class="emcat-tab active" onclick="window._emcatTab(0,this)">Replay</button>
      <button class="emcat-tab" onclick="window._emcatTab(1,this)">À voir aussi</button>
    </div>

    <div id="emcat-panel-episodes">
      <div id="emcat-list-section">
        <div id="emcat-list"></div>
      </div>
    </div>

    <div id="emcat-panel-discover" style="display:none;">
      <div id="emcat-discover-section">
        <div id="emcat-discover-scroll">
          <div style="color:rgba(255,255,255,.3);font-size:13px;padding:16px;">Chargement…</div>
        </div>
      </div>
    </div>
  `;
}

// ─── EPISODE ROW ──────────────────────────────────────────────────────────────

function buildEpisodeRow(show, idx = 0) {
  const id          = show.id || show._id;
  const contentType = show._contentType || _contentType || 'show';
  const img         = show.thumbnail || show.image_url || show.image || '';
  const title       = show.title || 'Sans titre';
  const dur         = show.duration ? fmtDur(show.duration) : null;
  const pubDate     = fmtDate(show.created_at || show.date || show.published_at);
  const views       = show.views != null ? show.views : null;
  const isNew       = show.is_new || (show.created_at && (Date.now() - new Date(show.created_at).getTime()) < 7*24*3600000);

  return `
    <div class="emcat-ep-row" style="animation-delay:${idx*40}ms"
         onclick="window.location.hash='#/show/${esc(contentType)}/${esc(id)}'">
      <div class="emcat-ep-thumb">
        ${img
          ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.parentNode.style.background='#1a1a1a'">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
               <i class="bi bi-play-circle-fill" style="font-size:28px;color:rgba(226,62,62,.3);"></i>
             </div>`}
        ${dur ? `<div class="emcat-ep-dur">${esc(dur)}</div>` : ''}
        <div class="emcat-ep-play"><i class="bi bi-play-fill"></i></div>
      </div>
      <div class="emcat-ep-info">
        <div class="emcat-ep-badges">
          ${isNew ? `<span class="emcat-ep-new">Nouveau</span>` : ''}
          ${views != null ? `<span class="emcat-ep-views">${esc(String(views))} vue${views !== 1 ? 's' : ''}</span>` : ''}
        </div>
        ${pubDate ? `<div class="emcat-ep-date">${pubDate}</div>` : ''}
        <div class="emcat-ep-title">${esc(title)}</div>
      </div>
      <button class="emcat-ep-plus"
              onclick="event.stopPropagation();window._emcatToggleFav&&window._emcatToggleFav('${esc(id)}',this)">
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>`;
}

// ─── DISCOVER CARD ────────────────────────────────────────────────────────────

function buildDiscoverCard(emission) {
  const img     = emission.image_main || emission.image_url || emission.image || '';
  const name    = emission.name || emission.title || '';
  const fp      = emission.filter_path || '';
  const fpEnc   = fp ? btoa(unescape(encodeURIComponent(fp))) : '';
  const nameEnc = encodeURIComponent(name);
  const href    = fpEnc ? `#/emission-category/${nameEnc}?fp=${fpEnc}` : `#/emission-category/${nameEnc}`;

  return `
    <a href="${href}" class="emcat-discover-card">
      <div class="emcat-discover-thumb">
        ${img
          ? `<img src="${esc(img)}" alt="${esc(name)}" loading="lazy">`
          : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);
                          display:flex;align-items:center;justify-content:center;">
               <i class="bi bi-tv-fill" style="font-size:28px;color:rgba(255,255,255,.15);"></i>
             </div>`}
        <div class="emcat-discover-plus"><i class="bi bi-plus-lg"></i></div>
      </div>
      <div class="emcat-discover-name">${esc(name)}</div>
    </a>`;
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function buildSkeleton(n = 4) {
  const sk = (w, h, r = '5px') =>
    `<div style="width:${w};height:${h}px;border-radius:${r};flex-shrink:0;
                 background:linear-gradient(90deg,#161616 25%,#222 50%,#161616 75%);
                 background-size:200% 100%;animation:emcat-shimmer 1.4s ease-in-out infinite;"></div>`;
  return Array(n).fill(null).map(() => `
    <div style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);">
      ${sk('118px', 76, '10px')}
      <div style="flex:1;display:flex;flex-direction:column;gap:7px;padding-top:4px;">
        ${sk('50px', 9, '4px')}
        ${sk('95%', 13, '4px')}
        ${sk('70%', 13, '4px')}
      </div>
    </div>`).join('');
}

// ─── INFINITE SCROLL ──────────────────────────────────────────────────────────

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
    skels.innerHTML = buildSkeleton(3);
    listEl.appendChild(skels);

    try {
      const res = await api.getShowsByFilterPath(_filterPath, _categoryName, _skip, LIMIT);
      const newItems = res.items || [];
      if (res.total) _total = res.total;
      skels.remove();

      if (newItems.length) {
        _allShows = [..._allShows, ...newItems];
        _skip += newItems.length;
        newItems.forEach((item, i) => {
          const div = document.createElement('div');
          div.innerHTML = buildEpisodeRow(item, i);
          listEl.insertBefore(div.firstElementChild, sentinel);
        });
      }
      sentinel.remove();
      if (_skip < _total) setupScrollPagination(listEl);
    } catch (e) {
      console.error('Erreur chargement suite:', e);
      skels.remove();
    }
  }, { rootMargin: '300px' });

  _observer.observe(sentinel);
}

// ─── TAB SWITCH ───────────────────────────────────────────────────────────────

window._emcatTab = function(idx, btn) {
  _activeTab = idx;
  document.querySelectorAll('.emcat-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.getElementById('emcat-panel-episodes').style.display = idx === 0 ? '' : 'none';
  document.getElementById('emcat-panel-discover').style.display = idx === 1 ? '' : 'none';
};

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

export async function loadEmissionCategory(categoryName, filterPath) {
  if (_observer) { _observer.disconnect(); _observer = null; }

  _categoryName = categoryName || '';
  _filterPath   = filterPath  || '';
  _allShows = []; _skip = 0; _total = 0;
  _contentType = 'show'; _activeTab = 0;

  const container = document.getElementById('emcat-container');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(createPageSpinner());

  try {
    const [res, allCats] = await Promise.all([
      api.getShowsByFilterPath(_filterPath, _categoryName, 0, LIMIT).catch(() => ({ items:[], total:0, contentType:'show' })),
      api.getEmissions ? api.getEmissions().catch(() => []) : Promise.resolve([]),
    ]);

    const list     = res.items || [];
    _total         = res.total || 0;
    _contentType   = res.contentType || 'show';
    _allShows      = [...list];
    _skip          = list.length;

    const catInfo  = (Array.isArray(allCats) ? allCats : []).find(c =>
      (c.name || '').toLowerCase() === _categoryName.toLowerCase() ||
      (c.filter_path || '') === filterPath
    ) || null;

    const firstImg = list[0] ? (list[0].thumbnail || list[0].image_url || list[0].image || '') : '';

    container.innerHTML = buildHero(catInfo, firstImg);

    // Episodes tab
    const listEl = document.getElementById('emcat-list');
    if (listEl) {
      if (list.length) {
        listEl.innerHTML = list.map((item, i) => buildEpisodeRow(item, i)).join('');
        if (_skip < _total) setupScrollPagination(listEl);
      } else {
        listEl.innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:13px;padding:24px 16px;">Aucun épisode disponible.</p>';
      }
    }

    // Discover tab
    const discoverEl = document.getElementById('emcat-discover-scroll');
    if (discoverEl) {
      const others = (Array.isArray(allCats) ? allCats : [])
        .filter(c => (c.name || '').toLowerCase() !== _categoryName.toLowerCase())
        .slice(0, 16);
      discoverEl.innerHTML = others.length
        ? others.map(buildDiscoverCard).join('')
        : '<p style="color:rgba(255,255,255,.3);font-size:13px;padding:16px;">Aucune autre émission.</p>';
    }

  } catch (err) {
    console.error('Erreur loadEmissionCategory:', err);
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;
                  justify-content:center;padding:80px 24px;text-align:center;">
        <div style="width:64px;height:64px;border-radius:50%;margin:0 auto 14px;
                    background:rgba(226,62,62,.1);border:1px solid rgba(226,62,62,.2);
                    display:flex;align-items:center;justify-content:center;">
          <i class="bi bi-exclamation-circle" style="font-size:26px;color:#E23E3E;"></i>
        </div>
        <p style="color:#fff;font-size:15px;font-weight:800;margin:0 0 6px;">Erreur de chargement</p>
        <p style="color:rgba(255,255,255,.35);font-size:13px;margin:0 0 22px;">Vérifiez votre connexion</p>
        <button onclick="history.back()"
                style="background:#E23E3E;color:#fff;border:none;border-radius:50px;
                       padding:11px 28px;cursor:pointer;font-size:13px;font-weight:700;">
          Retour
        </button>
      </div>`;
  }
}
