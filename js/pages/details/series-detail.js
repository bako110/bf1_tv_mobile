import * as api from '../../services/api.js';
import { createSnakeLoader } from '../../utils/snakeLoader.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extractYoutubeId(url) {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function buildEpVideoPlayer(videoUrl, posterImg) {
  if (!videoUrl) return `
    <div style="width:100%;height:180px;background:#111;display:flex;flex-direction:column;
         align-items:center;justify-content:center;gap:8px;">
      <i class="bi bi-camera-video-off" style="font-size:2rem;color:#444;"></i>
      <p style="color:#555;font-size:13px;margin:0;">Vidéo non disponible</p>
    </div>`;

  const ytId = extractYoutubeId(videoUrl);
  if (ytId) {
    const src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    return `
      <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;background:#000;">
        <iframe src="${esc(src)}"
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowfullscreen loading="lazy"></iframe>
      </div>`;
  }

  return `
    <video controls autoplay muted playsinline preload="auto"
           style="width:100%;max-height:260px;display:block;background:#000;"
           ${posterImg ? `poster="${esc(posterImg)}"` : ''}>
      <source src="${esc(videoUrl)}" type="video/mp4">
      Votre navigateur ne supporte pas la lecture vidéo.
    </video>`;
}

function fmtDur(min) {
  if (!min) return null;
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? min % 60 + 'm' : ''}` : `${min}min`;
}

// ─── Episode player bottom sheet ──────────────────────────────────────────────

function openEpPlayer(ep) {
  const overlay = document.getElementById('ep-overlay');
  const sheet   = document.getElementById('ep-sheet');
  const titleEl = document.getElementById('ep-title');
  const videoWrap = document.getElementById('ep-video-wrap');
  const descEl  = document.getElementById('ep-desc');
  if (!overlay || !sheet) return;

  if (titleEl) titleEl.textContent = ep.title || 'Épisode';
  if (descEl)  descEl.textContent  = ep.description || '';

  if (videoWrap) {
    videoWrap.innerHTML = buildEpVideoPlayer(ep.video_url, ep.thumbnail_url);
  }

  overlay.style.display = 'block';
  requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
  });
}

function closeEpPlayer() {
  const overlay = document.getElementById('ep-overlay');
  const sheet   = document.getElementById('ep-sheet');
  const videoWrap = document.getElementById('ep-video-wrap');
  if (!overlay || !sheet) return;
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => {
    overlay.style.display = 'none';
    if (videoWrap) videoWrap.innerHTML = '';
  }, 300);
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderSeries(container, serie, seasons, episodes) {
  const headerEl = document.getElementById('sd2-header-title');
  if (headerEl) headerEl.textContent = serie.title || 'Série';

  const img    = serie.image_url || serie.banner_url || '';
  const title  = serie.title || 'Sans titre';
  const desc   = serie.description || '';
  const genres = Array.isArray(serie.genre) ? serie.genre : [];
  const cast   = Array.isArray(serie.cast) ? serie.cast.slice(0, 5) : [];
  const year   = serie.release_year || '';
  const network = serie.network || 'BF1';
  const isPremium = serie.is_premium;

  // Group episodes by season
  const epsBySeason = {};
  episodes.forEach(ep => {
    const sid = ep.season_id || 'no-season';
    if (!epsBySeason[sid]) epsBySeason[sid] = [];
    epsBySeason[sid].push(ep);
  });

  // Season tabs
  const seasonTabs = seasons.map((s, i) => `
    <button id="stab-${i}" onclick="_bf1SelectSeason(${i})"
            style="flex-shrink:0;padding:8px 16px;border:none;border-radius:20px;cursor:pointer;font-size:13px;font-weight:500;
                   background:${i === 0 ? '#E23E3E' : '#1a1a1a'};color:${i === 0 ? '#fff' : '#888'};">
      ${esc(s.title || `Saison ${s.season_number || i + 1}`)}
    </button>`).join('');

  // Build episodes panel for each season
  const seasonPanels = seasons.map((s, i) => {
    const sid = s.id || s._id;
    const eps = epsBySeason[sid] || epsBySeason['no-season'] || [];
    const epItems = eps.length
      ? eps.sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0)).map(ep => buildEpCard(ep)).join('')
      : `<p style="color:#555;font-size:13px;padding:8px 0;">Aucun épisode disponible</p>`;
    return `<div id="spanel-${i}" style="display:${i === 0 ? 'block' : 'none'};">${epItems}</div>`;
  }).join('');

  // Fallback: all episodes if no seasons
  const noSeasonEps = seasons.length === 0 && episodes.length > 0
    ? episodes.sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0)).map(ep => buildEpCard(ep)).join('')
    : '';

  container.innerHTML = `

    <!-- Hero banner -->
    ${img ? `
    <div style="position:relative;width:100%;max-height:280px;overflow:hidden;">
      <img src="${esc(img)}" alt="" style="width:100%;object-fit:cover;max-height:280px;display:block;"
           onerror="this.style.display='none'">
      <div style="position:absolute;inset:0;background:linear-gradient(transparent 30%,#000 100%);"></div>
      ${isPremium ? `<div style="position:absolute;top:12px;left:12px;">
        <span style="background:#FF6F00;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;">PREMIUM</span>
      </div>` : ''}
    </div>` : ''}

    <div class="px-3 pt-3">

      <!-- Title + meta -->
      <h1 style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;
           overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</h1>

      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        ${year ? `<span style="font-size:13px;color:#888;">${year}</span>` : ''}
        <span style="font-size:13px;color:#888;">${esc(network)}</span>
        ${genres.map(g => `<span style="background:rgba(226,62,62,0.15);color:#E23E3E;font-size:11px;padding:2px 8px;border-radius:12px;">${esc(g)}</span>`).join('')}
        ${episodes.length > 0 ? `<span style="font-size:12px;color:#666;">${episodes.length} épisode${episodes.length > 1 ? 's' : ''}</span>` : ''}
      </div>

      <!-- Description -->
      ${desc ? `
      <div style="margin-bottom:20px;">
        <div id="sd2-desc-wrap" onclick="_sd2ToggleDesc()"
             style="position:relative;overflow:hidden;max-height:calc(1.7em * 5);cursor:pointer;">
          <p id="sd2-desc-text" style="font-size:14px;color:#c0c0c0;line-height:1.7;white-space:pre-wrap;margin:0;">${esc(desc)}</p>
          <div id="sd2-desc-fade" style="position:absolute;bottom:0;left:0;right:0;height:40px;
               background:linear-gradient(transparent,#000);pointer-events:none;"></div>
        </div>
      </div>` : ''}

      <!-- Cast -->
      ${cast.length > 0 ? `
      <div class="mb-4">
        <p style="font-size:12px;font-weight:600;color:#555;margin-bottom:8px;text-transform:uppercase;letter-spacing:.6px;">Casting</p>
        <div class="d-flex flex-wrap gap-2">
          ${cast.map(c => `<span style="background:#1a1a1a;color:#ccc;font-size:12px;padding:4px 10px;border-radius:12px;border:1px solid #2a2a2a;">${esc(c)}</span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Épisodes section -->
      <div class="mb-4">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-collection-play-fill" style="color:#E23E3E;font-size:16px;"></i>
          <h3 style="font-size:16px;font-weight:700;color:#fff;margin:0;">Épisodes</h3>
        </div>

        ${seasons.length > 0 ? `
        <!-- Season tabs -->
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:12px;scrollbar-width:none;">
          ${seasonTabs}
        </div>
        <!-- Season panels -->
        ${seasonPanels}` : noSeasonEps
          ? `<div>${noSeasonEps}</div>`
          : `<p style="color:#555;font-size:14px;">Aucun épisode disponible pour le moment</p>`
        }
      </div>

    </div>`;

  // Toggle description
  window._sd2ToggleDesc = function() {
    const wrap = document.getElementById('sd2-desc-wrap');
    const fade = document.getElementById('sd2-desc-fade');
    const btn  = document.getElementById('sd2-desc-btn');
    if (!wrap) return;
    const open = wrap.style.maxHeight === 'none';
    wrap.style.maxHeight = open ? 'calc(1.7em * 5)' : 'none';
    if (fade) fade.style.display = open ? 'block' : 'none';
    if (btn)  btn.innerHTML = open
      ? 'Lire la suite <i class="bi bi-chevron-down" style="font-size:11px;"></i>'
      : 'Réduire <i class="bi bi-chevron-up" style="font-size:11px;"></i>';
  };

  // Hide 'Lire la suite' if desc is short enough
  requestAnimationFrame(() => {
    const wrap = document.getElementById('sd2-desc-wrap');
    const btn  = document.getElementById('sd2-desc-btn');
    if (wrap && btn && wrap.scrollHeight <= wrap.offsetHeight + 4) {
      wrap.style.maxHeight = 'none';
      const fade = document.getElementById('sd2-desc-fade');
      if (fade) fade.style.display = 'none';
      btn.style.display = 'none';
    }
  });

  // Season tab switching
  window._bf1SelectSeason = (idx) => {
    seasons.forEach((_, i) => {
      const tab   = document.getElementById(`stab-${i}`);
      const panel = document.getElementById(`spanel-${i}`);
      if (tab)   { tab.style.background = i === idx ? '#E23E3E' : '#1a1a1a'; tab.style.color = i === idx ? '#fff' : '#888'; }
      if (panel) panel.style.display = i === idx ? 'block' : 'none';
    });
  };

  // Expose episode opener & closer
  window._bf1PlayEpisode = (epData) => openEpPlayer(epData);
  window.closeEpPlayer = closeEpPlayer;

  // Overlay backdrop click closes
  const overlay = document.getElementById('ep-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeEpPlayer();
    });
  }
}

function buildEpCard(ep) {
  const id     = ep.id || ep._id;
  const num    = ep.episode_number || '';
  const title  = ep.title || `Épisode ${num}`;
  const thumb  = ep.thumbnail_url || '';
  const dur    = fmtDur(ep.duration);
  const hasVideo = !!ep.video_url;
  const epData = JSON.stringify({
    id, title, description: ep.description || '',
    video_url: ep.video_url || '', thumbnail_url: ep.thumbnail_url || ''
  }).replace(/'/g, '&#39;').replace(/"/g, '&quot;');

  return `
    <div onclick="_bf1PlayEpisode(${epData.replace(/&quot;/g, '"').replace(/&#39;/g, "'")})"
         style="display:flex;gap:12px;background:#1a1a1a;border-radius:10px;overflow:hidden;
                cursor:pointer;margin-bottom:10px;align-items:stretch;">
      <div style="position:relative;flex-shrink:0;width:110px;">
        ${thumb
          ? `<img src="${esc(thumb)}" alt="" style="width:110px;height:72px;object-fit:cover;display:block;">`
          : `<div style="width:110px;height:72px;background:#2a2a2a;display:flex;align-items:center;justify-content:center;">
               <i class="bi bi-${hasVideo ? 'play-circle' : 'camera-video-off'}" style="font-size:24px;color:${hasVideo ? '#E23E3E' : '#444'};"></i>
             </div>`}
        ${dur ? `<span style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.8);color:#fff;font-size:9px;border-radius:3px;padding:1px 4px;">${esc(dur)}</span>` : ''}
        ${hasVideo ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <div style="width:28px;height:28px;background:rgba(226,62,62,0.85);border-radius:50%;display:flex;align-items:center;justify-content:center;">
            <i class="bi bi-play-fill" style="color:#fff;font-size:13px;margin-left:2px;"></i>
          </div>
        </div>` : ''}
      </div>
      <div style="padding:8px 12px 8px 4px;flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:center;">
        ${num ? `<span style="font-size:11px;color:#E23E3E;font-weight:600;margin-bottom:2px;">Épisode ${num}</span>` : ''}
        <p style="font-size:13px;font-weight:600;color:#fff;margin:0;overflow:hidden;
            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.35;">${esc(title)}</p>
        ${!hasVideo ? `<span style="font-size:11px;color:#555;margin-top:3px;">Non disponible</span>` : ''}
      </div>
    </div>`;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function loadSeriesDetail(seriesId) {
  const container = document.getElementById('sd2-container');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(createSnakeLoader(50));

  try {
    const [serie, seasons, episodesRes] = await Promise.all([
      api.getSeriesById(seriesId).catch(() => null),
      api.getSeriesSeasons(seriesId).catch(() => []),
      api.getSeriesEpisodes(seriesId).catch(() => []),
    ]);

    if (!serie) {
      container.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center py-5 px-4">
          <i class="bi bi-exclamation-circle text-danger" style="font-size:3rem;"></i>
          <p class="mt-3" style="color:#888;">Série introuvable</p>
          <button onclick="history.back()"
                  style="background:#E23E3E;color:#fff;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;margin-top:8px;">
            Retour
          </button>
        </div>`;
      return;
    }

    const episodes = Array.isArray(episodesRes) ? episodesRes : (episodesRes?.episodes || []);

    renderSeries(container, serie, seasons, episodes);

  } catch (err) {
    console.error('Erreur loadSeriesDetail:', err);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-circle text-danger" style="font-size:2rem;"></i>
        <p style="color:#888;margin-top:8px;">Erreur de chargement</p>
        <button onclick="history.back()"
                style="background:#E23E3E;color:#fff;border:none;border-radius:8px;padding:8px 18px;margin-top:8px;cursor:pointer;">
          Retour
        </button>
      </div>`;
  }
}
