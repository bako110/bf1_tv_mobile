// favoris.js — Page Mes Favoris (web)
// Inspiré de mobile/js/pages/favorites.js
import * as api from '../../shared/services/api.js';
import { getNewsDetailUrl, getContentDetailUrl, slugify } from '/js/slugUtils.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// breaking_news → news-detail.html, tout le reste → detail-contenu.html
function getDetailUrl(contentType, contentId, title = '') {
  if (contentType === 'breaking_news') return getNewsDetailUrl(title, contentId);
  return `detail-contenu.html?slug=${slugify(title)}&type=${contentType}` || `detail-contenu.html?id=${contentId}&type=${contentType}`;
}

// Config type → label + couleur + icône (sans route, gérée par getDetailUrl)
const TYPE_CFG = {
  breaking_news:     { label: 'Flash Info',     color: '#E23E3E', icon: 'bi-lightning-fill' },
  sport:             { label: 'Sport',           color: '#1DA1F2', icon: 'bi-trophy-fill' },
  jtandmag:          { label: 'JT & Mag',        color: '#E23E3E', icon: 'bi-camera-video-fill' },
  divertissement:    { label: 'Divertissement',  color: '#10B981', icon: 'bi-emoji-smile-fill' },
  reportage:         { label: 'Reportage',       color: '#F59E0B', icon: 'bi-camera-fill' },
  archive:           { label: 'Archive',         color: '#6B7280', icon: 'bi-archive-fill' },
  movie:             { label: 'Film',            color: '#F97316', icon: 'bi-camera-reels-fill' },
  series:            { label: 'Série',           color: '#8B5CF6', icon: 'bi-collection-play-fill' },
  reel:              { label: 'Reel',            color: '#EC4899', icon: 'bi-play-circle-fill' },
  show:              { label: 'Émission',        color: '#8B5CF6', icon: 'bi-tv-fill' },
  emission_category: { label: 'Émission',        color: '#10B981', icon: 'bi-tv-fill' },
  popular_program:   { label: 'Programme',       color: '#F59E0B', icon: 'bi-star-fill' },
  program:           { label: 'Programme',       color: '#F59E0B', icon: 'bi-star-fill' },
};

const FILTER_TABS = [
  { key: 'all',              label: 'Tout' },
  { key: 'emission_category',label: 'Émissions' },
  { key: 'breaking_news',    label: 'Flash Info' },
  { key: 'sport',            label: 'Sport' },
  { key: 'jtandmag',         label: 'JT & Mag' },
  { key: 'divertissement',   label: 'Divertissement' },
  { key: 'reportage',        label: 'Reportage' },
  { key: 'archive',          label: 'Archive' },
  { key: 'movie',            label: 'Film' },
  { key: 'series',           label: 'Série' },
  { key: 'show',             label: 'Show' },
  { key: 'reel',             label: 'Reel' },
];

// ─── État local ───────────────────────────────────────────────────────────────

let _allFavorites = [];
let _activeFilter = 'all';

// ─── Rendu carte ──────────────────────────────────────────────────────────────

function renderCard(fav) {
  const cfg = TYPE_CFG[fav.content_type] || { label: fav.content_type, color: '#888', icon: 'bi-play-circle-fill' };
  const title = fav.content_title || 'Sans titre';
  const href = getDetailUrl(fav.content_type, fav.content_id, title);
  if (!href) return ''; // type non supporté sur le web, on ne rend pas la carte
  const img = fav.image_url || '';
  const favId = esc(String(fav.id || fav._id || ''));

  return `
  <div class="fav-card" data-id="${favId}" onclick="window.location.href='${esc(href)}'">
    <div class="fav-card-thumb">
      ${img
        ? `<img src="${esc(img)}" alt="${esc(title)}" loading="lazy" class="fav-card-img" onerror="this.style.display='none'">`
        : `<div class="fav-card-placeholder"><i class="bi ${cfg.icon}"></i></div>`
      }
      <div class="fav-card-overlay"></div>
      <span class="fav-card-badge" style="background:${cfg.color};">
        <i class="bi ${cfg.icon}"></i>${esc(cfg.label)}
      </span>
      <button class="fav-card-remove"
              onclick="event.stopPropagation();_removeFav('${favId}','${esc(fav.content_type)}','${esc(String(fav.content_id||''))}')"
              title="Retirer des favoris">
        <i class="bi bi-bookmark-x-fill"></i>
      </button>
    </div>
    <div class="fav-card-body">
      <p class="fav-card-title">${esc(title)}</p>
    </div>
  </div>`;
}

// ─── Rendu grille filtrée ──────────────────────────────────────────────────────

function renderGrid(favs) {
  const grid = document.getElementById('fav-grid');
  const count = document.getElementById('fav-count');
  if (!grid) return;

  const filtered = _activeFilter === 'all' ? favs : favs.filter(f => f.content_type === _activeFilter);

  const sorted = [...filtered]
    .sort((a, b) => {
    const dateA = new Date(a.added_at || a.created_at || 0);
    const dateB = new Date(b.added_at || b.created_at || 0);
    return dateB - dateA;
  });

  if (count) count.textContent = `${sorted.length} favori${sorted.length !== 1 ? 's' : ''}`;

  if (!sorted.length) {
    grid.innerHTML = `
      <div class="fav-empty">
        <i class="bi bi-bookmark fav-empty-icon"></i>
        <p class="fav-empty-title">Aucun favori${_activeFilter !== 'all' ? ' dans cette catégorie' : ''}</p>
        <p class="fav-empty-sub">Ajoutez du contenu en cliquant sur le signet depuis les pages de détail</p>
      </div>`;
    return;
  }

  grid.innerHTML = sorted.map(renderCard).join('');
}

// ─── Rendu onglets filtres ─────────────────────────────────────────────────────

function renderFilters(favs) {
  const bar = document.getElementById('fav-filters');
  if (!bar) return;
  const presentTypes = new Set(favs.map(f => f.content_type));
  const tabs = FILTER_TABS.filter(t => t.key === 'all' || presentTypes.has(t.key));
  bar.innerHTML = tabs.map(t => `
    <button class="fav-filter-btn${_activeFilter === t.key ? ' active' : ''}"
            onclick="_setFavFilter('${t.key}')">
      ${esc(t.label)}
    </button>`).join('');
}

// ─── Actions globales ──────────────────────────────────────────────────────────

window._setFavFilter = function(key) {
  _activeFilter = key;
  renderFilters(_allFavorites);
  renderGrid(_allFavorites);
};

window._removeFav = async function(favId, contentType, contentId) {
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

// ─── Initialisation ───────────────────────────────────────────────────────────

async function loadFavorites() {
  const container = document.getElementById('fav-container');
  if (!container) return;

  // Vérif auth
  const token = localStorage.getItem('bf1_token');
  if (!token) {
    container.innerHTML = `
      <div class="fav-auth-wall">
        <i class="bi bi-bookmark fav-auth-icon"></i>
        <h2 class="fav-auth-title">Mes Favoris</h2>
        <p class="fav-auth-desc">Connectez-vous pour retrouver tous les contenus que vous avez sauvegardés</p>
        <a href="connexion.html" class="fav-auth-btn">Se connecter</a>
      </div>`;
    return;
  }

  // Loader
  container.innerHTML = `<div class="fav-loader"><div class="spinner-border text-danger" role="status"></div></div>`;

  try {
    console.log('[Favoris] appel getMyFavorites...');
    const favs = await api.getMyFavorites();
    console.log('[Favoris] réponse brute:', favs);
    _allFavorites = Array.isArray(favs) ? favs : (favs?.items ?? favs?.favorites ?? []);
    console.log('[Favoris] nb favoris:', _allFavorites.length);
    console.log('[Favoris] types reçus:', [...new Set(_allFavorites.map(f => f.content_type))]);
    if (_allFavorites.length > 0) console.log('[Favoris] 1er favori:', _allFavorites[0]);
    _activeFilter = 'all';

    container.innerHTML = `
      <div class="fav-page-container">
        <!-- En-tête -->
        <div class="fav-header">
          <div>
            <h1 class="fav-title">Mes Favoris</h1>
            <span id="fav-count" class="fav-count">${_allFavorites.length} favori${_allFavorites.length !== 1 ? 's' : ''}</span>
          </div>
          <i class="bi bi-bookmark-heart-fill fav-header-icon"></i>
        </div>

        <!-- Filtres -->
        <div id="fav-filters" class="fav-filters"></div>

        <!-- Grille -->
        <div id="fav-grid" class="fav-grid"></div>
      </div>`;

    renderFilters(_allFavorites);
    renderGrid(_allFavorites);

  } catch(e) {
    console.error('Erreur favoris:', e);
    container.innerHTML = `
      <div class="fav-error">
        <i class="bi bi-exclamation-circle fav-error-icon"></i>
        <p class="fav-error-msg">Erreur lors du chargement des favoris</p>
        <button onclick="location.reload()" class="fav-retry-btn">Réessayer</button>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadFavorites);
