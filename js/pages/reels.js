import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

function formatCount(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

// ── State ─────────────────────────────────────────────────────────────────────
// Stocke le nombre brut (pas formaté) pour chaque reel
const _likeCount    = new Map(); // id → number
const _commentCount = new Map(); // id → number
const _shareCount   = new Map(); // id → number
const _likedState   = new Map(); // id → boolean
let _activeCommentId = null;

// ── Layout ────────────────────────────────────────────────────────────────────
function _setReelsLayout() {
  const container = document.getElementById('reels-container');
  const appContent = document.getElementById('app-content');
  const bottomNav = document.querySelector('.bottom-nav');
  if (!container || !appContent) return;

  // Bloquer tout scroll sur app-content
  appContent.style.overflow     = 'hidden';
  appContent.style.paddingBottom = '0';
  appContent.style.height        = '100%';

  // Hauteur nette = viewport moins la bottom nav
  const navH = bottomNav ? bottomNav.offsetHeight : 60;
  const h = window.innerHeight - navH;
  container.style.height = h + 'px';
  container.querySelectorAll('.reel-item').forEach(item => {
    item.style.height = h + 'px';
  });
}

// ── Reel card builder ─────────────────────────────────────────────────────────
function buildReel(reel, index) {
  const id          = String(reel.id || reel._id);
  const videoUrl    = reel.video_url || reel.videoUrl || '';
  const title       = reel.title || '';
  const description = reel.description || '';
  // Les API peuvent renvoyer un tableau ou un entier
  const likes    = Number(Array.isArray(reel.likes)    ? reel.likes.length    : (reel.likes    ?? reel.likes_count    ?? 0));
  const comments = Number(Array.isArray(reel.comments) ? reel.comments.length : (reel.comments ?? reel.comments_count ?? 0));
  const shares   = Number(Array.isArray(reel.shares)   ? reel.shares.length   : (reel.shares   ?? reel.shares_count   ?? 0));
  const allowComments = reel.allow_comments !== false;
  const safeTitle = title.replace(/"/g, '&quot;');

  // Initialiser les compteurs bruts
  _likeCount.set(id, likes);
  _commentCount.set(id, comments);
  _shareCount.set(id, shares);

  return `
    <div class="reel-item" style="
        width:100%;
        background:#000;
        scroll-snap-align:start;
        scroll-snap-stop:always;
        flex-shrink:0;
        overflow:hidden;
        position:relative;
    " data-index="${index}" data-id="${id}">

      <video class="reel-video"
             src="${videoUrl}"
             loop
             muted
             playsinline
             preload="metadata"
             style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;cursor:pointer;"
             onclick="window.__reelTogglePlay(this)"
      ></video>

      <!-- Play/Pause flash icon -->
      <div class="reel-play-icon" style="
          display:none;position:absolute;inset:0;pointer-events:none;
          align-items:center;justify-content:center;">
        <i class="bi bi-pause-circle-fill" style="font-size:5rem;color:rgba(255,255,255,0.75);"></i>
      </div>

      <!-- Bottom gradient + info -->
      <div style="
          position:absolute;bottom:0;left:0;right:0;
          background:linear-gradient(transparent, rgba(0,0,0,0.88));
          padding:60px 76px 20px 14px;pointer-events:none;">
        ${title       ? `<p style="margin:0 0 4px;font-weight:700;color:#fff;font-size:14px;line-height:1.3;">${title}</p>` : ''}
        ${description ? `<p style="margin:0;color:rgba(255,255,255,0.75);font-size:12px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${description}</p>` : ''}
      </div>

      <!-- Boutons droite -->
      <div style="position:absolute;right:10px;bottom:24px;
                  display:flex;flex-direction:column;align-items:center;gap:22px;">

        <!-- Like -->
        <button class="reel-like-btn"
                data-id="${id}"
                onclick="window.__reelToggleLike(this)"
                style="background:none;border:none;padding:0;cursor:pointer;
                       display:flex;flex-direction:column;align-items:center;gap:4px;">
          <i class="bi bi-heart" style="font-size:30px;color:#fff;transition:color .15s,transform .15s;"></i>
          <span class="reel-like-count" style="color:#fff;font-size:12px;font-weight:600;">${formatCount(likes)}</span>
        </button>

        <!-- Commentaires -->
        ${allowComments ? `
        <button class="reel-comment-btn"
                data-id="${id}"
                onclick="window.__reelOpenComments('${id}')"
                style="background:none;border:none;padding:0;cursor:pointer;
                       display:flex;flex-direction:column;align-items:center;gap:4px;">
          <i class="bi bi-chat-dots" style="font-size:28px;color:#fff;"></i>
          <span class="reel-comment-count" data-id="${id}" style="color:#fff;font-size:12px;font-weight:600;">${formatCount(comments)}</span>
        </button>` : ''}

        <!-- Partager -->
        <button class="reel-share-btn"
                data-id="${id}" data-title="${safeTitle}"
                onclick="window.__reelShare(this)"
                style="background:none;border:none;padding:0;cursor:pointer;
                       display:flex;flex-direction:column;align-items:center;gap:4px;">
          <i class="bi bi-share" style="font-size:27px;color:#fff;"></i>
          <span class="reel-share-count" data-id="${id}" style="color:#fff;font-size:12px;font-weight:600;">${formatCount(shares)}</span>
        </button>

      </div>
    </div>`;
}

// ── Auto-play (TikTok style) ───────────────────────────────────────────────────
// Scroll+debounce + scrollend natif pour détection de snap précise
function setupAutoPlay(container) {
  let _unmuted = false;
  let _scrollTimer = null;

  function _playVisible() {
    const cRect = container.getBoundingClientRect();
    container.querySelectorAll('.reel-item').forEach(item => {
      const video = item.querySelector('.reel-video');
      if (!video) return;
      const rect = item.getBoundingClientRect();
      // Visible si au moins 70% de l'item est dans le container
      const overlapTop    = Math.max(rect.top, cRect.top);
      const overlapBottom = Math.min(rect.bottom, cRect.bottom);
      const overlap = Math.max(0, overlapBottom - overlapTop);
      const visible = overlap / rect.height >= 0.70;
      if (visible) {
        video.muted = !_unmuted;
        if (video.paused) video.play().catch(() => {});
      } else {
        if (!video.paused) video.pause();
      }
    });
  }

  // Débounce scroll → joue quand l'utilisateur s'arrête
  container.addEventListener('scroll', () => {
    clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(_playVisible, 150);
  }, { passive: true });

  // scrollend natif (Chrome 114 / Android WebView moderne) = plus réactif
  container.addEventListener('scrollend', _playVisible, { passive: true });

  // Joue le premier reel au chargement
  setTimeout(_playVisible, 80);

  // Désourdissage au premier tap sur l'écran
  document.addEventListener('click', () => {
    if (_unmuted) return;
    _unmuted = true;
    container.querySelectorAll('.reel-video').forEach(v => {
      if (!v.paused) v.muted = false;
    });
  }, { once: true });
}

// ── Toggle play/pause ─────────────────────────────────────────────────────────
window.__reelTogglePlay = function(video) {
  const item = video.closest('.reel-item');
  const icon = item?.querySelector('.reel-play-icon i');
  if (video.paused) {
    video.play().catch(() => {});
    if (icon) {
      icon.className = 'bi bi-play-circle-fill';
      icon.parentElement.style.display = 'flex';
      setTimeout(() => { icon.parentElement.style.display = 'none'; }, 700);
    }
  } else {
    video.pause();
    if (icon) {
      icon.className = 'bi bi-pause-circle-fill';
      icon.parentElement.style.display = 'flex';
      setTimeout(() => { icon.parentElement.style.display = 'none'; }, 700);
    }
  }
};

// ── Like ──────────────────────────────────────────────────────────────────────
window.__reelToggleLike = async function(btn) {
  if (!api.isAuthenticated()) {
    window._showLoginModal?.('Connectez-vous pour aimer ce reel');
    return;
  }
  const id      = btn.dataset.id;
  const icon    = btn.querySelector('i');
  const countEl = btn.querySelector('.reel-like-count');
  const wasLiked = _likedState.get(id) === true;
  const prevCount = _likeCount.get(id) ?? 0;
  const newCount  = wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

  // Mise à jour optimiste
  _likedState.set(id, !wasLiked);
  _likeCount.set(id, newCount);
  if (icon) {
    icon.className    = wasLiked ? 'bi bi-heart' : 'bi bi-heart-fill';
    icon.style.color  = wasLiked ? '#fff' : '#E23E3E';
    icon.style.transform = 'scale(1.3)';
    setTimeout(() => { icon.style.transform = 'scale(1)'; }, 200);
  }
  if (countEl) countEl.textContent = formatCount(newCount);

  try {
    await api.toggleLike('reel', id);
    // Récupérer le vrai compteur serveur
    const serverCount = await api.getLikesCount('reel', id);
    _likeCount.set(id, serverCount);
    if (countEl) countEl.textContent = formatCount(serverCount);
  } catch {
    // Annuler sur erreur
    _likedState.set(id, wasLiked);
    _likeCount.set(id, prevCount);
    if (icon) {
      icon.className   = wasLiked ? 'bi bi-heart-fill' : 'bi bi-heart';
      icon.style.color = wasLiked ? '#E23E3E' : '#fff';
    }
    if (countEl) countEl.textContent = formatCount(prevCount);
  }
};

// ── Comment drawer ─────────────────────────────────────────────────────────────
function _injectCommentDrawer() {
  if (document.getElementById('_reels-comment-drawer')) return;

  const overlay = document.createElement('div');
  overlay.id = '_reels-comment-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9998;display:none;';
  overlay.onclick = () => window.__reelCloseComments();

  const drawer = document.createElement('div');
  drawer.id = '_reels-comment-drawer';
  drawer.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;' +
    'z-index:9999;transform:translateY(100%);transition:transform 0.3s cubic-bezier(.4,0,.2,1);' +
    'max-height:75vh;display:flex;flex-direction:column;';
  drawer.innerHTML = `
    <div style="width:40px;height:4px;background:#2a2a2a;border-radius:2px;margin:12px auto 8px;flex-shrink:0;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:0 16px 12px;flex-shrink:0;border-bottom:1px solid #1a1a1a;">
      <span id="_reels-comment-title"
            style="color:#fff;font-weight:700;font-size:15px;">Commentaires</span>
      <button onclick="window.__reelCloseComments()"
              style="background:rgba(255,255,255,.06);border:1px solid #222;color:#aaa;
                     width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;
                     display:flex;align-items:center;justify-content:center;">✕</button>
    </div>
    <div id="_reels-comments-list"
         style="flex:1;overflow-y:auto;padding:0 16px;-webkit-overflow-scrolling:touch;"></div>
    <div style="padding:10px 12px;border-top:1px solid #1a1a1a;display:flex;gap:8px;flex-shrink:0;
                padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));">
      <input id="_reels-comment-input"
             placeholder="Écrire un commentaire…"
             style="flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:22px;
                    padding:10px 16px;color:#fff;font-size:14px;outline:none;
                    transition:border-color .2s;"
             onfocus="this.style.borderColor='#E23E3E'"
             onblur="this.style.borderColor='#2a2a2a'"
             onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.__reelSubmitComment();}" />
      <button id="_reels-comment-send"
              onclick="window.__reelSubmitComment()"
              style="background:#E23E3E;border:none;border-radius:50%;
                     width:42px;height:42px;color:#fff;font-size:18px;cursor:pointer;
                     display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="bi bi-send-fill"></i>
      </button>
    </div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
}

function _timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return 'à l\'instant';
  if (diff < 3600) return `${Math.floor(diff/60)}min`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}j`;
}

function _renderComments(items) {
  if (!items.length) return `
    <div style="text-align:center;padding:32px 0;color:#444;">
      <i class="bi bi-chat-dots" style="font-size:2rem;"></i>
      <p style="margin:8px 0 0;font-size:13px;">Aucun commentaire pour l'instant.<br>Soyez le premier !</p>
    </div>`;
  return items.map(c => {
    const user = c.user?.username || c.author || 'Anonyme';
    const text = c.text || c.content || '';
    const time = _timeAgo(c.created_at);
    return `
      <div style="padding:12px 0;border-bottom:1px solid #1a1a1a;display:flex;gap:10px;align-items:flex-start;">
        <div style="width:34px;height:34px;border-radius:50%;background:#1e1e1e;flex-shrink:0;
                    display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${c.user?.avatar ? `<img src="${c.user.avatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<i class=\\'bi bi-person-fill\\' style=\\'font-size:18px;color:#555;\\'></i>'">` :
            `<i class="bi bi-person-fill" style="font-size:18px;color:#555;"></i>`}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:3px;">
            <span style="color:#ddd;font-size:13px;font-weight:600;">${user}</span>
            ${time ? `<span style="color:#444;font-size:11px;">${time}</span>` : ''}
          </div>
          <p style="margin:0;color:#bbb;font-size:13px;line-height:1.45;word-break:break-word;">${text}</p>
        </div>
      </div>`;
  }).join('');
}

window.__reelOpenComments = async function(reelId) {
  _activeCommentId = reelId;
  const overlay = document.getElementById('_reels-comment-overlay');
  const drawer  = document.getElementById('_reels-comment-drawer');
  const list    = document.getElementById('_reels-comments-list');
  const title   = document.getElementById('_reels-comment-title');
  if (!overlay || !drawer || !list) return;

  const count = _commentCount.get(reelId) ?? 0;
  if (title) title.textContent = `Commentaires ${count > 0 ? `(${formatCount(count)})` : ''}`;

  overlay.style.display = 'block';
  requestAnimationFrame(() => { drawer.style.transform = 'translateY(0)'; });

  list.innerHTML = `
    <div style="text-align:center;padding:28px 0;color:#444;">
      <div style="width:28px;height:28px;border:3px solid #1a1a1a;border-top-color:#E23E3E;
                  border-radius:50%;animation:reelSpin .7s linear infinite;margin:0 auto;"></div>
    </div>
    <style>@keyframes reelSpin{to{transform:rotate(360deg)}}</style>`;

  try {
    const res   = await api.getComments('reel', reelId);
    const items = Array.isArray(res) ? res : (res?.items || res?.comments || []);
    const cnt   = items.length;
    _commentCount.set(reelId, cnt);
    // Mettre à jour le badge du bouton
    document.querySelectorAll(`.reel-comment-count[data-id="${reelId}"]`)
      .forEach(el => { el.textContent = formatCount(cnt); });
    if (title) title.textContent = `Commentaires ${cnt > 0 ? `(${formatCount(cnt)})` : ''}`;
    list.innerHTML = _renderComments(items);
    list.scrollTop = list.scrollHeight;
  } catch {
    list.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:#555;font-size:13px;">
        <i class="bi bi-exclamation-circle" style="color:#E23E3E;font-size:1.5rem;"></i>
        <p style="margin:8px 0 0;">Impossible de charger les commentaires</p>
      </div>`;
  }
};

window.__reelCloseComments = function() {
  const overlay = document.getElementById('_reels-comment-overlay');
  const drawer  = document.getElementById('_reels-comment-drawer');
  if (drawer)  drawer.style.transform = 'translateY(100%)';
  if (overlay) setTimeout(() => { overlay.style.display = 'none'; }, 300);
  _activeCommentId = null;
};

window.__reelSubmitComment = async function() {
  if (!_activeCommentId) return;
  if (!api.isAuthenticated()) {
    window._showLoginModal?.('Connectez-vous pour commenter');
    return;
  }
  const input   = document.getElementById('_reels-comment-input');
  const sendBtn = document.getElementById('_reels-comment-send');
  const text    = input?.value?.trim();
  if (!text) return;

  input.value    = '';
  input.disabled = true;
  if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<div style="width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:reelSpin .7s linear infinite;"></div>'; }

  const list = document.getElementById('_reels-comments-list');
  const reelId = _activeCommentId;

  try {
    await api.addComment('reel', reelId, text);
    // Recharger la liste réelle
    const res   = await api.getComments('reel', reelId);
    const items = Array.isArray(res) ? res : (res?.items || res?.comments || []);
    const cnt   = items.length;
    _commentCount.set(reelId, cnt);
    document.querySelectorAll(`.reel-comment-count[data-id="${reelId}"]`)
      .forEach(el => { el.textContent = formatCount(cnt); });
    const title = document.getElementById('_reels-comment-title');
    if (title) title.textContent = `Commentaires (${formatCount(cnt)})`;
    list.innerHTML = _renderComments(items);
    list.scrollTop = list.scrollHeight;
  } catch {
    // Afficher localement si l'API échoue
    const prev = _commentCount.get(reelId) ?? 0;
    const newCnt = prev + 1;
    _commentCount.set(reelId, newCnt);
    document.querySelectorAll(`.reel-comment-count[data-id="${reelId}"]`)
      .forEach(el => { el.textContent = formatCount(newCnt); });
    const div = document.createElement('div');
    div.style.cssText = 'padding:12px 0;border-bottom:1px solid #1a1a1a;display:flex;gap:10px;';
    div.innerHTML = `
      <div style="width:34px;height:34px;border-radius:50%;background:#1e1e1e;flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;">
        <i class="bi bi-person-fill" style="font-size:18px;color:#555;"></i>
      </div>
      <div>
        <span style="color:#ddd;font-size:13px;font-weight:600;">Moi</span>
        <p style="margin:3px 0 0;color:#bbb;font-size:13px;line-height:1.45;">${text}</p>
      </div>`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  } finally {
    if (input)   input.disabled   = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="bi bi-send-fill"></i>'; }
  }
};

// ── Share ─────────────────────────────────────────────────────────────────────
window.__reelShare = async function(btn) {
  const id    = btn.dataset.id;
  const title = btn.dataset.title || 'BF1 Reel';
  const url   = `https://bf1.fly.dev/reels/${id}`;

  try {
    await navigator.share({ title: `BF1 · ${title}`, text: title, url });
  } catch {
    try {
      await navigator.clipboard.writeText(url);
      _reelToast('Lien copié !');
    } catch {
      _reelToast('Partage non disponible');
      return;
    }
  }

  // Incrémenter le compteur localement + API (best-effort)
  const prev    = _shareCount.get(id) ?? 0;
  const newCnt  = prev + 1;
  _shareCount.set(id, newCnt);
  document.querySelectorAll(`.reel-share-count[data-id="${id}"]`)
    .forEach(el => { el.textContent = formatCount(newCnt); });
  api.http?.post?.(`/reels/${id}/share`, {}).catch(() => {});
};

function _reelToast(msg) {
  let t = document.getElementById('_reel-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_reel-toast';
    t.style.cssText =
      'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
      'background:#1e1e1e;color:#fff;padding:10px 20px;border-radius:20px;' +
      'font-size:13px;z-index:99999;opacity:0;transition:opacity .2s;pointer-events:none;' +
      'white-space:nowrap;border:1px solid #2a2a2a;max-width:90vw;text-align:center;';
    document.body.appendChild(t);
  }
  t.textContent   = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function loadReels() {
  const container = document.getElementById('reels-container');
  if (!container) return;

  _injectCommentDrawer();
  _setReelsLayout();
  window.addEventListener('resize', _setReelsLayout, { passive: true });

  container.innerHTML = '';
  const loaderWrap = document.createElement('div');
  loaderWrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;';
  loaderWrap.appendChild(createSnakeLoader(50));
  container.appendChild(loaderWrap);

  try {
    const reelsRaw = await api.getReels();
    
    // Trier par date (plus récent en premier) 📅
    const reels = reelsRaw && reelsRaw.length > 0
      ? [...reelsRaw].sort((a, b) => {
          const dateA = new Date(a.created_at || a.published_at || 0);
          const dateB = new Date(b.created_at || b.published_at || 0);
          return dateB - dateA;
        })
      : [];

    if (!reels || reels.length === 0) {
      container.innerHTML = `
        <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
          <i class="bi bi-play-circle" style="font-size:3.5rem;color:#444;"></i>
          <p style="color:#666;margin:0;font-size:14px;">Aucun reel disponible</p>
        </div>`;
      return;
    }

    container.innerHTML = reels.map((reel, i) => buildReel(reel, i)).join('');
    _setReelsLayout();
    setupAutoPlay(container);

    // Initialiser l'état "aimé" si connecté
    if (api.isAuthenticated()) {
      api.getMyLikes('reel').then(myLikes => {
        const likedIds = new Set((myLikes || []).map(l => String(l.content_id || l.id)));
        container.querySelectorAll('.reel-like-btn').forEach(btn => {
          const id = String(btn.dataset.id);
          if (likedIds.has(id)) {
            _likedState.set(id, true);
            const icon = btn.querySelector('i');
            if (icon) {
              icon.className  = 'bi bi-heart-fill';
              icon.style.color = '#E23E3E';
            }
          }
        });
      }).catch(() => {});
    }

  } catch (err) {
    console.error('Erreur loadReels:', err);
    container.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
        <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:#E23E3E;"></i>
        <p style="color:#888;margin:0;font-size:14px;">Erreur lors du chargement</p>
        <button onclick="window.location.reload()"
                style="background:none;border:1px solid #E23E3E;border-radius:8px;
                       padding:8px 16px;color:#E23E3E;font-size:13px;cursor:pointer;margin-top:4px;">
          Réessayer
        </button>
      </div>`;
  }
}

