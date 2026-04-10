import * as api from '../services/api.js';
import { injectCardStyles } from '../utils/cardStyles.js';
import { API_CONFIG } from '../config/routes.js';

function _resolveAvatar(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return API_CONFIG.API_URL + url;
}

export function destroyLive() {
  if (window.__emcatTimer) {
    clearInterval(window.__emcatTimer);
    window.__emcatTimer = null;
  }
  if (_chatRefreshTimer) {
    clearInterval(_chatRefreshTimer);
    _chatRefreshTimer = null;
  }
  // Nettoyer le WebSocket chat
  window._chatWsDestroy?.();
  window._chatWsDestroy = null;
  // Retirer les listeners fullscreen et re-verrouiller portrait
  window._liveFsCleanup?.();
  window._liveFsCleanup = null;
  try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch {}
}

export function cleanupLive() {
  const videoContainer = document.getElementById('live-video-container');
  if (videoContainer) {
    videoContainer.innerHTML = `
      <div style="position:relative;width:100%;background:var(--bg-1);overflow:hidden;">
        <div style="position:relative;width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:var(--surface);">
          <i class="bi bi-broadcast" style="font-size:2.5rem;color:var(--text-4);"></i>
        </div>
      </div>
    `;
    console.log('🛑 Live arrêté');
  }
  
  destroyLive();
  
  const appContent = document.getElementById('app-content');
  if (appContent) {
    appContent.style.overflow = '';
    appContent.style.paddingBottom = '';
  }
}

export async function reloadLivePlayer() {
  const videoContainer = document.getElementById('live-video-container');
  if (!videoContainer) return;

  try {
    const [liveData, streamUrl] = await Promise.all([
      api.getLive().catch(() => null),
      api.getLiveStreamUrl(),
    ]);
    const viewers = liveData?.viewers || 0;
    const isLive = liveData?.is_live !== false;

    if (isLive && streamUrl) {
      videoContainer.innerHTML = `
        <div id="live-player-wrapper" style="position:relative;width:100%;background:#000;overflow:hidden;">
          <div class="live-ratio" style="position:relative;width:100%;aspect-ratio:16/9;">
            <iframe 
              src="${streamUrl}" 
              allow="autoplay; fullscreen; picture-in-picture" 
              allowfullscreen
              style="position:absolute;inset:0;width:100%;height:100%;border:0;">
            </iframe>
          </div>
          
          <div style="position:absolute;top:12px;left:12px;
                      display:flex;align-items:center;gap:6px;
                      background:rgba(226,62,62,0.95);border-radius:4px;padding:6px 12px;z-index:15;">
            <span style="width:8px;height:8px;background:#fff;border-radius:50%;
                         animation:livePulse 1.4s ease-in-out infinite;"></span>
            <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:0.5px;">EN DIRECT</span>
          </div>

          ${viewers > 0 ? `
          <div style="position:absolute;top:12px;right:12px;
                      background:rgba(0,0,0,0.7);border-radius:20px;padding:6px 12px;z-index:15;
                      display:flex;align-items:center;gap:6px;">
            <i class="bi bi-eye-fill" style="color:#fff;font-size:12px;"></i>
            <span style="color:#fff;font-size:12px;font-weight:600;">${formatCount(viewers)}</span>
          </div>` : ''}
        </div>`;
      
    } else {
      videoContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    aspect-ratio:16/9;background:var(--surface);gap:12px;">
          <i class="bi bi-wifi-off" style="font-size:2.5rem;color:var(--text-4);"></i>
          <p style="color:var(--text-3);margin:0;font-size:13px;">Aucun flux disponible</p>
        </div>`;
    }
    
    console.log('🔄 Player live rechargé');
  } catch (error) {
    console.error('Erreur rechargement player live:', error);
  }
}

function formatCount(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

function buildEpisodeCard(item, index = 0) {
  const image = item.thumbnail || item.image_url || item.image || '';
  const title = item.title || item.name || 'Sans titre';
  const duration = item.duration;
  const views = item.views;
  const date = item.published_at || item.created_at;
  const id = item.id || item._id;
  const contentType = item._contentType || 'jtandmag';

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + 
           ' - ' + 
           date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return `
    <div class="live-episode-card" style="--card-index:${index};" data-id="${id}" data-type="${contentType}">
      <div class="live-episode-inner">
        <div class="live-episode-thumbnail">
          ${image
            ? `<img src="${image}" alt="${title}" 
                    onerror="this.src='https://via.placeholder.com/160x90/1a1a1a/E23E3E?text=BF1'" />`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--surface);">
                 <i class="bi bi-play-circle-fill" style="font-size:2rem;color:var(--text-4);"></i>
               </div>`
          }
          ${duration ? `
          <div class="live-episode-duration">
            <span>${duration}min</span>
          </div>` : ''}
          <div class="live-episode-bar"></div>
        </div>
        
        <div class="live-episode-info">
          ${views != null ? `
          <div class="live-episode-views">
            <span>${formatCount(views)} vues</span>
          </div>` : ''}
          
          ${date ? `
          <div class="live-episode-date">
            <span>Publiée le ${formatDate(date)}</span>
          </div>` : ''}
          
          <div class="live-episode-title">
            <h3>${title}</h3>
          </div>
        </div>

        <button class="live-episode-add" onclick="event.preventDefault();event.stopPropagation();alert('Ajouter à la liste');">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>
    </div>`;
}

export async function loadLive() {
  const videoContainer = document.getElementById('live-video-container');
  const sectionsContainer = document.getElementById('live-sections');
  const episodesContainer = document.getElementById('live-episodes-container');
  if (!videoContainer && !sectionsContainer) return;

  injectLiveStyles();
  injectCardStyles();

  function _setLiveLayout() {
    const livePage = document.getElementById('live-page');
    const appContent = document.getElementById('app-content');
    const appHeader = document.querySelector('.app-header');
    if (!livePage || !appContent) return;

    const headerH = appHeader ? appHeader.offsetHeight : 0;
    const available = window.innerHeight - headerH;
    livePage.style.height = available + 'px';

    appContent.style.overflow = 'hidden';
    appContent.style.paddingBottom = '0';
  }
  _setLiveLayout();
  window.addEventListener('resize', _setLiveLayout, { once: true });

  try {
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
    const liveTitle = liveData?.title || 'LIVE - BF1';
    const liveDescription = liveData?.description || 'Du Lundi au Vendredi à 13:05';
    const liveViewersText = liveData?.viewers_text || `${viewers} Personnes suivent ce programme actuellement`;

    if (videoContainer) {
      if (isLive && streamUrl) {
        videoContainer.innerHTML = `
          <div id="live-player-wrapper" style="position:relative;width:100%;background:#000;overflow:hidden;">
            <div class="live-ratio" style="position:relative;width:100%;aspect-ratio:16/9;">
              <iframe 
                src="${streamUrl}" 
                allow="autoplay; fullscreen; picture-in-picture" 
                allowfullscreen
                style="position:absolute;inset:0;width:100%;height:100%;border:0;">
              </iframe>
            </div>

            <div style="position:absolute;top:12px;left:12px;
                        display:flex;align-items:center;gap:6px;
                        background:rgba(226,62,62,0.95);border-radius:4px;padding:6px 12px;z-index:15;">
              <span style="width:8px;height:8px;background:#fff;border-radius:50%;
                           animation:livePulse 1.4s ease-in-out infinite;"></span>
              <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:0.5px;">EN DIRECT</span>
            </div>

            ${viewers > 0 ? `
            <div style="position:absolute;top:12px;right:12px;
                        background:rgba(0,0,0,0.7);border-radius:20px;padding:6px 12px;z-index:15;
                        display:flex;align-items:center;gap:6px;">
              <i class="bi bi-eye-fill" style="color:#fff;font-size:12px;"></i>
              <span style="color:#fff;font-size:12px;font-weight:600;">${formatCount(viewers)}</span>
            </div>` : ''}
          </div>`;

      } else {
        videoContainer.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                      aspect-ratio:16/9;background:var(--surface);gap:12px;">
            <i class="bi bi-wifi-off" style="font-size:2.5rem;color:var(--text-4);"></i>
            <p style="color:var(--text-3);margin:0;font-size:13px;">Aucun flux disponible</p>
          </div>`;
      }
    }

    const epContainer = episodesContainer || sectionsContainer;
    if (epContainer) {
      const allContent = [
        ...sports.items.map(item => ({ ...item, _contentType: 'sport' })),
        ...jtandmag.items.map(item => ({ ...item, _contentType: 'jtandmag' })),
        ...divertissement.items.map(item => ({ ...item, _contentType: 'divertissement' })),
        ...reportages.items.map(item => ({ ...item, _contentType: 'reportage' })),
        ...teleRealite.items.map(item => ({ ...item, _contentType: 'tele_realite' })),
      ].sort((a, b) =>
        new Date(b.published_at || b.created_at || 0) -
        new Date(a.published_at || a.created_at || 0)
      );

      epContainer.innerHTML = `
        <div style="display:flex;justify-content:center;padding:12px 0;">
          <div style="width:40px;height:4px;background:var(--border,#2a2a2a);border-radius:2px;"></div>
        </div>

        <div class="live-tabs">
          <button class="live-tab active" data-tab="recent">À ne pas manquer</button>
          <button class="live-tab" data-tab="episodes">Émissions entières</button>
          <button class="live-tab" data-tab="highlights">Moments forts</button>
        </div>

        <div class="live-tab-content active" data-content="recent">
          <div class="live-episodes-list">
            ${allContent.slice(0, 15).map((item, i) => buildEpisodeCard(item, i)).join('')}
          </div>
        </div>

        <div class="live-tab-content" data-content="episodes">
          <div class="live-episodes-list">
            ${[...jtandmag.items.map(i => ({...i, _contentType:'jtandmag'})), ...divertissement.items.map(i => ({...i, _contentType:'divertissement'}))]
              .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
              .slice(0, 15)
              .map((item, i) => buildEpisodeCard(item, i))
              .join('')}
          </div>
        </div>

        <div class="live-tab-content" data-content="highlights">
          <div class="live-episodes-list">
            ${[...sports.items.map(i => ({...i, _contentType:'sport'})), ...reportages.items.map(i => ({...i, _contentType:'reportage'}))]
              .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
              .slice(0, 15)
              .map((item, i) => buildEpisodeCard(item, i))
              .join('')}
          </div>
        </div>
      `;

      const tabs = epContainer.querySelectorAll('.live-tab');
      const contents = epContainer.querySelectorAll('.live-tab-content');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetTab = tab.dataset.tab;
          tabs.forEach(t => t.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          const targetContent = epContainer.querySelector(`[data-content="${targetTab}"]`);
          if (targetContent) targetContent.classList.add('active');
        });
      });

      epContainer.querySelectorAll('.live-episode-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.live-episode-add')) return;
          const id = card.dataset.id;
          const type = card.dataset.type || 'jtandmag';
          window.location.hash = `#/show/${type}/${id}`;
        });
      });
    }

  } catch (error) {
    console.error('Erreur loadLive:', error);
    if (videoContainer) {
      videoContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    aspect-ratio:16/9;background:var(--surface);gap:12px;">
          <i class="bi bi-exclamation-circle" style="font-size:2rem;color:var(--primary);"></i>
          <p style="color:var(--text-3);margin:0;font-size:13px;">Erreur lors du chargement</p>
        </div>`;
    }
  }

  _initLiveChat();

  // ── Orientation : landscape pendant le plein écran, portrait à la sortie ──
  function _onFullscreenChange() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      // Entrée en plein écran → autoriser landscape
      try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch {}
    } else {
      // Sortie du plein écran → forcer le portrait
      try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch {}
    }
  }

  document.addEventListener('fullscreenchange', _onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', _onFullscreenChange);

  // Nettoyage au déchargement de la page live
  window._liveFsCleanup = () => {
    document.removeEventListener('fullscreenchange', _onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', _onFullscreenChange);
  };
}

function injectLiveStyles() {
  if (document.getElementById('live-custom-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'live-custom-styles';
  style.textContent = `
    @keyframes livePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(1.4); }
    }

    @keyframes liveFadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes liveSlideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .live-tabs {
      display: flex;
      border-bottom: 1px solid var(--border, #1a1a1a);
      background: var(--bg-1, #0d0d0d);
      position: sticky;
      top: 0;
      z-index: 10;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .live-tabs::-webkit-scrollbar { display: none; }

    .live-tab {
      flex: 1;
      min-width: max-content;
      padding: 14px 16px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      color: var(--text-3, #666);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
    }

    .live-tab:hover {
      color: var(--text-2, #aaa);
      background: rgba(255, 255, 255, 0.03);
    }

    .live-tab.active {
      color: var(--text-1, #fff);
      border-bottom-color: var(--primary, #E23E3E);
    }

    .live-tab-content {
      display: none;
      animation: liveFadeIn 0.4s ease-out;
    }

    .live-tab-content.active {
      display: block;
    }

    .live-episodes-list {
      padding: 16px;
    }

    .live-episode-card {
      background: var(--surface, #1a1a1a);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: liveSlideIn 0.4s ease-out both;
      animation-delay: calc(var(--card-index, 0) * 0.05s);
    }

    .live-episode-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    }

    .live-episode-card:active {
      transform: translateY(0);
    }

    .live-episode-inner {
      display: flex;
      gap: 12px;
      padding: 12px;
      position: relative;
    }

    .live-episode-thumbnail {
      width: 160px;
      min-width: 160px;
      height: 90px;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      background: var(--bg-2, #0a0a0a);
    }

    .live-episode-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .live-episode-card:hover .live-episode-thumbnail img {
      transform: scale(1.05);
    }

    .live-episode-duration {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.85);
      border-radius: 4px;
      padding: 3px 6px;
      z-index: 2;
    }

    .live-episode-duration span {
      color: #fff;
      font-size: 11px;
      font-weight: 600;
    }

    .live-episode-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 30%;
      height: 3px;
      background: var(--primary, #E23E3E);
      z-index: 3;
    }

    .live-episode-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .live-episode-views {
      color: var(--text-3, #666);
      font-size: 11px;
    }

    .live-episode-date {
      color: var(--text-3, #666);
      font-size: 11px;
    }

    .live-episode-title {
      margin-top: 2px;
    }

    .live-episode-title h3 {
      margin: 0;
      color: var(--text-1, #fff);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .live-episode-add {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .live-episode-add:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: rotate(90deg);
    }

    .live-episode-add:active {
      transform: rotate(90deg) scale(0.9);
    }

    .live-episode-add i {
      color: var(--text-2, #aaa);
      font-size: 16px;
    }

    [data-theme="light"] .live-tabs {
      background: #fff;
      border-bottom-color: #ddd;
    }

    [data-theme="light"] .live-tab {
      color: #666;
    }

    [data-theme="light"] .live-tab:hover {
      color: #333;
      background: rgba(0, 0, 0, 0.03);
    }

    [data-theme="light"] .live-tab.active {
      color: #000;
    }

    [data-theme="light"] .live-episode-card {
      background: #fff;
      border: 1px solid #e5e5e5;
    }

    [data-theme="light"] .live-episode-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    [data-theme="light"] .live-episode-thumbnail {
      background: #f5f5f5;
    }

    [data-theme="light"] .live-episode-title h3 {
      color: #000;
    }

    [data-theme="light"] .live-episode-views,
    [data-theme="light"] .live-episode-date {
      color: #666;
    }

    [data-theme="light"] .live-episode-add {
      background: rgba(0, 0, 0, 0.05);
    }

    [data-theme="light"] .live-episode-add:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    [data-theme="light"] .live-episode-add i {
      color: #666;
    }
  `;
  
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE MODAL — Chat temps réel (modal bottom-sheet)
// ═══════════════════════════════════════════════════════════════════════════

let _chatRefreshTimer = null;
let _chatWs           = null;
let _chatWsReady      = false;
let _chatOpen         = true;
let _chatMessages     = [];

function _escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return "à l'instant";
  if (s < 3600)  return Math.floor(s / 60) + 'min';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'j';
}

// ── Rendu d'un message chat ──────────────────────────────────────────────────
function _renderChatMessage(c) {
  const user   = _escHtml(c.username || 'Anonyme');
  const text   = _escHtml(c.text || '');
  const time   = _timeAgo(c.created_at);
  const av     = _resolveAvatar(c.avatar_url || '');
  const id     = c.id || '';
  const bg     = av ? 'transparent' : _avatarBg(c.username || '');
  const letter = _escHtml((c.username || '?')[0].toUpperCase());
  const me     = api.getUser();
  const isMine = me && c.user_id && String(c.user_id) === String(me.id);
  const edited = c.edited ? `<span class="cm-edited" style="font-size:10px;color:var(--text-4,#444);font-style:italic;">modifié</span>` : '';

  const avatarInner = av
    ? `<img src="${av}" style="width:100%;height:100%;object-fit:cover;"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;
                    font-size:13px;font-weight:700;color:#fff;">${letter}</span>`
    : `<span style="font-size:13px;font-weight:700;color:#fff;">${letter}</span>`;

  const actions = isMine ? `
    <div style="margin-left:auto;display:flex;gap:2px;flex-shrink:0;">
      <button onclick="window._editChatMsg('${id}')"
              style="background:none;border:none;cursor:pointer;padding:3px 5px;
                     color:var(--text-4,#555);border-radius:4px;" title="Modifier">
        <i class="bi bi-pencil" style="font-size:11px;"></i>
      </button>
      <button onclick="window._deleteChatMsg('${id}')"
              style="background:none;border:none;cursor:pointer;padding:3px 5px;
                     color:var(--text-4,#555);border-radius:4px;" title="Supprimer">
        <i class="bi bi-trash3" style="font-size:11px;"></i>
      </button>
    </div>` : '';

  return `
    <div id="cm-${id}" style="display:flex;gap:10px;padding:8px 12px;animation:liveSlideIn 0.2s ease-out;">
      <div style="width:32px;height:32px;border-radius:50%;background:${bg};
                  flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        ${avatarInner}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px;flex-wrap:wrap;">
          <span style="color:var(--text-1,#fff);font-size:13px;font-weight:700;">${user}</span>
          <span class="cm-time" style="color:var(--text-3,#555);font-size:10px;">${time}</span>
          ${edited}
          ${actions}
        </div>
        <p class="cm-text" style="margin:0;color:var(--text-2,#ccc);font-size:13px;line-height:1.5;word-break:break-word;">${text}</p>
      </div>
    </div>`;
}

// ── Rendu liste chat dans le modal (plus récents en haut) ────────────────────
function _renderChatList() {
  const list = document.getElementById('lm-chat-list');
  if (!list) return;
  if (!_chatMessages.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px 16px;color:var(--text-3,#555);">
      <i class="bi bi-chat-dots" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;"></i>
      <p style="margin:0;font-size:13px;">Aucun message. Soyez le premier !</p></div>`;
  } else {
    // Inverser : le plus récent en premier
    list.innerHTML = [..._chatMessages].reverse().map(_renderChatMessage).join('');
  }
  _updateModalSubtitle();
}

function _appendChatMessage(msg) {
  _chatMessages.push(msg);
  if (_chatMessages.length > 200) _chatMessages.shift();
  const list = document.getElementById('lm-chat-list');
  if (!list) { _updateModalSubtitle(); return; }
  const empty = list.querySelector('div[style*="text-align:center"]');
  if (empty) empty.remove();
  // Insérer en haut de la liste
  list.insertAdjacentHTML('afterbegin', _renderChatMessage(msg));
  _updateModalSubtitle();
}

function _removeChatMessageFromDom(id) {
  _chatMessages = _chatMessages.filter(m => m.id !== id);
  document.getElementById(`cm-${id}`)?.remove();
  if (!_chatMessages.length) _renderChatList();
}

// ── État chat ouvert/fermé ───────────────────────────────────────────────────
function _updateChatStatus(open) {
  _chatOpen = open;
  const inputBar     = document.getElementById('lm-chat-input-bar');
  const closedBanner = document.getElementById('lm-chat-closed');
  const loginPrompt  = document.getElementById('lm-chat-login');
  if (inputBar)     inputBar.style.display     = (open && api.isAuthenticated()) ? 'flex' : 'none';
  if (closedBanner) closedBanner.style.display = open ? 'none' : 'block';
  if (loginPrompt)  loginPrompt.style.display  = (!open || api.isAuthenticated()) ? 'none' : 'block';
}

// ── Envoi d'un message chat ──────────────────────────────────────────────────
function _sendChatMessage() {
  const input   = document.getElementById('lm-chat-input');
  const sendBtn = document.getElementById('lm-chat-send');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !_chatOpen) return;
  const user = api.getUser();
  if (_chatWsReady && _chatWs) {
    _chatWs.send(JSON.stringify({
      type: 'chat_send', text,
      user_id:    user?.id   || null,
      username:   user?.username || 'Anonyme',
      avatar_url: user?.avatar_url || null,
    }));
    input.value = '';
    input.focus();
  } else {
    if (sendBtn) { sendBtn.disabled = true; input.disabled = true; }
    api.addComment('livestream', 'livestream_bf1', text)
      .then(() => { input.value = ''; _fallbackLoadMessages(); })
      .catch(e => console.warn('Erreur envoi chat:', e))
      .finally(() => {
        if (sendBtn) sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
      });
  }
}

// ── Mise à jour du sous-titre du bouton d'ouverture ─────────────────────────
function _updateModalSubtitle() {
  const sub = document.getElementById('live-modal-subtitle');
  if (!sub) return;
  const nc = _chatMessages.length;
  if (nc > 0) {
    sub.textContent = `${nc} message${nc > 1 ? 's' : ''}`;
  } else {
    sub.textContent = 'Rejoindre la discussion';
  }
}

// ── Fallback polling (si WS indisponible) ───────────────────────────────────
async function _fallbackLoadMessages() {
  try {
    const res = await api.getComments('livestream', 'livestream_bf1');
    const items = Array.isArray(res) ? res : (res?.items || res?.comments || []);
    _chatMessages = items;
    _renderChatList();
  } catch (e) {
    console.warn('Erreur chargement chat (fallback):', e);
  }
}

// ── WebSocket init ───────────────────────────────────────────────────────────
function _initChatWebSocket() {
  const wsBase = API_CONFIG.API_BASE_URL.replace(/^https?/, (p) => p === 'https' ? 'wss' : 'ws');
  const wsUrl  = `${wsBase}/ws`;
  const token  = localStorage.getItem('bf1_token');
  const user   = api.getUser();

  let reconnectDelay = 2000;
  let reconnectTimer = null;
  let destroyed = false;

  function connect() {
    if (destroyed) return;
    try {
      _chatWs = new WebSocket(wsUrl);
    } catch (e) {
      _startFallbackPolling();
      return;
    }

    _chatWs.onopen = () => {
      _chatWsReady = true;
      reconnectDelay = 2000;
      // Rejoindre le livestream pour recevoir les messages chat
      _chatWs.send(JSON.stringify({
        type:    'join_livestream',
        user_id: user?.id || null,
        token:   token || null,
      }));
      // Arrêter le polling fallback si actif
      if (_chatRefreshTimer) { clearInterval(_chatRefreshTimer); _chatRefreshTimer = null; }
    };

    _chatWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        _handleWsMessage(msg);
      } catch {}
    };

    _chatWs.onclose = () => {
      _chatWsReady = false;
      _chatWs = null;
      if (!destroyed) {
        // Démarrer le fallback pendant la reconnexion
        _startFallbackPolling();
        reconnectTimer = setTimeout(() => { connect(); }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
      }
    };

    _chatWs.onerror = () => {
      _chatWsReady = false;
    };
  }

  // Exposer le cleanup pour destroyLive()
  window._chatWsDestroy = () => {
    destroyed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (_chatWs) { try { _chatWs.close(); } catch {} _chatWs = null; }
    _chatWsReady = false;
    if (_chatRefreshTimer) { clearInterval(_chatRefreshTimer); _chatRefreshTimer = null; }
  };

  connect();
}

// ── Traitement des messages WS entrants ─────────────────────────────────────
function _handleWsMessage(msg) {
  switch (msg.type) {

    case 'joined_livestream':
    case 'chat_init':
      // Initialisation : historique + état
      _chatMessages = msg.messages || [];
      _chatOpen     = msg.open !== false;
      _renderChatList();
      _updateChatStatus(_chatOpen);
      _updateViewerCount(msg.viewers || msg.total_viewers);
      break;

    case 'chat_message':
      if (msg.message) _appendChatMessage(msg.message);
      break;

    case 'chat_message_hidden':
    case 'chat_message_deleted':
      if (msg.message_id) _removeChatMessageFromDom(msg.message_id);
      break;

    case 'chat_message_edited':
      if (msg.message_id) {
        const idx = _chatMessages.findIndex(m => m.id === msg.message_id);
        if (idx !== -1) _chatMessages[idx].text = msg.text;
        const textEl = document.querySelector(`#cm-${msg.message_id} .cm-text`);
        if (textEl) textEl.textContent = msg.text;
        const badge = document.querySelector(`#cm-${msg.message_id} .cm-edited`);
        if (!badge) {
          const timeEl = document.querySelector(`#cm-${msg.message_id} .cm-time`);
          if (timeEl) timeEl.insertAdjacentHTML('afterend', `<span class="cm-edited" style="font-size:10px;color:var(--text-4,#444);font-style:italic;">modifié</span>`);
        }
      }
      break;

    case 'chat_status':
      _updateChatStatus(msg.open !== false);
      // Afficher un toast si le chat est fermé
      if (!msg.open) _showChatToast(msg.message || 'Le chat a été fermé.', true);
      else           _showChatToast(msg.message || 'Le chat est ouvert.', false);
      break;

    case 'chat_cleared':
      _chatMessages = [];
      _renderChatList();
      _showChatToast('Le chat a été vidé.', false);
      break;

    case 'viewer_joined':
    case 'viewer_left':
      _updateViewerCount(msg.total_viewers);
      break;

    case 'error':
      if (msg.code === 'CHAT_CLOSED') _updateChatStatus(false);
      break;
  }
}

function _updateViewerCount(n) {
  if (!n) return;
  const el = document.querySelector('#live-player-wrapper [data-viewers]');
  if (el) el.textContent = formatCount(n);
}

function _showChatToast(text, isWarning) {
  const list = document.getElementById('lm-chat-list');
  if (!list) return;
  const toast = document.createElement('div');
  toast.style.cssText = `text-align:center;padding:6px 12px;margin:4px 12px;border-radius:8px;font-size:12px;
    background:${isWarning ? 'rgba(226,62,62,.15)' : 'rgba(255,255,255,.06)'};
    color:${isWarning ? '#E23E3E' : 'var(--text-3,#555)'};`;
  toast.textContent = text;
  list.prepend(toast);
  setTimeout(() => toast.remove(), 4000);
}

function _startFallbackPolling() {
  if (_chatRefreshTimer) return;
  _fallbackLoadMessages();
  _chatRefreshTimer = setInterval(_fallbackLoadMessages, 8000);
}

// ── Point d'entrée principal ─────────────────────────────────────────────────
function _initLiveChat() {
  const bar = document.getElementById('live-chat-btn-bar');
  if (bar) bar.style.display = 'block';

  _chatMessages = [];
  _chatOpen     = true;

  _initChatWebSocket();
}

// ── Couleur d'avatar déterministe ────────────────────────────────────────────
function _avatarBg(username) {
  const colors = ['#E23E3E','#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#14B8A6'];
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++) hash = (username.charCodeAt(i) + hash * 31) | 0;
  return colors[Math.abs(hash) % colors.length];
}

// ── Modal chat bottom-sheet ───────────────────────────────────────────────────
window._openLiveModal = function() {
  let modal = document.getElementById('live-modal');
  if (modal) {
    modal.style.display = 'flex';
    return;
  }

  const isAuth = api.isAuthenticated();
  modal = document.createElement('div');
  modal.id = 'live-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.65);display:flex;flex-direction:column;justify-content:flex-end;';

  modal.innerHTML = `
    <style>
      #live-modal .lm-sheet{animation:lmUp .3s ease}
      @keyframes lmUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      @keyframes lmSpin{to{transform:rotate(360deg)}}
    </style>
    <div class="lm-sheet" style="background:var(--bg-2,#111);border-radius:20px 20px 0 0;
         max-height:82vh;display:flex;flex-direction:column;overflow:hidden;">

      <!-- Drag handle + header -->
      <div style="display:flex;justify-content:center;padding:10px 0 4px;flex-shrink:0;">
        <div style="width:36px;height:4px;background:var(--border,#2a2a2a);border-radius:2px;"></div>
      </div>
      <div style="display:flex;align-items:center;padding:0 16px 10px;flex-shrink:0;border-bottom:1px solid var(--border,#1a1a1a);">
        <span style="flex:1;font-size:14px;font-weight:700;color:var(--text-1,#fff);">Chat en direct</span>
        <button onclick="window._closeLiveModal()"
                style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-3,#777);font-size:18px;">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Liste messages -->
      <div id="lm-chat-list" style="flex:1;overflow-y:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:4px;">
        <div style="text-align:center;padding:40px 16px;color:var(--text-3,#555);">
          <div style="width:26px;height:26px;border:2px solid var(--border,#2a2a2a);border-top-color:#E23E3E;
                      border-radius:50%;animation:lmSpin .7s linear infinite;margin:0 auto;"></div>
        </div>
      </div>

      <!-- Chat fermé -->
      <div id="lm-chat-closed" style="display:none;padding:10px 16px;text-align:center;flex-shrink:0;">
        <span style="font-size:12px;color:var(--text-3,#888);font-style:italic;">
          <i class="bi bi-lock-fill" style="margin-right:4px;"></i>Le chat est actuellement fermé.
        </span>
      </div>

      <!-- Input chat -->
      <div id="lm-chat-input-bar" style="display:${isAuth && _chatOpen ? 'flex' : 'none'};
           gap:8px;align-items:center;padding:8px 16px 12px;
           border-top:1px solid var(--border,#1a1a1a);flex-shrink:0;">
        <input id="lm-chat-input" type="text" maxlength="300" placeholder="Écrire un message…" autocomplete="off"
               style="flex:1;background:var(--surface,#1a1a1a);border:1px solid var(--border,#2a2a2a);
                      border-radius:20px;padding:9px 14px;font-size:13px;color:var(--text-1,#fff);outline:none;">
        <button id="lm-chat-send" style="width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;
                background:#E23E3E;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="bi bi-send-fill" style="font-size:14px;color:#fff;"></i>
        </button>
      </div>

      <!-- Login prompt -->
      <div id="lm-chat-login" style="display:${!isAuth ? 'block' : 'none'};
           padding:10px 16px 14px;text-align:center;flex-shrink:0;">
        <button onclick="window._closeLiveModal();setTimeout(()=>window.location.hash='#/login',300)"
                style="background:none;border:1px solid #E23E3E;border-radius:20px;padding:9px 24px;
                       color:#E23E3E;font-size:13px;font-weight:600;cursor:pointer;">
          Se connecter pour participer
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) window._closeLiveModal(); });

  const chatInput = modal.querySelector('#lm-chat-input');
  const chatSend  = modal.querySelector('#lm-chat-send');
  if (chatSend)  chatSend.addEventListener('click', _sendChatMessage);
  if (chatInput) {
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendChatMessage(); } });
    chatInput.addEventListener('input', () => { if (chatInput.value.length > 300) chatInput.value = chatInput.value.slice(0, 300); });
  }

  _renderChatList();
  _updateChatStatus(_chatOpen);
};

// ── Suppression / modification d'un message par son auteur ───────────────────
window._deleteChatMsg = async function(msgId) {
  if (!confirm('Supprimer ce message ?')) return;
  try {
    await api.deleteMyChatMessage(msgId);
    // Le broadcast WS retire chez tous — on retire localement aussi au cas où
    _removeChatMessageFromDom(msgId);
  } catch (e) {
    console.error('Erreur suppression message:', e);
  }
};

window._editChatMsg = function(msgId) {
  const row    = document.getElementById(`cm-${msgId}`);
  const textEl = row?.querySelector('.cm-text');
  if (!row || !textEl) return;
  if (row.querySelector('.cm-edit-area')) return; // déjà en édition

  const orig = textEl.textContent.trim();
  textEl.style.display = 'none';

  row.insertAdjacentHTML('beforeend', `
    <div class="cm-edit-area" style="width:100%;margin-top:4px;padding:0 0 4px;">
      <textarea id="cm-ta-${msgId}" maxlength="300" rows="2"
                style="width:100%;background:var(--surface,#1a1a1a);border:1px solid #E23E3E;
                       border-radius:10px;padding:7px 10px;font-size:13px;color:var(--text-1,#fff);
                       outline:none;resize:none;font-family:inherit;line-height:1.4;
                       box-sizing:border-box;scrollbar-width:none;">${orig}</textarea>
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;">
        <button onclick="window._cancelEditChatMsg('${msgId}')"
                style="background:none;border:1px solid var(--border,#2a2a2a);border-radius:8px;
                       padding:4px 12px;font-size:12px;color:var(--text-3,#777);cursor:pointer;">
          Annuler
        </button>
        <button onclick="window._saveEditChatMsg('${msgId}')"
                style="background:#E23E3E;border:none;border-radius:8px;
                       padding:4px 12px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">
          Enregistrer
        </button>
      </div>
    </div>`);

  const ta = document.getElementById(`cm-ta-${msgId}`);
  if (ta) {
    ta.focus();
    ta.selectionStart = ta.value.length;
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
    ta.dispatchEvent(new Event('input'));
  }
};

window._cancelEditChatMsg = function(msgId) {
  const row    = document.getElementById(`cm-${msgId}`);
  const textEl = row?.querySelector('.cm-text');
  const area   = row?.querySelector('.cm-edit-area');
  if (textEl) textEl.style.display = '';
  if (area)   area.remove();
};

window._saveEditChatMsg = async function(msgId) {
  const ta = document.getElementById(`cm-ta-${msgId}`);
  if (!ta) return;
  const newText = ta.value.trim();
  if (!newText) return;
  const saveBtn = ta.closest('.cm-edit-area').querySelector('button:last-child');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '…'; }
  try {
    await api.editMyChatMessage(msgId, newText);
    // Le broadcast WS met à jour chez tous — on met aussi à jour localement
    const row    = document.getElementById(`cm-${msgId}`);
    const textEl = row?.querySelector('.cm-text');
    const area   = row?.querySelector('.cm-edit-area');
    if (textEl) { textEl.textContent = newText; textEl.style.display = ''; }
    if (area)   area.remove();
    if (row && !row.querySelector('.cm-edited')) {
      const timeEl = row.querySelector('.cm-time');
      if (timeEl) timeEl.insertAdjacentHTML('afterend', `<span class="cm-edited" style="font-size:10px;color:var(--text-4,#444);font-style:italic;">modifié</span>`);
    }
    const idx = _chatMessages.findIndex(m => m.id === msgId);
    if (idx !== -1) { _chatMessages[idx].text = newText; _chatMessages[idx].edited = true; }
  } catch (e) {
    console.error('Erreur modification message:', e);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Enregistrer'; }
  }
};

window._closeLiveModal = function() {
  const m = document.getElementById('live-modal');
  if (m) m.remove();
};