// js/services/programme.js
import { getProgramWeek, getProgramGrid, getPrograms } from '../../shared/services/api.js';
import { slugify, cacheProgram, getProgramDetailUrl } from '/shared/utils/slug-utils.js';

export class ProgrammesService {
  constructor() {
    // État actuel des filtres
    this.currentFilters = {
      type: null,
      category: 'all',
      timePeriod: 'all',
      sortBy: 'time',
    };
    
    this.currentWeek = 0;
    this.currentSelectedDate = null;
    this.programsByDay = {};
    this.currentDayPrograms = [];
    this.isLoading = false;
  }

  async init() {
    // Charger d'abord la semaine complète
    await this.loadWeeklyPrograms(0);
    // Initialiser avec la date d'aujourd'hui
    this.currentSelectedDate = this.getTodayDate();
    this.selectDayByDate(this.currentSelectedDate);
    this.setupEventListeners();
    this.renderDaySelector();
    this.updateDayFilterValue(this.currentSelectedDate);
  }

  // Retourne la date du jour en UTC (Afrique/Ouagadougou = UTC+0)
  getTodayDate() {
    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();
    // Crée une date à minuit UTC
    const utcMidnight = new Date(Date.UTC(utcYear, utcMonth, utcDate));
    return utcMidnight.toISOString().split('T')[0];
  }

  // Retourne la date à offset jours en UTC (Afrique/Ouagadougou = UTC+0)
  getDateFromOffset(offsetDays) {
    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();
    const utcMidnight = new Date(Date.UTC(utcYear, utcMonth, utcDate));
    utcMidnight.setUTCDate(utcMidnight.getUTCDate() + offsetDays);
    return utcMidnight.toISOString().split('T')[0];
  }

  selectDayByDate(date) {
    // Sélectionner un jour dans le cache
    if (this.programsByDay[date]) {
      this.currentDayPrograms = this.programsByDay[date].programs;
      this.currentSelectedDate = date;
      this.applyFiltersAndRender();
      this.renderFeatured();
      this.highlightDayInSelector(date);
      this.updateDayFilterValue(date);
    } else {
      // Si pas dans le cache, charger via getProgramGrid
      this.loadProgramsForDate(date);
    }
  }

  async loadProgramsForDate(date) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading();
    
    try {
      console.log(`📅 Chargement des programmes pour: ${date}`);
      
      const response = await getProgramGrid(date, date, this.currentFilters.type);
      
      if (response && response.days && response.days.length > 0) {
        const dayData = response.days[0];
        this.currentDayPrograms = (dayData.programs || []).map(prog => this.transformProgram(prog));
        this.currentSelectedDate = date;
        
        this.programsByDay[date] = {
          date: date,
          dayOfWeek: dayData.day_of_week,
          dayName: this.getDayName(dayData.day_of_week),
          programs: this.currentDayPrograms
        };
      } else {
        console.warn(`⚠️ Aucun programme pour ${date}`);
        this.currentDayPrograms = [];
      }
      
      this.applyFiltersAndRender();
      this.renderFeatured();
      this.highlightDayInSelector(date);
      
    } catch (error) {
      console.error('❌ Erreur chargement programmes:', error);
      this.showError('Impossible de charger les programmes');
    } finally {
      this.isLoading = false;
    }
  }

  async loadWeeklyPrograms(weeksAhead = 0) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading();
    
    try {
      console.log(`📅 Chargement de la semaine (offset: ${weeksAhead})`);
      const response = await getProgramWeek(weeksAhead, this.currentFilters.type);
      
      if (response && response.days) {
        console.log(`✅ ${response.days.length} jours chargés`);
        
        // Mettre à jour le cache avec tous les jours
        response.days.forEach(day => {
          const date = day.date;
          this.programsByDay[date] = {
            date: date,
            dayOfWeek: day.day_of_week,
            dayName: this.getDayName(day.day_of_week),
            programs: (day.programs || []).map(prog => this.transformProgram(prog))
          };
        });
        
        this.currentWeek = weeksAhead;
        
        // Re-rendre le sélecteur de jours
        this.renderDaySelector();
        
        // Afficher les logs des programmes trouvés
        const totalPrograms = Object.values(this.programsByDay).reduce((sum, day) => sum + day.programs.length, 0);
        console.log(`📺 Total programmes dans la semaine: ${totalPrograms}`);
        
        // Si la date sélectionnée existe, l'afficher
        if (this.currentSelectedDate && this.programsByDay[this.currentSelectedDate]) {
          this.currentDayPrograms = this.programsByDay[this.currentSelectedDate].programs;
          this.applyFiltersAndRender();
          this.renderFeatured();
          this.highlightDayInSelector(this.currentSelectedDate);
        } else if (Object.keys(this.programsByDay).length > 0) {
          // Sinon, afficher le premier jour qui a des programmes
          const firstDateWithPrograms = Object.keys(this.programsByDay).find(date => 
            this.programsByDay[date].programs.length > 0
          ) || Object.keys(this.programsByDay)[0];
          
          if (firstDateWithPrograms) {
            this.currentSelectedDate = firstDateWithPrograms;
            this.currentDayPrograms = this.programsByDay[firstDateWithPrograms].programs;
            this.applyFiltersAndRender();
            this.renderFeatured();
            this.highlightDayInSelector(firstDateWithPrograms);
            this.updateDayFilterValue(firstDateWithPrograms);
          }
        }
      } else {
        console.warn('⚠️ Aucune donnée de semaine reçue');
        this.programsByDay = {};
      }
    } catch (error) {
      console.error('❌ Erreur chargement semaine:', error);
      this.showError('Impossible de charger les programmes');
    } finally {
      this.isLoading = false;
    }
  }

  transformProgram(program) {
    // Extraire l'heure du start_time (gère les formats ISO)
    let timeDisplay = '00:00';
    let startTime = program.start_time;
    
    if (startTime) {
      if (typeof startTime === 'string') {
        // Format ISO: "2026-03-29T08:30:00.000+00:00"
        if (startTime.includes('T')) {
          timeDisplay = startTime.split('T')[1].substring(0, 5);
        } else {
          timeDisplay = startTime.substring(0, 5);
        }
      }
    }
    
    return {
      id: program.id || program._id,
      title: program.title,
      description: program.description || '',
      startTime: program.start_time,
      endTime: program.end_time,
      duration: program.duration,
      channel: program.channel_name || 'BF1 TV',
      channelId: program.channel_id,
      channelIcon: this.getChannelIcon(program.channel_name),
      category: program.category || 'divertissement',
      type: program.type || 'replay',
      isLive: program.is_live || false,
      hasReplay: program.has_replay || false,
      image: program.image_url || program.thumbnail || null,
      videoUrl: program.video_url,
      host: program.host,
      tags: program.tags || [],
      views: program.views || 0,
      likes: program.likes || 0,
      rating: program.rating || 0,
      period: this.getPeriodFromTime(timeDisplay),
      hour: parseInt(timeDisplay.split(':')[0]),
      timeDisplay: timeDisplay
    };
  }

  getDayName(dayOfWeek) {
    const days = {
      0: 'Dimanche',
      1: 'Lundi',
      2: 'Mardi',
      3: 'Mercredi',
      4: 'Jeudi',
      5: 'Vendredi',
      6: 'Samedi'
    };
    return days[dayOfWeek] || 'Lundi';
  }

  getChannelIcon(channelName) {
    const icons = {
      'BF1 National': 'bi-tv-fill',
      'BF1 Sport': 'bi-trophy-fill',
      'BF1 Culture': 'bi-music-note-fill',
      'BF1 Info': 'bi-mic-fill',
      'BF1 Musique': 'bi-music-note-beamed'
    };
    return icons[channelName] || 'bi-tv-fill';
  }

  getPeriodFromTime(time) {
    if (!time) return 'morning';
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  getFilteredPrograms() {
    let programs = [...this.currentDayPrograms];
    
    if (this.currentFilters.category !== 'all') {
      programs = programs.filter(p => p.category === this.currentFilters.category);
    }
    
    if (this.currentFilters.type) {
      if (this.currentFilters.type === 'live') {
        programs = programs.filter(p => p.isLive);
      } else if (this.currentFilters.type === 'replay') {
        programs = programs.filter(p => p.hasReplay);
      } else if (this.currentFilters.type === 'event') {
        programs = programs.filter(p => p.type === 'event');
      }
    }
    
    if (this.currentFilters.timePeriod !== 'all') {
      programs = programs.filter(p => p.period === this.currentFilters.timePeriod);
    }
    
    switch (this.currentFilters.sortBy) {
      case 'time':
        programs.sort((a, b) => a.timeDisplay.localeCompare(b.timeDisplay));
        break;
      case 'trending':
        programs.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'popular':
        programs.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      default:
        programs.sort((a, b) => a.timeDisplay.localeCompare(b.timeDisplay));
    }
    
    return programs;
  }

  applyFiltersAndRender() {
    const filtered = this.getFilteredPrograms();
    this.renderProgramsToContainer(filtered, document.getElementById('programsList'));
  }

  setupEventListeners() {
    const dayFilter = document.getElementById('dayFilter');
    if (dayFilter) {
      dayFilter.addEventListener('change', async (e) => {
        const value = e.target.value;
        let targetDate = null;
        
        if (value === 'today') {
          targetDate = this.getTodayDate();
        } else if (value === 'tomorrow') {
          targetDate = this.getDateFromOffset(1);
        } else if (value === 'after-tomorrow') {
          targetDate = this.getDateFromOffset(2);
        }
        
        if (targetDate) {
          // Vérifier si la date est dans le cache
          if (this.programsByDay[targetDate]) {
            this.currentDayPrograms = this.programsByDay[targetDate].programs;
            this.currentSelectedDate = targetDate;
            this.applyFiltersAndRender();
            this.renderFeatured();
            this.highlightDayInSelector(targetDate);
          } else {
            // Recharger la semaine si nécessaire
            const targetDateObj = new Date(targetDate);
            const today = new Date();
            const diffDays = Math.floor((targetDateObj - today) / (1000 * 60 * 60 * 24));
            const weeksAhead = Math.floor(diffDays / 7);
            
            if (weeksAhead !== this.currentWeek) {
              await this.loadWeeklyPrograms(weeksAhead);
            }
            this.selectDayByDate(targetDate);
          }
          
          this.updateDayFilterValue(targetDate);
        }
      });
    }
    
    const timeFilter = document.getElementById('timeFilter');
    if (timeFilter) {
      timeFilter.addEventListener('change', (e) => {
        this.currentFilters.timePeriod = e.target.value;
        this.applyFiltersAndRender();
      });
    }
    
    const genreFilter = document.getElementById('genreFilter');
    if (genreFilter) {
      genreFilter.addEventListener('change', (e) => {
        this.currentFilters.category = e.target.value;
        this.applyFiltersAndRender();
      });
    }
    
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabType = tab.dataset.tab;
        if (tabType === 'trending') {
          this.currentFilters.sortBy = 'trending';
          this.currentFilters.type = null;
        } else if (tabType === 'popular') {
          this.currentFilters.sortBy = 'popular';
          this.currentFilters.type = null;
        } else if (tabType === 'recent') {
          this.currentFilters.sortBy = 'time';
          this.currentFilters.type = null;
        } else {
          this.currentFilters.sortBy = 'time';
          this.currentFilters.type = tabType;
        }
        
        this.applyFiltersAndRender();
      });
    });
  }

  updateDayFilterValue(date) {
    const dayFilter = document.getElementById('dayFilter');
    if (!dayFilter) return;
    
    const today = this.getTodayDate();
    const tomorrow = this.getDateFromOffset(1);
    const afterTomorrow = this.getDateFromOffset(2);
    
    if (date === today) {
      dayFilter.value = 'today';
    } else if (date === tomorrow) {
      dayFilter.value = 'tomorrow';
    } else if (date === afterTomorrow) {
      dayFilter.value = 'after-tomorrow';
    } else {
      dayFilter.value = 'today';
    }
  }

  renderDaySelector() {
    const container = document.getElementById('daySelector');
    if (!container) return;
    
    const weekDates = this.getWeekDates();
    
    container.innerHTML = weekDates.map((date, index) => `
      <div class="day-btn" data-date="${date.date}" data-index="${index}">
        <div class="day-name">${date.dayName}</div>
        <div class="day-date">${date.dayDate}</div>
        ${this.programsByDay[date.date] && this.programsByDay[date.date].programs.length > 0 ? '<span class="has-programs-dot"></span>' : ''}
      </div>
    `).join('');
    
    document.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const selectedDate = btn.dataset.date;
        this.selectDayByDate(selectedDate);
      });
    });
    
    this.highlightDayInSelector(this.currentSelectedDate);
  }
  
  highlightDayInSelector(date) {
    document.querySelectorAll('.day-btn').forEach(btn => {
      if (btn.dataset.date === date) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  getWeekDates() {
    // Utiliser UTC partout pour éviter les décalages dus au fuseau horaire local
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const currentDayUTC = todayUTC.getUTCDay(); // 0=Dim, 1=Lun...
    const diffToMonday = currentDayUTC === 0 ? -6 : 1 - currentDayUTC;

    const monday = new Date(todayUTC);
    monday.setUTCDate(todayUTC.getUTCDate() + diffToMonday + (this.currentWeek * 7));

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + i);

      weekDates.push({
        date: date.toISOString().split('T')[0],
        dayName: this.getDayName(i + 1 > 6 ? 0 : i + 1),
        dayDate: `${date.getUTCDate()} ${this.getMonthName(date.getUTCMonth())}`
      });
    }

    return weekDates;
  }
  
  getMonthName(month) {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months[month];
  }
  
  renderProgramsToContainer(programs, container) {
    if (!container) return;
    
    if (!programs.length) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-calendar-x" style="font-size: 3rem; color: var(--text-secondary);"></i>
          <p class="mt-3">Aucun programme trouvé pour cette date</p>
          <p class="small text-secondary">Date: ${this.currentSelectedDate}</p>
        </div>
      `;
      return;
    }
    
    const grouped = {
      morning: programs.filter(p => p.period === 'morning'),
      afternoon: programs.filter(p => p.period === 'afternoon'),
      evening: programs.filter(p => p.period === 'evening')
    };
    
    let html = '';
    
    for (const [period, periodPrograms] of Object.entries(grouped)) {
      if (periodPrograms.length === 0) continue;
      
      const periodLabel = this.getPeriodLabel(period);
      html += `
        <span class="time-period-label ${period}">
          <i class="bi ${periodLabel.icon} me-1"></i>${periodLabel.text}
        </span>
      `;
      
      periodPrograms.forEach(program => {
        const thumbHtml = program.image 
          ? `<img src="${program.image}" alt="${program.title}"/>`
          : `<div style="width:100%;height:100%;background:var(--bg-3);display:flex;align-items:center;justify-content:center;color:var(--text-3)"><i class="bi bi-camera-video-fill"></i></div>`;
        
        html += `
          <div class="programme-item anim-up" data-id="${program.id}" data-title="${this.escapeHtml(program.title)}">
            <div class="programme-time">${program.timeDisplay}</div>
            <div class="programme-thumb">${thumbHtml}</div>
            <div class="programme-info">
              <div class="programme-title">${this.escapeHtml(program.title)}</div>
              <div class="programme-channel">
                <i class="bi ${program.channelIcon}"></i>${this.escapeHtml(program.channel)}
              </div>
              ${program.description ? `<div class="programme-desc small text-secondary mt-1">${this.escapeHtml(program.description.substring(0, 60))}${program.description.length > 60 ? '...' : ''}</div>` : ''}
            </div>
            ${this.getBadge(program)}
          </div>
        `;
      });
    }
    
    container.innerHTML = html;
    
    document.querySelectorAll('.programme-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const title = item.dataset.title || '';
        this.showProgrammeDetails(id, title);
      });
    });
  }
  
  renderFeatured() {
    const container = document.getElementById('featuredContent');
    if (!container) return;
    
    const featured = this.currentDayPrograms.find(p => p.isLive) || 
                     this.currentDayPrograms.find(p => p.type === 'event') ||
                     this.currentDayPrograms[0];
    
    if (!featured) {
      container.innerHTML = '<div class="text-center p-5">Aucun programme en vedette</div>';
      return;
    }
    
    const imageUrl = featured.image || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80';
    
    container.innerHTML = `
      <img src="${imageUrl}" alt="${this.escapeHtml(featured.title)}" style="width:100%;height:100%;object-fit:cover;"/>
      <div class="ala-une-overlay">
        <div class="ala-une-title">${this.escapeHtml(featured.title)}</div>
        <div class="ala-une-meta">${this.escapeHtml(featured.channel)} · ${featured.timeDisplay}</div>
        <div class="ala-une-desc small mt-2">${featured.description ? this.escapeHtml(featured.description.substring(0, 100)) + (featured.description.length > 100 ? '...' : '') : ''}</div>
        <button class="btn-red mt-3" style="font-size:0.8rem;padding:7px 16px" onclick="window.location.href='${getProgramDetailUrl(featured.title, featured.id)}'">
          <i class="bi bi-broadcast"></i>${featured.isLive ? 'EN DIRECT' : 'VOIR LE PROGRAMME'}
        </button>
      </div>
    `;
  }
  
  async showProgrammeDetails(programId, programTitle = '') {
    try {
      const url = getProgramDetailUrl(programTitle, programId);
      window.location.href = url;
    } catch (error) {
      console.error('Erreur affichage détails programme:', error);
    }
  }
  
  getPeriodLabel(period) {
    const labels = {
      morning: { icon: 'bi-sunrise-fill', text: 'Matin' },
      afternoon: { icon: 'bi-sun-fill', text: 'Après-midi' },
      evening: { icon: 'bi-moon-fill', text: 'Soirée' }
    };
    return labels[period] || { icon: 'bi-clock', text: period };
  }
  
  getBadge(program) {
    if (program.isLive) {
      return '<span class="badge-live"><i class="bi bi-record-circle me-1"></i>EN DIRECT</span>';
    }
    if (program.type === 'premium') {
      return '<span class="badge-premium"><i class="bi bi-star-fill me-1"></i>PREMIUM</span>';
    }
    if (program.type === 'event') {
      return '<span class="badge-event"><i class="bi bi-calendar-event-fill me-1"></i>ÉVÉNEMENT</span>';
    }
    if (program.hasReplay) {
      return '<span class="badge-replay"><i class="bi bi-arrow-counterclockwise me-1"></i>REPLAY</span>';
    }
    return '';
  }
  
  showLoading() {
    const container = document.getElementById('programsList');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-danger" role="status">
            <span class="visually-hidden">Chargement...</span>
          </div>
          <p class="mt-3">Chargement des programmes...</p>
        </div>
      `;
    }
  }
  
  showError(message) {
    const container = document.getElementById('programsList');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-5 text-danger">
          <i class="bi bi-exclamation-triangle-fill" style="font-size: 2rem;"></i>
          <p class="mt-3">${this.escapeHtml(message)}</p>
          <button class="btn btn-outline-danger mt-2" onclick="location.reload()">Réessayer</button>
        </div>
      `;
    }
  }
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}