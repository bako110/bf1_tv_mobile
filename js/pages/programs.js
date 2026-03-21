import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

function formatCount(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function buildProgramCard(prog) {
  const image = prog.image_url || prog.image || 'https://via.placeholder.com/300x200/111/333?text=Prog';
  const title = prog.title || 'Titre';
  const type = prog.type || prog.category || 'Programme';
  const start = formatTime(prog.start_time || prog.startTime);
  const duration = prog.duration ? `${prog.duration} min` : '';

  return `
    <div class="col-6 mb-3">
      <div class="position-relative rounded overflow-hidden" style="background:#111;aspect-ratio:3/2;cursor:pointer;">
        <img src="${image}" alt="${title}"
             class="w-100 h-100" style="object-fit:cover;"
             onerror="this.src='https://via.placeholder.com/300x200/111/333?text=Prog'" />
        
        <div class="position-absolute bottom-0 start-0 end-0"
             style="background:linear-gradient(transparent,rgba(0,0,0,0.88));padding:32px 10px 10px;">
          <p class="mb-0 fw-bold text-white" style="font-size:12px;line-height:1.2;">${title}</p>
        </div>

        <div class="position-absolute top-0 start-0 m-2">
          <span class="badge" style="background:#E23E3E;font-size:9px;font-weight:600;letter-spacing:.5px;">${type.toUpperCase()}</span>
        </div>

        ${start ? `
        <div class="position-absolute top-0 end-0 m-2">
          <span class="badge" style="background:#1111;color:#A0A0A0;font-size:10px;"><i class="bi bi-clock-fill me-1"></i>${start}</span>
        </div>` : ''}

        ${duration ? `
        <div class="position-absolute bottom-0 end-0 m-2">
          <span style="background:#000;color:#A0A0A0;font-size:10px;padding:2px 6px;border-radius:4px;">${duration}</span>
        </div>` : ''}
      </div>
    </div>`;
}

export async function loadPrograms() {
  const container = document.getElementById('programs-list');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(createSnakeLoader(40));

  try {
    // Charger les programmes (peut être des shows ou programs)
    const programsRaw = await api.getPrograms() || [];

    if (!programsRaw || programsRaw.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-calendar-event" style="font-size:3rem;color:#444;"></i>
          <p class="text-secondary mt-3">Aucun programme disponible</p>
        </div>`;
      return;
    }

    // Trier par date (plus récent en premier) 📅
    const programs = [...programsRaw].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || a.start_time || 0);
      const dateB = new Date(b.created_at || b.date || b.start_time || 0);
      return dateB - dateA;
    }).slice(0, 20); // Limiter à 20

    container.innerHTML = `<div class="row g-0 px-2 py-2">${programs.map(buildProgramCard).join('')}</div>`;

  } catch (err) {
    console.error('Erreur loadPrograms:', err);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-circle text-danger" style="font-size:2rem;"></i>
        <p class="text-secondary mt-2">Erreur lors du chargement</p>
        <button class="btn btn-sm btn-outline-danger mt-2" onclick="location.reload()">Réessayer</button>
      </div>`;
  }
}
