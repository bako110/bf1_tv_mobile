import * as api from '../services/api.js';

// Instance HLS globale — détruite quand on quitte la page live
let _hlsInstance = null;

export function destroyLive() {
  if (_hlsInstance) {
    try { _hlsInstance.destroy(); } catch (e) {}
    _hlsInstance = null;
  }
  const video = document.getElementById('live-video');
  if (video) {
    video.pause();
    video.src = '';
    video.load();
  }
  // Quitter le plein écran CSS si actif
  const wrapper = document.getElementById('live-player-wrapper');
  if (wrapper?.classList.contains('live-fs')) {
    wrapper.classList.remove('live-fs');
    const appHeader = document.querySelector('.app-header');
    const bottomNav = document.querySelector('.bottom-nav');
    if (appHeader) appHeader.style.display = '';
    if (bottomNav) bottomNav.style.display = '';
    document.body.style.overflow = '';
  }
  if (window.__emcatTimer) { clearInterval(window.__emcatTimer); window.__emcatTimer = null; }
}

function formatCount(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

const SECTION_ICONS = {
  sports:        'bi-trophy-fill',
  jtandmag:      'bi-collection-play-fill',
  divertissement:'bi-emoji-smile-fill',
  reportages:    'bi-camera-reels-fill',
  'tele-realite':'bi-camera-video-fill',
};

function buildHorizontalCard(item, type) {
  const image    = item.thumbnail || item.image_url || item.image || '';
  const title    = item.title || item.name || 'Sans titre';
  const duration = item.duration;
  const views    = item.views;
  const likes    = item.likes;
  const id       = item.id || item._id;

  // Route de détail selon le type
  const detailRoutes = {
    sports:         `#/show/sport/${id}`,
    jtandmag:       `#/show/jtandmag/${id}`,
    divertissement: `#/show/divertissement/${id}`,
    reportages:     `#/show/reportage/${id}`,
    'tele-realite': `#/show/tele_realite/${id}`,
  };
  const href = detailRoutes[type] || `#/show/${type}/${id}`;

  return `
    <div style="flex-shrink:0;width:130px;cursor:pointer;"
         onclick="window.location.hash='${href}'">
      <div style="position:relative;border-radius:10px;overflow:hidden;height:175px;
                  background:#181818;box-shadow:0 3px 12px rgba(0,0,0,0.5);">
        ${image
          ? `<img src="${image}" alt=""
                  style="width:100%;height:100%;object-fit:cover;display:block;"
                  onerror="this.parentElement.style.background='#111'" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
               <i class="bi bi-play-circle" style="font-size:2rem;color:#333;"></i>
             </div>`
        }
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.2) 55%,transparent 75%);"
             class="bf1-card-overlay"></div>
        <!-- Bouton play centré -->
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);
                    width:30px;height:30px;background:rgba(226,62,62,0.85);border-radius:50%;
                    display:flex;align-items:center;justify-content:center;
                    box-shadow:0 2px 10px rgba(226,62,62,0.5);">
          <i class="bi bi-play-fill" style="color:#fff;font-size:13px;margin-left:2px;"></i>
        </div>
        ${duration ? `<div style="position:absolute;top:7px;right:7px;background:rgba(0,0,0,0.75);
                                  border-radius:4px;padding:2px 5px;">
          <span style="font-size:9px;color:#ccc;">${duration}min</span>
        </div>` : ''}
        <div style="position:absolute;bottom:0;left:0;right:0;padding:6px 8px 8px;">
          <p class="bf1-card-title" style="margin:0 0 4px;color:#fff;font-size:11px;font-weight:600;line-height:1.3;
                    overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                    -webkit-box-orient:vertical;text-shadow:0 1px 3px rgba(0,0,0,0.8);">${title}</p>
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            ${views != null ? `<span style="display:flex;align-items:center;gap:2px;">
              <i class="bi bi-eye" style="font-size:8px;color:rgba(255,255,255,0.45);"></i>
              <span style="font-size:9px;color:rgba(255,255,255,0.45);">${views >= 1000 ? (views/1000).toFixed(1)+'k' : views}</span>
            </span>` : ''}
            ${likes != null && likes > 0 ? `<span style="display:flex;align-items:center;gap:2px;">
              <i class="bi bi-heart-fill" style="font-size:8px;color:#E23E3E;"></i>
              <span style="font-size:9px;color:rgba(255,255,255,0.45);">${likes >= 1000 ? (likes/1000).toFixed(1)+'k' : likes}</span>
            </span>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

function buildSection(title, items, route) {
  if (!items.length) return '';
  const icon = SECTION_ICONS[route] || 'bi-play-circle-fill';
  const cards = items.map(item => buildHorizontalCard(item, route)).join('');
  return `
    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 16px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <i class="bi ${icon}" style="font-size:14px;color:#E23E3E;"></i>
          <h6 class="bf1-section-title" style="margin:0;font-weight:700;font-size:14px;">${title}</h6>
        </div>
        <a href="#/${route}" style="color:#E23E3E;text-decoration:none;
                                    display:flex;align-items:center;gap:3px;font-size:11px;font-weight:600;">
          Tout voir <i class="bi bi-chevron-right" style="font-size:11px;"></i>
        </a>
      </div>
      <div style="display:flex;overflow-x:auto;overflow-y:hidden;gap:10px;scrollbar-width:none;
                  -webkit-overflow-scrolling:touch;padding:0 16px 4px;">${cards}</div>
    </div>`;
}

export async function loadLive() {
  const videoContainer = document.getElementById('live-video-container');
  const sectionsContainer = document.getElementById('live-sections');
  if (!videoContainer && !sectionsContainer) return;

  // ── Ajuster la hauteur du layout pour que la vidéo soit fixe ──────────────
  // #live-page prend tout l'espace disponible sous l'app-header
  // #live-sections scrolle indépendamment dans l'espace restant
  function _setLiveLayout() {
    const livePage = document.getElementById('live-page');
    const appContent = document.getElementById('app-content');
    const appHeader = document.querySelector('.app-header');
    if (!livePage || !appContent) return;

    const headerH = appHeader ? appHeader.offsetHeight : 0;
    const available = window.innerHeight - headerH;
    livePage.style.height = available + 'px';

    // Empêcher le scroll global sur app-content
    appContent.style.overflow = 'hidden';
    appContent.style.paddingBottom = '0';
  }
  _setLiveLayout();
  window.addEventListener('resize', _setLiveLayout, { once: true });

  try {
    // Charger live + toutes les sections en parallèle
    const [liveData, streamUrl, sports, jtandmag, divertissement, reportages, teleRealite] = await Promise.all([
      api.getLive().catch(() => null),
      api.getLiveStreamUrl(),
      api.getSports(0, 20).catch(() => ({ items: [] })),
      api.getJTandMag(0, 20).catch(() => ({ items: [] })),
      api.getDivertissement(0, 20).catch(() => ({ items: [] })),
      api.getReportages(0, 20).catch(() => ({ items: [] })),
      api.getTeleRealite(0, 20).catch(() => ({ items: [] })),
    ]);
    const viewers = liveData?.viewers || 0;
    const isLive = liveData?.is_live !== false;

    // --- Lecteur vidéo ---
    if (videoContainer) {
      if (isLive && streamUrl) {
        videoContainer.innerHTML = `
          <div id="live-player-wrapper" style="position:relative;width:100%;background:#000;overflow:hidden;">
            <div class="live-ratio" style="position:relative;width:100%;aspect-ratio:16/9;">
              <video id="live-video" autoplay playsinline
                     style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;">
              </video>
            </div>

            <!-- Erreur flux -->
            <div id="live-error"
                 style="display:none;flex-direction:column;align-items:center;justify-content:center;
                        position:absolute;inset:0;background:#000;gap:8px;z-index:5;">
              <i class="bi bi-wifi-off" style="font-size:32px;color:#555;"></i>
              <p style="color:#555;font-size:13px;margin:0;">Impossible de charger le flux</p>
            </div>

            <!-- Overlay tap (toujours là, intercepte les taps pour afficher/cacher les contrôles) -->
            <div id="live-tap-overlay" style="position:absolute;inset:0;z-index:8;"></div>

            <!-- Badge EN DIRECT + spectateurs — toujours visibles, au-dessus de l'overlay -->
            <div style="position:absolute;top:10px;left:0;right:0;
                        display:flex;align-items:center;justify-content:space-between;
                        padding:0 12px;z-index:15;pointer-events:none;">
              <div style="display:flex;align-items:center;gap:5px;
                          background:rgba(0,0,0,0.5);border-radius:20px;padding:3px 9px;">
                <span style="width:7px;height:7px;background:#E23E3E;border-radius:50%;
                             animation:livePulse 1.4s ease-in-out infinite;display:inline-block;"></span>
                <span style="color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;">EN DIRECT</span>
              </div>
              ${viewers > 0 ? `<div style="background:rgba(0,0,0,0.5);border-radius:20px;
                          padding:3px 9px;display:flex;align-items:center;gap:4px;">
                <i class="bi bi-eye-fill" style="font-size:9px;color:#E23E3E;"></i>
                <span style="color:#fff;font-size:10px;">${formatCount(viewers)}</span>
              </div>` : ''}
            </div>

            <!-- Contrôles centrés — cachés par défaut, apparaissent au tap -->
            <div class="live-controls" id="live-controls-bar"
                 style="opacity:0;pointer-events:none;transition:opacity .25s;">
              <button class="live-ctrl-btn" id="live-mute-btn" onclick="window.toggleLiveMute()">
                <div class="live-ctrl-icon">
                  <i class="bi bi-volume-mute-fill" id="live-mute-icon"></i>
                </div>
                <span class="live-ctrl-label" id="live-mute-label">Son coupé</span>
              </button>
              <button class="live-ctrl-btn live-ctrl-primary" id="live-stop-btn" onclick="window.toggleLiveStop()">
                <div class="live-ctrl-icon">
                  <i class="bi bi-stop-fill" id="live-stop-icon"></i>
                </div>
                <span class="live-ctrl-label" id="live-stop-label">Stop</span>
              </button>
              <button class="live-ctrl-btn" id="live-fs-btn" onclick="window.toggleLiveFullscreen()">
                <div class="live-ctrl-icon">
                  <i class="bi bi-fullscreen" id="live-fs-icon"></i>
                </div>
                <span class="live-ctrl-label">Plein écran</span>
              </button>
            </div>
          </div>`;

        // Afficher le compteur de spectateurs dans le header si présent
        const viewersHeader = document.getElementById('live-viewers-header');
        const viewersCount  = document.getElementById('live-viewers-count');
        if (viewersHeader && viewersCount && viewers > 0) {
          viewersCount.textContent = formatCount(viewers);
          viewersHeader.style.display = 'inline-flex';
        }

        // ── Afficher/cacher les contrôles au tap ──────────────────────────────
        let _hideTimer = null;
        function _showControls() {
          const bar = document.getElementById('live-controls-bar');
          if (!bar) return;
          bar.style.opacity = '1';
          bar.style.pointerEvents = 'auto';
          clearTimeout(_hideTimer);
          _hideTimer = setTimeout(_hideControls, 3000);
        }
        function _hideControls() {
          const bar = document.getElementById('live-controls-bar');
          if (!bar) return;
          bar.style.opacity = '0';
          bar.style.pointerEvents = 'none';
        }
        // Tap sur l'overlay → afficher/cacher
        requestAnimationFrame(() => {
          const tapOverlay = document.getElementById('live-tap-overlay');
          if (tapOverlay) {
            tapOverlay.addEventListener('click', () => {
              const bar = document.getElementById('live-controls-bar');
              if (bar?.style.opacity === '1') _hideControls();
              else _showControls();
            });
          }
          // Tap sur les boutons → reset timer sans cacher
          const bar = document.getElementById('live-controls-bar');
          if (bar) {
            bar.addEventListener('click', (e) => {
              e.stopPropagation();
              clearTimeout(_hideTimer);
              _hideTimer = setTimeout(_hideControls, 3000);
            });
          }
        });

        // ── Plein écran paysage — rotation native Android ─────────────────────
        function enterFullscreen() {
          const wrapper   = document.getElementById('live-player-wrapper');
          const icon      = document.getElementById('live-fs-icon');
          const appHeader = document.querySelector('.app-header');
          const bottomNav = document.querySelector('.bottom-nav');
          if (!wrapper) return;

          // 1. Rotation via bridge Android natif (méthode fiable sur Capacitor)
          if (window.AndroidBridge?.setLandscape) {
            window.AndroidBridge.setLandscape();
          } else {
            // 2. Fallback : Screen Orientation API Web
            screen.orientation?.lock?.('landscape').catch(() => {});
          }

          // Masquer header/nav + passer le wrapper en plein écran CSS
          wrapper.classList.add('live-fs');
          if (icon)      icon.className = 'bi bi-fullscreen-exit';
          if (appHeader) appHeader.style.display = 'none';
          if (bottomNav) bottomNav.style.display = 'none';
          document.body.style.overflow = 'hidden';
        }

        function exitFullscreen() {
          const wrapper   = document.getElementById('live-player-wrapper');
          const icon      = document.getElementById('live-fs-icon');
          const appHeader = document.querySelector('.app-header');
          const bottomNav = document.querySelector('.bottom-nav');

          // Revenir en portrait via bridge Android
          if (window.AndroidBridge?.setPortrait) {
            window.AndroidBridge.setPortrait();
          } else {
            screen.orientation?.unlock?.();
          }

          wrapper?.classList.remove('live-fs');
          if (icon)      icon.className = 'bi bi-fullscreen';
          if (appHeader) appHeader.style.display = '';
          if (bottomNav) bottomNav.style.display = '';
          document.body.style.overflow = '';
        }

        // Bouton retour Android → quitter le plein écran si actif
        document.addEventListener('bf1BackButton', () => {
          const wrapper = document.getElementById('live-player-wrapper');
          if (wrapper?.classList.contains('live-fs')) exitFullscreen();
        });

        window.toggleLiveFullscreen = function () {
          const wrapper = document.getElementById('live-player-wrapper');
          if (!wrapper) return;
          wrapper.classList.contains('live-fs') ? exitFullscreen() : enterFullscreen();
        };

        // ── Stop / Reprendre ─────────────────────────────────────────────────
        let _stopped = false;
        window.toggleLiveStop = function () {
          const video = document.getElementById('live-video');
          const icon  = document.getElementById('live-stop-icon');
          const label = document.getElementById('live-stop-label');
          if (!video) return;
          if (!_stopped) {
            if (_hlsInstance) { try { _hlsInstance.stopLoad(); } catch(e) {} }
            video.pause();
            _stopped = true;
            if (icon)  icon.className = 'bi bi-play-fill';
            if (label) label.textContent = 'Reprendre';
          } else {
            _stopped = false;
            if (icon)  icon.className = 'bi bi-stop-fill';
            if (label) label.textContent = 'Stop';
            if (_hlsInstance) {
              _hlsInstance.startLoad(-1);
              video.play().catch(() => {});
            } else {
              _initHls(video, streamUrl);
            }
          }
        };

        // ── Son ──────────────────────────────────────────────────────────────
        window.toggleLiveMute = function () {
          const video = document.getElementById('live-video');
          const icon  = document.getElementById('live-mute-icon');
          const label = document.getElementById('live-mute-label');
          if (!video) return;
          video.muted = !video.muted;
          if (video.muted) {
            if (icon)  icon.className = 'bi bi-volume-mute-fill';
            if (label) label.textContent = 'Son coupé';
          } else {
            if (icon)  icon.className = 'bi bi-volume-up-fill';
            if (label) label.textContent = 'Son activé';
            video.volume = video.volume === 0 ? 1 : video.volume;
          }
        };

        requestAnimationFrame(() => {
          const video = document.getElementById('live-video');
          if (!video) return;
          video.muted = true;
          video.volume = 1;
          _initHls(video, streamUrl);
        });

        function _initHls(video, url) {
          if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            if (_hlsInstance) { try { _hlsInstance.destroy(); } catch (e) {} }
            _hlsInstance = new Hls({ autoStartLoad: true, lowLatencyMode: false });
            _hlsInstance.loadSource(url);
            _hlsInstance.attachMedia(video);
            _hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
            _hlsInstance.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) document.getElementById('live-error')?.style.setProperty('display', 'flex');
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.play().catch(() => {});
          } else {
            document.getElementById('live-error')?.style.setProperty('display', 'flex');
          }
        }

      } else {
        videoContainer.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                      aspect-ratio:16/9;background:#0a0a0a;gap:8px;">
            <i class="bi bi-wifi-off" style="font-size:2.5rem;color:#333;"></i>
            <p style="color:#555;margin:0;font-size:13px;">Aucun flux disponible</p>
          </div>`;
      }
    }

    // --- Sections horizontales scrollables ---
    if (sectionsContainer) {
      const sortByDate = (arr) => [...arr].sort((a, b) =>
        new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0)
      );

      sectionsContainer.innerHTML = `
        <div style="display:flex;justify-content:center;padding:10px 0 6px;">
          <div style="width:36px;height:4px;background:#2a2a2a;border-radius:2px;"></div>
        </div>
        <div style="padding:10px 0 20px;">
          ${[
            buildSection('Sports',                    sortByDate(sports.items || []).slice(0, 10),        'sports'),
            buildSection('JT & Mag',                  sortByDate(jtandmag.items || []).slice(0, 10),      'jtandmag'),
            buildSection('Divertissement',             sortByDate(divertissement.items || []).slice(0, 10),'divertissement'),
            buildSection('Reportages',                 sortByDate(reportages.items || []).slice(0, 10),    'reportages'),
            buildSection('Télé Réalité & Événements', sortByDate(teleRealite.items || []).slice(0, 10),   'tele-realite'),
          ].join('')}
        </div>`;
    }

  } catch (error) {
    console.error('Erreur loadLive:', error);
    if (videoContainer) {
      videoContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    aspect-ratio:16/9;background:#0a0a0a;gap:8px;">
          <i class="bi bi-exclamation-circle" style="font-size:2rem;color:#E23E3E;"></i>
          <p style="color:#888;margin:0;font-size:13px;">Erreur lors du chargement</p>
        </div>`;
    }
  }
}
