import * as api from '../services/api.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Config type → label + couleur + route
const TYPE_CFG = {
  breaking_news:  { label: 'Flash Info',     color: '#E23E3E', icon: 'bi-lightning-fill',   route: f => `#/news/${f.content_id}` },
  sport:          { label: 'Sport',           color: '#1DA1F2', icon: 'bi-trophy-fill',       route: f => `#/show/sport/${f.content_id}` },
  jtandmag:       { label: 'JT & Mag',        color: '#E23E3E', icon: 'bi-camera-video-fill', route: f => `#/show/jtandmag/${f.content_id}` },
  divertissement: { label: 'Divertissement',  color: '#A855F7', icon: 'bi-music-note-beamed', route: f => `#/show/divertissement/${f.content_id}` },
  reportage:      { label: 'Reportage',       color: '#F59E0B', icon: 'bi-film',              route: f => `#/show/reportage/${f.content_id}` },
  archive:        { label: 'Archive',         color: '#6B7280', icon: 'bi-archive-fill',      route: f => `#/show/archive/${f.content_id}` },
  show:           { label: 'Émission',        color: '#10B981', icon: 'bi-tv-fill',           route: f => `#/show/show/${f.content_id}` },
  movie:          { label: 'Film',            color: '#F97316', icon: 'bi-camera-reels-fill', route: f => `#/show/movie/${f.content_id}` },
  series:         { label: 'Série',           color: '#8B5CF6', icon: 'bi-collection-play-fill', route: f => `#/show/series/${f.content_id}` },
  reel:           { label: 'Reel',            color: '#EC4899', icon: 'bi-play-circle-fill',  route: f => `#/show/reel/${f.content_id}` },
};

const FILTER_TABS = [
  { key: 'all',           label: 'Tout' },
  { key: 'breaking_news', label: 'News' },
  { key: 'sport',         label: 'Sport' },
  { key: 'jtandmag',      label: 'JT & Mag' },
  { key: 'divertissement',label: 'Divertissement' },
  { key: 'reportage',     label: 'Reportage' },
  { key: 'archive',       label: 'Archive' },
  { key: 'show',          label: 'Émission' },
];

// ─── État local ───────────────────────────────────────────────────────────────

let _allFavorites = [];
let _activeFilter = 'all';

// ─── Rendu carte ──────────────────────────────────────────────────────────────

function renderCard(fav) {
  const cfg = TYPE_CFG[fav.content_type] || { label: fav.content_type, color: '#888', icon: 'bi-star', route: () => '#/home' };
  const href = cfg.route(fav);
  const img = fav.image_url || '';
  const title = fav.content_title || 'Sans titre';
  const favId = esc(String(fav.id || fav._id || ''));

  return `
  <div class="fav-card" data-id="${favId}"
       style="position:relative;background:#111;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .15s;"
       onclick="window.location.hash='${esc(href)}'"
       onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
    <!-- Image -->
    <div style="position:relative;width:100%;padding-top:56%;overflow:hidden;background:#1a1a1a;">
      ${img ? `<img src="${esc(img)}" alt="" loading="lazy"
               style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"
               onerror="this.style.display='none'">` : `
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        <i class="bi ${cfg.icon}" style="font-size:36px;color:#333;"></i>
      </div>`}
      <div style="position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(0,0,0,0.8) 100%);"></div>
      <!-- Badge type -->
      <span style="position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:4px;
                   background:${cfg.color};color:#fff;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;">
        <i class="bi ${cfg.icon}" style="font-size:9px;"></i>${esc(cfg.label)}
      </span>
      <!-- Bouton retirer -->
      <button onclick="event.stopPropagation();removeFav('${favId}','${esc(fav.content_type)}','${esc(String(fav.content_id||''))}')"
              style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.65);border:none;
                     border-radius:50%;width:28px;height:28px;color:#fff;cursor:pointer;
                     display:flex;align-items:center;justify-content:center;font-size:14px;" title="Retirer des favoris">
        <i class="bi bi-bookmark-x-fill"></i>
      </button>
    </div>
    <!-- Titre -->
    <div style="padding:10px 12px 12px;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#fff;
                overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
                line-height:1.4;">${esc(title)}</p>
    </div>
  </div>`;
}

// ─── Rendu liste filtrée ──────────────────────────────────────────────────────

function renderGrid(favs) {
  const grid = document.getElementById('fav-grid');
  const count = document.getElementById('fav-count');
  if (!grid) return;

  const filtered = _activeFilter === 'all' ? favs : favs.filter(f => f.content_type === _activeFilter);
  
  // Trier par date (plus récent en premier) 📅
  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.added_at || a.created_at || a.date || 0);
    const dateB = new Date(b.added_at || b.created_at || b.date || 0);
    return dateB - dateA;
  });

  if (count) count.textContent = `${sorted.length} favori${sorted.length !== 1 ? 's' : ''}`;

  if (!sorted.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <i class="bi bi-bookmark" style="font-size:52px;color:#333;display:block;margin-bottom:16px;"></i>
        <p style="color:#666;font-size:15px;margin:0 0 8px;">Aucun favori${_activeFilter !== 'all' ? ' dans cette catégorie' : ''}</p>
        <p style="color:#444;font-size:13px;margin:0;">Ajoutez du contenu depuis les pages de détail</p>
      </div>`;
    return;
  }

  grid.innerHTML = sorted.map(renderCard).join('');
}

// ─── Rendu onglets filtres ─────────────────────────────────────────────────────

function renderFilters(favs) {
  const bar = document.getElementById('fav-filters');
  if (!bar) return;
  // N'afficher que les types présents
  const presentTypes = new Set(favs.map(f => f.content_type));
  const tabs = FILTER_TABS.filter(t => t.key === 'all' || presentTypes.has(t.key));
  bar.innerHTML = tabs.map(t => `
    <button onclick="setFavFilter('${t.key}')"
            id="fav-tab-${t.key}"
            style="flex-shrink:0;background:${_activeFilter === t.key ? '#E23E3E' : '#1a1a1a'};
                   border:none;border-radius:20px;padding:6px 16px;color:${_activeFilter === t.key ? '#fff' : '#888'};
                   cursor:pointer;font-size:13px;white-space:nowrap;transition:background .2s;">
      ${esc(t.label)}
    </button>`).join('');
}

// ─── Actions ──────────────────────────────────────────────────────────────────

window.setFavFilter = function(key) {
  _activeFilter = key;
  renderFilters(_allFavorites);
  renderGrid(_allFavorites);
};

window.removeFav = async function(favId, contentType, contentId) {
  const card = document.querySelector(`.fav-card[data-id="${favId}"]`);
  if (card) { card.style.opacity = '0.4'; card.style.pointerEvents = 'none'; }
  try {
    await api.removeFavorite(contentType, contentId);
    _allFavorites = _allFavorites.filter(f => String(f.id || f._id) !== favId);
    renderFilters(_allFavorites);
    renderGrid(_allFavorites);
  } catch(e) {
    console.error('Erreur suppression favori:', e);
    if (card) { card.style.opacity = '1'; card.style.pointerEvents = ''; }
  }
};

// ─── Export principal ──────────────────────────────────────────────────────────

export async function loadFavorites() {
  const container = document.getElementById('fav-container');
  if (!container) return;

  // Vérif auth
  const token = localStorage.getItem('bf1_token');
  if (!token) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  min-height:calc(100vh - 130px);padding:0 24px;text-align:center;">
        <i class="bi bi-bookmark" style="font-size:56px;color:#E23E3E;margin-bottom:20px;"></i>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Mes Favoris</h2>
        <p style="color:#888;font-size:14px;margin-bottom:24px;max-width:280px;">
          Connectez-vous pour retrouver tous les contenus que vous avez sauvegardés
        </p>
        <button onclick="window._showLoginModal?.('Connectez-vous pour retrouver tous les contenus que vous avez sauvegardés')"
                style="background:#E23E3E;border:none;border-radius:10px;padding:14px 40px;
                       color:#fff;font-size:15px;font-weight:600;cursor:pointer;">
          Se connecter
        </button>
      </div>`;
    return;
  }

  // Loader
  container.innerHTML = `
    <div style="text-align:center;padding:60px;">
      <div style="display:inline-block;width:40px;height:40px;border:3px solid #1a1a1a;
                  border-top-color:#E23E3E;border-radius:50%;animation:favSpin 0.7s linear infinite;"></div>
    </div>
    <style>@keyframes favSpin{to{transform:rotate(360deg)}}</style>`;

  try {
    const favs = await api.getMyFavorites();
    _allFavorites = Array.isArray(favs) ? favs : [];
    _activeFilter = 'all';

    container.innerHTML = `
      <style>
        #fav-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(min-width:480px){ #fav-grid{grid-template-columns:repeat(3,1fr);} }
      </style>

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px;">
        <div>
          <h2 style="font-size:20px;font-weight:700;margin:0;">Mes Favoris</h2>
          <span id="fav-count" style="font-size:13px;color:#666;">${_allFavorites.length} favori${_allFavorites.length !== 1 ? 's' : ''}</span>
        </div>
        <i class="bi bi-bookmark-heart-fill" style="font-size:26px;color:#E23E3E;"></i>
      </div>

      <!-- Filtres -->
      <div id="fav-filters" style="display:flex;gap:8px;overflow-x:auto;padding:0 16px 12px;
                                    scrollbar-width:none;-webkit-overflow-scrolling:touch;"></div>

      <!-- Grille -->
      <div id="fav-grid" style="padding:0 16px 70px;"></div>`;

    renderFilters(_allFavorites);
    renderGrid(_allFavorites);

  } catch(e) {
    console.error('Erreur favoris:', e);
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <i class="bi bi-exclamation-circle" style="font-size:40px;color:#E23E3E;"></i>
        <p style="color:#888;margin-top:12px;">Erreur lors du chargement des favoris</p>
        <button onclick="loadFavorites()" style="background:#E23E3E;border:none;border-radius:8px;
                padding:9px 24px;color:#fff;cursor:pointer;margin-top:12px;">Réessayer</button>
      </div>`;
  }
}
