import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';

// ── State global ──────────────────────────────────────────────────────────────
const _likes    = new Map(); // id → count
const _comments = new Map();
const _shares   = new Map();
const _liked    = new Map(); // id → bool
let _muted            = true;
let _muteTimer        = null;
let _activeCommentId  = null;
let _observer         = null; // IntersectionObserver
let _currentVideo     = null;
let _progRaf          = null;

function fmt(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

// ── Build HTML d'une slide ────────────────────────────────────────────────────
function buildSlide(reel, index, isLiked) {
  const id       = String(reel.id || reel._id);
  const videoUrl = reel.video_url || reel.videoUrl || '';
  const title    = reel.title || '';
  const desc     = reel.description || '';
  const author   = reel.author_name || reel.author || 'BF1 TV';
  const avatar   = reel.author_avatar || '';
  const nLikes   = Number(Array.isArray(reel.likes) ? reel.likes.length : (reel.likes ?? 0));
  const nComments= Number(Array.isArray(reel.comments) ? reel.comments.length : (reel.comments ?? reel.comments_count ?? 0));
  const nShares  = Number(reel.shares ?? reel.shares_count ?? 0);
  const allowCom = reel.allow_comments !== false;

  _likes.set(id, nLikes);
  _comments.set(id, nComments);
  _shares.set(id, nShares);
  _liked.set(id, isLiked);

  const avatarEl = avatar
    ? `<img src="${avatar}" class="reel-author-avatar" loading="lazy" onerror="this.src=''">`
    : `<div class="reel-author-avatar" style="display:flex;align-items:center;justify-content:center;background:#1e1e1e;">
         <i class="bi bi-person-fill" style="font-size:18px;color:#555;"></i>
       </div>`;

  return `
<div class="reel-slide" data-id="${id}" data-index="${index}">

  <video class="reel-video"
         src="${videoUrl}"
         loop playsinline preload="none"
         data-id="${id}"
         onclick="window.__reelTap(event,this)">
  </video>

  <div class="reel-gradient"></div>

  <div class="reel-flash" id="rf-${id}">
    <i class="bi bi-pause-fill"></i>
  </div>

  <div class="reel-progress"><div class="reel-progress-fill" id="rp-${id}"></div></div>

  <div class="reel-info">
    <div class="reel-author">
      ${avatarEl}
      <span class="reel-author-name">@${author}</span>
    </div>
    ${title ? `<p class="reel-title">${title}</p>` : ''}
    ${desc  ? `<p class="reel-desc">${desc}</p>`   : ''}
  </div>

  <div class="reel-actions">

    <button class="reel-action-btn" onclick="window.__reelToggleMute()" aria-label="Son">
      <div class="reel-action-icon" id="rs-${id}">
        <i class="bi ${_muted ? 'bi-volume-mute-fill' : 'bi-volume-up-fill'}"></i>
      </div>
    </button>

    <button class="reel-action-btn reel-like-btn" data-id="${id}"
            onclick="window.__reelToggleLike(this)" aria-label="Aimer">
      <div class="reel-action-icon" id="rli-${id}"
           style="background:${isLiked ? 'rgba(226,62,62,0.25)' : 'rgba(255,255,255,0.15)'};">
        <i class="bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}"
           style="color:${isLiked ? '#E23E3E' : '#fff'};"></i>
      </div>
      <span class="reel-action-label" id="rlc-${id}">${fmt(nLikes)}</span>
    </button>

    <button class="reel-action-btn" data-id="${id}" data-allow-comments="${allowCom}"
            onclick="${allowCom ? `window.__reelOpenComments('${id}')` : `window.__reelCommentsDisabled()`}"
            aria-label="Commentaires">
      <div class="reel-action-icon" style="${allowCom ? '' : 'background:rgba(255,255,255,0.07);'}">
        <i class="bi ${allowCom ? 'bi-chat-dots-fill' : 'bi-chat-slash-fill'}" style="${allowCom ? '' : 'color:rgba(255,255,255,0.35);'}"></i>
      </div>
      <span class="reel-action-label" id="rcc-${id}">${allowCom ? fmt(nComments) : ''}</span>
    </button>

    <button class="reel-action-btn reel-share-btn" data-id="${id}"
            data-title="${title.replace(/"/g, '&quot;')}"
            onclick="window.__reelShare(this)" aria-label="Partager">
      <div class="reel-action-icon">
        <i class="bi bi-share-fill"></i>
      </div>
      <span class="reel-action-label" id="rsc-${id}">${fmt(nShares)}</span>
    </button>

  </div>
</div>`;
}

// ── IntersectionObserver : autoplay/pause ─────────────────────────────────────
function _setupObserver(feed) {
  if (_observer) _observer.disconnect();

  _observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const slide = entry.target;
      const video = slide.querySelector('.reel-video');
      if (!video) return;

      if (entry.intersectionRatio >= 0.6) {
        // Cette slide est visible → play
        _currentVideo = video;
        video.muted  = _muted;
        video.volume = _muted ? 0 : 1;
        if (video.readyState < 2) {
          video.preload = 'auto';
          video.load();
        }
        video.play().catch(() => {});
        _startProgress(video, slide.dataset.id);

        // Pré-charger la suivante
        const next = slide.nextElementSibling;
        if (next) {
          const nv = next.querySelector('.reel-video');
          if (nv && nv.preload !== 'auto') { nv.preload = 'auto'; nv.load(); }
        }
      } else {
        // Hors vue → pause
        if (!video.paused) video.pause();
        if (video.dataset.id === (_currentVideo?.dataset?.id ?? '')) _currentVideo = null;
        _stopProgress(slide.dataset.id);
      }
    });
  }, {
    root: feed,
    threshold: [0, 0.6, 1]
  });

  feed.querySelectorAll('.reel-slide').forEach(s => _observer.observe(s));
}

// ── Progress bar (requestAnimationFrame) ──────────────────────────────────────
const _progVideos = new Map(); // id → video

function _startProgress(video, id) {
  _progVideos.set(id, video);
  if (_progRaf) return; // déjà en cours
  _rafProgress();
}
function _stopProgress(id) {
  _progVideos.delete(id);
  const bar = document.getElementById(`rp-${id}`);
  if (bar) bar.style.width = '0%';
}
function _rafProgress() {
  _progRaf = requestAnimationFrame(() => {
    _progVideos.forEach((video, id) => {
      if (!video.duration) return;
      const bar = document.getElementById(`rp-${id}`);
      if (bar) bar.style.width = (video.currentTime / video.duration * 100) + '%';
    });
    if (_progVideos.size > 0) _rafProgress();
    else _progRaf = null;
  });
}

// ── Tap (play/pause) + double tap (like) ─────────────────────────────────────
let _lastTap = 0;
window.__reelTap = function(e, video) {
  const now = Date.now();
  const dt  = now - _lastTap;

  if (dt < 280) {
    // Double tap → coeur + like
    _lastTap = 0;
    const slide = video.closest('.reel-slide');
    const id    = slide?.dataset.id;
    if (id) {
      const heart = document.createElement('i');
      heart.className = 'bi bi-heart-fill dt-heart';
      heart.style.left = (e.clientX - 41) + 'px';
      heart.style.top  = (e.clientY - 41) + 'px';
      slide.appendChild(heart);
      setTimeout(() => heart.remove(), 760);
      if (!_liked.get(id)) {
        const btn = slide.querySelector('.reel-like-btn');
        if (btn) window.__reelToggleLike(btn);
      }
    }
    return;
  }
  _lastTap = now;

  // Simple tap → play / pause
  setTimeout(() => {
    if (Date.now() - _lastTap < 280) return; // annulé par double tap
    const slide = video.closest('.reel-slide');
    const id    = slide?.dataset.id;
    const flash = id ? document.getElementById(`rf-${id}`) : null;
    const icon  = flash?.querySelector('i');

    if (video.paused) {
      video.play().catch(() => {});
      if (icon) icon.className = 'bi bi-play-fill';
    } else {
      video.pause();
      if (icon) icon.className = 'bi bi-pause-fill';
    }
    if (flash) {
      flash.classList.remove('active');
      void flash.offsetWidth;
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 580);
    }
  }, 200);
};

// ── Mute ─────────────────────────────────────────────────────────────────────
window.__reelToggleMute = function() {
  _muted = !_muted;
  document.querySelectorAll('.reel-video').forEach(v => {
    v.muted = _muted; v.volume = _muted ? 0 : 1;
  });
  document.querySelectorAll('[id^="rs-"]').forEach(el => {
    el.querySelector('i').className = _muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
  });
  const ind  = document.getElementById('reel-mute-ind');
  const icon = document.getElementById('reel-mute-icon');
  if (ind && icon) {
    icon.className = _muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
    ind.classList.add('show');
    clearTimeout(_muteTimer);
    _muteTimer = setTimeout(() => ind.classList.remove('show'), 1100);
  }
};

// ── Like ─────────────────────────────────────────────────────────────────────
window.__reelToggleLike = async function(btn) {
  if (!api.isAuthenticated()) { window._showLoginModal?.('Connectez-vous pour aimer ce reel'); return; }
  const id      = btn.dataset.id;
  const iconWrap= document.getElementById(`rli-${id}`);
  const iconEl  = iconWrap?.querySelector('i');
  const countEl = document.getElementById(`rlc-${id}`);
  const wasLiked= _liked.get(id) === true;
  const prev    = _likes.get(id) ?? 0;
  const next    = wasLiked ? Math.max(0, prev - 1) : prev + 1;

  _liked.set(id, !wasLiked);
  _likes.set(id, next);
  if (iconEl)   { iconEl.className = wasLiked ? 'bi bi-heart' : 'bi bi-heart-fill'; iconEl.style.color = wasLiked ? '#fff' : '#E23E3E'; }
  if (iconWrap) { iconWrap.style.background = wasLiked ? 'rgba(255,255,255,0.15)' : 'rgba(226,62,62,0.25)'; }
  if (countEl)  { countEl.textContent = fmt(next); }
  if (!wasLiked) { btn.classList.add('like-popping'); setTimeout(() => btn.classList.remove('like-popping'), 340); }

  try {
    await api.toggleLike('reel', id);
    const srv = await api.getLikesCount('reel', id);
    _likes.set(id, srv);
    if (countEl) countEl.textContent = fmt(srv);
  } catch {
    _liked.set(id, wasLiked); _likes.set(id, prev);
    if (iconEl)   { iconEl.className = wasLiked ? 'bi bi-heart-fill' : 'bi bi-heart'; iconEl.style.color = wasLiked ? '#E23E3E' : '#fff'; }
    if (iconWrap) { iconWrap.style.background = wasLiked ? 'rgba(226,62,62,0.25)' : 'rgba(255,255,255,0.15)'; }
    if (countEl)  { countEl.textContent = fmt(prev); }
  }
};

// ── Commentaires désactivés ───────────────────────────────────────────────────
window.__reelCommentsDisabled = function() {
  _toast('Les commentaires sont désactivés sur ce reel');
};

// ── Commentaires ──────────────────────────────────────────────────────────────
function _timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return 'à l\'instant';
  if (s < 3600)  return Math.floor(s / 60) + 'min';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'j';
}

function _renderComments(items) {
  if (!items.length) return `
    <div style="text-align:center;padding:40px 0;color:#444;">
      <i class="bi bi-chat-dots" style="font-size:2.5rem;"></i>
      <p style="margin:10px 0 0;font-size:13px;color:#555;">Aucun commentaire.<br>Soyez le premier !</p>
    </div>`;
  return items.map(c => {
    const user = c.user?.username || c.author || 'Anonyme';
    const text = c.text || c.content || '';
    const time = _timeAgo(c.created_at);
    const av   = c.user?.avatar;
    return `
    <div style="padding:12px 0;border-bottom:1px solid #1a1a1a;display:flex;gap:10px;">
      <div style="width:36px;height:36px;border-radius:50%;background:#1e1e1e;flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;overflow:hidden;">
        ${av
          ? `<img src="${av}" style="width:100%;height:100%;object-fit:cover;"
                  onerror="this.parentElement.innerHTML='<i class=\\'bi bi-person-fill\\' style=\\'font-size:18px;color:#555;\\'></i>'">`
          : '<i class="bi bi-person-fill" style="font-size:18px;color:#555;"></i>'}
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
  const overlay = document.getElementById('reel-comment-overlay');
  const drawer  = document.getElementById('reel-comment-drawer');
  const list    = document.getElementById('reel-comment-list');
  const title   = document.getElementById('reel-comment-title');

  const cnt = _comments.get(reelId) ?? 0;
  if (title) title.textContent = `Commentaires${cnt > 0 ? ` (${fmt(cnt)})` : ''}`;

  overlay?.classList.add('open');
  drawer?.classList.add('open');

  if (list) list.innerHTML = `
    <div style="text-align:center;padding:32px 0;">
      <div style="width:26px;height:26px;border:3px solid #1a1a1a;border-top-color:#E23E3E;
                  border-radius:50%;animation:_spin .65s linear infinite;margin:0 auto;"></div>
      <style>@keyframes _spin{to{transform:rotate(360deg)}}</style>
    </div>`;

  try {
    const res   = await api.getComments('reel', reelId);
    const items = Array.isArray(res) ? res : (res?.items || res?.comments || []);
    _comments.set(reelId, items.length);
    const el = document.getElementById(`rcc-${reelId}`);
    if (el) el.textContent = fmt(items.length);
    if (title) title.textContent = `Commentaires${items.length > 0 ? ` (${fmt(items.length)})` : ''}`;
    if (list) { list.innerHTML = _renderComments(items); list.scrollTop = list.scrollHeight; }
  } catch {
    if (list) list.innerHTML = `
      <div style="text-align:center;padding:24px;color:#555;font-size:13px;">
        <i class="bi bi-exclamation-circle" style="color:#E23E3E;font-size:1.5rem;display:block;margin-bottom:8px;"></i>
        Impossible de charger les commentaires
      </div>`;
  }
};

window.__reelCloseComments = function() {
  document.getElementById('reel-comment-overlay')?.classList.remove('open');
  document.getElementById('reel-comment-drawer')?.classList.remove('open');
  _activeCommentId = null;
};

window.__reelSubmitComment = async function() {
  if (!_activeCommentId) return;
  if (!api.isAuthenticated()) { window._showLoginModal?.('Connectez-vous pour commenter'); return; }
  const input   = document.getElementById('reel-comment-input');
  const sendBtn = document.getElementById('reel-comment-send');
  const text    = input?.value?.trim();
  if (!text) return;

  input.value = ''; input.disabled = true;
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div style="width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:_spin .65s linear infinite;"></div>';
  }

  const reelId = _activeCommentId;
  const list   = document.getElementById('reel-comment-list');
  try {
    await api.addComment('reel', reelId, text);
    const res   = await api.getComments('reel', reelId);
    const items = Array.isArray(res) ? res : (res?.items || res?.comments || []);
    _comments.set(reelId, items.length);
    const el = document.getElementById(`rcc-${reelId}`);
    if (el) el.textContent = fmt(items.length);
    const title = document.getElementById('reel-comment-title');
    if (title) title.textContent = `Commentaires (${fmt(items.length)})`;
    if (list) { list.innerHTML = _renderComments(items); list.scrollTop = list.scrollHeight; }
  } catch {
    const prev = _comments.get(reelId) ?? 0;
    _comments.set(reelId, prev + 1);
    const el = document.getElementById(`rcc-${reelId}`);
    if (el) el.textContent = fmt(prev + 1);
    if (list) {
      const div = document.createElement('div');
      div.style.cssText = 'padding:12px 0;border-bottom:1px solid #1a1a1a;display:flex;gap:10px;';
      div.innerHTML = `
        <div style="width:36px;height:36px;border-radius:50%;background:#1e1e1e;flex-shrink:0;
                    display:flex;align-items:center;justify-content:center;">
          <i class="bi bi-person-fill" style="font-size:18px;color:#555;"></i>
        </div>
        <div><span style="color:#ddd;font-size:13px;font-weight:600;">Moi</span>
          <p style="margin:3px 0 0;color:#bbb;font-size:13px;">${text}</p>
        </div>`;
      list.appendChild(div); list.scrollTop = list.scrollHeight;
    }
  } finally {
    if (input)   input.disabled = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="bi bi-send-fill"></i>'; }
  }
};

// ── Share ─────────────────────────────────────────────────────────────────────
window.__reelShare = async function(btn) {
  const id    = btn.dataset.id;
  const title = btn.dataset.title || 'BF1 Reel';
  const url   = `https://bf1.fly.dev/reels/${id}`;
  try { await navigator.share({ title: `BF1 · ${title}`, text: title, url }); }
  catch {
    try { await navigator.clipboard.writeText(url); _toast('Lien copié !'); }
    catch { _toast('Partage non disponible'); return; }
  }
  const prev = _shares.get(id) ?? 0;
  _shares.set(id, prev + 1);
  const el = document.getElementById(`rsc-${id}`);
  if (el) el.textContent = fmt(prev + 1);
};

// ── Toast ─────────────────────────────────────────────────────────────────────
let _toastTimer = null;
function _toast(msg) {
  const t = document.getElementById('reel-toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Nav bar compensation ──────────────────────────────────────────────────────
// Le feed est position:fixed, on pousse les infos/actions vers le haut
// si une bottom-nav existe, on applique un padding-bottom sur les éléments bas
function _applyNavOffset() {
  const nav = document.querySelector('.bottom-nav');
  const navH = nav ? nav.offsetHeight : 60;
  document.querySelectorAll('.reel-info, .reel-actions').forEach(el => {
    el.style.paddingBottom = (navH + (el.classList.contains('reel-info') ? 8 : 4)) + 'px';
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────
export async function loadReels() {
  const feed = document.getElementById('reels-feed');
  if (!feed) return;

  // Reset
  if (_observer) { _observer.disconnect(); _observer = null; }
  _progVideos.clear();
  if (_progRaf) { cancelAnimationFrame(_progRaf); _progRaf = null; }
  _currentVideo = null;

  feed.innerHTML = '';

  // Loader
  const loaderWrap = document.createElement('div');
  loaderWrap.style.cssText = 'height:100vh;display:flex;align-items:center;justify-content:center;';
  loaderWrap.appendChild(createPageSpinner('100vh'));
  feed.appendChild(loaderWrap);

  try {
    let likedIds = new Set();
    if (api.isAuthenticated()) {
      try {
        const myLikes = await api.getMyLikes('reel');
        likedIds = new Set((myLikes || []).map(l => String(l.content_id || l.id)));
      } catch {}
    }

    const data  = await api.getReels(0, 50);
    const reels = [...(data.items || [])].sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    if (!reels.length) {
      feed.innerHTML = `
        <div style="height:100vh;display:flex;flex-direction:column;align-items:center;
                    justify-content:center;gap:12px;background:#000;">
          <i class="bi bi-play-circle" style="font-size:3.5rem;color:#444;"></i>
          <p style="color:#666;margin:0;font-size:14px;">Aucun reel disponible</p>
        </div>`;
      return;
    }

    feed.innerHTML = reels.map((r, i) => buildSlide(r, i, likedIds.has(String(r.id || r._id)))).join('');

    _applyNavOffset();
    window.addEventListener('resize', _applyNavOffset, { passive: true });

    // Premier chargement vidéo 1 immédiatement
    const first = feed.querySelector('.reel-video');
    if (first) { first.preload = 'auto'; first.load(); }

    _setupObserver(feed);

  } catch {
    feed.innerHTML = `
      <div style="height:100vh;display:flex;flex-direction:column;align-items:center;
                  justify-content:center;gap:12px;background:#000;">
        <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:#E23E3E;"></i>
        <p style="color:#888;margin:0;font-size:14px;">Erreur lors du chargement</p>
        <button onclick="window.__loadReels()"
                style="background:none;border:1px solid #E23E3E;border-radius:8px;
                       padding:8px 16px;color:#E23E3E;font-size:13px;cursor:pointer;margin-top:4px;">
          Réessayer
        </button>
      </div>`;
  }
}

window.__loadReels = loadReels;
