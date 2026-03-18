import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtRelative(d) {
  if (!d) return '';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `${j}j`;
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

function fmtDur(s) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? m % 60 + 'm' : ''}` : `${m}min`;
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

function buildCarousel(shows) {
  const slides = shows.slice(0, 5);
  if (!slides.length) return '';

  const slidesHtml = slides.map((s) => {
    const img   = s.thumbnail || s.image_url || s.image || '';
    const title = s.title || '';
    return `
      <div style="min-width:100%;position:relative;height:220px;flex-shrink:0;">
        <img src="${esc(img)}" alt="" loading="lazy"
             style="width:100%;height:100%;object-fit:cover;display:block;"
             onerror="this.src='https://via.placeholder.com/800x220/111/222?text=BF1'">
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.72) 100%);"></div>
        <div style="position:absolute;bottom:38px;left:0;right:0;padding:0 16px;">
          <p style="color:#fff;font-size:14px;font-weight:700;margin:0;
                    overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                    -webkit-box-orient:vertical;text-shadow:0 1px 6px rgba(0,0,0,0.9);">${esc(title)}</p>
        </div>
      </div>`;
  }).join('');

  const dotsHtml = slides.map((_, i) =>
    `<div class="emcat-dot" data-index="${i}"
          style="height:5px;border-radius:3px;cursor:pointer;transition:width .3s,background .3s;
                 width:${i === 0 ? '18px' : '5px'};
                 background:${i === 0 ? '#E23E3E' : 'rgba(255,255,255,0.35)'};
                 margin:0 2px;"></div>`
  ).join('');

  return `
    <div id="emcat-carousel"
         style="position:relative;overflow:hidden;border-radius:0 0 14px 14px;">
      <div id="emcat-track"
           style="display:flex;transition:transform .42s cubic-bezier(.4,0,.2,1);">
        ${slidesHtml}
      </div>
      <div style="position:absolute;bottom:14px;left:0;right:0;
                  display:flex;justify-content:center;align-items:center;">
        ${dotsHtml}
      </div>
    </div>`;
}

function startCarousel(total) {
  if (total < 2) return;
  let current = 0;

  function goTo(idx) {
    current = ((idx % total) + total) % total;
    const track = document.getElementById('emcat-track');
    if (track) track.style.transform = `translateX(-${current * 100}%)`;
    document.querySelectorAll('.emcat-dot').forEach((dot, i) => {
      const active = i === current;
      dot.style.width      = active ? '18px' : '5px';
      dot.style.background = active ? '#E23E3E' : 'rgba(255,255,255,0.35)';
    });
  }

  // Dot clicks
  document.querySelectorAll('.emcat-dot').forEach(dot =>
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index, 10)))
  );

  // Touch swipe
  const carousel = document.getElementById('emcat-carousel');
  if (carousel) {
    let tx = 0;
    carousel.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  // Auto-advance every 5 s
  if (window.__emcatTimer) clearInterval(window.__emcatTimer);
  window.__emcatTimer = setInterval(() => goTo(current + 1), 5000);
}

// ─── Show card ────────────────────────────────────────────────────────────────

function buildShowCard(show) {
  const id          = show.id || show._id;
  const contentType = show._contentType || 'show';
  const img         = show.thumbnail || show.image_url || show.image || '';
  const title       = show.title || 'Sans titre';
  const dur         = show.duration ? fmtDur(show.duration) : null;
  const time        = fmtRelative(show.created_at || show.date);
  const views       = show.views != null ? show.views : null;
  const desc        = show.description || '';

  return `
    <div onclick="window.location.hash='#/show/${esc(contentType)}/${esc(id)}'"
         style="display:flex;gap:12px;background:#141414;border-radius:12px;
                overflow:hidden;cursor:pointer;border:1px solid #1e1e1e;
                transition:opacity .15s;">
      <!-- Thumbnail -->
      <div style="position:relative;flex-shrink:0;width:130px;height:90px;">
        ${img
          ? `<img src="${esc(img)}" alt="" loading="lazy"
                  style="width:100%;height:100%;object-fit:cover;display:block;"
                  onerror="this.src='https://via.placeholder.com/130x90/111/222?text=BF1'">`
          : `<div style="width:100%;height:100%;background:#222;
                          display:flex;align-items:center;justify-content:center;">
               <i class="bi bi-tv" style="font-size:24px;color:#333;"></i>
             </div>`}
        ${dur ? `<span style="position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.85);
                               color:#ccc;font-size:9px;border-radius:4px;padding:1px 5px;">
                   ${esc(dur)}</span>` : ''}
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <div style="width:32px;height:32px;background:rgba(226,62,62,0.9);border-radius:50%;
                      display:flex;align-items:center;justify-content:center;
                      box-shadow:0 2px 10px rgba(226,62,62,.45);">
            <i class="bi bi-play-fill" style="color:#fff;font-size:14px;margin-left:2px;"></i>
          </div>
        </div>
      </div>
      <!-- Info -->
      <div style="padding:10px 10px 10px 0;flex:1;overflow:hidden;
                  display:flex;flex-direction:column;justify-content:space-between;">
        <p style="font-size:13px;font-weight:700;color:#f0f0f0;margin:0 0 4px;
                  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                  -webkit-box-orient:vertical;line-height:1.35;">${esc(title)}</p>
        ${desc ? `<p style="font-size:11px;color:#606060;margin:0 0 6px;
                             overflow:hidden;display:-webkit-box;
                             -webkit-line-clamp:1;-webkit-box-orient:vertical;
                             line-height:1.4;">${esc(desc)}</p>` : ''}
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          ${views != null ? `<span style="font-size:10px;color:#555;
                              display:flex;align-items:center;gap:3px;">
            <i class="bi bi-eye" style="color:#E23E3E;font-size:10px;"></i>${esc(String(views))}</span>` : ''}
          ${time ? `<span style="font-size:10px;color:#555;
                             display:flex;align-items:center;gap:3px;">
            <i class="bi bi-clock" style="font-size:10px;"></i>${time}</span>` : ''}
        </div>
      </div>
    </div>`;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function loadEmissionCategory(categoryName) {
  if (window.__emcatTimer) { clearInterval(window.__emcatTimer); window.__emcatTimer = null; }

  const container = document.getElementById('emcat-container');
  const titleEl   = document.getElementById('emcat-title');
  if (!container) return;

  if (titleEl) titleEl.textContent = categoryName || 'Émission';

  container.innerHTML = '';
  container.appendChild(createSnakeLoader(40));

  try {
    const shows = await api.getShowsByCategory(categoryName).catch(() => []);
    const list  = Array.isArray(shows) ? shows : [];

    if (!list.length) {
      container.innerHTML = `
        <div class="text-center" style="padding:60px 20px;">
          <i class="bi bi-tv" style="font-size:3rem;color:#333;"></i>
          <p style="color:#555;margin-top:12px;font-size:14px;">Aucun contenu disponible pour
            <strong style="color:#E23E3E;">${esc(categoryName)}</strong></p>
        </div>`;
      return;
    }

    const sorted = list.sort((a, b) =>
      new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0)
    );

    container.innerHTML = `
      ${buildCarousel(sorted)}
      <div style="padding:16px 14px 80px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <h2 style="font-size:15px;font-weight:700;color:#fff;margin:0;">Toutes les émissions</h2>
          <span style="font-size:11px;color:#777;background:#1a1a1a;border-radius:20px;
                       padding:3px 10px;border:1px solid #252525;">${sorted.length}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${sorted.map(buildShowCard).join('')}
        </div>
      </div>`;

    startCarousel(Math.min(sorted.length, 5));

  } catch (err) {
    console.error('Erreur loadEmissionCategory:', err);
    container.innerHTML = `
      <div class="text-center" style="padding:60px 20px;">
        <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:#E23E3E;"></i>
        <p style="color:#666;margin-top:10px;font-size:14px;">Erreur lors du chargement</p>
        <button onclick="history.back()"
                style="background:#E23E3E;color:#fff;border:none;border-radius:8px;
                       padding:8px 18px;margin-top:8px;cursor:pointer;font-size:13px;">
          Retour
        </button>
      </div>`;
  }
}
