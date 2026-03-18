import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

function formatCount(n) {
  if (!n && n !== 0) return '';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return n;
}

function buildCategoryCard(cat) {
  const id = cat.id || cat._id;
  const name = cat.name || 'Sans titre';
  const image = cat.image_main || cat.image_url || cat.image || 'https://via.placeholder.com/400x560/111/333?text=BF1';
  const likes = cat.likes ?? 0;
  const isNew = cat.is_new;

  return `
    <div class="col-6">
      <div class="position-relative rounded overflow-hidden" style="background:#111;aspect-ratio:3/4;cursor:pointer;"
           onclick="window.location.hash='#/emission-category/${encodeURIComponent(name)}'">
        <img
          src="${image}"
          alt="${name}"
          class="w-100 h-100"
          style="object-fit:cover;display:block;"
          onerror="this.src='https://via.placeholder.com/400x560/111/333?text=BF1'"
        />
        <!-- gradient overlay -->
        <div class="position-absolute bottom-0 start-0 end-0"
             style="background:linear-gradient(transparent, rgba(0,0,0,0.88));padding:40px 10px 10px;">
        </div>

        ${isNew ? `<div class="position-absolute top-0 start-0 m-2">
          <span class="badge" style="background:#E23E3E;font-size:10px;">Nouveau</span>
        </div>` : ''}

        <!-- like badge top-right -->
        <div class="position-absolute top-0 end-0 m-2 d-flex flex-column align-items-center">
          <i class="bi bi-heart text-white" style="font-size:18px;"></i>
          ${likes > 0 ? `<span style="color:#fff;font-size:10px;font-weight:600;">${formatCount(likes)}</span>` : ''}
        </div>

        <!-- name bottom -->
        <div class="position-absolute bottom-0 start-0 end-0 p-2">
          <p class="mb-0 fw-bold text-white" style="font-size:13px;line-height:1.2;text-shadow:0 1px 3px rgba(0,0,0,0.8);">${name}</p>
        </div>
      </div>
    </div>
  `;
}

export async function loadEmissions() {
  const container = document.getElementById('emissions-list');
  if (!container) return;

  // Afficher loader
  container.innerHTML = '';
  container.appendChild(createSnakeLoader(40));

  try {
    const categories = await api.getEmissions();

    if (!categories || categories.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-grid" style="font-size:3rem;color:#444;"></i>
          <p class="text-secondary mt-3">Aucune catégorie disponible</p>
          <p class="text-secondary" style="font-size:13px;">Les catégories d'émissions seront affichées ici</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="row g-3 px-3 py-3">${categories.map(buildCategoryCard).join('')}</div>`;

  } catch (err) {
    console.error('Erreur loadEmissions:', err);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-circle text-danger" style="font-size:2rem;"></i>
        <p class="text-secondary mt-2">Erreur lors du chargement</p>
        <button class="btn btn-sm btn-outline-danger mt-2" onclick="location.reload()">Réessayer</button>
      </div>`;
  }
}
