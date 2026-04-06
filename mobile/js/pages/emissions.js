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

const _emState = { liked: new Set(), favd: new Set(), counts: {} };

function buildCategoryCard(cat) {
  const id    = cat.id || cat._id;
  const name  = cat.name || 'Sans titre';
  const image = cat.image_main || cat.image_url || cat.image || 'https://via.placeholder.com/400x560/111/333?text=BF1';
  const likes = cat.likes ?? 0;
  const isNew = cat.is_new;
  const liked = _emState.liked.has(String(id));
  const favd  = _emState.favd.has(String(id));
  _emState.counts[id] = likes;

  return `
    <div class="col-6">
      <div class="position-relative rounded overflow-hidden"
           style="background:var(--surface,#111);aspect-ratio:3/4;cursor:pointer;"
           onclick="window.location.hash='#/emission-category/${encodeURIComponent(name)}'">
        <img src="${esc(image)}" alt="${esc(name)}" class="w-100 h-100"
             style="object-fit:cover;display:block;"
             onerror="this.src='https://via.placeholder.com/400x560/111/333?text=BF1'" />

        <!-- gradient -->
        <div class="position-absolute bottom-0 start-0 end-0"
             style="background:linear-gradient(transparent,rgba(0,0,0,0.88));padding:40px 10px 10px;"></div>

        ${isNew ? `<div class="position-absolute top-0 start-0 m-2">
          <span class="badge" style="background:#E23E3E;font-size:10px;">Nouveau</span>
        </div>` : ''}

        <!-- Favorite btn top-right -->
        <button id="emfav-${esc(id)}"
                onclick="event.stopPropagation();_emToggleFav('${esc(id)}','${esc(name)}')"
                style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.55);
                       border:none;border-radius:50%;width:32px;height:32px;
                       display:flex;align-items:center;justify-content:center;
                       cursor:pointer;z-index:2;padding:0;">
          <i class="bi ${favd ? 'bi-bookmark-fill' : 'bi-bookmark'}"
             style="font-size:15px;color:${favd ? '#F59E0B' : '#fff'};"></i>
        </button>

        <!-- Like btn below fav -->
        <button id="emlike-${esc(id)}"
                onclick="event.stopPropagation();_emToggleLike('${esc(id)}','${esc(name)}')"
                style="position:absolute;top:46px;right:8px;background:rgba(0,0,0,0.55);
                       border:none;border-radius:50%;width:32px;height:32px;
                       display:flex;flex-direction:column;align-items:center;justify-content:center;
                       cursor:pointer;z-index:2;padding:0;gap:1px;">
          <i class="bi ${liked ? 'bi-heart-fill' : 'bi-heart'}"
             style="font-size:15px;color:${liked ? '#E23E3E' : '#fff'};"></i>
        </button>
        <span id="emlike-count-${esc(id)}"
              style="position:absolute;top:82px;right:0;left:0;text-align:center;
                     color:#fff;font-size:9px;font-weight:600;z-index:2;
                     ${likes > 0 ? '' : 'display:none;'}">${formatCount(likes)}</span>

        <!-- name bottom -->
        <div class="position-absolute bottom-0 start-0 end-0 p-2">
          <p class="mb-0 fw-bold" style="color:var(--description-grid-color, #fff);font-size:13px;line-height:1.2;text-shadow:0 1px 3px rgba(0,0,0,0.8);">${esc(name)}</p>
        </div>
      </div>
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
        <div class="text-center py-5">
          <i class="bi bi-grid" style="font-size:3rem;color:var(--text-3,#555);"></i>
          <p style="color:var(--text-2,#888);" class="mt-3">Aucune catégorie disponible</p>
          <p style="color:var(--text-3,#666);font-size:13px;">Les catégories d'émissions seront affichées ici</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="row g-3 px-3 py-3">${categories.map(buildCategoryCard).join('')}</div>`;

  } catch (err) {
    console.error('Erreur loadEmissions:', err);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-circle" style="font-size:2rem;color:#E23E3E;"></i>
        <p style="color:var(--text-2,#888);" class="mt-2">Erreur lors du chargement</p>
        <button class="btn btn-sm btn-outline-danger mt-2" onclick="location.reload()">Réessayer</button>
      </div>`;
  }
}
