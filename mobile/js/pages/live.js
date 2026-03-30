import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

function formatCount(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

function buildHorizontalCard(item, type) {
  const image = item.thumbnail || item.image_url || item.image || '';
  const title = item.title || item.name || 'Sans titre';
  const duration = item.duration;

  return `
    <div style="flex-shrink:0;width:138px;cursor:pointer;margin-right:12px;"
         onclick="window.location.hash='#/${type}'">
      <div style="position:relative;border-radius:12px;overflow:hidden;height:188px;
                  background:#181818;box-shadow:0 4px 14px rgba(0,0,0,0.55);">
        ${image
          ? `<img src="${image}" alt="${title}"
                  style="width:100%;height:100%;object-fit:cover;display:block;"
                  onerror="this.parentElement.style.background='#111'" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
               <i class="bi bi-play-circle" style="font-size:2rem;color:#333;"></i>
             </div>`
        }
        <div style="position:absolute;inset:0;
                    background:linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.25) 50%,transparent 72%);"
             class="bf1-card-overlay"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 9px 10px;">
          <p class="bf1-card-title" style="margin:0;color:#fff;font-size:11.5px;font-weight:600;line-height:1.35;
                    overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                    -webkit-box-orient:vertical;text-shadow:0 1px 3px rgba(0,0,0,0.7);">
            ${title}
          </p>
          ${duration ? `<div style="display:flex;align-items:center;gap:3px;margin-top:4px;">
            <i class="bi bi-clock bf1-card-time" style="font-size:9px;color:rgba(255,255,255,0.45);"></i>
            <span class="bf1-card-time" style="font-size:10px;color:rgba(255,255,255,0.45);">${duration} min</span>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

function buildSection(title, items, route) {
  const cards = items.map(item => buildHorizontalCard(item, route)).join('');
  return `
    <div style="margin-bottom:24px;margin-left:16px;margin-right:16px;
                background:rgba(255,255,255,0.02);border-radius:14px;padding:16px;
                border:1px solid rgba(255,255,255,0.05);">
      <div style="display:flex;justify-content:space-between;align-items:center;
                  margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:3px;height:18px;background:#E23E3E;border-radius:2px;flex-shrink:0;"></div>
          <h6 class="bf1-section-title" style="margin:0;font-weight:700;color:#fff;font-size:15px;">${title}</h6>
        </div>
        <a href="#/${route}" style="color:#E23E3E;text-decoration:none;display:flex;
                                    align-items:center;gap:4px;font-size:12px;font-weight:600;">
          Tout voir <i class="bi bi-arrow-right-circle-fill" style="font-size:15px;"></i>
        </a>
      </div>
      ${items.length === 0
        ? `<p style="color:#444;font-size:13px;margin:0;">Aucun contenu disponible</p>`
        : `<div style="display:flex;overflow-x:auto;overflow-y:hidden;gap:0;scrollbar-width:none;-ms-overflow-style:none;
                       -webkit-overflow-scrolling:touch;margin:-16px -16px 0 -16px;padding:0 16px 8px;">${cards}</div>`
      }
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
    const [liveData, streamUrl, sports, jtandmag, divertissement, reportages] = await Promise.all([
      api.getLive().catch(() => null),
      api.getLiveStreamUrl(),
      api.getSports().catch(() => []),
      api.getJTandMag().catch(() => []),
      api.getDivertissement().catch(() => []),
      api.getReportages().catch(() => []),
    ]);
    const viewers = liveData?.viewers || 0;
    const isLive = liveData?.is_live !== false;

    // --- Lecteur vidéo ---
    if (videoContainer) {
      if (isLive && streamUrl) {
        videoContainer.innerHTML = `
          <div id="live-player-wrapper" style="position:relative;width:100%;background:#000;border-radius:12px;overflow:hidden;">
            <div class="live-ratio" style="position:relative;width:100%;aspect-ratio:16/9;">
              <video id="live-video" autoplay playsinline
                     style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;"
                     onerror="document.getElementById('live-error')?.style.setProperty('display','flex')">
              </video>
            </div>
            <div id="live-error"
                 style="display:none;flex-direction:column;align-items:center;justify-content:center;
                        position:absolute;inset:0;background:#000;gap:8px;">
              <i class="bi bi-wifi-off" style="font-size:32px;color:#555;"></i>
              <p style="color:#555;font-size:13px;margin:0;">Impossible de charger le flux</p>
            </div>
            <!-- Bouton son (muet au démarrage pour respecter l'autoplay Android) -->
            <button id="live-mute-btn" onclick="window.toggleLiveMute()"
                    style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.65);
                           border:1px solid rgba(255,255,255,0.12);border-radius:8px;
                           padding:7px 9px;color:#fff;z-index:20;cursor:pointer;
                           display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;">
              <i class="bi bi-volume-mute-fill" id="live-mute-icon"></i>
              <span id="live-mute-label">Son coupé</span>
            </button>
            <!-- Bouton plein écran -->
            <button id="live-fs-btn" onclick="window.toggleLiveFullscreen()"
                    style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);
                           border:none;border-radius:8px;padding:7px 9px;color:#fff;z-index:20;cursor:pointer;">
              <i class="bi bi-fullscreen" id="live-fs-icon"></i>
            </button>
          </div>`;

        // Afficher le compteur de spectateurs
        const viewersHeader = document.getElementById('live-viewers-header');
        const viewersCount = document.getElementById('live-viewers-count');
        if (viewersHeader && viewersCount && viewers > 0) {
          viewersCount.textContent = formatCount(viewers);
          viewersHeader.style.display = 'inline-flex';
        }

        // Plein écran paysage
        function enterCssFallback() {
          const container = document.getElementById('live-video-container');
          const icon = document.getElementById('live-fs-icon');
          const appHeader = document.querySelector('.app-header');
          const bottomNav = document.querySelector('.bottom-nav');
          container.classList.add('live-fullscreen');
          if (icon) icon.className = 'bi bi-fullscreen-exit';
          if (appHeader) appHeader.style.display = 'none';
          if (bottomNav) bottomNav.style.display = 'none';
        }
        function exitCssFallback() {
          const container = document.getElementById('live-video-container');
          const icon = document.getElementById('live-fs-icon');
          const appHeader = document.querySelector('.app-header');
          const bottomNav = document.querySelector('.bottom-nav');
          container.classList.remove('live-fullscreen');
          if (icon) icon.className = 'bi bi-fullscreen';
          if (appHeader) appHeader.style.display = '';
          if (bottomNav) bottomNav.style.display = '';
        }

        document.addEventListener('fullscreenchange', () => {
          if (!document.fullscreenElement) { screen.orientation?.unlock?.(); exitCssFallback(); }
        });
        document.addEventListener('webkitfullscreenchange', () => {
          if (!document.webkitFullscreenElement) exitCssFallback();
        });

        window.toggleLiveMute = function () {
          const video = document.getElementById('live-video');
          const icon  = document.getElementById('live-mute-icon');
          const label = document.getElementById('live-mute-label');
          const btn   = document.getElementById('live-mute-btn');
          if (!video) return;
          video.muted = !video.muted;
          if (video.muted) {
            if (icon)  icon.className = 'bi bi-volume-mute-fill';
            if (label) label.textContent = 'Son coupé';
            if (btn)   btn.style.borderColor = 'rgba(255,255,255,0.12)';
          } else {
            if (icon)  icon.className = 'bi bi-volume-up-fill';
            if (label) label.textContent = 'Son activé';
            if (btn)   btn.style.borderColor = '#E23E3E';
            // S'assurer que le volume est audible
            video.volume = video.volume === 0 ? 1 : video.volume;
          }
        };

        window.toggleLiveFullscreen = function () {
          const container = document.getElementById('live-video-container');
          const video = document.getElementById('live-video');
          const isFs = !!document.fullscreenElement || !!document.webkitFullscreenElement
                       || container.classList.contains('live-fullscreen');
          if (!isFs) {
            const fsPromise = container.requestFullscreen
              ? container.requestFullscreen()
              : container.webkitRequestFullscreen
                ? (container.webkitRequestFullscreen(), Promise.resolve())
                : video?.webkitEnterFullscreen
                  ? (video.webkitEnterFullscreen(), Promise.resolve())
                  : Promise.reject();
            fsPromise
              .then(() => { screen.orientation?.lock?.('landscape').catch(() => {}); enterCssFallback(); })
              .catch(() => enterCssFallback());
          } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            screen.orientation?.unlock?.();
            exitCssFallback();
          }
        };

        requestAnimationFrame(() => {
          const video = document.getElementById('live-video');
          if (!video) return;
          // Démarrer en muet pour respecter la politique d'autoplay Android
          // L'utilisateur peut activer le son avec le bouton dédié
          video.muted = true;
          video.volume = 1;
          
          // Toujours utiliser HLS.js : le proxy retourne du contenu M3U8
          // même si l'URL ne se termine pas par .m3u8
          _initHls(video, streamUrl);
        });

        function _initHls(video, url) {
          if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls({ autoStartLoad: true, lowLatencyMode: false });
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
            hls.on(Hls.Events.ERROR, (_e, data) => {
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
            buildSection('Sports',         sortByDate(Array.isArray(sports) ? sports : []).slice(0, 10),         'sports'),
            buildSection('JT & Mag',       sortByDate(Array.isArray(jtandmag) ? jtandmag : []).slice(0, 10),     'jtandmag'),
            buildSection('Divertissement', sortByDate(Array.isArray(divertissement) ? divertissement : []).slice(0, 10), 'divertissement'),
            buildSection('Reportages',     sortByDate(Array.isArray(reportages) ? reportages : []).slice(0, 10), 'reportages'),
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
