// js/search.js
import * as api from '../../shared/services/api.js';
import { getNewsDetailUrl, getContentDetailUrl, slugify } from '/js/slugUtils.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// breaking_news → news-detail.html, tout le reste → detail-contenu.html
function getDetailUrl(type, item) {
  const id = item._id || item.id || '';
  const title = item.title || '';
  if (type === 'news' || type === 'breaking_news') return getNewsDetailUrl(title, id);
  return `detail-contenu.html?slug=${slugify(title)}&type=${type}` || `detail-contenu.html?id=${id}&type=${type}`;
}

const TYPE_CFG = {
  news:              { label: 'Flash Info',      color: '#E23E3E', icon: 'bi-lightning-fill'       },
  breaking_news:     { label: 'Flash Info',      color: '#E23E3E', icon: 'bi-lightning-fill'       },
  sport:             { label: 'Sport',            color: '#1DA1F2', icon: 'bi-trophy-fill'           },
  show:              { label: 'Émission',         color: '#10B981', icon: 'bi-tv-fill'               },
  emission_category: { label: 'Émission',         color: '#10B981', icon: 'bi-tv-fill'               },
  jtandmag:          { label: 'JT & Magazine',    color: '#E23E3E', icon: 'bi-camera-video-fill'     },
  divertissement:    { label: 'Divertissement',   color: '#A855F7', icon: 'bi-music-note-beamed'     },
  reportage:         { label: 'Reportage',        color: '#F59E0B', icon: 'bi-film'                  },
  archive:           { label: 'Archive',          color: '#6B7280', icon: 'bi-archive-fill'          },
  movie:             { label: 'Film',             color: '#F97316', icon: 'bi-camera-reels-fill'     },
  series:            { label: 'Série',            color: '#8B5CF6', icon: 'bi-collection-play-fill'  },
  reel:              { label: 'Reel',             color: '#EC4899', icon: 'bi-play-circle-fill'      },
  popular_program:   { label: 'Programme',        color: '#F59E0B', icon: 'bi-star-fill'             },
};

// ─── Rendu résultats ──────────────────────────────────────────────────────────

function renderResults(items) {
  const area = document.getElementById('srch-results');
  const countEl = document.getElementById('srch-count');
  const suggestions = document.getElementById('srch-suggestions');
  if (!area) return;

  if (!items || items.length === 0) {
    area.innerHTML = `
      <div class="srch-empty">
        <i class="bi bi-search"></i>
        <p style="font-size:16px;font-weight:600;margin-bottom:6px;">Aucun résultat trouvé</p>
        <p>Essayez avec d'autres mots-clés</p>
      </div>`;
    if (countEl) countEl.textContent = '0 résultat';
    if (suggestions) suggestions.style.display = 'none';
    return;
  }

  if (countEl) countEl.textContent = `${items.length} résultat${items.length !== 1 ? 's' : ''}`;
  if (suggestions) suggestions.style.display = 'none';

  // Grouper par type
  const grouped = {};
  items.forEach(item => {
    const t = item.type || 'autre';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(item);
  });

  const ORDER = ['news', 'breaking_news', 'sport', 'jtandmag', 'divertissement', 'reportage', 'show', 'emission_category', 'movie', 'series', 'archive', 'reel'];
  const sortedKeys = [
    ...ORDER.filter(k => grouped[k]),
    ...Object.keys(grouped).filter(k => !ORDER.includes(k))
  ];

  area.innerHTML = sortedKeys.map(type => {
    const cfg = TYPE_CFG[type] || { label: type, color: '#888', icon: 'bi-collection' };
    const list = grouped[type];
    return `
      <div style="margin-bottom:32px;">
        <div class="srch-section-label">
          <span style="color:${cfg.color};font-size:14px;"><i class="bi ${cfg.icon}"></i></span>
          <span>${esc(cfg.label)}</span>
          <small>(${list.length})</small>
        </div>
        ${list.map(item => {
          const href = getDetailUrl(type, item);
          const imgUrl = item.image_url || item.thumbnail || item.image || '';
          return `
          <a href="${esc(href)}" class="srch-result-item">
            <div class="srch-result-thumb">
              ${imgUrl
                ? `<img src="${esc(imgUrl)}" alt="" onerror="this.style.display='none'">`
                : `<i class="bi ${cfg.icon}" style="color:#333;font-size:22px;"></i>`}
            </div>
            <div class="srch-result-info">
              <div class="srch-result-title">${esc(item.title)}</div>
              ${item.description ? `<div class="srch-result-desc">${esc(item.description)}</div>` : ''}
              <div><span class="srch-tag" style="background:${cfg.color}22;color:${cfg.color}">${esc(cfg.label)}</span></div>
            </div>
            <i class="bi bi-chevron-right" style="color:var(--text-3,#444);font-size:16px;align-self:center;flex-shrink:0;"></i>
          </a>`;
        }).join('')}
      </div>`;
  }).join('');
}

// ─── Debounce & logique de recherche ─────────────────────────────────────────

let _timer = null;
let _lastQuery = '';

async function doSearch(q) {
  const area = document.getElementById('srch-results');
  const suggestions = document.getElementById('srch-suggestions');
  const spinner = document.querySelector('.navbar-search .search-spinner');

  if (!q || q.length < 2) {
    if (area) area.innerHTML = '';
    if (suggestions) suggestions.style.display = '';
    if (spinner) spinner.classList.add('d-none');
    _lastQuery = '';
    return;
  }

  if (q === _lastQuery) return;
  _lastQuery = q;

  if (suggestions) suggestions.style.display = 'none';
  if (spinner) spinner.classList.remove('d-none');
  if (area) area.innerHTML = '';

  try {
    const res = await api.searchContent(q);
    const headerInput = document.querySelector('.navbar-search .search-input');
    if (headerInput && q !== headerInput.value.trim()) return; // résultat obsolète
    renderResults(res?.items || []);
  } catch (e) {
    if (area) area.innerHTML = `
      <div class="srch-empty">
        <i class="bi bi-exclamation-circle"></i>
        <p>Erreur lors de la recherche. Réessayez.</p>
      </div>`;
  } finally {
    if (spinner) spinner.classList.add('d-none');
  }
}

// ─── Initialisation ───────────────────────────────────────────────────────────

export function initSearch() {
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q') || '';

  if (initialQuery) {
    doSearch(initialQuery);
  }

  // Attendre que le header soit injecté puis brancher l'input
  function bindHeaderInput() {
    const headerInput = document.querySelector('.navbar-search .search-input');
    if (!headerInput) { setTimeout(bindHeaderInput, 100); return; }

    // Désactiver la redirection du header (on est déjà sur search.html)
    headerInput.oninput = null;
    headerInput.value = initialQuery;
    setTimeout(() => headerInput.focus(), 150);

    headerInput.addEventListener('input', () => {
      clearTimeout(_timer);
      const q = headerInput.value.trim();
      const url = new URL(window.location.href);
      if (q) { url.searchParams.set('q', q); } else { url.searchParams.delete('q'); }
      history.replaceState(null, '', url.toString());
      _timer = setTimeout(() => doSearch(q), 350);
    });

    headerInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        clearTimeout(_timer);
        doSearch(headerInput.value.trim());
      }
    });
  }

  bindHeaderInput();
}
