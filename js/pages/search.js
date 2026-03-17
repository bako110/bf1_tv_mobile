import * as api from '../services/api.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const TYPE_CFG = {
  news:          { label: 'Flash Info',    color: '#E23E3E', icon: 'bi-lightning-fill',   route: item => `#/news/${item.id}` },
  sport:         { label: 'Sport',          color: '#1DA1F2', icon: 'bi-trophy-fill',       route: item => `#/show/sport/${item.id}` },
  show:          { label: 'Émission',       color: '#10B981', icon: 'bi-tv-fill',           route: item => `#/show/show/${item.id}` },
  jtandmag:      { label: 'JT & Mag',       color: '#E23E3E', icon: 'bi-camera-video-fill', route: item => `#/show/jtandmag/${item.id}` },
  divertissement:{ label: 'Divertissement', color: '#A855F7', icon: 'bi-music-note-beamed', route: item => `#/show/divertissement/${item.id}` },
  reportage:     { label: 'Reportage',      color: '#F59E0B', icon: 'bi-film',              route: item => `#/show/reportage/${item.id}` },
  archive:       { label: 'Archive',        color: '#6B7280', icon: 'bi-archive-fill',      route: item => `#/show/archive/${item.id}` },
};

// ─── Rendu résultats ──────────────────────────────────────────────────────────

function renderResults(items) {
  const area = document.getElementById('srch-results');
  const countEl = document.getElementById('srch-count');
  if (!area) return;

  if (!items || items.length === 0) {
    area.innerHTML = `
      <div style="text-align:center;padding:50px 20px;">
        <i class="bi bi-search" style="font-size:48px;color:#333;display:block;margin-bottom:14px;"></i>
        <p style="color:#666;font-size:15px;margin:0;">Aucun résultat trouvé</p>
        <p style="color:#444;font-size:13px;margin:4px 0 0;">Essayez avec d'autres mots</p>
      </div>`;
    if (countEl) countEl.textContent = '0 résultat';
    return;
  }

  if (countEl) countEl.textContent = `${items.length} résultat${items.length !== 1 ? 's' : ''}`;

  // Grouper par type
  const grouped = {};
  items.forEach(item => {
    const t = item.type || 'autre';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(item);
  });

  const ORDER = ['news','sport','jtandmag','divertissement','reportage','show','archive'];
  const sortedKeys = [...ORDER.filter(k => grouped[k]), ...Object.keys(grouped).filter(k => !ORDER.includes(k))];

  area.innerHTML = sortedKeys.map(type => {
    const cfg = TYPE_CFG[type] || { label: type, color: '#888', icon: 'bi-collection', route: () => '#/home' };
    const list = grouped[type];
    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:8px;padding:0 16px 10px;">
          <i class="bi ${cfg.icon}" style="color:${cfg.color};font-size:15px;"></i>
          <span style="font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px;">${esc(cfg.label)}</span>
          <span style="font-size:12px;color:#555;">(${list.length})</span>
        </div>
        ${list.map(item => {
          const href = cfg.route(item);
          return `
          <div onclick="window.location.hash='${esc(href)}'"
               style="display:flex;gap:12px;padding:10px 16px;cursor:pointer;transition:background .15s;"
               onmouseover="this.style.background='#111'" onmouseout="this.style.background='transparent'">
            <div style="flex-shrink:0;width:72px;height:52px;border-radius:8px;overflow:hidden;background:#1a1a1a;display:flex;align-items:center;justify-content:center;">
              ${item.image_url ? `<img src="${esc(item.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : `<i class="bi ${cfg.icon}" style="color:#333;font-size:20px;"></i>`}
            </div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:4px;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.35;">${esc(item.title)}</p>
              ${item.description ? `<p style="margin:0;font-size:12px;color:#666;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;">${esc(item.description)}</p>` : ''}
            </div>
            <i class="bi bi-chevron-right" style="color:#444;font-size:16px;align-self:center;flex-shrink:0;"></i>
          </div>`;
        }).join('')}
      </div>`;
  }).join('');
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

let _timer = null;
let _lastQuery = '';

async function doSearch(q) {
  if (!q || q.length < 2) {
    const area = document.getElementById('srch-results');
    const countEl = document.getElementById('srch-count');
    if (area) area.innerHTML = '';
    if (countEl) countEl.textContent = '';
    document.getElementById('srch-spinner')?.classList.add('d-none');
    showSuggestions();
    return;
  }

  if (q === _lastQuery) return;
  _lastQuery = q;

  hideSuggestions();
  document.getElementById('srch-spinner')?.classList.remove('d-none');

  try {
    const res = await api.searchContent(q);
    if (q !== document.getElementById('srch-input')?.value.trim()) return; // résultat obsolète
    renderResults(res?.items || []);
  } catch(e) {
    const area = document.getElementById('srch-results');
    if (area) area.innerHTML = `<p style="color:#666;text-align:center;padding:40px;">Erreur lors de la recherche</p>`;
  }
  document.getElementById('srch-spinner')?.classList.add('d-none');
}

function hideSuggestions() {
  const s = document.getElementById('srch-suggestions');
  if (s) s.style.display = 'none';
  const area = document.getElementById('srch-results');
  if (area) area.innerHTML = '';
}

function showSuggestions() {
  const s = document.getElementById('srch-suggestions');
  if (s) s.style.display = '';
}

// ─── Export principal ──────────────────────────────────────────────────────────

export async function loadSearch() {
  const container = document.getElementById('srch-container');
  if (!container) return;

  _lastQuery = '';

  const suggestions = [
    { label: 'Sport',          icon: 'bi-trophy-fill',       color: '#1DA1F2', href: '#/sports' },
    { label: 'JT & Magazine',  icon: 'bi-camera-video-fill', color: '#E23E3E', href: '#/jtandmag' },
    { label: 'Divertissement', icon: 'bi-music-note-beamed', color: '#A855F7', href: '#/divertissement' },
    { label: 'Reportages',     icon: 'bi-film',              color: '#F59E0B', href: '#/reportages' },
    { label: 'Flash Info',     icon: 'bi-lightning-fill',    color: '#E23E3E', href: '#/news' },
    { label: 'Archives',       icon: 'bi-archive-fill',      color: '#6B7280', href: '#/archive' },
  ];

  container.innerHTML = `
    <style>
      #srch-input:focus { outline:none; border-color:#E23E3E !important; }
      #srch-input::placeholder { color:#555; }
    </style>

    <!-- Barre de recherche -->
    <div style="position:sticky;top:0;z-index:10;background:#000;padding:14px 16px 10px;">
      <div style="position:relative;display:flex;align-items:center;background:#111;border-radius:14px;border:1.5px solid #222;overflow:hidden;">
        <i class="bi bi-search" style="position:absolute;left:14px;color:#555;font-size:16px;pointer-events:none;"></i>
        <input id="srch-input" type="search" placeholder="Rechercher un titre, sujet..." autocomplete="off"
               style="flex:1;background:transparent;border:none;padding:13px 44px 13px 42px;color:#fff;font-size:15px;width:100%;">
        <div id="srch-spinner" class="d-none" style="position:absolute;right:14px;">
          <div style="width:16px;height:16px;border:2px solid #333;border-top-color:#E23E3E;border-radius:50%;animation:srchSpin .6s linear infinite;"></div>
        </div>
      </div>
      <div id="srch-count" style="font-size:12px;color:#555;margin-top:6px;min-height:16px;padding-left:4px;"></div>
    </div>
    <style>@keyframes srchSpin{to{transform:rotate(360deg)}}</style>

    <!-- Suggestions catégories -->
    <div id="srch-suggestions" style="padding:4px 16px 16px;">
      <p style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.7px;margin-bottom:12px;">Parcourir par catégorie</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
        ${suggestions.map(s => `
        <div onclick="window.location.hash='${s.href}'"
             style="background:#111;border-radius:12px;padding:16px 10px;text-align:center;cursor:pointer;
                    transition:background .15s;"
             onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='#111'">
          <i class="bi ${s.icon}" style="font-size:24px;color:${s.color};display:block;margin-bottom:8px;"></i>
          <span style="font-size:12px;color:#ccc;font-weight:600;">${esc(s.label)}</span>
        </div>`).join('')}
      </div>
    </div>

    <!-- Zone résultats -->
    <div id="srch-results" style="padding-bottom:90px;"></div>`;

  // Écoute saisie
  const input = document.getElementById('srch-input');
  if (input) {
    input.addEventListener('input', () => {
      clearTimeout(_timer);
      const q = input.value.trim();
      _timer = setTimeout(() => doSearch(q), 350);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { clearTimeout(_timer); doSearch(input.value.trim()); }
    });
    // Focus automatique
    setTimeout(() => input.focus(), 100);
  }
}
