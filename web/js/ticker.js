// js/ticker.js
import { getProgramWeek, getProgramGrid } from '../../shared/services/api.js';

export async function loadTicker() {
  // Attendre que le header soit chargé et le ticker présent
  let tickerEl = document.getElementById('news-ticker');
  let attempts = 0;
  const maxAttempts = 50;
  
  while (!tickerEl && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100));
    tickerEl = document.getElementById('news-ticker');
    attempts++;
  }
  
  if (!tickerEl) return;

  const [inner1, inner2] = tickerEl.querySelectorAll('.ticker-track-inner');

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let allPrograms = [];

    // D'abord les programmes du jour
    const todayResponse = await getProgramGrid(todayStr, todayStr);
    if (todayResponse && todayResponse.days && todayResponse.days.length > 0 && todayResponse.days[0].programs) {
      allPrograms = todayResponse.days[0].programs;
    }

    // Si aucun programme aujourd'hui, prendre les prochains jours de la semaine
    if (allPrograms.length === 0) {
      const weekResponse = await getProgramWeek(0);
      if (weekResponse && weekResponse.days) {
        weekResponse.days.forEach(day => {
          if (day.programs && day.programs.length > 0) {
            // Garder seulement à partir d'aujourd'hui
            const upcoming = day.programs.filter(p => {
              if (!p.start_time) return false;
              return p.start_time.split('T')[0] >= todayStr;
            });
            allPrograms = [...allPrograms, ...upcoming];
          }
        });
      }
    }

    // Trier par heure de début
    allPrograms.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    // Limiter à 20 programmes max
    allPrograms = allPrograms.slice(0, 20);
    
    if (allPrograms.length > 0) {
      const tickerItems = allPrograms.map(program => {
        const title = program.title || 'Programme';
        const channel = program.channel_name || 'BF1 TV';
        let timeDisplay = '';
        let dateDisplay = '';
        if (program.start_time) {
          if (typeof program.start_time === 'string') {
            if (program.start_time.includes('T')) {
              const datePart = program.start_time.split('T')[0];
              timeDisplay = program.start_time.split('T')[1].substring(0, 5);
              if (datePart !== todayStr) {
                const dateObj = new Date(datePart);
                dateDisplay = ` ${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
              }
            } else {
              timeDisplay = program.start_time.substring(0, 5);
            }
          }
        }
        const liveIcon = program.is_live ? '<i class="bi bi-record-circle-fill me-1" style="color: #e8222a;"></i>' : '';
        return `<span>${liveIcon}${escapeHtml(title)} — ${escapeHtml(channel)}${timeDisplay ? ` (${timeDisplay})` : ''}</span>`;
      }).join('');
      if (inner1) inner1.innerHTML = tickerItems + tickerItems; // doublé pour boucle seamless
      if (inner2) inner2.innerHTML = ''; // non utilisé
      console.log('✅ Ticker mis à jour avec', allPrograms.length, 'programmes');
    } else {
      // Aucun programme : cacher le ticker
      tickerEl.style.display = 'none';
      console.log('📺 Aucun programme disponible, ticker masqué');
    }
    
  } catch (error) {
    console.error('❌ Erreur chargement du ticker:', error);
    tickerEl.style.display = 'none';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Auto-initialisation ──────────────────────────────────────────────────────
// Se déclenche automatiquement dès que .ticker-track apparaît dans le DOM.
// Aucun appel explicite nécessaire depuis les pages.
(function autoInit() {
  function tryInit() {
    if (document.querySelector('.ticker-track')) {
      loadTicker();
      return true;
    }
    return false;
  }
  if (!tryInit()) {
    const obs = new MutationObserver(() => {
      if (tryInit()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
})();