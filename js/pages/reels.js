import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

function formatCount(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

function buildReel(reel, index) {
  const id = reel.id || reel._id;
  const videoUrl = reel.video_url || reel.videoUrl || '';
  const title = reel.title || '';
  const description = reel.description || '';
  const likes = reel.likes ?? 0;
  const comments = reel.comments ?? 0;
  const shares = reel.shares ?? 0;
  const allowComments = reel.allow_comments !== false;

  return `
    <div class="reel-item position-relative" style="
        width:100%;
        height:calc(100vh - 60px);
        min-height:500px;
        background:#000;
        scroll-snap-align:start;
        flex-shrink:0;
        overflow:hidden;
    " data-index="${index}" data-id="${id}">

      <!-- Video -->
      <video class="reel-video"
             src="${videoUrl}"
             loop
             muted
             playsinline
             style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;cursor:pointer;"
             onclick="window.__reelTogglePlay(this)"
      ></video>

      <!-- Play/Pause icon (shown briefly) -->
      <div class="reel-play-icon d-none d-flex align-items-center justify-content-center"
           style="position:absolute;inset:0;pointer-events:none;">
        <i class="bi bi-play-circle-fill" style="font-size:5rem;color:rgba(255,255,255,0.85);"></i>
      </div>

      <!-- Bottom gradient + info -->
      <div class="position-absolute bottom-0 start-0 end-0" style="
          background:linear-gradient(transparent, rgba(0,0,0,0.85));
          padding:60px 70px 16px 14px;
          pointer-events:none;
      ">
        ${title ? `<p class="mb-1 fw-bold text-white" style="font-size:14px;line-height:1.3;">${title}</p>` : ''}
        ${description ? `<p class="mb-0 text-white" style="font-size:12px;opacity:0.8;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${description}</p>` : ''}
      </div>

      <!-- Right-side action buttons -->
      <div class="position-absolute d-flex flex-column align-items-center gap-3"
           style="right:10px;bottom:20px;">

        <!-- Like -->
        <button class="btn p-0 border-0 bg-transparent d-flex flex-column align-items-center reel-like-btn"
                data-id="${id}" data-likes="${likes}">
          <i class="bi bi-heart-fill" style="font-size:28px;color:#fff;"></i>
          <span class="text-white" style="font-size:11px;margin-top:3px;">${formatCount(likes)}</span>
        </button>

        <!-- Comments -->
        ${allowComments ? `
        <button class="btn p-0 border-0 bg-transparent d-flex flex-column align-items-center"
                onclick="void 0">
          <i class="bi bi-chat-fill" style="font-size:26px;color:#fff;"></i>
          <span class="text-white" style="font-size:11px;margin-top:3px;">${formatCount(comments)}</span>
        </button>` : ''}

        <!-- Share -->
        <button class="btn p-0 border-0 bg-transparent d-flex flex-column align-items-center">
          <i class="bi bi-reply-fill" style="font-size:26px;color:#fff;transform:scaleX(-1);"></i>
          <span class="text-white" style="font-size:11px;margin-top:3px;">${formatCount(shares)}</span>
        </button>

      </div>
    </div>`;
}

// Auto-play visible reel using IntersectionObserver
function setupAutoPlay(container) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector('.reel-video');
      if (!video) return;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.6 });

  container.querySelectorAll('.reel-item').forEach(item => observer.observe(item));
}

// Toggle play/pause on tap
window.__reelTogglePlay = function(video) {
  const item = video.closest('.reel-item');
  const icon = item?.querySelector('.reel-play-icon');
  if (video.paused) {
    video.play().catch(() => {});
    if (icon) {
      icon.querySelector('i').className = 'bi bi-play-circle-fill';
      icon.classList.remove('d-none');
      setTimeout(() => icon.classList.add('d-none'), 700);
    }
  } else {
    video.pause();
    if (icon) {
      icon.querySelector('i').className = 'bi bi-pause-circle-fill';
      icon.classList.remove('d-none');
      setTimeout(() => icon.classList.add('d-none'), 700);
    }
  }
};

export async function loadReels() {
  const container = document.getElementById('reels-container');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(createSnakeLoader(50));

  try {
    const reels = await api.getReels();

    if (!reels || reels.length === 0) {
      container.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center" style="height:calc(100vh - 60px);">
          <i class="bi bi-play-circle" style="font-size:3.5rem;color:#444;"></i>
          <p class="text-secondary mt-3">Aucun reel disponible</p>
        </div>`;
      return;
    }

    container.innerHTML = reels.map((reel, i) => buildReel(reel, i)).join('');
    setupAutoPlay(container);

  } catch (err) {
    console.error('Erreur loadReels:', err);
    container.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center" style="height:calc(100vh - 60px);">
        <i class="bi bi-exclamation-circle text-danger" style="font-size:2.5rem;"></i>
        <p class="text-secondary mt-3">Erreur lors du chargement</p>
        <button class="btn btn-sm btn-outline-danger mt-2" onclick="location.reload()">Réessayer</button>
      </div>`;
  }
}
