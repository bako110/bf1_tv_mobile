import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDuration(min) {
  if (!min) return null;
  return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? min % 60 + 'm' : ''}` : `${min}min`;
}

function fmtYear(movie) {
  if (movie.year) return movie.year;
  if (movie.created_at) return new Date(movie.created_at).getFullYear();
  return null;
}

function buildCard(movie) {
  const id = movie.id || movie._id;
  const title = movie.title || 'Sans titre';
  const img = movie.poster || movie.image_url || movie.image || movie.thumbnail || '';
  const dur = fmtDuration(movie.duration);
  const year = fmtYear(movie);
  const genres = Array.isArray(movie.genre) ? movie.genre.slice(0, 2) : [];
  const isPremium = movie.is_premium;

  return `
    <div onclick="window.location.hash='#/movie/${esc(id)}'"
         style="background:#111;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;aspect-ratio:2/3;">
      ${img
        ? `<img src="${esc(img)}" alt="${esc(title)}" loading="lazy"
               style="width:100%;height:100%;object-fit:cover;display:block;"
               onerror="this.src='https://via.placeholder.com/300x450/111/333?text=BF1'">`
        : `<div style="width:100%;height:100%;background:#1a1a1a;display:flex;align-items:center;justify-content:center;">
             <i class="bi bi-film" style="font-size:40px;color:#333;"></i>
           </div>`}

      <!-- Gradient overlay -->
      <div style="position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,0.96) 100%);"></div>

      <!-- Premium badge -->
      ${isPremium ? `<div style="position:absolute;top:8px;left:8px;">
        <span style="background:#FF6F00;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:.5px;">PREMIUM</span>
      </div>` : ''}

      <!-- Duration -->
      ${dur ? `<div style="position:absolute;top:8px;right:8px;">
        <span style="background:rgba(0,0,0,0.8);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;">
          <i class="bi bi-clock" style="font-size:9px;"></i> ${esc(dur)}
        </span>
      </div>` : ''}

      <!-- Info bottom -->
      <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 8px 8px;">
        <p style="font-size:12px;font-weight:600;color:var(--text-1,#fff);margin:0 0 3px;overflow:hidden;
            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3;">${esc(title)}</p>
        <div class="d-flex align-items-center gap-1 flex-wrap">
          ${year ? `<span style="font-size:10px;color:var(--text-3,#999);">${year}</span>` : ''}
          ${genres.map(g => `<span style="background:rgba(226,62,62,0.2);color:#E23E3E;font-size:9px;padding:1px 5px;border-radius:3px;">${esc(g)}</span>`).join('')}
        </div>
      </div>
    </div>`;
}

export async function loadMovies() {
  const container = document.getElementById('movies-container');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(createPageSpinner());

  try {
    const raw = await api.getMovies().catch(() => []);
    const moviesRaw = Array.isArray(raw) ? raw : (raw?.items || raw?.movies || []);
    
    // Trier par date (plus récent en premier) 📅
    const movies = [...moviesRaw].sort((a, b) => {
      const dateA = new Date(a.created_at || a.release_date || 0);
      const dateB = new Date(b.created_at || b.release_date || 0);
      return dateB - dateA;
    });

    if (!movies.length) {
      container.innerHTML = `
        <div class="text-center" style="padding:60px 20px;">
          <i class="bi bi-film" style="font-size:3rem;color:#333;"></i>
          <p style="color:#555;margin-top:12px;font-size:14px;">Aucun film disponible pour le moment</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-bottom:70px;">
        ${movies.map(buildCard).join('')}
      </div>`;

  } catch (err) {
    console.error('Erreur loadMovies:', err);
    container.innerHTML = `
      <div class="text-center" style="padding:60px 20px;">
        <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:#E23E3E;"></i>
        <p style="color:#666;margin-top:10px;font-size:14px;">Erreur lors du chargement</p>
        <button onclick="window.location.hash='#/movies'"
                style="background:#E23E3E;color:#fff;border:none;border-radius:8px;padding:8px 18px;margin-top:8px;cursor:pointer;font-size:13px;">
          Réessayer
        </button>
      </div>`;
  }
}
