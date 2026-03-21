import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

// ── État global ────────────────────────────────────────────────────────────────
let _allGroupedDays = [];     // TOUS les jours chargés: [{date, day_name, programs}, ...]
let _selectedDate = null;     // Date spécifique sélectionnée (via calendrier complet)
let _selectedDay = null;      // Jour sélectionné pour afficher ses programmes
let _selectedType = 'Tous';   // Filtre type d'émission
let _selectedStatus = 'Tous'; // Filtre statut: Tous, En direct, À venir
let _selectedPeriod = 'Tous'; // Filtre période: Tous, Aujourd'hui, Demain, Cette semaine, Week-end, Passés
let _weekDates = [];          // Dates de la semaine courante
let _loading = false;

// Formater heure: "14:30"
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Formater titre section: "Lundi 24 mars"
function formatDateTitle(dateStr) {
  const d = new Date(dateStr);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// Déterminer statut: "En direct", "À venir", "Passé"
function getStatus(startTime, endTime) {
  if (!startTime) return 'Passé';
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 3600000);
  
  if (now >= start && now <= end) return 'En direct';
  if (start > now) return 'À venir';
  return 'Passé';
}

// Trier programmes: live > à venir > passé > par heure
function sortByStatus(programs) {
  const now = new Date();
  
  return [...programs].sort((a, b) => {
    const aStart = new Date(a.start_time || 0);
    const bStart = new Date(b.start_time || 0);
    const aEnd = new Date(a.end_time || aStart.getTime() + 3600000);
    const bEnd = new Date(b.end_time || bStart.getTime() + 3600000);
    
    const aLive = now >= aStart && now <= aEnd;
    const bLive = now >= bStart && now <= bEnd;
    const aFuture = aStart > now;
    const bFuture = bStart > now;
    
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    
    return aStart - bStart;
  });
}

// Filtrer programmes par critères
function filterPrograms(programs, dateStr) {
  return programs.filter(prog => {
    // Filtre type
    if (_selectedType !== 'Tous') {
      const progType = prog.type || prog.category || '';
      if (progType !== _selectedType) return false;
    }
    
    // Filtre statut
    if (_selectedStatus !== 'Tous') {
      const status = getStatus(prog.start_time, prog.end_time);
      if (status !== _selectedStatus) return false;
    }
    
    // Filtre période
    if (_selectedPeriod !== 'Tous') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const progDate = new Date(dateStr);
      progDate.setHours(0, 0, 0, 0);
      
      const daysFromToday = Math.floor((progDate - now) / (1000 * 60 * 60 * 24));
      
      if (_selectedPeriod === 'Aujourd\'hui' && daysFromToday !== 0) return false;
      if (_selectedPeriod === 'Demain' && daysFromToday !== 1) return false;
      if (_selectedPeriod === 'Cette semaine' && (daysFromToday < 0 || daysFromToday > 6)) return false;
      if (_selectedPeriod === 'Week-end') {
        const dayOfWeek = progDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;
      }
      if (_selectedPeriod === 'Passés' && progDate >= now) return false;
    }
    
    return true;
  });
}

// Générer dates de la semaine courante
function generateWeekDates() {
  const dates = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push({
      date: date.toISOString().split('T')[0],
      dayName: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()],
      dayNumber: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
    });
  }
  return dates;
}

// Construire carte programme avec statut et couleur
function buildProgramCard(prog) {
  const image = prog.image_url || prog.image || '';
  const title = prog.title || 'Titre';
  const type = prog.type || prog.category || 'Programme';
  const start = formatTime(prog.start_time);
  const status = getStatus(prog.start_time, prog.end_time);
  
  const statusColors = {
    'En direct': '#E23E3E',
    'À venir': '#666',
    'Passé': '#333'
  };
  const statusColor = statusColors[status] || '#333';
  const opacity = status === 'Passé' ? 0.6 : 1;

  return `
    <div style="border:1px solid #1a1a1a;border-radius:6px;padding:12px;margin-bottom:12px;background:#0a0a0a;opacity:${opacity};">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        ${image ? `<img src="${image}" style="width:80px;height:60px;border-radius:4px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'" />` : ''}
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <h5 style="margin:0;font-size:13px;font-weight:600;color:#fff;line-height:1.3;">${title}</h5>
            <span style="background:${statusColor};color:#fff;padding:2px 6px;border-radius:3px;font-size:9px;white-space:nowrap;flex-shrink:0;font-weight:600;">${status}</span>
          </div>
          <p style="margin:4px 0;font-size:11px;color:#A0A0A0;"><i class="bi bi-tag me-1"></i>${type}</p>
          ${start ? `<p style="margin:2px 0;font-size:11px;color:#A0A0A0;"><i class="bi bi-clock me-1"></i>${start}</p>` : ''}
        </div>
      </div>
    </div>`;
}

// Charger données: semaine courante OU date spécifique OU passés
async function loadPrograms_() {
  try {
    let result;
    
    // MODE 1: Date spécifique du calendrier
    if (_selectedDate) {
      const endDate = new Date(_selectedDate);
      endDate.setDate(endDate.getDate() + 1);
      result = await api.getProgramGrid(
        _selectedDate,
        endDate.toISOString().split('T')[0],
        _selectedType !== 'Tous' ? _selectedType : null
      );
    }
    // MODE 2: Passés (charger historique)
    else if (_selectedPeriod === 'Passés') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
      result = await api.getProgramGrid(
        '2020-01-01',
        endDate.toISOString().split('T')[0],
        _selectedType !== 'Tous' ? _selectedType : null
      );
    }
    // MODE 3: Par défaut - semaine courante
    else {
      result = await api.getProgramWeek(
        0,
        _selectedType !== 'Tous' ? _selectedType : null
      );
    }
    
    _allGroupedDays = result?.days || [];
    
    // Sélection intelligente du jour
    if (_allGroupedDays.length > 0 && !_selectedDay) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // PRIORITÉ 1: Aujourd'hui
      const todaySection = _allGroupedDays.find(d => {
        const d2 = new Date(d.date);
        d2.setHours(0, 0, 0, 0);
        return d2.toDateString() === today.toDateString();
      });
      
      if (todaySection) {
        _selectedDay = todaySection.date;
      } else if (_selectedPeriod === 'Passés') {
        // PRIORITÉ 2: Si passés, sélectionner dernier jour
        _selectedDay = _allGroupedDays[_allGroupedDays.length - 1].date;
      } else {
        // PRIORITÉ 3: Premier jour disponible
        _selectedDay = _allGroupedDays[0].date;
      }
    }
    
    _weekDates = generateWeekDates();
  } catch (err) {
    console.error('Erreur loadPrograms_:', err);
  }
}

// Afficher programmes du jour sélectionné
function renderPrograms() {
  const container = document.getElementById('programs-list');
  if (!container) return;
  
  // Filtrer à afficher: uniquement le jour sélectionné
  const sections = _allGroupedDays.filter(section => {
    // Si filtre de période avec plusieurs jours, afficher tous les jours válides
    if (_selectedPeriod !== 'Tous' && !_selectedDate) {
      return filterPrograms(section.programs || [], section.date).length > 0;
    }
    // Sinon afficher seulement le jour sélectionné
    return section.date === _selectedDay;
  });
  
  if (sections.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5" style="margin-top:60px;">
        <i class="bi bi-calendar-event" style="font-size:3rem;color:#444;"></i>
        <p class="text-secondary mt-3">Aucun programme ne correspond aux filtres</p>
      </div>`;
    return;
  }
  
  let html = '<div style="padding:0;">';
  
  sections.forEach(section => {
    const programs = sortByStatus((section.programs || []).filter(p => filterPrograms([p], section.date).length > 0));
    if (programs.length === 0) return;
    
    const title = formatDateTitle(section.date);
    
    html += `
      <div style="padding:12px;border-bottom:1px solid #1a1a1a;">
        <h3 style="font-size:14px;font-weight:700;color:#E23E3E;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #1e1e1e;">
          <i class="bi bi-calendar3 me-2"></i>${title} (${programs.length})
        </h3>
        <div>
          ${programs.map(buildProgramCard).join('')}
        </div>
      </div>`;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Afficher sélecteur de jours
function renderDaySelector() {
  const container = document.getElementById('programs-days');
  if (!container) return;
  
  // Si une date est sélectionnée, cacher le sélecteur
  if (_selectedDate) {
    container.innerHTML = '';
    return;
  }
  
  // Afficher TOUS les jours du groupedDays avec count
  let html = '<div style="overflow-x:auto;padding:8px;display:flex;gap:6px;-webkit-overflow-scrolling:touch;">';
  
  _allGroupedDays.forEach(day => {
    const filteredPrograms = filterPrograms(day.programs || [], day.date);
    const isSelected = _selectedDay === day.date;
    const d = new Date(day.date);
    const isToday = d.toDateString() === new Date().toDateString();
    
    const bgColor = isSelected ? '#E23E3E' : (isToday ? '#1a1a1a' : '#0a0a0a');
    const textColor = isSelected ? '#fff' : '#A0A0A0';
    
    html += `
      <button onclick="window._selectDay('${day.date}')" style="
        background:${bgColor};
        border:1px solid ${isSelected ? '#E23E3E' : '#1e1e1e'};
        padding:8px;
        border-radius:6px;
        cursor:pointer;
        flex-shrink:0;
        text-align:center;
        min-width:60px;
      ">
        <div style="font-size:10px;color:${textColor};font-weight:600;">${day.day_name || d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
        <div style="font-size:12px;color:${textColor};font-weight:700;margin:2px 0;">${d.getDate()}</div>
        <div style="font-size:8px;color:${textColor};">${filteredPrograms.length}</div>
      </button>`;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Afficher calendrier semaine + navigation
function renderWeekCalendar() {
  const container = document.getElementById('programs-calendar');
  if (!container) return;
  
  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;gap:6px;">
      ${_selectedDate ? `<button onclick="window._selectDate(null)" style="background:#0a0a0a;border:1px solid #1e1e1e;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap;"><i class="bi bi-arrow-left me-1"></i>Semaine</button>` : ''}
      <div style="overflow-x:auto;display:flex;gap:6px;flex:1;-webkit-overflow-scrolling:touch;">`;
  
  _weekDates.forEach(day => {
    const isSelected = _selectedDate === day.date;
    const bgColor = isSelected ? '#E23E3E' : (day.isToday ? '#1a1a1a' : '#0a0a0a');
    const textColor = isSelected ? '#fff' : '#A0A0A0';
    
    html += `
      <button onclick="window._selectDate('${day.date}')" style="
        background:${bgColor};
        border:1px solid ${isSelected ? '#E23E3E' : '#1e1e1e'};
        padding:6px 10px;
        border-radius:4px;
        cursor:pointer;
        flex-shrink:0;
        text-align:center;
        font-size:10px;
        ${day.isToday && !isSelected ? 'border-color:#E23E3E;' : ''}
      ">
        <div style="color:${textColor};font-weight:600;">${day.dayName}</div>
        <div style="color:${textColor};font-weight:700;font-size:11px;">${day.dayNumber}</div>
      </button>`;
  });
  
  html += `</div>
    </div>`;
  
  container.innerHTML = html;
}

// Afficher modal calendrier complet
window._openCalendarModal = function() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let displayMonth = currentMonth;
  let displayYear = currentYear;
  
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  
  function renderCalendar(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    let calendarHtml = '';
    
    // Jours de la semaine
    const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    calendarHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px;">';
    weekDays.forEach(day => {
      calendarHtml += `<div style="text-align:center;font-size:10px;color:#666;font-weight:600;padding:8px 0;">${day}</div>`;
    });
    calendarHtml += '</div>';
    
    // Grille des jours
    calendarHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">';
    
    // Jours du mois précédent
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      calendarHtml += `<button style="padding:8px;background:#0a0a0a;border:1px solid #2a2a2a;color:#333;border-radius:4px;cursor:not-allowed;font-size:12px;" disabled>${prevLastDay - i}</button>`;
    }
    
    // Jours du mois courant
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isSelected = dateStr === _selectedDate;
      
      const bgColor = isSelected ? '#E23E3E' : (isToday ? '#1a1a1a' : '#0a0a0a');
      const borderColor = isSelected ? '#E23E3E' : (isToday ? '#1e1e1e' : '#1e1e1e');
      const textColor = isSelected ? '#fff' : '#A0A0A0';
      
      calendarHtml += `
        <button onclick="window._selectCalendarDay('${dateStr}')" style="
          padding:8px;
          background:${bgColor};
          border:1px solid ${borderColor};
          color:${textColor};
          border-radius:4px;
          cursor:pointer;
          font-size:12px;
          font-weight:600;
          transition:all 0.2s;
        ">${day}</button>`;
    }
    
    // Jours du mois suivant
    const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
      calendarHtml += `<button style="padding:8px;background:#0a0a0a;border:1px solid #2a2a2a;color:#333;border-radius:4px;cursor:not-allowed;font-size:12px;" disabled>${day}</button>`;
    }
    
    calendarHtml += '</div>';
    return calendarHtml;
  }
  
  const html = `
    <div id="calendar-modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:1000;" onclick="if(event.target === this) _closeCalendarModal()">
      <div style="position:absolute;bottom:0;left:0;right:0;background:#1a1a1a;border-radius:12px 12px 0 0;max-height:70vh;overflow-y:auto;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;color:#fff;font-size:16px;">Sélectionner une date</h3>
          <button onclick="_closeCalendarModal()" style="background:none;border:none;cursor:pointer;color:#E23E3E;font-size:20px;"><i class="bi bi-x"></i></button>
        </div>
        
        <div id="calendar-container" style="background:#0a0a0a;padding:16px;border-radius:8px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <button onclick="window._prevCalendarMonth()" style="background:none;border:none;color:#E23E3E;cursor:pointer;font-size:18px;"><i class="bi bi-chevron-left"></i></button>
            <h4 id="calendar-month-year" style="margin:0;color:#fff;font-size:14px;flex:1;text-align:center;"></h4>
            <button onclick="window._nextCalendarMonth()" style="background:none;border:none;color:#E23E3E;cursor:pointer;font-size:18px;"><i class="bi bi-chevron-right"></i></button>
          </div>
          
          <div id="calendar-days" style="margin-top:12px;"></div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button onclick="window._closeCalendarModal()" style="background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;padding:10px;border-radius:4px;cursor:pointer;">Annuler</button>
          <button onclick="window._applyCalendarDate()" style="background:#E23E3E;border:none;color:#fff;padding:10px;border-radius:4px;cursor:pointer;font-weight:600;">Appliquer</button>
        </div>
      </div>
    </div>`;
  
  document.body.insertAdjacentHTML('beforeend', html);
  
  // Rendre le calendrier initial
  window._updateCalendarDisplay = function(month, year) {
    document.getElementById('calendar-month-year').textContent = `${months[month]} ${year}`;
    document.getElementById('calendar-days').innerHTML = renderCalendar(month, year);
  };
  
  window._prevCalendarMonth = function() {
    displayMonth--;
    if (displayMonth < 0) {
      displayMonth = 11;
      displayYear--;
    }
    window._updateCalendarDisplay(displayMonth, displayYear);
  };
  
  window._nextCalendarMonth = function() {
    displayMonth++;
    if (displayMonth > 11) {
      displayMonth = 0;
      displayYear++;
    }
    window._updateCalendarDisplay(displayMonth, displayYear);
  };
  
  window._selectCalendarDay = function(dateStr) {
    _selectedDate = dateStr;
    // Re-rendre pour mettre à jour la sélection
    window._updateCalendarDisplay(displayMonth, displayYear);
  };
  
  window._updateCalendarDisplay(displayMonth, displayYear);
};

window._closeCalendarModal = function() {
  const modal = document.getElementById('calendar-modal-overlay');
  if (modal) modal.remove();
};

window._applyCalendarDate = async function() {
  if (_selectedDate) {
    _selectedDay = null;
    _selectedPeriod = 'Tous';
    window._closeCalendarModal();
    await _loadAndRender();
  }
};

// Sélectionner jour depuis calendrier semaine
window._selectDate = async function(dateStr) {
  _selectedDate = dateStr;
  if (!dateStr) {
    _selectedDay = null;
    _selectedPeriod = 'Tous';
  }
  await _loadAndRender();
};

// Sélectionner jour du sélecteur
window._selectDay = async function(dateStr) {
  _selectedDay = dateStr;
  renderDaySelector();
  renderPrograms();
};

// Charger et afficher
window._loadAndRender = async function() {
  const container = document.getElementById('programs-list');
  container.innerHTML = '';
  container.appendChild(createSnakeLoader(40));
  
  await loadPrograms_();
  renderWeekCalendar();
  renderDaySelector();
  renderPrograms();
};

// Afficher modal filtres
window._openFilterModal = function() {
  const html = `
    <div id="filter-modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:1000;" onclick="if(event.target === this) window._closeFilterModal()">
      <div style="position:absolute;bottom:0;left:0;right:0;background:#1a1a1a;border-radius:12px 12px 0 0;max-height:70vh;overflow-y:auto;padding:16px;">
        <h3 style="margin:0 0 16px;color:#fff;font-size:16px;">Filtrer</h3>
        
        <label style="display:block;margin-bottom:12px;font-size:12px;color:#A0A0A0;">Type</label>
        <select id="filter-type" onchange="window._updateFilters()" style="width:100%;padding:8px;background:#0a0a0a;border:1px solid #2a2a2a;color:#fff;border-radius:4px;margin-bottom:12px;">
          <option value="Tous">Tous</option>
          <option value="JT">JT</option>
          <option value="Magazine">Magazine</option>
          <option value="Sport">Sport</option>
        </select>
        
        <label style="display:block;margin-bottom:12px;font-size:12px;color:#A0A0A0;">Statut</label>
        <select id="filter-status" onchange="window._updateFilters()" style="width:100%;padding:8px;background:#0a0a0a;border:1px solid #2a2a2a;color:#fff;border-radius:4px;margin-bottom:12px;">
          <option value="Tous">Tous</option>
          <option value="En direct">En direct</option>
          <option value="À venir">À venir</option>
          <option value="Passé">Passé</option>
        </select>
        
        <label style="display:block;margin-bottom:12px;font-size:12px;color:#A0A0A0;">Période</label>
        <select id="filter-period" onchange="window._updateFilters()" style="width:100%;padding:8px;background:#0a0a0a;border:1px solid #2a2a2a;color:#fff;border-radius:4px;margin-bottom:12px;">
          <option value="Tous">Tous</option>
          <option value="Aujourd'hui">Aujourd'hui</option>
          <option value="Demain">Demain</option>
          <option value="Cette semaine">Cette semaine</option>
          <option value="Week-end">Week-end</option>
          <option value="Passés">Passés</option>
        </select>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button onclick="window._closeFilterModal()" style="background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;padding:10px;border-radius:4px;cursor:pointer;">Annuler</button>
          <button onclick="window._applyFilters()" style="background:#E23E3E;border:none;color:#fff;padding:10px;border-radius:4px;cursor:pointer;font-weight:600;">Appliquer</button>
        </div>
      </div>
    </div>`;
  
  document.body.insertAdjacentHTML('beforeend', html);
  
  document.getElementById('filter-type').value = _selectedType;
  document.getElementById('filter-status').value = _selectedStatus;
  document.getElementById('filter-period').value = _selectedPeriod;
};

window._updateFilters = function() {
  _selectedType = document.getElementById('filter-type').value;
  _selectedStatus = document.getElementById('filter-status').value;
  _selectedPeriod = document.getElementById('filter-period').value;
};

window._applyFilters = async function() {
  _updateFilters();
  _selectedDate = null;
  _selectedDay = null;
  window._closeFilterModal();
  await _loadAndRender();
};

window._closeFilterModal = function() {
  const modal = document.getElementById('filter-modal-overlay');
  if (modal) modal.remove();
};

window._resetFilters = async function() {
  _selectedType = 'Tous';
  _selectedStatus = 'Tous';
  _selectedPeriod = 'Tous';
  _selectedDate = null;
  _selectedDay = null;
  window._closeFilterModal();
  await _loadAndRender();
};

export async function loadPrograms() {
  const container = document.getElementById('programs-list');
  if (!container) return;
  
  if (_loading) return;
  _loading = true;

  try {
    // Créer conteneurs s'ils n'existent pas
    ['programs-calendar', 'programs-days'].forEach(id => {
      if (!document.getElementById(id)) {
        const header = document.querySelector('[style*="sticky-top"]');
        const div = document.createElement('div');
        div.id = id;
        div.style.cssText = 'background:#000;border-bottom:1px solid #1e1e1e;';
        if (header) header.insertAdjacentElement('afterend', div);
      }
    });
    
    // Charger et afficher
    await _loadAndRender();
    
  } catch (err) {
    console.error('Erreur loadPrograms:', err);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-circle text-danger" style="font-size:2rem;"></i>
        <p class="text-secondary mt-2">Erreur de chargement</p>
      </div>`;
  } finally {
    _loading = false;
  }
}
