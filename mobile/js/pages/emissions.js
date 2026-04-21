import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatCount(n) {
  if (!n && n !== 0) return '';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

const _emState = { liked: new Set(), favd: new Set(), counts: {} };

function buildCategoryCard(cat, index = 0) {
  const id    = cat.id || cat._id;
  const name  = cat.name || 'Sans titre';
  const image = cat.image_main || cat.image_url || cat.image || 'https://via.placeholder.com/400x560/111/333?text=BF1';
  const isNew = cat.is_new || false;
  const likes = cat.likes || 0;
  const time  = formatTime(cat.created_at || cat.updated_at);
  const liked = _emState.liked.has(String(id));
  const favd  = _emState.favd.has(String(id));
  _emState.counts[id] = likes;

  // Badge "Nouveau" pour les 2 premiers ou si is_new
  const nouveauBadge = (index < 2 || isNew) ? `
    <div style="position:absolute;top:8px;right:8px;background:#0E7AFE;color:white;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;z-index:3;box-shadow:0 2px 8px rgba(14,122,254,0.4);">
      Nouveau
    </div>
  ` : '';

  // Bouton + en bas à droite
  const addButton = `
    <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('emission_category','${id}',this)" style="position:absolute;bottom:8px;right:8px;width:36px;height:36px;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;z-index:3;border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
      <i class="bi bi-plus-lg"></i>
    </div>
  `;

  return `
    <div class="col-6" style="--card-index:${index};">
      <a href="#/emission-category/${encodeURIComponent(name)}?fp=${btoa(unescape(encodeURIComponent(cat.filter_path || '')))}" class="bf1-emission-card" style="text-decoration:none;display:block;">
        <div class="bf1-emission-inner">
          <div class="bf1-emission-image-wrapper">
            <img src="${esc(image)}" alt="${esc(name)}" class="bf1-emission-image"
                 onerror="this.src='https://via.placeholder.com/400x560/111/333?text=BF1'" />
            ${nouveauBadge}
            ${addButton}
          </div>
          <div class="bf1-emission-content">
            <h3 class="bf1-emission-title">${esc(name)}</h3>
          </div>
        </div>
      </a>
    </div>
  `;
}

window._emToggleLike = async function(id, name) {
  if (!localStorage.getItem('bf1_token')) {
    window._showLoginModal?.('Connectez-vous pour liker "' + name + '"');
    return;
  }
  const btn     = document.getElementById('emlike-' + id);
  const countEl = document.getElementById('emlike-count-' + id);
  const wasLiked = _emState.liked.has(String(id));
  // Optimistic
  if (wasLiked) _emState.liked.delete(String(id)); else _emState.liked.add(String(id));
  const nowLiked = !wasLiked;
  _emState.counts[id] = (_emState.counts[id] || 0) + (nowLiked ? 1 : -1);
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) { icon.className = 'bi ' + (nowLiked ? 'bi-heart-fill' : 'bi-heart'); icon.style.color = nowLiked ? '#E23E3E' : '#fff'; }
  }
  if (countEl) {
    countEl.textContent = formatCount(Math.max(0, _emState.counts[id]));
    countEl.style.display = _emState.counts[id] > 0 ? '' : 'none';
  }
  try {
    await api.toggleLike('emission_category', id);
  } catch(e) {
    // Rollback
    if (wasLiked) _emState.liked.add(String(id)); else _emState.liked.delete(String(id));
    _emState.counts[id] += wasLiked ? 1 : -1;
    if (btn) { const icon = btn.querySelector('i'); if (icon) { icon.className = 'bi ' + (wasLiked ? 'bi-heart-fill' : 'bi-heart'); icon.style.color = wasLiked ? '#E23E3E' : '#fff'; } }
    console.error('Erreur like:', e);
  }
};

window._emToggleFav = async function(id, name) {
  if (!localStorage.getItem('bf1_token')) {
    window._showLoginModal?.('Connectez-vous pour sauvegarder "' + name + '"');
    return;
  }
  const btn    = document.getElementById('emfav-' + id);
  const wasFavd = _emState.favd.has(String(id));
  if (wasFavd) _emState.favd.delete(String(id)); else _emState.favd.add(String(id));
  const nowFavd = !wasFavd;
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) { icon.className = 'bi ' + (nowFavd ? 'bi-bookmark-fill' : 'bi-bookmark'); icon.style.color = nowFavd ? '#F59E0B' : '#fff'; }
  }
  try {
    if (wasFavd) await api.removeFavorite('emission_category', id);
    else         await api.addFavorite('emission_category', id);
  } catch(e) {
    if (wasFavd) _emState.favd.add(String(id)); else _emState.favd.delete(String(id));
    if (btn) { const icon = btn.querySelector('i'); if (icon) { icon.className = 'bi ' + (wasFavd ? 'bi-bookmark-fill' : 'bi-bookmark'); icon.style.color = wasFavd ? '#F59E0B' : '#fff'; } }
    console.error('Erreur favori:', e);
  }
};

export async function loadEmissions() {
  const container = document.getElementById('emissions-list');
  if (!container) return;

  // Reset state
  _emState.liked.clear(); _emState.favd.clear(); _emState.counts = {};

  container.innerHTML = '';
  container.appendChild(createPageSpinner());

  try {
    const categories = await api.getEmissions();

    // Pre-load liked/favorited state if logged in
    if (localStorage.getItem('bf1_token')) {
      const [likedRes, favRes] = await Promise.all([
        api.getMyLikes('emission_category').catch(() => []),
        api.getMyFavorites('emission_category').catch(() => []),
      ]);
      (Array.isArray(likedRes) ? likedRes : []).forEach(l => {
        const lid = l.content_id || l.id || l._id;
        if (lid) _emState.liked.add(String(lid));
      });
      (Array.isArray(favRes) ? favRes : []).forEach(f => {
        const fid = f.content_id || f.id || f._id;
        if (fid) _emState.favd.add(String(fid));
      });
    }

    if (!categories || categories.length === 0) {
      container.innerHTML = `
        <div class="bf1-empty-state">
          <i class="bi bi-grid"></i>
          <p>Aucune catégorie disponible</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="row g-3 px-3 py-3">${categories.map((cat, i) => buildCategoryCard(cat, i)).join('')}</div>`;
    
    // Injecter les styles
    injectEmissionStyles();

  } catch (err) {
    console.error('Erreur loadEmissions:', err);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-circle" style="font-size:2rem;color:#E23E3E;"></i>
        <p style="color:#888;" class="mt-2">Erreur lors du chargement</p>
        <button class="btn btn-sm btn-outline-danger mt-2" onclick="location.reload()">Réessayer</button>
      </div>`;
  }
}

function injectEmissionStyles() {
  if (document.getElementById('bf1-emission-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'bf1-emission-styles';
  style.textContent = `
    /* ===== EMISSION CARDS ===== */
    .bf1-emission-card {
      display: block;
      cursor: pointer;
      animation: cardFadeIn 0.5s ease-out forwards;
      animation-delay: calc(var(--card-index) * 0.05s);
      opacity: 0;
    }

    .bf1-emission-inner {
      position: relative;
      width: 100%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bf1-emission-card:active .bf1-emission-inner {
      transform: scale(0.97);
    }

    .bf1-emission-image-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 3/4;
      border-radius: 16px;
      overflow: hidden;
      background: #1a1a1a;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .bf1-emission-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bf1-emission-card:hover .bf1-emission-image {
      transform: scale(1.05);
    }

    .bf1-emission-content {
      padding: 12px 0 0;
    }

    .bf1-emission-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 8px;
      color: white;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      letter-spacing: -0.2px;
    }

    .bf1-emission-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 500;
    }

    .bf1-emission-stats span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .bf1-emission-stats i {
      font-size: 11px;
    }

    .bf1-likes {
      color: #E23E3E !important;
    }

    .bf1-likes i {
      color: #E23E3E !important;
    }

    /* ===== ANIMATIONS ===== */
    @keyframes cardFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ===== EMPTY STATE ===== */
    .bf1-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #999;
    }

    .bf1-empty-state i {
      font-size: 64px;
      color: #333;
      margin-bottom: 16px;
    }

    .bf1-empty-state p {
      font-size: 15px;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}