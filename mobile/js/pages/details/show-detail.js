import * as api from '../../services/api.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `${j}j`;
    return formatDate(d);
  } catch { return 'Récemment'; }
}

// ─── YouTube IFrame API — custom player ─────────────────────────────────────

function _fmtTime(s) {
  const m = Math.floor(s / 60);
  return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

function _setupYTGlobals() {
  if (window.__ytSetup) return;
  window.__ytSetup  = true;
  window._ytPlayers = window._ytPlayers || {};
  window._ytTimers  = window._ytTimers  || {};
  window._ytQueue   = window._ytQueue   || [];
  window._ytPending = window._ytPending || {};

  const _orig = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function() {
    if (_orig) _orig();
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
            const post = document.getElementById(posterId);
            if (post) post.style.display = 'none';
          }
        },
        onStateChange: (e) => {
          const playing = e.data === 1;
          const btn = document.getElementById(pid + '-playbtn');
          if (btn) btn.innerHTML = playing
            ? '<i class="bi bi-pause-fill" style="font-size:20px;"></i>'
            : '<i class="bi bi-play-fill"  style="font-size:20px;"></i>';
          const post = document.getElementById(posterId);
          if (post && playing) post.style.display = 'none';
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

  if (ytId) {
    const pid      = 'ytp' + Date.now().toString(36);
    const posterId = pid + '-post';
    _createYTPlayer(pid, ytId, posterId);
    const pStyle = posterImg
      ? `background:url('${esc(posterImg)}') center/cover no-repeat;`
      : 'background:var(--bg-3,#111);';
    return `
    <div style="background:#000;">
      <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
        <div id="${pid}" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
        <div id="${posterId}"
             onclick="window._ytToggle('${pid}');this.style.display='none';"
             style="position:absolute;inset:0;cursor:pointer;z-index:5;${pStyle}">
          <div style="position:absolute;inset:0;background:rgba(0,0,0,0.35);
                      display:flex;align-items:center;justify-content:center;">
            <div style="width:62px;height:62px;background:rgba(226,62,62,.92);border-radius:50%;
                        display:flex;align-items:center;justify-content:center;
                        box-shadow:0 4px 20px rgba(226,62,62,.45);">
              <i class="bi bi-play-fill" style="color:#fff;font-size:26px;margin-left:3px;"></i>
            </div>
          </div>
        </div>
      </div>
      <div style="background:var(--bg-2,#0d0d0d);padding:8px 14px;display:flex;align-items:center;
                  gap:10px;border-top:1px solid var(--divider,#1a1a1a);">
        <button id="${pid}-playbtn" onclick="window._ytToggle('${pid}')"
                style="background:none;border:none;color:var(--text-1,#fff);cursor:pointer;
                       padding:0;flex-shrink:0;line-height:1;">
          <i class="bi bi-play-fill" style="font-size:20px;"></i>
        </button>
        <div style="flex:1;height:4px;background:var(--border,#2a2a2a);border-radius:2px;
                    cursor:pointer;position:relative;"
             onclick="window._ytSeek(event,'${pid}')">
          <div id="${pid}-prog"
               style="height:100%;background:#E23E3E;border-radius:2px;
                      width:0%;pointer-events:none;transition:width .4s linear;"></div>
        </div>
        <span id="${pid}-time"
              style="font-size:11px;color:var(--body-muted,#888);white-space:nowrap;
                     min-width:78px;text-align:right;">0:00 / 0:00</span>
        <button onclick="window._ytFullscreen('${pid}')"
                style="background:none;border:none;color:var(--body-muted,#888);cursor:pointer;
                       padding:0;flex-shrink:0;line-height:1;">
          <i class="bi bi-fullscreen" style="font-size:16px;"></i>
        </button>
      </div>
    </div>`;
  }

  // ── Direct / MP4 ─────────────────────────────────────────────────────────
  return `
    <div style="position:relative;width:100%;background:#000;">
      <video id="sd-video" controls autoplay muted playsinline preload="auto"
             style="width:100%;max-height:280px;display:block;object-fit:contain;"
             ${posterImg ? `poster="${esc(posterImg)}"` : ''}>
        <source src="${esc(videoUrl)}" type="video/mp4">
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
    </div>`;
}

// ─── Config par type ──────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  sport:         { label: 'Sport',         icon: 'bi-trophy-fill',        color: '#1DA1F2', apiType: 'sport' },
  jtandmag:      { label: 'JT & Magazine', icon: 'bi-camera-video-fill',  color: '#E23E3E', apiType: 'jtandmag' },
  divertissement:{ label: 'Divertissement',icon: 'bi-music-note-beamed',  color: '#A855F7', apiType: 'divertissement' },
  reportage:     { label: 'Reportage',     icon: 'bi-film',               color: '#F59E0B', apiType: 'reportage' },
  archive:       { label: 'Archive',       icon: 'bi-archive-fill',       color: '#6B7280', apiType: 'archive' },
  show:          { label: 'Émission',      icon: 'bi-tv-fill',            color: '#10B981', apiType: 'show' },
  movie:         { label: 'Film',          icon: 'bi-film',               color: '#E23E3E', apiType: 'movie' },
};

// ─── Export principal ─────────────────────────────────────────────────────────

export async function loadShowDetail(id, type) {
  const container = document.getElementById('sd-container');
  const headerTitle = document.getElementById('sd-header-title');
  if (!container) return;

  const cfg = TYPE_CONFIG[type] || { label: 'Programme', icon: 'bi-play-circle', color: '#E23E3E', apiType: type };
  const CONTENT_TYPE = cfg.apiType;

  try {
    let show = null;
    let showError = null;
    try {
      show = await api.getShowById(id, type);
    } catch (err) {
      showError = err;
    }

    if (!show) {
      const status = showError?.status;

      // ── 401 : non connecté ────────────────────────────────────────────────
      if (status === 401) {
        container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                      padding:40px 24px;text-align:center;">
            <div style="width:72px;height:72px;background:rgba(226,62,62,.12);border-radius:50%;
                        display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
              <i class="bi bi-lock-fill" style="font-size:32px;color:#E23E3E;"></i>
            </div>
            <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;
                       color:var(--heading-color,#fff);">Connexion requise</h3>
            <p style="font-size:14px;line-height:1.6;margin:0 0 20px;
                      color:var(--body-color,#aaa);">
              Cette archive est réservée aux abonnés.<br>Connectez-vous pour accéder à notre contenu premium.
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

      // ── 403 : abonnement insuffisant ──────────────────────────────────────
      if (status === 403) {
        const isLoggedIn = (() => { try { return Boolean(localStorage.getItem('bf1_token')); } catch { return false; } })();
        const userCat    = (() => { try { return JSON.parse(localStorage.getItem('bf1_user') || 'null')?.subscription_category; } catch { return null; } })();
        const BADGES = { basic: { label: 'Basic', color: '#3B82F6' }, standard: { label: 'Standard', color: '#9C27B0' }, premium: { label: 'Premium', color: '#FF6F00' } };
        const userBadge = userCat ? BADGES[userCat] : null;
        container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                      padding:40px 24px;text-align:center;">
            <div style="width:72px;height:72px;background:rgba(255,111,0,.12);border-radius:50%;
                        display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
              <i class="bi bi-star-fill" style="font-size:32px;color:#FF6F00;"></i>
            </div>
            <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;
                       color:var(--heading-color,#fff);">Abonnement insuffisant</h3>
            <p style="font-size:14px;line-height:1.6;margin:0 0 4px;color:var(--body-color,#aaa);">
              ${userBadge
                ? `Votre abonnement actuel : <strong style="color:var(--text-1,#fff);">${userBadge.label}</strong>`
                : "Vous n'avez pas encore d'abonnement."}
            </p>
            <p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:var(--body-color,#aaa);">
              Améliorez votre abonnement pour accéder à cette archive.
            </p>
            <div style="display:flex;gap:12px;">
              <button onclick="history.back()"
                      style="background:var(--bg-3,#1a1a1a);color:var(--body-muted,#aaa);
                             border:1px solid var(--divider,#2a2a2a);border-radius:8px;
                             padding:10px 20px;cursor:pointer;font-size:14px;">Retour</button>
              <button onclick="window._archiveBannerUpgrade ? window._archiveBannerUpgrade('premium') : (window.location.hash='#/premium')"
                      style="background:#FF6F00;color:#fff;border:none;border-radius:8px;
                             padding:10px 20px;cursor:pointer;font-size:14px;font-weight:700;">Voir les offres</button>
            </div>
          </div>`;
        return;
      }

      // ── Erreur générique ──────────────────────────────────────────────────
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

    // ── Données complémentaires ───────────────────────────────────────────────
    const [related, comments, likesCount] = await Promise.all([
      api.getRelatedByType(type, id).catch(() => []),
      api.getComments(CONTENT_TYPE, id).catch(() => []),
      api.getLikesCount(CONTENT_TYPE, id).catch(() => 0),
    ]);

    let userLiked = false;
    let userFavorited = false;
    const user = (() => { try { return JSON.parse(localStorage.getItem('bf1_user') || 'null'); } catch { return null; } })();
    if (user) {
      [userLiked, userFavorited] = await Promise.all([
        api.checkLiked(CONTENT_TYPE, id).catch(() => false),
        api.checkFavorite(CONTENT_TYPE, id).catch(() => false),
      ]);
    }

    if (headerTitle) headerTitle.textContent = cfg.label;

    const videoUrl = show.video_url || show.stream_url || show.url || '';
    const img      = show.image_url || show.thumbnail || show.image || show.poster || '';
    const title    = show.title || 'Sans titre';
    const desc     = show.description || show.content || '';
    const date     = formatDate(show.created_at || show.date || show.published_at);
    const duration = show.duration ? `${Math.floor(show.duration / 60)}min` : '';

    // ── HTML principal ────────────────────────────────────────────────────────
    container.innerHTML = `

      ${videoUrl ? buildVideoPlayer(videoUrl, img) : img ? `
      <div style="position:relative;width:100%;max-height:260px;overflow:hidden;">
        <img src="${esc(img)}" alt="" style="width:100%;object-fit:cover;display:block;max-height:260px;"
             onerror="this.style.display='none'">
        <div style="position:absolute;inset:0;background:var(--hero-overlay,linear-gradient(transparent 40%,#000 100%));"></div>
        <div style="position:absolute;top:12px;left:12px;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:${cfg.color};
                       color:#fff;border-radius:4px;padding:3px 9px;font-size:11px;font-weight:700;">
            <i class="bi ${cfg.icon}" style="font-size:10px;"></i>${esc(cfg.label.toUpperCase())}
          </span>
        </div>
        ${duration ? `<div style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.7);
                                   color:#fff;border-radius:4px;padding:2px 7px;font-size:11px;">
                        <i class="bi bi-clock me-1"></i>${esc(duration)}</div>` : ''}
      </div>` : ''}

      <div class="px-3 pt-3">

        <!-- Badges méta -->
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <span style="background:${cfg.color};color:#fff;border-radius:4px;
                       padding:3px 9px;font-size:12px;font-weight:600;">
            <i class="bi ${cfg.icon} me-1" style="font-size:10px;"></i>${esc(cfg.label)}
          </span>
          ${date     ? `<span style="font-size:12px;color:var(--body-muted,#666);">${date}</span>` : ''}
          ${duration ? `<span style="font-size:12px;color:var(--body-muted,#666);">
                          <i class="bi bi-clock me-1"></i>${esc(duration)}</span>` : ''}
        </div>

        <!-- Titre -->
        <h1 style="font-size:20px;font-weight:700;line-height:1.35;margin-bottom:12px;
                   color:var(--heading-color,#fff);
                   overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
          ${esc(title)}
        </h1>

        <!-- Chaîne / Catégorie -->
        ${show.channel ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <i class="bi bi-tv" style="color:var(--body-muted,#555);"></i>
          <span style="font-size:13px;color:var(--body-color,#888);">${esc(show.channel)}</span>
        </div>` : ''}
        ${show.category ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <i class="bi bi-tag" style="color:var(--body-muted,#555);"></i>
          <span style="font-size:13px;color:var(--body-color,#888);">${esc(show.category)}</span>
        </div>` : ''}

        <!-- Actions : Like / Commentaires / Favori -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;
                    padding-bottom:16px;border-bottom:1px solid var(--divider,#1e1e1e);">
          <button id="sd-like-btn" onclick="toggleSdLike()"
                  style="display:inline-flex;align-items:center;gap:6px;
                         background:${userLiked ? '#E23E3E' : 'var(--bg-3,#1a1a1a)'};
                         border:1px solid ${userLiked ? '#E23E3E' : 'var(--divider,#2a2a2a)'};
                         border-radius:20px;padding:7px 14px;
                         color:${userLiked ? '#fff' : 'var(--body-muted,#888)'};
                         cursor:pointer;font-size:13px;">
            <i class="bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
            <span id="sd-like-count">${likesCount}</span>
          </button>
          <button onclick="openSdComments()"
                  style="display:inline-flex;align-items:center;gap:6px;
                         background:var(--bg-3,#1a1a1a);
                         border:1px solid var(--divider,#2a2a2a);
                         border-radius:20px;padding:7px 14px;
                         color:var(--body-muted,#888);cursor:pointer;font-size:13px;">
            <i class="bi bi-chat-dots"></i>
            <span id="sd-cm-count-btn">${comments.length} commentaire${comments.length !== 1 ? 's' : ''}</span>
          </button>
          <button id="sd-fav-btn" onclick="toggleSdFavorite()"
                  style="display:inline-flex;align-items:center;gap:6px;
                         background:${userFavorited ? '#F59E0B' : 'var(--bg-3,#1a1a1a)'};
                         border:1px solid ${userFavorited ? '#F59E0B' : 'var(--divider,#2a2a2a)'};
                         border-radius:20px;padding:7px 14px;
                         color:${userFavorited ? '#fff' : 'var(--body-muted,#888)'};
                         cursor:pointer;font-size:13px;" title="Favoris">
            <i class="bi ${userFavorited ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
          </button>
        </div>

        <!-- Description -->
        ${desc ? `
        <div style="margin-bottom:24px;">
          <div id="sd-desc-wrap" onclick="_sdToggleDesc()"
               style="position:relative;overflow:hidden;max-height:calc(1.75em * 5);cursor:pointer;">
            <p id="sd-desc-text"
               style="font-size:15px;color:var(--body-color,#d0d0d0);line-height:1.75;
                      white-space:pre-wrap;margin:0;">${esc(desc)}</p>
            <div id="sd-desc-fade"
                 style="position:absolute;bottom:0;left:0;right:0;height:40px;
                        background:linear-gradient(transparent, var(--bg-1,#000));
                        pointer-events:none;"></div>
          </div>
        </div>` : ''}

        <!-- Partager -->
        <div style="margin-bottom:28px;">
          <p style="font-size:12px;font-weight:600;color:var(--body-muted,#555);
                    margin-bottom:10px;text-transform:uppercase;letter-spacing:.6px;">Partager</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href),'_blank')"
                    style="display:inline-flex;align-items:center;gap:6px;background:#1877F2;
                           border:none;border-radius:8px;padding:8px 14px;color:#fff;cursor:pointer;font-size:13px;">
              <i class="bi bi-facebook"></i> Facebook
            </button>
            <button onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.title+' '+location.href),'_blank')"
                    style="display:inline-flex;align-items:center;gap:6px;background:#25D366;
                           border:none;border-radius:8px;padding:8px 14px;color:#fff;cursor:pointer;font-size:13px;">
              <i class="bi bi-whatsapp"></i> WhatsApp
            </button>
            <button onclick="navigator.share ? navigator.share({title:document.title,url:location.href}) : navigator.clipboard?.writeText(location.href)"
                    style="display:inline-flex;align-items:center;gap:6px;
                           background:var(--bg-3,#333);border:none;border-radius:8px;padding:8px 14px;
                           color:var(--text-1,#fff);cursor:pointer;font-size:13px;">
              <i class="bi bi-share-fill"></i> Plus
            </button>
          </div>
        </div>

        <!-- Voir aussi -->
        ${related.length > 0 ? `
        <div style="margin-bottom:28px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <i class="bi ${cfg.icon}" style="color:${cfg.color};font-size:16px;"></i>
            <h3 style="font-size:15px;font-weight:700;margin:0;
                       color:var(--heading-color,#fff);">Voir aussi (${related.length})</h3>
          </div>
          ${related.map(rItem => {
            const rImg = rItem.image_url || rItem.thumbnail || rItem.image || '';
            const rId  = rItem.id || rItem._id;
            const rDur = rItem.duration ? `${Math.floor(rItem.duration/60)}min` : '';
            return `
            <div style="display:flex;margin-bottom:12px;
                        background:var(--bg-3,#1a1a1a);border-radius:10px;overflow:hidden;
                        border:1px solid var(--divider,#2a2a2a);cursor:pointer;"
                 onclick="window.location.hash='#/show/${type}/${rId}'">
              <div style="position:relative;flex-shrink:0;">
                ${rImg
                  ? `<img src="${esc(rImg)}" alt="" style="width:110px;height:80px;object-fit:cover;">`
                  : `<div style="width:110px;height:80px;background:var(--border,#2a2a2a);
                                 display:flex;align-items:center;justify-content:center;">
                       <i class="bi bi-image" style="color:var(--body-muted,#666);"></i>
                     </div>`}
                ${rDur ? `<span style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.75);
                                        color:#fff;font-size:9px;border-radius:3px;padding:1px 4px;">${esc(rDur)}</span>` : ''}
              </div>
              <div style="padding:10px;flex:1;overflow:hidden;">
                <p style="font-size:13px;font-weight:600;margin:0 0 6px;
                           color:var(--heading-color,#fff);
                           overflow:hidden;display:-webkit-box;
                           -webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(rItem.title || '')}</p>
                <span style="font-size:11px;color:var(--body-muted,#666);">
                  <i class="bi bi-clock"></i> ${formatRelative(rItem.created_at || rItem.date)}
                </span>
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}

      </div>`;

    // ── Toggle description ────────────────────────────────────────────────────
    window._sdToggleDesc = function() {
      const wrap = document.getElementById('sd-desc-wrap');
      const fade = document.getElementById('sd-desc-fade');
      if (!wrap) return;
      const open = wrap.style.maxHeight === 'none';
      wrap.style.maxHeight = open ? 'calc(1.75em * 5)' : 'none';
      if (fade) fade.style.display = open ? 'block' : 'none';
    };

    requestAnimationFrame(() => {
      const wrap = document.getElementById('sd-desc-wrap');
      if (wrap && wrap.scrollHeight <= wrap.offsetHeight + 4) {
        wrap.style.maxHeight = 'none';
        const fade = document.getElementById('sd-desc-fade');
        if (fade) fade.style.display = 'none';
      }
    });

    // ── Toggle favori ─────────────────────────────────────────────────────────
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
        btn.style.background   = currentlyFavorited ? '#F59E0B' : 'var(--bg-3,#1a1a1a)';
        btn.style.borderColor  = currentlyFavorited ? '#F59E0B' : 'var(--divider,#2a2a2a)';
        btn.style.color        = currentlyFavorited ? '#fff'    : 'var(--body-muted,#888)';
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'bi ' + (currentlyFavorited ? 'bi-bookmark-fill' : 'bi-bookmark');
      } catch(e) { console.error('Erreur favori:', e); }
      btn.disabled = false;
    };

    // ── Toggle like ───────────────────────────────────────────────────────────
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
        btn.style.background  = currentlyLiked ? '#E23E3E' : 'var(--bg-3,#1a1a1a)';
        btn.style.borderColor = currentlyLiked ? '#E23E3E' : 'var(--divider,#2a2a2a)';
        btn.style.color       = currentlyLiked ? '#fff'    : 'var(--body-muted,#888)';
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'bi ' + (currentlyLiked ? 'bi-heart-fill' : 'bi-heart');
        if (countEl) countEl.textContent = Math.max(0, currentLikesCount);
      } catch(e) { console.error('Erreur like:', e); }
      btn.disabled = false;
    };

    // ─── Modal Commentaires ───────────────────────────────────────────────────
    const _sdCmOrig = {};

    function renderSdCmList(cmts) {
      const listEl = document.getElementById('sd-cm-list');
      if (!listEl) return;
      if (!cmts.length) {
        listEl.innerHTML = `
          <p style="color:var(--body-muted,#666);font-size:14px;text-align:center;padding:30px 0;">
            <i class="bi bi-chat-dots" style="font-size:28px;display:block;
               color:var(--border,#333);margin-bottom:10px;"></i>
            Aucun commentaire. Soyez le premier !
          </p>`;
        return;
      }
      listEl.innerHTML = cmts.map(c => {
        const isOwn = user && String(c.user_id) === String(user.id);
        const uname = c.username || c.user?.username || 'Utilisateur';
        const cid = esc(String(c.id || c._id));
        return `
        <div class="sd-cm-comment" data-id="${cid}"
             style="display:flex;gap:10px;padding:12px 0;
                    border-bottom:1px solid var(--divider,#1a1a1a);">
          <div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;
                      background:#E23E3E;display:flex;align-items:center;justify-content:center;
                      font-weight:700;font-size:13px;color:#fff;">
            ${esc((uname[0]||'U').toUpperCase())}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;
                        gap:6px;margin-bottom:4px;">
              <span style="font-size:13px;font-weight:600;
                           color:var(--heading-color,#fff);">${esc(uname)}</span>
              <div class="sd-cm-actions" style="display:flex;gap:6px;flex-shrink:0;align-items:center;">
                <span style="font-size:11px;color:var(--body-muted,#555);">${formatRelative(c.created_at)}</span>
                ${isOwn ? `
                <button onclick="editSdCmComment('${cid}')"
                        style="background:none;border:none;color:var(--body-muted,#888);
                               cursor:pointer;padding:2px;font-size:14px;line-height:1;" title="Modifier">
                  <i class="bi bi-pencil"></i>
                </button>
                <button onclick="deleteSdCmComment('${cid}')"
                        style="background:none;border:none;color:#E23E3E;
                               cursor:pointer;padding:2px;font-size:14px;line-height:1;" title="Supprimer">
                  <i class="bi bi-trash"></i>
                </button>` : ''}
              </div>
            </div>
            <p class="sd-cm-text"
               style="font-size:14px;color:var(--body-color,#ccc);margin:0;
                      line-height:1.5;word-break:break-word;">${esc(c.text)}</p>
          </div>
        </div>`;
      }).join('');
    }

    window.openSdComments = async function() {
      const existing = document.getElementById('sd-comments-modal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'sd-comments-modal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;flex-direction:column;justify-content:flex-end;';
      modal.innerHTML = `
        <style>
          #sd-comments-modal .sd-cm-sheet { animation: sdSlideUp 0.3s ease; }
          @keyframes sdSlideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
        </style>
        <div class="sd-cm-sheet"
             style="background:var(--bg-1,#000);border-radius:20px 20px 0 0;
                    height:80vh;display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:center;
                      padding:16px;border-bottom:1px solid var(--divider,#1e1e1e);">
            <span style="color:var(--heading-color,#fff);font-size:17px;font-weight:700;">
              Commentaires (<span id="sd-cm-count">...</span>)
            </span>
            <button onclick="closeSdComments()"
                    style="background:none;border:none;color:var(--text-1,#fff);
                           font-size:26px;cursor:pointer;line-height:1;padding:0 4px;">✕</button>
          </div>
          <div id="sd-cm-list" style="flex:1;overflow-y:auto;padding:0 16px;">
            <div style="text-align:center;padding:30px;">
              <i class="bi bi-hourglass-split" style="color:#E23E3E;font-size:28px;"></i>
            </div>
          </div>
          ${user ? `
          <div style="padding:10px 16px;border-top:1px solid var(--divider,#1e1e1e);
                      background:var(--bg-1,#000);display:flex;align-items:flex-end;gap:10px;">
            <textarea id="sd-cm-input" maxlength="1000" placeholder="Ajouter un commentaire..."
                      style="flex:1;background:var(--bg-3,#1a1a1a);border-radius:20px;
                             border:1px solid var(--divider,#2a2a2a);padding:10px 16px;
                             color:var(--text-1,#fff);font-size:14px;resize:none;
                             height:42px;max-height:100px;outline:none;line-height:1.4;"></textarea>
            <button onclick="submitSdCmComment()"
                    style="flex-shrink:0;background:var(--bg-3,#1a1a1a);
                           border:1px solid var(--divider,#2a2a2a);border-radius:50%;
                           width:42px;height:42px;color:#E23E3E;cursor:pointer;
                           font-size:18px;display:flex;align-items:center;justify-content:center;">
              <i class="bi bi-send-fill"></i>
            </button>
          </div>` : `
          <div style="padding:14px 16px;border-top:1px solid var(--divider,#1e1e1e);text-align:center;">
            <button onclick="closeSdComments();setTimeout(()=>window._showLoginModal?.('Connectez-vous pour laisser un commentaire'),350);"
                    style="background:#E23E3E;border:none;border-radius:8px;padding:9px 24px;
                           color:#fff;cursor:pointer;font-size:14px;font-weight:600;">
              Se connecter pour commenter
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

    // ── Plein écran vidéo native ──────────────────────────────────────────────
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