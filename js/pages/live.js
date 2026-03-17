import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

function formatCount(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

function buildHorizontalCard(item, type) {
  const image = item.thumbnail || item.image_url || item.image || 'https://via.placeholder.com/300x400/111/333?text=BF1';
  const title = item.title || item.name || 'Sans titre';
  const duration = item.duration;

  return `
    <div class="flex-shrink-0 me-2" style="width:130px;cursor:pointer;"
         onclick="window.location.hash='#/${type}'">
      <div class="position-relative rounded overflow-hidden" style="height:180px;background:#111;">
        <img src="${image}" alt="${title}"
             class="w-100 h-100" style="object-fit:cover;"
             onerror="this.src='https://via.placeholder.com/300x400/111/333?text=BF1'" />
        <div class="position-absolute bottom-0 start-0 end-0"
             style="background:linear-gradient(transparent,rgba(0,0,0,0.82));padding:24px 6px 6px;">
          <p class="mb-0 text-white" style="font-size:11px;font-weight:600;line-height:1.2;
             overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
            ${title}
          </p>
          ${duration ? `<span style="font-size:10px;color:rgba(255,255,255,0.7);"><i class="bi bi-clock me-1"></i>${duration} min</span>` : ''}
        </div>
      </div>
    </div>`;
}

function buildSection(title, items, route, iconName) {
  const cards = items.map(item => buildHorizontalCard(item, route)).join('');
  return `
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center px-3 mb-2">
        <h6 class="mb-0 fw-bold text-white">${title}</h6>
        <a href="#/${route}" style="color:#E23E3E;text-decoration:none;">
          <i class="bi bi-arrow-right-circle-fill" style="font-size:20px;"></i>
        </a>
      </div>
      ${items.length === 0
        ? `<p class="text-secondary px-3" style="font-size:13px;">Aucun contenu disponible</p>`
        : `<div class="d-flex overflow-auto px-3 pb-1" style="scrollbar-width:none;-ms-overflow-style:none;">${cards}</div>`
      }
    </div>`;
}

export async function loadLive() {
  const videoContainer = document.getElementById('live-video-container');
  const sectionsContainer = document.getElementById('live-sections');
  if (!videoContainer && !sectionsContainer) return;

  try {
    // Charger live + toutes les sections en parallèle
    const [liveData, sports, jtandmag, divertissement, reportages] = await Promise.all([
      api.getLive().catch(() => null),
      api.getSports().catch(() => []),
      api.getJTandMag().catch(() => []),
      api.getDivertissement().catch(() => []),
      api.getReportages().catch(() => []),
    ]);

    const streamUrl = liveData?.stream_url || liveData?.url;
    const viewers = liveData?.viewers || 0;
    const isLive = liveData?.is_live !== false && !!streamUrl;

    // --- Lecteur vidéo ---
    if (videoContainer) {
      if (isLive && streamUrl) {
        videoContainer.innerHTML = `
          <div class="position-relative w-100" style="background:#000;">
            <div class="ratio ratio-16x9">
              <video id="live-video" autoplay muted playsinline
                     style="object-fit:contain;background:#000;"
                     onerror="this.parentElement.parentElement.parentElement.querySelector('.live-error')?.classList.remove('d-none')">
              </video>
            </div>



            <div class="live-error d-none text-center p-3">
              <p class="text-secondary mb-0" style="font-size:13px;">Impossible de charger le flux</p>
            </div>
          </div>`;

        // Afficher le compteur de spectateurs dans le header
        const viewersHeader = document.getElementById('live-viewers-header');
        const viewersCount = document.getElementById('live-viewers-count');
        if (viewersHeader && viewersCount && viewers > 0) {
          viewersCount.textContent = formatCount(viewers);
          viewersHeader.style.display = 'inline-flex';
        }

        // Affecter la source vidéo
        requestAnimationFrame(() => {
          const video = document.getElementById('live-video');
          if (video) {
            video.src = streamUrl;
            video.play().catch(() => {});
          }
        });
      } else {
        videoContainer.innerHTML = `
          <div class="d-flex flex-column align-items-center justify-content-center"
               style="height:200px;background:#000;border-radius:8px;">
            <i class="bi bi-wifi-off text-secondary" style="font-size:2.5rem;"></i>
            <p class="text-secondary mt-2 mb-0">Aucun flux disponible</p>
          </div>`;
      }
    }

    // --- Sections horizontales ---
    if (sectionsContainer) {
      const sortByDate = (arr) => [...arr].sort((a, b) =>
        new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0)
      );

      sectionsContainer.innerHTML = [
        buildSection('Sports',          sortByDate(Array.isArray(sports) ? sports : []).slice(0, 10),          'sports',         'bi-trophy'),
        buildSection('JT & Mag',        sortByDate(Array.isArray(jtandmag) ? jtandmag : []).slice(0, 10),      'jtandmag',       'bi-camera-video'),
        buildSection('Divertissement',  sortByDate(Array.isArray(divertissement) ? divertissement : []).slice(0, 10), 'divertissement', 'bi-stars'),
        buildSection('Reportages',      sortByDate(Array.isArray(reportages) ? reportages : []).slice(0, 10),  'reportages',     'bi-film'),
      ].join('');
    }

  } catch (error) {
    console.error('Erreur loadLive:', error);
    if (videoContainer) {
      videoContainer.innerHTML = `<div class="alert alert-warning mx-3">Erreur lors du chargement du live</div>`;
    }
  }
}
