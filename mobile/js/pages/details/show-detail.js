import * as api from '../../services/api.js';
import { API_CONFIG } from '../../config/routes.js';

function _resolveAvatar(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return API_CONFIG.API_URL + url;
}

// --- Helpers -----------------------------------------------------------------

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return ''; }
}

function formatRelative(d) {
  if (!d) return 'Récemment';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `${j}j`;
    return formatDate(d);
  } catch { return 'Récemment'; }
}

// Fonction de partage native améliorée avec deep links
function shareContent(platform, title, url) {
  const deepLink = createDeepLink(url || location.href);
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=tv.bf1.app';
  
  const shareText = `${title || document.title}\n\n${deepLink}\n\nTéléchargez BF1 TV : ${playStoreUrl}`;
  
  const shareData = {
    title: title || document.title,
    text: shareText,
    url: deepLink
  };

  if (platform === 'native') {
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Partage réussi'))
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Erreur de partage:', err);
            copyToClipboard(shareText);
          }
        });
    } else {
      copyToClipboard(shareText);
    }
  } else if (platform === 'facebook') {
    const fbText = `${title || document.title}\n\n${deepLink}\n\nTéléchargez BF1 TV : ${playStoreUrl}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(playStoreUrl)}&quote=${encodeURIComponent(fbText)}`,
      '_blank',
      'width=600,height=400'
    );
  } else if (platform === 'whatsapp') {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      '_blank'
    );
  } else if (platform === 'twitter') {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'width=600,height=400'
    );
  }
}

function createDeepLink(hashUrl) {
  const hash = hashUrl.includes('#') ? hashUrl.split('#')[1] : hashUrl;
  
  if (hash && hash.startsWith('/')) {
    const path = hash.substring(1);
    return `bf1tv://${path}`;
  }
  
  return 'bf1tv://home';
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Lien copié dans le presse-papiers !');
      })
      .catch(() => {
        showToast('Impossible de copier le lien');
      });
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Lien copié dans le presse-papiers !');
    } catch (err) {
      showToast('Impossible de copier le lien');
    }
    document.body.removeChild(textarea);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 10000;
    animation: fadeInOut 2.5s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

window.shareContent = shareContent;

// --- YouTube IFrame API à custom player -------------------------------------

function _fmtTime(s) {
  const m = Math.floor(s / 60);
  return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

function _setupYTGlobals() {
  if (window.__ytSetup) return;
  window.__ytSetup  = true;
  window._ytPlayers = {};
  window._ytTimers  = {};
  window._ytQueue   = window._ytQueue   || [];
  window._ytPending = {};

  if (!window.__ytOrigReady) window.__ytOrigReady = window.onYouTubeIframeAPIReady || null;
  window.onYouTubeIframeAPIReady = function() {
    if (window.__ytOrigReady) window.__ytOrigReady();
    window._ytReady = true;
    (window._ytQueue || []).forEach(fn => fn());
    window._ytQueue = [];
  };
  if (window.YT && window.YT.Player) window._ytReady = true;

  window._ytLoad = function() {
    if (document.getElementById('yt-iframe-api')) return;
    const s = document.createElement('script');
    s.id = 'yt-iframe-api';
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  };

  window._ytToggle = function(pid) {
    const p = window._ytPlayers[pid];
    if (!p || typeof p.getPlayerState !== 'function') {
      window._ytPending[pid] = true; return;
    }
    p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo();
  };

  window._ytSeek = function(e, pid) {
    const p = window._ytPlayers[pid];
    if (!p || typeof p.getDuration !== 'function') return;
    const rect = e.currentTarget.getBoundingClientRect();
    p.seekTo(((e.clientX - rect.left) / rect.width) * p.getDuration(), true);
  };

  window._ytFullscreen = function(pid) {
    const p = window._ytPlayers[pid];
    if (!p) return;
    const el = p.getIframe();
    (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || (()=>{})).call(el);
  };

  window._ytStartTimer = function(pid) {
    clearInterval(window._ytTimers[pid]);
    window._ytTimers[pid] = setInterval(() => {
      const p = window._ytPlayers[pid];
      if (!p || typeof p.getCurrentTime !== 'function') { clearInterval(window._ytTimers[pid]); return; }
      try {
        const cur = p.getCurrentTime(), dur = p.getDuration();
        if (dur > 0) {
          const prog   = document.getElementById(pid + '-prog');
          const timeEl = document.getElementById(pid + '-time');
          if (prog)   prog.style.width   = (cur / dur * 100) + '%';
          if (timeEl) timeEl.textContent = _fmtTime(cur) + ' / ' + _fmtTime(dur);
        }
      } catch(err) {}
    }, 500);
  };
}

function extractYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function _createYTPlayer(pid, ytId, posterId) {
  _setupYTGlobals();
  window._ytLoad();
  const init = () => {
    const el = document.getElementById(pid);
    if (!el) return;
    window._ytPlayers[pid] = new YT.Player(pid, {
      videoId: ytId,
      playerVars: {
        autoplay: 0, controls: 0, modestbranding: 1, rel: 0,
        showinfo: 0, iv_load_policy: 3, playsinline: 1, hl: 'fr',
      },
      events: {
        onReady: () => {
          if (window._ytPending && window._ytPending[pid]) {
            window._ytPlayers[pid].playVideo();
            delete window._ytPending[pid];
          }
        },
        onStateChange: (e) => {
          const playing   = e.data === 1;
          const buffering = e.data === 3;
          const started   = e.data === 1 || e.data === 2 || e.data === 0;
          const btn   = document.getElementById(pid + '-playbtn');
          const post  = document.getElementById(posterId);
          const snake = document.getElementById(pid + '-snake');
          if (btn) btn.innerHTML = playing
            ? '<i class="bi bi-pause-fill" style="font-size:22px;"></i>'
            : '<i class="bi bi-play-fill"  style="font-size:22px;"></i>';
          if (post  && started) post.style.display = 'none';
          if (snake) snake.style.display = buffering ? 'flex' : 'none';
          if (playing) window._ytStartTimer(pid);
          else clearInterval(window._ytTimers[pid]);
        },
      },
    });
  };
  if (window._ytReady) setTimeout(init, 80);
  else { window._ytQueue = window._ytQueue || []; window._ytQueue.push(() => setTimeout(init, 80)); }
}

function buildVideoPlayer(videoUrl, posterImg) {
  if (!videoUrl) return '';
  const ytId = extractYoutubeId(videoUrl);

  const _playerCSS = `
    <style>
      @keyframes _sdSnake {
        0%   { stroke-dashoffset: 340; }
        50%  { stroke-dashoffset: 100; }
        100% { stroke-dashoffset: -340; }
      }
      @keyframes _sdFadeIn { from { opacity:0; transform:scale(.97); } to { opacity:1; transform:scale(1); } }
      @keyframes _sdPulse  { 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.12); } }
      @keyframes _sdBarGlow { 0%,100%{ box-shadow:none; } 50%{ box-shadow:0 0 6px 1px rgba(226,62,62,.55); } }
    </style>`;

  if (ytId) {
    const pid      = 'ytp' + Date.now().toString(36);
    const posterId = pid + '-post';
    _createYTPlayer(pid, ytId, posterId);
    const hasPoster = !!posterImg;
    return `${_playerCSS}
    <div style="animation:_sdFadeIn .35s ease;background:#000;border-radius:0;">
      <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
        <div id="${pid}" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>

        <!-- Poster + snake loader -->
        <div id="${posterId}"
             onclick="this.style.pointerEvents='none';window._ytToggle('${pid}');document.getElementById('${pid}-snake').style.display='flex';"
             style="position:absolute;inset:0;cursor:pointer;z-index:5;
                    ${hasPoster ? `background:url('${esc(posterImg)}') center/cover no-repeat;` : 'background:#111;'}">

          <!-- Dégradé -->
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%);"></div>

          <!-- Bouton play animé -->
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
            <div style="position:relative;width:68px;height:68px;">
              <!-- Cercle serpent SVG -->
              <svg viewBox="0 0 120 120" style="position:absolute;inset:0;width:100%;height:100%;">
                <circle cx="60" cy="60" r="54"
                  fill="none" stroke="rgba(226,62,62,.35)" stroke-width="4"/>
                <circle cx="60" cy="60" r="54"
                  fill="none" stroke="#E23E3E" stroke-width="4"
                  stroke-dasharray="340" stroke-dashoffset="340"
                  stroke-linecap="round"
                  transform="rotate(-90 60 60)"
                  style="animation:_sdSnake 2s ease-in-out infinite;"/>
              </svg>
              <!-- Icône play -->
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                <div style="width:44px;height:44px;background:rgba(226,62,62,.92);border-radius:50%;
                            display:flex;align-items:center;justify-content:center;
                            box-shadow:0 4px 22px rgba(226,62,62,.5);
                            animation:_sdPulse 2s ease-in-out infinite;">
                  <i class="bi bi-play-fill" style="color:#fff;font-size:22px;margin-left:3px;"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Snake de chargement après clic (caché par défaut) -->
        <div id="${pid}-snake" style="display:none;position:absolute;inset:0;z-index:6;
                                      background:rgba(0,0,0,.6);
                                      align-items:center;justify-content:center;pointer-events:none;">
          <svg viewBox="0 0 60 60" style="width:52px;height:52px;">
            <circle cx="30" cy="30" r="24"
              fill="none" stroke="#1a1a1a" stroke-width="4"/>
            <circle cx="30" cy="30" r="24"
              fill="none" stroke="#E23E3E" stroke-width="4"
              stroke-dasharray="150" stroke-dashoffset="150"
              stroke-linecap="round"
              transform="rotate(-90 30 30)"
              style="animation:_sdSnake 1s linear infinite;"/>
          </svg>
        </div>
      </div>

      <!-- Barre de contrôle -->
      <div style="background:#0d0d0d;padding:10px 14px;display:flex;align-items:center;
                  gap:10px;border-top:1px solid var(--divider,#1a1a1a);">
        <button id="${pid}-playbtn" onclick="window._ytToggle('${pid}')"
                style="background:none;border:none;color:#fff;cursor:pointer;
                       padding:0;flex-shrink:0;line-height:1;transition:transform .1s;"
                ontouchstart="this.style.transform='scale(.82)'"
                ontouchend="this.style.transform='scale(1)'">
          <i class="bi bi-play-fill" style="font-size:22px;"></i>
        </button>

        <!-- Barre de progression cliquable -->
        <div style="flex:1;height:5px;background:#2a2a2a;border-radius:3px;
                    cursor:pointer;position:relative;overflow:hidden;"
             onclick="window._ytSeek(event,'${pid}')">
          <div id="${pid}-prog"
               style="height:100%;background:linear-gradient(90deg,#E23E3E,#ff6b6b);
                      border-radius:3px;width:0%;pointer-events:none;
                      transition:width .4s linear;
                      animation:_sdBarGlow 2s ease-in-out infinite;"></div>
        </div>

        <span id="${pid}-time"
              style="font-size:11px;color:#888;white-space:nowrap;min-width:78px;text-align:right;">
          0:00 / 0:00
        </span>
        <button onclick="window._ytFullscreen('${pid}')"
                style="background:none;border:none;color:#666;cursor:pointer;
                       padding:0;flex-shrink:0;line-height:1;transition:color .15s;"
                onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='#666'">
          <i class="bi bi-fullscreen" style="font-size:16px;"></i>
        </button>
      </div>
    </div>`;
  }

  // -- Direct / MP4 ---------------------------------------------------------
  const vid = 'sdv' + Date.now().toString(36);
  return `${_playerCSS}
    <div style="position:relative;width:100%;background:#000;animation:_sdFadeIn .35s ease;">

      <!-- Snake loader visible jusqu'au canplay -->
      <div id="${vid}-loader" style="position:absolute;inset:0;z-index:5;background:#000;
                                     display:flex;align-items:center;justify-content:center;
                                     pointer-events:none;">
        ${posterImg ? `<img src="${esc(posterImg)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.45;">` : ''}
        <svg viewBox="0 0 60 60" style="width:56px;height:56px;position:relative;z-index:1;">
          <circle cx="30" cy="30" r="24" fill="none" stroke="#1a1a1a" stroke-width="4"/>
          <circle cx="30" cy="30" r="24"
            fill="none" stroke="#E23E3E" stroke-width="4"
            stroke-dasharray="150" stroke-dashoffset="150"
            stroke-linecap="round" transform="rotate(-90 30 30)"
            style="animation:_sdSnake 1s linear infinite;"/>
        </svg>
      </div>

      <video id="sd-video" controls autoplay muted playsinline preload="auto"
             style="width:100%;display:block;object-fit:contain;"
             ${posterImg ? `poster="${esc(posterImg)}"` : ''}
             oncanplay="(function(){var l=document.getElementById('${vid}-loader');if(l)l.style.display='none';})()">
        <source src="${esc(videoUrl)}" type="video/mp4">
      </video>
    </div>`;
}

// --- Config par type ----------------------------------------------------------

const TYPE_CONFIG = {
  sport:         { label: 'Sport',                  icon: 'bi-trophy-fill',        color: '#1DA1F2', apiType: 'sport' },
  jtandmag:      { label: 'Journal',                 icon: 'bi-camera-video-fill',  color: '#E23E3E', apiType: 'jtandmag' },
  magazine:      { label: 'Magazine',                 icon: 'bi-journal-richtext',   color: '#8B5CF6', apiType: 'magazine' },
  divertissement:{ label: 'Divertissement',         icon: 'bi-music-note-beamed',  color: '#A855F7', apiType: 'divertissement' },
  reportage:     { label: 'Reportage',              icon: 'bi-film',               color: '#F59E0B', apiType: 'reportage' },
  archive:       { label: 'Archive',                icon: 'bi-archive-fill',       color: '#6B7280', apiType: 'archive' },
  tele_realite:  { label: 'Télé Réalité',           icon: 'bi-camera-video-fill',  color: '#EC4899', apiType: 'tele_realite' },
  show:          { label: 'Émission',               icon: 'bi-tv-fill',            color: '#10B981', apiType: 'show' },
  movie:         { label: 'Film',                   icon: 'bi-film',               color: '#E23E3E', apiType: 'movie' },
  missed:        { label: 'Rattrapage',             icon: 'bi-clock-history',      color: '#F59E0B', apiType: 'missed' },
};

// --- Cleanup au départ de la page --------------------------------------------

export function cleanupShowDetail() {
  const video = document.getElementById('sd-video');
  if (video) {
    video.pause();
    video.src = '';
    video.load();
  }

  if (window._ytPlayers) {
    Object.keys(window._ytPlayers).forEach(pid => {
      try {
        const player = window._ytPlayers[pid];
        if (player) {
          if (typeof player.stopVideo === 'function') player.stopVideo();
          if (typeof player.destroy === 'function') player.destroy();
        }
      } catch (e) {}
      if (window._ytTimers?.[pid]) {
        clearInterval(window._ytTimers[pid]);
        delete window._ytTimers[pid];
      }
      delete window._ytPlayers[pid];
    });
  }
}

// --- Cache mémoire détail (TTL 5 min) ----------------------------------------
const _showCache = new Map();
const _SHOW_TTL  = 5 * 60 * 1000;

function _cacheGet(key) {
  const e = _showCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > _SHOW_TTL) { _showCache.delete(key); return null; }
  return e.payload;
}
function _cacheSet(key, payload) { _showCache.set(key, { payload, ts: Date.now() }); }

// --- Export principal ---------------------------------------------------------

export async function loadShowDetail(id, type) {
  const container = document.getElementById('sd-container');
  const headerTitle = document.getElementById('sd-header-title');
  if (!container) return;

  const cfg = TYPE_CONFIG[type] || { label: 'Programme', icon: 'bi-play-circle', color: '#E23E3E', apiType: type };
  const CONTENT_TYPE = cfg.apiType;
  const cacheKey = `${type}:${id}`;

  try {
    let show = null;
    let showError = null;
    let related, comments, likesCount, userLiked, userFavorited;

    const cached = _cacheGet(cacheKey);

    if (cached) {
      show          = cached.show;
      related       = cached.related;
      comments      = cached.comments;
      likesCount    = cached.likesCount;
      userLiked     = cached.userLiked;
      userFavorited = cached.userFavorited;
    } else {
      try {
        show = await api.getShowById(id, type);
      } catch (err) {
        showError = err;
      }

      if (!show) {
        const status = showError?.status;

        if (status === 401) {
          const isArchive = type === 'archive';
          container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                        padding:40px 24px;text-align:center;">
              <div style="width:72px;height:72px;background:rgba(226,62,62,.12);border-radius:50%;
                          display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <i class="bi bi-lock-fill" style="font-size:32px;color:#E23E3E;"></i>
              </div>
              <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;
                         color:var(--heading-color,#fff);">Connexion requise</h3>
              <p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:var(--body-color,#aaa);">
                Ce contenu est réservé aux abonnés.<br>Connectez-vous pour y accéder.
              </p>
              <div style="display:flex;gap:12px;">
                <button onclick="history.back()"
                        style="background:var(--bg-3,#1a1a1a);color:var(--body-muted,#aaa);
                               border:1px solid var(--divider,#2a2a2a);border-radius:8px;
                               padding:10px 20px;cursor:pointer;font-size:14px;">Retour</button>
                <button onclick="window.location.hash='#/login'"
                        style="background:#E23E3E;color:#fff;border:none;border-radius:8px;
                               padding:10px 20px;cursor:pointer;font-size:14px;font-weight:700;">Se connecter</button>
              </div>
            </div>`;
          return;
        }

        if (status === 403) {
          const userCat = (() => { try { return JSON.parse(localStorage.getItem('bf1_user') || 'null')?.subscription_category; } catch { return null; } })();
          // Récupérer la catégorie requise depuis la réponse backend (ex: {required_category: 'basic'})
          const requiredCat = showError?.data?.required_category || showError?.data?.detail?.required_category || 'basic';
          const BADGES = {
            basic:    { label: 'Basic',    color: '#3B82F6', icon: 'bi-shield-fill' },
            standard: { label: 'Standard', color: '#9C27B0', icon: 'bi-shield-fill' },
            premium:  { label: 'Premium',  color: '#FF6F00', icon: 'bi-star-fill'   },
          };
          const reqBadge  = BADGES[requiredCat]  || BADGES.basic;
          const userBadge = userCat ? BADGES[userCat] : null;
          container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                        padding:40px 24px;text-align:center;">
              <div style="width:72px;height:72px;background:rgba(${reqBadge.color === '#3B82F6' ? '59,130,246' : reqBadge.color === '#9C27B0' ? '156,39,176' : '255,111,0'},.12);border-radius:50%;
                          display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <i class="bi ${reqBadge.icon}" style="font-size:32px;color:${reqBadge.color};"></i>
              </div>
              <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:var(--heading-color,#fff);">
                Abonnement <span style="color:${reqBadge.color};">${reqBadge.label}</span> requis
              </h3>
              <p style="font-size:14px;line-height:1.6;margin:0 0 4px;color:var(--body-color,#aaa);">
                ${userBadge
                  ? `Votre abonnement actuel : <strong style="color:var(--text-1,#fff);">${userBadge.label}</strong>`
                  : "Vous n'avez pas encore d'abonnement."}
              </p>
              <p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:var(--body-color,#aaa);">
                Souscrivez à un abonnement <strong style="color:${reqBadge.color};">${reqBadge.label}</strong> pour accéder à ce contenu.
              </p>
              <div style="display:flex;gap:12px;">
                <button onclick="history.back()"
                        style="background:var(--bg-3,#1a1a1a);color:var(--body-muted,#aaa);
                               border:1px solid var(--divider,#2a2a2a);border-radius:8px;
                               padding:10px 20px;cursor:pointer;font-size:14px;">Retour</button>
                <button onclick="window._showPremiumModal ? window._showPremiumModal({requiredCategory:'${requiredCat}'}) : (window.location.hash='#/premium')"
                        style="background:${reqBadge.color};color:#fff;border:none;border-radius:8px;
                               padding:10px 20px;cursor:pointer;font-size:14px;font-weight:700;">
                  <i class="bi bi-arrow-up-circle me-1"></i> Voir les offres
                </button>
              </div>
            </div>`;
          return;
        }

        container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;">
            <i class="bi bi-exclamation-circle" style="font-size:3rem;color:#E23E3E;"></i>
            <p style="margin-top:12px;color:var(--body-muted,#888);">Contenu introuvable</p>
            <button onclick="history.back()"
                    style="background:#E23E3E;color:#fff;border:none;border-radius:8px;
                           padding:9px 20px;cursor:pointer;margin-top:8px;">Retour</button>
          </div>`;
        return;
      }

      const user = (() => { try { return JSON.parse(localStorage.getItem('bf1_user') || 'null'); } catch { return null; } })();
      [related, comments, likesCount] = await Promise.all([
        api.getRelatedByType(type, id).catch(() => []),
        api.getComments(CONTENT_TYPE, id).catch(() => []),
        api.getLikesCount(CONTENT_TYPE, id).catch(() => 0),
      ]);
      userLiked     = false;
      userFavorited = false;
      if (user) {
        [userLiked, userFavorited] = await Promise.all([
          api.checkLiked(CONTENT_TYPE, id).catch(() => false),
          api.checkFavorite(CONTENT_TYPE, id).catch(() => false),
        ]);
      }

      _cacheSet(cacheKey, { show, related, comments, likesCount, userLiked, userFavorited });

      // Incrémenter les vues (silencieux, ne bloque pas l'UI)
      api.incrementView(CONTENT_TYPE, id);
    }

    const user = (() => { try { return JSON.parse(localStorage.getItem('bf1_user') || 'null'); } catch { return null; } })();
    if (headerTitle) headerTitle.textContent = cfg.label;

    const videoUrl = show.video_url || show.stream_url || show.url || '';
    const img      = show.image_url || show.thumbnail || show.image || show.poster || '';
    const title    = show.title || 'Sans titre';
    const desc     = show.description || show.content || '';
    const date     = formatDate(show.created_at || show.date || show.published_at);
    const duration = show.duration ? `${Math.floor(show.duration / 60)}min` : '';

    window._showDetailData = { allow_comments: show.allow_comments };

    const skeleton = document.getElementById('sd-skeleton');
    if (skeleton) skeleton.style.display = 'none';

    container.innerHTML = `
    <style>
      @keyframes sd-bar-anim   { from{width:0} to{width:100%} }
      @keyframes sd-fadeUp     { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes sd-fadeIn     { from{opacity:0} to{opacity:1} }
      @keyframes sd-scaleIn    { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
      @keyframes sd-slideRight { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
      @keyframes sd-glow-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }

      /* === HERO IMAGE avec overlay gradient sophistiqué === */
      #sd-hero-wrap {
        position:relative; width:100%; overflow:hidden;
        background:#000;
      }
      #sd-hero-img {
        width:100%; height:290px; object-fit:cover; display:block;
        filter:brightness(.82);
      }
      #sd-hero-overlay {
        position:absolute; inset:0;
        background:linear-gradient(
          to bottom,
          rgba(0,0,0,.0)   0%,
          rgba(0,0,0,.0)  35%,
          rgba(0,0,0,.55) 65%,
          rgba(0,0,0,.9)  85%,
          var(--bg-1,#0a0a0a) 100%
        );
      }
      /* Infos flottantes sur le hero (titre + badge) */
      #sd-hero-info {
        position:absolute; bottom:0; left:0; right:0;
        padding:0 18px 20px;
        animation:sd-fadeUp .5s .15s ease both;
      }

      /* === CONTENU CARD === */
      #sd-content-card {
        position:relative; z-index:5;
        background:var(--bg-1,#0a0a0a);
        padding:0 18px 0;
        margin-top:-2px;
      }

      /* === STATS BAR (vues, likes, durée) === */
      #sd-stats-bar {
        display:flex; align-items:center; gap:16px;
        padding:14px 0 16px;
        border-bottom:1px solid rgba(255,255,255,.07);
        animation:sd-fadeUp .4s .2s ease both;
        opacity:0; animation-fill-mode:both;
      }
      .sd-stat-item {
        display:flex; align-items:center; gap:5px;
        font-size:12px; color:var(--body-muted,#777);
      }
      .sd-stat-item i { font-size:11px; }

      /* === ACTIONS ROW === */
      #sd-actions-row {
        display:flex; align-items:center; gap:10px;
        padding:16px 0 18px;
        overflow-x:auto; scrollbar-width:none;
        animation:sd-fadeUp .4s .3s ease both;
        opacity:0; animation-fill-mode:both;
      }
      #sd-actions-row::-webkit-scrollbar { display:none; }

      .sd-action-pill {
        display:inline-flex; align-items:center; gap:7px;
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.1);
        border-radius:50px; padding:10px 18px;
        font-size:13px; color:var(--body-muted,#aaa);
        cursor:pointer; white-space:nowrap; flex-shrink:0;
        transition:background .2s,border-color .2s,color .2s,transform .12s;
        -webkit-tap-highlight-color:transparent;
        font-weight:600;
      }
      .sd-action-pill:active { transform:scale(.91); }
      .sd-action-pill.active-red   { background:rgba(226,62,62,.2); border-color:rgba(226,62,62,.7); color:#ff5f5f; }
      .sd-action-pill.active-amber { background:rgba(245,158,11,.2); border-color:rgba(245,158,11,.7); color:#fbbf24; }

      /* Bouton favori rond */
      .sd-icon-btn {
        display:inline-flex; align-items:center; justify-content:center;
        width:42px; height:42px; border-radius:50%; flex-shrink:0;
        border:1px solid rgba(255,255,255,.1);
        background:rgba(255,255,255,.06);
        color:var(--body-muted,#aaa); cursor:pointer; font-size:17px;
        transition:background .2s,border-color .2s,color .2s,transform .12s;
        -webkit-tap-highlight-color:transparent;
      }
      .sd-icon-btn:active { transform:scale(.88); }
      .sd-icon-btn.active-amber { background:rgba(245,158,11,.2); border-color:rgba(245,158,11,.7); color:#fbbf24; }

      /* === PARTAGE === */
      #sd-share-row {
        display:flex; align-items:center; gap:8px;
        padding-bottom:20px;
        animation:sd-fadeUp .4s .35s ease both;
        opacity:0; animation-fill-mode:both;
      }
      .sd-share-lbl { font-size:11px; color:var(--body-muted,#555); font-weight:700; text-transform:uppercase; letter-spacing:.7px; flex-shrink:0; }
      .sd-share-btn {
        display:inline-flex; align-items:center; justify-content:center;
        width:38px; height:38px; border-radius:50%; flex-shrink:0;
        border:1px solid rgba(255,255,255,.08);
        background:rgba(255,255,255,.05);
        color:#fff; cursor:pointer; font-size:15px;
        transition:background .2s,transform .12s;
        -webkit-tap-highlight-color:transparent;
      }
      .sd-share-btn:active { transform:scale(.88); }
      .sd-share-btn.fb  { background:rgba(24,119,242,.18); border-color:rgba(24,119,242,.4); color:#1877F2; }
      .sd-share-btn.wa  { background:rgba(37,211,102,.18); border-color:rgba(37,211,102,.4); color:#25D366; }
      .sd-share-btn.tw  { background:rgba(29,161,242,.18); border-color:rgba(29,161,242,.4); color:#1DA1F2; }
      .sd-share-btn.nat { background:rgba(226,62,62,.15);  border-color:rgba(226,62,62,.4); color:#ff6b6b; }

      /* === DESCRIPTION === */
      #sd-desc-wrap {
        margin-bottom:24px;
        animation:sd-fadeUp .4s .4s ease both;
        opacity:0; animation-fill-mode:both;
      }
      #sd-desc-inner {
        overflow:hidden; max-height:calc(1.72em * 3);
        transition:max-height .4s cubic-bezier(.22,1,.36,1);
      }
      #sd-desc-inner.expanded { max-height:2000px; }
      #sd-desc-toggle {
        margin-top:8px; background:none; border:none;
        color:${cfg.color}; font-size:12.5px; font-weight:700;
        cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:4px;
        transition:opacity .15s;
      }

      /* === PRÉSENTATEUR CARD === */
      #sd-host-card {
        display:flex; align-items:center; gap:12px;
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.07);
        border-radius:14px;
        padding:12px 14px;
        margin-bottom:20px;
        animation:sd-fadeUp .4s .45s ease both;
        opacity:0; animation-fill-mode:both;
      }
      #sd-host-avatar {
        width:42px; height:42px; border-radius:50%; object-fit:cover; flex-shrink:0;
        background:${cfg.color};
        display:flex; align-items:center; justify-content:center;
        font-weight:800; font-size:16px; color:#fff;
        border:2px solid ${cfg.color}40;
        overflow:hidden;
      }

      /* === DIVIDER === */
      .sd-divider { height:1px; background:rgba(255,255,255,.07); margin:20px 0; }

      /* === SECTION TITRE === */
      .sd-section-hd {
        display:flex; align-items:center; justify-content:space-between;
        margin-bottom:14px;
      }
      .sd-section-hd-left {
        display:flex; align-items:center; gap:8px;
      }
      .sd-section-accent { width:3px; height:18px; background:${cfg.color}; border-radius:2px; }
      .sd-section-title {
        font-size:13px; font-weight:800;
        color:var(--text-1,#fff);
        text-transform:uppercase; letter-spacing:.7px;
        margin:0;
      }
      .sd-section-count {
        font-size:11px; color:var(--body-muted,#555);
        background:rgba(255,255,255,.06);
        border-radius:50px; padding:2px 9px;
      }

      /* === RELATED CARDS === */
      #sd-see-also-scroll {
        display:flex; gap:12px;
        overflow-x:auto; padding:4px 2px 16px;
        scrollbar-width:none; -webkit-overflow-scrolling:touch;
      }
      #sd-see-also-scroll::-webkit-scrollbar { display:none; }

      .sd-related-card {
        flex-shrink:0; width:152px;
        border-radius:14px; overflow:hidden;
        background:var(--bg-3,#111);
        border:1px solid rgba(255,255,255,.08);
        cursor:pointer;
        transition:transform .18s, box-shadow .18s;
        animation:sd-scaleIn .35s ease both;
      }
      .sd-related-card:active { transform:scale(.94); box-shadow:none; }
      .sd-related-card:hover  { box-shadow:0 4px 20px rgba(0,0,0,.4); }

      /* === TYPE BADGE HERO === */
      .sd-type-badge {
        display:inline-flex; align-items:center; gap:5px;
        background:${cfg.color}; color:#fff;
        border-radius:6px; padding:4px 10px;
        font-size:10px; font-weight:800; letter-spacing:.5px;
        text-transform:uppercase;
        box-shadow:0 2px 12px ${cfg.color}55;
      }

      /* === LIVE / NOUVEAU indicator (si applicable) === */
      .sd-new-dot {
        display:inline-block; width:6px; height:6px; border-radius:50%;
        background:#E23E3E; margin-right:5px;
        animation:sd-glow-pulse 1.5s ease-in-out infinite;
        box-shadow:0 0 6px #E23E3E;
        vertical-align:middle;
      }
    </style>

    <!-- ===== HERO ===== -->
    <div id="sd-hero-wrap">
      ${videoUrl
        ? buildVideoPlayer(videoUrl, img)
        : img
          ? `<img id="sd-hero-img" src="${esc(img)}" alt="" onerror="this.style.display='none'">
             <div id="sd-hero-overlay"></div>
             <div id="sd-hero-info">
               <div style="margin-bottom:10px;">
                 <span class="sd-type-badge">
                   <i class="bi ${cfg.icon}" style="font-size:9px;"></i>${esc(cfg.label.toUpperCase())}
                 </span>
                 ${duration ? `<span style="margin-left:8px;display:inline-flex;align-items:center;gap:4px;
                   background:rgba(0,0,0,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
                   border:1px solid rgba(255,255,255,.15);border-radius:6px;
                   padding:3px 9px;color:#fff;font-size:10px;font-weight:600;">
                   <i class="bi bi-clock" style="font-size:9px;"></i>${esc(duration)}
                 </span>` : ''}
               </div>
               <h1 style="font-size:20px;font-weight:800;line-height:1.25;margin:0;
                          color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.7);">
                 ${esc(title)}
               </h1>
             </div>`
          : `<div style="height:80px;"></div>`
      }
    </div>

    <!-- ===== CONTENT CARD ===== -->
    <div id="sd-content-card">

      ${!videoUrl ? `
      <!-- Titre hors hero si pas d'image -->
      <div style="padding-top:20px;margin-bottom:6px;">
        <span class="sd-type-badge" style="margin-bottom:10px;display:inline-flex;">
          <i class="bi ${cfg.icon}" style="font-size:9px;"></i>${esc(cfg.label.toUpperCase())}
        </span>
        <h1 style="font-size:21px;font-weight:800;line-height:1.3;margin:8px 0 0;
                   color:var(--heading-color,#fff);">${esc(title)}</h1>
      </div>` : ''}

      <!-- === STATS BAR === -->
      <div id="sd-stats-bar">
        ${date ? `<span class="sd-stat-item">
          <i class="bi bi-calendar3" style="color:${cfg.color};"></i>
          <span>${date}</span>
        </span>` : ''}
        ${show.views_count ? `<span class="sd-stat-item">
          <i class="bi bi-eye" style="color:${cfg.color};"></i>
          <span>${show.views_count} vues</span>
        </span>` : ''}
        ${duration ? `<span class="sd-stat-item">
          <i class="bi bi-clock" style="color:${cfg.color};"></i>
          <span>${esc(duration)}</span>
        </span>` : ''}
        ${show.channel ? `<span class="sd-stat-item">
          <i class="bi bi-tv" style="color:${cfg.color};"></i>
          <span>${esc(show.channel)}</span>
        </span>` : ''}
      </div>

      <!-- === PRÉSENTATEUR CARD === -->
      ${show.host ? `
      <div id="sd-host-card" style="margin-top:16px;">
        <div id="sd-host-avatar">
          <i class="bi bi-person-fill" style="font-size:18px;"></i>
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:${cfg.color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Présentateur</div>
          <div style="font-size:14px;font-weight:700;color:var(--heading-color,#fff);">${esc(show.host)}</div>
        </div>
      </div>` : ''}

      <!-- === BARRE ACCENT ANIMÉE === -->
      <div style="height:2px;background:rgba(255,255,255,.05);border-radius:2px;
                  margin:${show.host ? '0' : '18px'} 0 0;overflow:hidden;">
        <div style="height:100%;background:linear-gradient(90deg,${cfg.color},${cfg.color}55,transparent);
                    animation:sd-bar-anim .9s .3s ease both;"></div>
      </div>

      <!-- === ACTIONS PILLS === -->
      <div id="sd-actions-row">
        <!-- Like -->
        <button id="sd-like-btn" onclick="toggleSdLike()"
                class="sd-action-pill ${userLiked ? 'active-red' : ''}">
          <i class="bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'}" style="font-size:15px;"></i>
          <span id="sd-like-count">${likesCount}</span>
        </button>

        <!-- Commentaires -->
        <button onclick="${show.allow_comments === false ? `window._detailToast&&window._detailToast('Les commentaires sont désactivés')` : 'openSdComments()'}"
                class="sd-action-pill" style="${show.allow_comments === false ? 'opacity:.4;pointer-events:none;' : ''}">
          <i class="bi ${show.allow_comments === false ? 'bi-chat-slash' : 'bi-chat-dots'}" style="font-size:15px;"></i>
          <span id="sd-cm-count-btn">${comments.length}</span>
        </button>

        <!-- Favori (round icon) -->
        <button id="sd-fav-btn" onclick="toggleSdFavorite()"
                class="sd-icon-btn ${userFavorited ? 'active-amber' : ''}" title="Favoris">
          <i class="bi ${userFavorited ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
        </button>

        <div style="flex:1;min-width:8px;"></div>

        <!-- Catégorie -->
        ${show.category ? `
        <span style="display:inline-flex;align-items:center;gap:5px;flex-shrink:0;
                     background:${cfg.color}18;border:1px solid ${cfg.color}40;
                     border-radius:50px;padding:8px 14px;
                     font-size:12px;color:${cfg.color};font-weight:700;">
          <i class="bi bi-tag-fill" style="font-size:11px;"></i>${esc(show.category)}
        </span>` : ''}
      </div>

      <!-- === DESCRIPTION === -->
      ${desc ? `
      <div id="sd-desc-wrap">
        <div id="sd-desc-inner">
          <p style="font-size:14.5px;color:var(--body-color,#bbb);line-height:1.78;
                    white-space:pre-wrap;margin:0;">${esc(desc)}</p>
        </div>
        <button onclick="_sdToggleDesc()" id="sd-desc-toggle">
          Lire plus <i class="bi bi-chevron-down" style="font-size:11px;"></i>
        </button>
      </div>` : ''}

      <!-- === PARTAGE === -->
      <div id="sd-share-row">
        <span class="sd-share-lbl">Partager</span>
        <button class="sd-share-btn fb" onclick="shareContent('facebook','${esc(show.title)}',location.href)" title="Facebook">
          <i class="bi bi-facebook"></i>
        </button>
        <button class="sd-share-btn wa" onclick="shareContent('whatsapp','${esc(show.title)}',location.href)" title="WhatsApp">
          <i class="bi bi-whatsapp"></i>
        </button>
        <button class="sd-share-btn tw" onclick="shareContent('twitter','${esc(show.title)}',location.href)" title="Twitter/X">
          <i class="bi bi-twitter"></i>
        </button>
        <button class="sd-share-btn nat" onclick="shareContent('native','${esc(show.title)}',location.href)" title="Plus">
          <i class="bi bi-share-fill"></i>
        </button>
      </div>

      <div class="sd-divider" style="margin-top:4px;"></div>

      <!-- === VOIR AUSSI === -->
      ${related.length > 0 ? `
      <div style="margin-bottom:28px;animation:sd-fadeUp .4s .5s ease both;opacity:0;animation-fill-mode:both;">
        <div class="sd-section-hd">
          <div class="sd-section-hd-left">
            <div class="sd-section-accent"></div>
            <span class="sd-section-title">Voir aussi</span>
          </div>
          <span class="sd-section-count">${related.length} contenus</span>
        </div>
        <div id="sd-see-also-scroll">
          ${related.map((rItem, idx) => {
            const rImg = rItem.image_url || rItem.thumbnail || rItem.image || '';
            const rId  = rItem.id || rItem._id;
            const rDur = rItem.duration ? `${Math.floor(rItem.duration/60)}min` : '';
            return `
            <div class="sd-related-card" style="animation-delay:${idx * 55}ms"
                 onclick="window.location.hash='#/show/${type}/${rId}'">
              <div style="position:relative;width:100%;height:102px;overflow:hidden;background:#1a1a1a;">
                ${rImg
                  ? `<img src="${esc(rImg)}" alt=""
                         style="width:100%;height:100%;object-fit:cover;display:block;
                                transition:transform .3s;" loading="lazy"
                         onerror="this.parentNode.style.background='#1a1a1a'">`
                  : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                       <i class="bi bi-play-circle" style="font-size:26px;color:#444;"></i>
                     </div>`}
                <!-- gradient overlay -->
                <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 55%);"></div>
                <!-- play btn -->
                <div style="position:absolute;bottom:7px;left:8px;
                            width:22px;height:22px;border-radius:50%;
                            background:rgba(226,62,62,.9);
                            display:flex;align-items:center;justify-content:center;
                            box-shadow:0 2px 8px rgba(226,62,62,.5);">
                  <i class="bi bi-play-fill" style="color:#fff;font-size:10px;margin-left:1px;"></i>
                </div>
                ${rDur ? `<span style="position:absolute;bottom:7px;right:8px;
                                      background:rgba(0,0,0,.8);color:#fff;
                                      font-size:9px;font-weight:700;border-radius:4px;padding:2px 6px;">${esc(rDur)}</span>` : ''}
              </div>
              <div style="padding:9px 10px 11px;">
                <p style="font-size:11.5px;font-weight:700;margin:0 0 5px;
                           color:var(--heading-color,#eee);line-height:1.4;
                           overflow:hidden;display:-webkit-box;
                           -webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(rItem.title || '')}</p>
                <span style="font-size:10px;color:var(--body-muted,#555);display:inline-flex;align-items:center;gap:3px;">
                  <i class="bi bi-clock" style="font-size:9px;"></i>${formatRelative(rItem.created_at || rItem.date)}
                </span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

    </div>`;

    if (show.allow_comments !== false) {
      if (typeof renderSdComments === 'function') {
        renderSdComments(comments, show, user, id, type);
      }
    }

    window._sdToggleDesc = function() {
      const inner  = document.getElementById('sd-desc-inner');
      const toggle = document.getElementById('sd-desc-toggle');
      if (!inner) return;
      const expanded = inner.classList.toggle('expanded');
      if (toggle) toggle.innerHTML = expanded
        ? 'Voir moins <i class="bi bi-chevron-up"></i>'
        : 'Lire plus <i class="bi bi-chevron-down"></i>';
    };

    requestAnimationFrame(() => {
      const inner  = document.getElementById('sd-desc-inner');
      const toggle = document.getElementById('sd-desc-toggle');
      if (inner && inner.scrollHeight <= inner.offsetHeight + 4) {
        inner.classList.add('expanded');
        if (toggle) toggle.style.display = 'none';
      }
    });

    let currentlyFavorited = userFavorited;
    window.toggleSdFavorite = async function() {
      if (!localStorage.getItem('bf1_token')) {
        window._showLoginModal?.('Connectez-vous pour sauvegarder ce contenu dans vos favoris');
        return;
      }
      const btn = document.getElementById('sd-fav-btn');
      if (!btn) return;
      btn.disabled = true;
      try {
        if (currentlyFavorited) {
          await api.removeFavorite(CONTENT_TYPE, id);
          currentlyFavorited = false;
        } else {
          await api.addFavorite(CONTENT_TYPE, id);
          currentlyFavorited = true;
        }
        btn.classList.toggle('active-amber', currentlyFavorited);
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'bi ' + (currentlyFavorited ? 'bi-bookmark-fill' : 'bi-bookmark');
      } catch(e) { console.error('Erreur favori:', e); }
      btn.disabled = false;
    };

    let currentlyLiked = userLiked;
    let currentLikesCount = likesCount;
    window.toggleSdLike = async function() {
      if (!localStorage.getItem('bf1_token')) {
        window._showLoginModal?.('Connectez-vous pour liker ce contenu');
        return;
      }
      const btn = document.getElementById('sd-like-btn');
      const countEl = document.getElementById('sd-like-count');
      if (!btn) return;
      btn.disabled = true;
      try {
        const res = await api.toggleLike(CONTENT_TYPE, id);
        currentlyLiked = res?.liked ?? !currentlyLiked;
        currentLikesCount = res?.count ?? (currentlyLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1));
        btn.classList.toggle('active-red', currentlyLiked);
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'bi ' + (currentlyLiked ? 'bi-heart-fill' : 'bi-heart');
        if (countEl) countEl.textContent = Math.max(0, currentLikesCount);
      } catch(e) { console.error('Erreur like:', e); }
      btn.disabled = false;
    };

    const _sdCmOrig = {};

    function renderSdCmList(cmts) {
      const listEl = document.getElementById('sd-cm-list');
      if (!listEl) return;
      if (!cmts.length) {
        listEl.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;
                      justify-content:center;padding:48px 24px;text-align:center;">
            <div style="width:60px;height:60px;border-radius:50%;
                        background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
                        display:flex;align-items:center;justify-content:center;margin-bottom:14px;">
              <i class="bi bi-chat-dots" style="font-size:24px;color:var(--body-muted,#444);"></i>
            </div>
            <p style="color:var(--heading-color,#ddd);font-size:15px;font-weight:700;margin:0 0 6px;">Aucun commentaire</p>
            <p style="color:var(--body-muted,#555);font-size:13px;margin:0;">Soyez le premier à réagir !</p>
          </div>`;
        return;
      }
      listEl.innerHTML = cmts.map((c, ci) => {
        const isOwn = user && String(c.user_id) === String(user.id);
        const uname = c.username || c.user?.username || 'Utilisateur';
        const cid = esc(String(c.id || c._id));
        const av = _resolveAvatar(c.avatar_url || c.user?.avatar_url);
        const initials = esc((uname[0]||'U').toUpperCase());
        return `
        <div class="sd-cm-comment" data-id="${cid}"
             style="display:flex;gap:11px;padding:14px 0;
                    border-bottom:1px solid rgba(255,255,255,.06);
                    animation-delay:${ci * 40}ms;">
          <!-- Avatar -->
          <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;
                      background:${cfg.color}22;border:1.5px solid ${cfg.color}50;
                      display:flex;align-items:center;justify-content:center;
                      font-weight:800;font-size:13px;color:${cfg.color};overflow:hidden;">
            ${av
              ? `<img src="${esc(av)}" style="width:100%;height:100%;object-fit:cover;"
                      onerror="this.parentElement.innerHTML='${initials}'">`
              : initials}
          </div>
          <div style="flex:1;min-width:0;">
            <!-- Header commentaire -->
            <div style="display:flex;justify-content:space-between;align-items:center;
                        gap:6px;margin-bottom:5px;">
              <div style="display:flex;align-items:center;gap:7px;">
                <span style="font-size:13px;font-weight:700;
                             color:var(--heading-color,#fff);">${esc(uname)}</span>
                ${isOwn ? `<span style="font-size:9px;font-weight:700;color:${cfg.color};
                                       background:${cfg.color}18;border-radius:4px;padding:1px 6px;
                                       text-transform:uppercase;letter-spacing:.3px;">Vous</span>` : ''}
              </div>
              <div class="sd-cm-actions" style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
                <span style="font-size:10px;color:var(--body-muted,#555);">${formatRelative(c.created_at)}</span>
                ${isOwn ? `
                <button onclick="editSdCmComment('${cid}')"
                        style="background:rgba(255,255,255,.06);border:none;border-radius:6px;
                               color:var(--body-muted,#888);cursor:pointer;padding:4px 6px;
                               font-size:12px;line-height:1;transition:background .15s;" title="Modifier">
                  <i class="bi bi-pencil"></i>
                </button>
                <button onclick="deleteSdCmComment('${cid}')"
                        style="background:rgba(226,62,62,.1);border:none;border-radius:6px;
                               color:#E23E3E;cursor:pointer;padding:4px 6px;font-size:12px;
                               line-height:1;transition:background .15s;" title="Supprimer">
                  <i class="bi bi-trash"></i>
                </button>` : ''}
              </div>
            </div>
            <!-- Texte -->
            <p class="sd-cm-text"
               style="font-size:14px;color:var(--body-color,#ccc);margin:0;
                      line-height:1.55;word-break:break-word;">${esc(c.text)}</p>
          </div>
        </div>`;
      }).join('');
    }

    window.openSdComments = async function() {
      if (window._showDetailData && window._showDetailData.allow_comments === false) {
        return;
      }
      const existing = document.getElementById('sd-comments-modal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'sd-comments-modal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;flex-direction:column;justify-content:flex-end;';
      modal.innerHTML = `
        <style>
          #sd-comments-modal .sd-cm-sheet { animation: sdSlideUp 0.32s cubic-bezier(.22,1,.36,1); }
          @keyframes sdSlideUp { from { transform:translateY(100%);opacity:.4 } to { transform:translateY(0);opacity:1 } }
          #sd-cm-list .sd-cm-comment { animation:sdCmFadeIn .25s ease both; }
          @keyframes sdCmFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        </style>
        <div class="sd-cm-sheet"
             style="background:var(--bg-1,#0b0b0b);border-radius:22px 22px 0 0;
                    height:82vh;display:flex;flex-direction:column;
                    border-top:1px solid rgba(255,255,255,.08);">

          <!-- Handle bar -->
          <div style="display:flex;justify-content:center;padding:10px 0 0;">
            <div style="width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.18);"></div>
          </div>

          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:center;
                      padding:12px 18px 14px;border-bottom:1px solid rgba(255,255,255,.07);">
            <div style="display:flex;align-items:center;gap:10px;">
              <i class="bi bi-chat-dots-fill" style="color:${cfg.color};font-size:16px;"></i>
              <span style="color:var(--heading-color,#fff);font-size:16px;font-weight:800;">
                Commentaires
              </span>
              <span style="background:rgba(255,255,255,.08);border-radius:50px;
                           padding:2px 10px;font-size:12px;font-weight:700;color:var(--body-muted,#888);">
                <span id="sd-cm-count">...</span>
              </span>
            </div>
            <button onclick="closeSdComments()"
                    style="background:rgba(255,255,255,.08);border:none;
                           width:32px;height:32px;border-radius:50%;
                           color:var(--text-1,#fff);font-size:16px;cursor:pointer;
                           display:flex;align-items:center;justify-content:center;
                           transition:background .15s;">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- List -->
          <div id="sd-cm-list" style="flex:1;overflow-y:auto;padding:0 16px;
                                       -webkit-overflow-scrolling:touch;">
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;">
              <svg viewBox="0 0 40 40" width="36" height="36" style="margin-bottom:12px;">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#1a1a1a" stroke-width="3.5"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke="${cfg.color}" stroke-width="3.5"
                  stroke-dasharray="100" stroke-dashoffset="100" stroke-linecap="round"
                  transform="rotate(-90 20 20)"
                  style="animation:_sdSnake .9s linear infinite;"/>
              </svg>
              <span style="font-size:13px;color:var(--body-muted,#555);">Chargement…</span>
            </div>
          </div>

          <!-- Input zone -->
          ${user ? `
          <div style="padding:10px 14px 14px;border-top:1px solid rgba(255,255,255,.07);
                      background:var(--bg-1,#0b0b0b);display:flex;align-items:flex-end;gap:10px;">
            <!-- Avatar initiale -->
            <div style="width:34px;height:34px;border-radius:50%;background:${cfg.color};flex-shrink:0;
                        display:flex;align-items:center;justify-content:center;
                        font-weight:800;font-size:13px;color:#fff;">
              ${esc((user.username?.[0] || user.email?.[0] || 'U').toUpperCase())}
            </div>
            <div style="flex:1;background:rgba(255,255,255,.06);border-radius:22px;
                        border:1px solid rgba(255,255,255,.1);
                        display:flex;align-items:flex-end;gap:0;overflow:hidden;">
              <textarea id="sd-cm-input" maxlength="1000" placeholder="Écrire un commentaire…"
                        style="flex:1;background:transparent;border:none;padding:10px 14px;
                               color:var(--text-1,#fff);font-size:14px;resize:none;
                               height:42px;max-height:110px;outline:none;line-height:1.45;
                               font-family:inherit;"></textarea>
              <button onclick="submitSdCmComment()"
                      style="flex-shrink:0;background:${cfg.color};
                             border:none;border-radius:50%;margin:5px;
                             width:32px;height:32px;color:#fff;cursor:pointer;
                             font-size:14px;display:flex;align-items:center;justify-content:center;
                             transition:opacity .15s,transform .12s;box-shadow:0 2px 10px ${cfg.color}55;">
                <i class="bi bi-send-fill"></i>
              </button>
            </div>
          </div>` : `
          <div style="padding:16px 18px;border-top:1px solid rgba(255,255,255,.07);text-align:center;">
            <p style="font-size:13px;color:var(--body-muted,#666);margin:0 0 12px;">
              Connectez-vous pour rejoindre la conversation
            </p>
            <button onclick="closeSdComments();setTimeout(()=>window._showLoginModal?.('Connectez-vous pour laisser un commentaire'),350);"
                    style="background:${cfg.color};border:none;border-radius:50px;padding:10px 28px;
                           color:#fff;cursor:pointer;font-size:14px;font-weight:700;
                           box-shadow:0 3px 14px ${cfg.color}44;">
              <i class="bi bi-person-fill" style="margin-right:6px;"></i>Se connecter
            </button>
          </div>`}
        </div>`;
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';
      modal.addEventListener('click', e => { if (e.target === modal) closeSdComments(); });
      const inp = document.getElementById('sd-cm-input');
      if (inp) {
        inp.addEventListener('input', function() { this.style.height='42px'; this.style.height=Math.min(this.scrollHeight,100)+'px'; });
        inp.addEventListener('keydown', function(e) { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); submitSdCmComment(); } });
      }
      try {
        const cmts = await api.getComments(CONTENT_TYPE, id);
        renderSdCmList(cmts);
        const cEl = document.getElementById('sd-cm-count');
        if (cEl) cEl.textContent = cmts.length;
      } catch(e) {
        const lEl = document.getElementById('sd-cm-list');
        if (lEl) lEl.innerHTML = `<p style="color:var(--body-muted,#666);text-align:center;padding:30px;">Erreur de chargement</p>`;
      }
    };

    window.closeSdComments = function() {
      const m = document.getElementById('sd-comments-modal');
      if (m) m.remove();
      document.body.style.overflow = '';
    };

    window.submitSdCmComment = async function() {
      const inp = document.getElementById('sd-cm-input');
      if (!inp || !inp.value.trim()) return;
      if (!localStorage.getItem('bf1_token')) {
        closeSdComments();
        window._showLoginModal?.('Connectez-vous pour laisser un commentaire');
        return;
      }
      const text = inp.value.trim();
      inp.disabled = true;
      const sendBtn = inp.parentElement?.querySelector('button');
      const origIcon = sendBtn?.innerHTML;
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="bi bi-arrow-repeat" style="animation:spin .8s linear infinite;"></i>';
        if (!document.getElementById('sd-spin-style')) {
          const st = document.createElement('style'); st.id = 'sd-spin-style';
          st.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
          document.head.appendChild(st);
        }
      }
      try {
        await api.addComment(CONTENT_TYPE, id, text);
        inp.value = ''; inp.style.height = '42px';
        const cmts = await api.getComments(CONTENT_TYPE, id);
        renderSdCmList(cmts);
        const cEl = document.getElementById('sd-cm-count');
        if (cEl) cEl.textContent = cmts.length;
        const btn = document.getElementById('sd-cm-count-btn');
        if (btn) btn.textContent = `${cmts.length} commentaire${cmts.length !== 1 ? 's' : ''}`;
      } catch(e) { console.error('Erreur envoi:', e); }
      inp.disabled = false;
      if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = origIcon; }
    };

    window.deleteSdCmComment = async function(commentId) {
      if (!confirm('Supprimer ce commentaire ?')) return;
      try {
        await api.deleteComment(commentId);
        const cmts = await api.getComments(CONTENT_TYPE, id);
        renderSdCmList(cmts);
        const cEl = document.getElementById('sd-cm-count');
        if (cEl) cEl.textContent = cmts.length;
        const btn = document.getElementById('sd-cm-count-btn');
        if (btn) btn.textContent = `${cmts.length} commentaire${cmts.length !== 1 ? 's' : ''}`;
      } catch(e) { console.error('Erreur suppression:', e); }
    };

    window.editSdCmComment = function(commentId) {
      const el = document.querySelector(`#sd-cm-list .sd-cm-comment[data-id="${commentId}"]`);
      if (!el) return;
      const textEl = el.querySelector('.sd-cm-text');
      const actEl  = el.querySelector('.sd-cm-actions');
      if (!textEl) return;
      _sdCmOrig[commentId] = textEl.textContent.trim();
      textEl.innerHTML = `
        <textarea id="sd-cm-edit-${commentId}"
                  style="width:100%;background:var(--bg-1,#000);border:1px solid #E23E3E;
                         border-radius:8px;padding:8px;color:var(--text-1,#fff);
                         font-size:14px;resize:none;min-height:60px;outline:none;">${esc(_sdCmOrig[commentId])}</textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
          <button onclick="cancelSdCmEdit('${commentId}')"
                  style="background:var(--bg-3,#1a1a1a);border:1px solid var(--divider,#2a2a2a);
                         border-radius:8px;padding:6px 14px;color:var(--body-muted,#aaa);
                         cursor:pointer;font-size:12px;">Annuler</button>
          <button onclick="updateSdCmComment('${commentId}')"
                  style="background:#E23E3E;border:none;border-radius:8px;padding:6px 14px;
                         color:#fff;cursor:pointer;font-size:12px;font-weight:600;">Enregistrer</button>
        </div>`;
      if (actEl) actEl.style.display = 'none';
      const ta = document.getElementById(`sd-cm-edit-${commentId}`);
      if (ta) ta.focus();
    };

    window.cancelSdCmEdit = function(commentId) {
      const el = document.querySelector(`#sd-cm-list .sd-cm-comment[data-id="${commentId}"]`);
      if (!el) return;
      const textEl = el.querySelector('.sd-cm-text');
      const actEl  = el.querySelector('.sd-cm-actions');
      if (textEl) textEl.innerHTML = esc(_sdCmOrig[commentId] || '');
      if (actEl)  actEl.style.display = '';
      delete _sdCmOrig[commentId];
    };

    window.updateSdCmComment = async function(commentId) {
      const ta = document.getElementById(`sd-cm-edit-${commentId}`);
      if (!ta || !ta.value.trim()) return;
      const newText = ta.value.trim();
      ta.disabled = true;
      try {
        await api.updateComment(commentId, newText);
        const cmts = await api.getComments(CONTENT_TYPE, id);
        renderSdCmList(cmts);
        const cEl = document.getElementById('sd-cm-count');
        if (cEl) cEl.textContent = cmts.length;
      } catch(e) {
        console.error('Erreur modification:', e);
        if (ta) ta.disabled = false;
        return;
      }
      delete _sdCmOrig[commentId];
    };

    window.toggleSdFullscreen = function() {
      const video = document.getElementById('sd-video');
      if (!video) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        video.requestFullscreen().then(() => {
          if (screen.orientation?.lock) screen.orientation.lock('landscape').catch(() => {});
        }).catch(() => {});
      }
    };

  } catch (err) {
    console.error('Erreur loadShowDetail:', err);
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;
                  justify-content:center;padding:40px 24px;">
        <i class="bi bi-exclamation-circle" style="font-size:3rem;color:#E23E3E;"></i>
        <p style="margin-top:12px;color:var(--body-muted,#888);">Erreur lors du chargement</p>
        <button onclick="history.back()"
                style="background:#E23E3E;color:#fff;border:none;border-radius:8px;
                       padding:9px 20px;cursor:pointer;margin-top:8px;">Retour</button>
      </div>`;
  }
}