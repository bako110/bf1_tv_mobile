// js/ticker.js
import { getProgramWeek, getProgramGrid } from '../shared/services/api.js';

export async function loadTicker() {
  let tickerTrack = document.querySelector('.ticker-track');
  let attempts = 0;
  const maxAttempts = 50;
  
  while (!tickerTrack && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100));
    tickerTrack = document.querySelector('.ticker-track');
    attempts++;
  }
  
  if (!tickerTrack) {
    console.error('❌ Élément .ticker-track non trouvé');
    return;
  }

  try {
    console.log('📡 Chargement des programmes pour le ticker...');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Essayer d'abord avec getProgramWeek (comme dans programme.js)
    console.log('📅 Tentative avec getProgramWeek...');
    const weekResponse = await getProgramWeek(0);
    console.log('📡 Réponse getProgramWeek:', weekResponse);
    
    let allPrograms = [];
    
    if (weekResponse && weekResponse.days && weekResponse.days.length > 0) {
      // Récupérer tous les programmes de la semaine
      weekResponse.days.forEach(day => {
        if (day.programs && day.programs.length > 0) {
          allPrograms = [...allPrograms, ...day.programs];
        }
      });
      console.log(`✅ ${allPrograms.length} programmes trouvés dans la semaine`);
    }
    
    // Si aucun programme trouvé, essayer getProgramGrid
    if (allPrograms.length === 0) {
      console.log('⚠️ Aucun programme dans la semaine, essai avec getProgramGrid...');
      const todayResponse = await getProgramGrid(todayStr, todayStr);
      if (todayResponse && todayResponse.days && todayResponse.days.length > 0 && todayResponse.days[0].programs) {
        allPrograms = todayResponse.days[0].programs;
        console.log(`✅ ${allPrograms.length} programmes trouvés pour aujourd'hui`);
      }
    }
    
    // Trier les programmes par date et heure
    allPrograms.sort((a, b) => {
      const dateA = new Date(a.start_time);
      const dateB = new Date(b.start_time);
      return dateA - dateB;
    });
    
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
              // Si la date n'est pas aujourd'hui, afficher la date
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
        
        return `<span>${liveIcon}${escapeHtml(title)} — ${escapeHtml(channel)} ${timeDisplay ? `(${timeDisplay}${dateDisplay})` : ''}</span>`;
      }).join('');
      
      tickerTrack.innerHTML = tickerItems;
      console.log('✅ Ticker mis à jour avec', allPrograms.length, 'programmes');
      
    } else {
      // Données par défaut
      tickerTrack.innerHTML = `
        <span><i class="bi bi-record-circle-fill me-1" style="color: #e8222a;"></i>Journal de 20h — BF1 National (20:00)</span>
        <span>CAN 2024 : Match des Étalons — BF1 Sport (18:00)</span>
        <span>Festival International de Ouagadougou — BF1 Culture (15:00)</span>
        <span>Débat politique — BF1 Info (21:00)</span>
        <span>Top 50 — BF1 Musique (22:30)</span>
      `;
      console.log('📺 Utilisation des données par défaut');
    }
    
  } catch (error) {
    console.error('❌ Erreur chargement du ticker:', error);
    tickerTrack.innerHTML = `
      <span><i class="bi bi-record-circle-fill me-1" style="color: #e8222a;"></i>Journal de 20h — BF1 National (20:00)</span>
      <span>CAN 2024 : Match des Étalons — BF1 Sport (18:00)</span>
      <span>Festival International de Ouagadougou — BF1 Culture (15:00)</span>
      <span>Débat politique — BF1 Info (21:00)</span>
      <span>Top 50 — BF1 Musique (22:30)</span>
    `;
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