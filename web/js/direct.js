// js/direct.js
import { getProgramWeek, getProgramGrid, getPrograms, toggleLike, getMyLikes, getMyReminders } from '../../shared/services/api.js';

export class DirectService {
  constructor() {
    this.currentLiveProgram = null;
    this.upcomingPrograms = [];
    this.allDayPrograms = [];
    this.isLoading = false;
    this.showAllPrograms = false;
    this.hls = null;
    this.videoElement = null;
    this.currentSelectedDate = null;
    this.reminderIds = new Set(); // IDs des programmes ayant déjà un rappel
  }

  async init() {
    this.currentSelectedDate = this.getTodayDate();
    await Promise.all([
      this.loadAllData(),
      this.loadMyReminders()
    ]);
    this.setupEventListeners();
    this.startAutoRefresh();
    await this.initVideoPlayer();
  }

  async loadMyReminders() {
    try {
      const reminders = await getMyReminders('scheduled', true);
      this.reminderIds = new Set((reminders || []).map(r => String(r.program_id)));
    } catch {
      // Non connecté ou API indisponible — on ignore
    }
  }

  getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  async initVideoPlayer() {
    const playerContainer = document.querySelector('.player-placeholder');
    if (!playerContainer) return;

    playerContainer.innerHTML = '';
    
    this.videoElement = document.createElement('video');
    this.videoElement.id = 'liveVideo';
    this.videoElement.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    this.videoElement.setAttribute('controls', 'true');
    this.videoElement.setAttribute('autoplay', 'true');
    this.videoElement.setAttribute('playsinline', 'true');
    this.videoElement.muted = true;
    
    playerContainer.appendChild(this.videoElement);

    const hlsUrl = 'https://bf1.fly.dev/api/v1/livestream/stream-proxy';

    // HLS.js en priorité : masque l'URL réelle (src = blob:..., pas le vrai m3u8)
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      this.hls = new Hls({ enableWorker: true, autoStartLoad: true });
      this.hls.loadSource(hlsUrl);
      this.hls.attachMedia(this.videoElement);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.videoElement.play().catch(e => console.log('Auto-play bloqué:', e));
      });
    }
    // Fallback natif uniquement si HLS.js non disponible (ex: vieux Safari sans CDN)
    else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      this.videoElement.src = hlsUrl;
      this.videoElement.play().catch(e => console.log('Auto-play bloqué:', e));
    }
    else {
      playerContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#1a1a1a;">
          <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: #666;"></i>
          <p style="color: #666;">Lecture HLS non supportée</p>
        </div>
      `;
    }
  }

  async loadAllData() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading();
    
    try {
      const today = this.getTodayDate();
      console.log(`📅 Chargement des programmes pour: ${today}`);
      
      // Essayer d'abord getProgramGrid
      let response = await getProgramGrid(today, today);
      console.log('📡 getProgramGrid réponse:', response);
      
      // Si pas de résultats, essayer getPrograms sans filtre
      if (!response || !response.days || response.days.length === 0) {
        console.log('⚠️ getProgramGrid vide, essai avec getPrograms');
        const allPrograms = await getPrograms();
        console.log('📡 getPrograms réponse:', allPrograms);
        
        if (allPrograms && allPrograms.length > 0) {
          // Filtrer les programmes du jour
          const todayPrograms = allPrograms.filter(p => {
            if (!p.start_time) return false;
            const progDate = p.start_time.split('T')[0];
            return progDate === today;
          });
          
          if (todayPrograms.length > 0) {
            this.allDayPrograms = todayPrograms.map(p => this.transformProgram(p));
            this.allDayPrograms.sort((a, b) => a.timeDisplay.localeCompare(b.timeDisplay));
          } else {
            this.allDayPrograms = [];
          }
        } else {
          this.allDayPrograms = [];
        }
      } else if (response.days && response.days.length > 0) {
        const dayData = response.days[0];
        this.allDayPrograms = (dayData.programs || []).map(p => this.transformProgram(p));
        this.allDayPrograms.sort((a, b) => a.timeDisplay.localeCompare(b.timeDisplay));
      }
      
      console.log(`✅ ${this.allDayPrograms.length} programmes trouvés pour aujourd'hui`);
      
      // Afficher les programmes trouvés
      if (this.allDayPrograms.length > 0) {
        console.log('📺 Programmes du jour:');
        this.allDayPrograms.forEach(p => {
          console.log(`   - ${p.timeDisplay} | ${p.title} | ${p.channel}`);
        });
      }
      
      // Trouver le programme en cours
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const currentProgram = this.allDayPrograms.find(p => {
        return p.timeDisplay <= currentTime && p.endTimeDisplay >= currentTime;
      });
      
      if (currentProgram) {
        this.currentLiveProgram = currentProgram;
        this.updatePlayerInfo(currentProgram);
        console.log('📺 Programme en cours:', currentProgram.title, 'à', currentProgram.timeDisplay);
      } else {
        // Si pas de programme en cours, prendre le premier programme du jour
        if (this.allDayPrograms.length > 0) {
          this.currentLiveProgram = this.allDayPrograms[0];
          this.updatePlayerInfo(this.currentLiveProgram);
        }
      }
      
      // Programmes à venir
      this.upcomingPrograms = this.allDayPrograms.filter(p => p.timeDisplay > currentTime);
      console.log(`📅 ${this.upcomingPrograms.length} programmes à venir`);
      
      // Mettre à jour les badges
      this.updateHeroBadges(this.allDayPrograms);
      
      this.renderAll();
      
    } catch (error) {
      console.error('❌ Erreur chargement des données:', error);
      this.showError('Impossible de charger les données');
    } finally {
      this.isLoading = false;
    }
  }

  transformProgram(program) {
    let timeDisplay = '00:00';
    let endTimeDisplay = '00:00';
    let startDate = '';
    let endDate = '';
    
    // Extraire la date et l'heure de début
    if (program.start_time) {
      if (typeof program.start_time === 'string') {
        if (program.start_time.includes('T')) {
          const parts = program.start_time.split('T');
          startDate = parts[0];
          timeDisplay = parts[1].substring(0, 5);
        } else if (program.start_time.includes(':')) {
          timeDisplay = program.start_time.substring(0, 5);
        }
      }
    }
    
    // Extraire l'heure de fin
    if (program.end_time) {
      if (typeof program.end_time === 'string') {
        if (program.end_time.includes('T')) {
          const parts = program.end_time.split('T');
          endDate = parts[0];
          endTimeDisplay = parts[1].substring(0, 5);
        } else if (program.end_time.includes(':')) {
          endTimeDisplay = program.end_time.substring(0, 5);
        }
      }
    }
    
    return {
      id: program.id || program._id,
      title: program.title || 'Programme',
      description: program.description || '',
      startDate: startDate,
      endDate: endDate,
      timeDisplay: timeDisplay,
      endTimeDisplay: endTimeDisplay,
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
      views: Math.floor(Math.random() * 5000) + 1000,
      period: this.getPeriodFromTime(timeDisplay)
    };
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

  updatePlayerInfo(program) {
    if (!program) return;
    
    const heroTitle = document.querySelector('.direct-hero-title');
    if (heroTitle) {
      heroTitle.innerHTML = `En Direct - ${this.escapeHtml(program.title)}`;
    }
    
    // (pas de compteur fictif sur le bouton like)
  }

  updateHeroBadges(programs) {
    const heroBadges = document.querySelector('.direct-hero-badges');
    if (!heroBadges) return;
    
    const liveCount = programs.filter(p => p.isLive === true).length;
    const totalViewers = programs.reduce((sum, p) => sum + (p.views || 0), 0);
    
    heroBadges.innerHTML = `
      <span class="direct-badge direct-badge-live"><i class="bi bi-broadcast"></i>${liveCount || programs.length} directs en cours</span>
      <span class="direct-badge direct-badge-viewers"><i class="bi bi-people-fill"></i>${this.formatNumber(totalViewers || programs.length * 1000)} téléspectateurs</span>
    `;
  }

  setupEventListeners() {
    const seeAllBtn = document.getElementById('seeAllPrograms');
    if (seeAllBtn) {
      seeAllBtn.addEventListener('click', () => {
        this.showAllPrograms = true;
        this.renderSchedule(true);
        seeAllBtn.style.display = 'none';
        const seeLessBtn = document.getElementById('seeLessPrograms');
        if (seeLessBtn) seeLessBtn.style.display = 'inline-flex';
      });
    }
    
    const seeLessBtn = document.getElementById('seeLessPrograms');
    if (seeLessBtn) {
      seeLessBtn.addEventListener('click', () => {
        this.showAllPrograms = false;
        this.renderSchedule(false);
        seeLessBtn.style.display = 'none';
        const seeAllBtn2 = document.getElementById('seeAllPrograms');
        if (seeAllBtn2) seeAllBtn2.style.display = 'inline-flex';
      });
    }

    // Bouton J'aime — état persisté via API + localStorage
    const likeBtnEl = document.querySelector('.player-actions .player-action-btn:first-child');
    if (likeBtnEl) {
      const LIKE_KEY = 'bf1_direct_liked';
      const LIKE_ID  = 'direct_live';

      // Restaurer l'état immédiatement depuis localStorage (instantané)
      let liked = localStorage.getItem(LIKE_KEY) === '1';
      const applyLikeState = (state) => {
        liked = state;
        if (liked) {
          likeBtnEl.classList.add('liked');
          likeBtnEl.innerHTML = `<i class="bi bi-heart-fill"></i>J'aime`;
        } else {
          likeBtnEl.classList.remove('liked');
          likeBtnEl.innerHTML = `<i class="bi bi-heart"></i>J'aime`;
        }
      };
      applyLikeState(liked);

      // Vérifier l'état réel depuis l'API en arrière-plan
      getMyLikes('program').then(myLikes => {
        const ids = new Set(myLikes.map(l => String(l.content_id)));
        const serverLiked = ids.has(LIKE_ID);
        if (serverLiked !== liked) {
          localStorage.setItem(LIKE_KEY, serverLiked ? '1' : '0');
          applyLikeState(serverLiked);
        }
      }).catch(() => {});

      likeBtnEl.addEventListener('click', async () => {
        const newState = !liked;
        applyLikeState(newState);
        localStorage.setItem(LIKE_KEY, newState ? '1' : '0');
        likeBtnEl.disabled = true;
        try {
          await toggleLike('program', LIKE_ID);
        } catch (e) {
          // Rollback si erreur API
          applyLikeState(!newState);
          localStorage.setItem(LIKE_KEY, !newState ? '1' : '0');
          console.error('Erreur like direct:', e);
        } finally {
          likeBtnEl.disabled = false;
        }
      });
    }

    // Bouton Partager
    const shareBtn = document.querySelector('.player-actions .player-action-btn:nth-child(2)');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const shareData = {
          title: 'BF1 TV – En Direct',
          text: this.currentLiveProgram ? `Regardez "${this.currentLiveProgram.title}" en direct sur BF1 TV` : 'Regardez BF1 TV en direct',
          url: window.location.href
        };
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            await navigator.clipboard.writeText(window.location.href);
            const orig = shareBtn.innerHTML;
            shareBtn.innerHTML = `<i class="bi bi-check2"></i>Lien copié !`;
            setTimeout(() => { shareBtn.innerHTML = orig; }, 2000);
          }
        } catch (err) {
          // Partage annulé ou non supporté
        }
      });
    }

    // Bouton Plein écran
    const fullscreenBtn = document.querySelector('.player-actions .player-action-btn:nth-child(3)');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        const playerWrap = document.querySelector('.player-wrap');
        const target = this.videoElement || playerWrap;
        if (!target) return;
        if (!document.fullscreenElement) {
          (target.requestFullscreen || target.webkitRequestFullscreen || target.mozRequestFullScreen).call(target);
          fullscreenBtn.innerHTML = `<i class="bi bi-fullscreen-exit"></i>Quitter`;
        } else {
          (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen).call(document);
          fullscreenBtn.innerHTML = `<i class="bi bi-fullscreen"></i>Plein écran`;
        }
      });
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
          fullscreenBtn.innerHTML = `<i class="bi bi-fullscreen"></i>Plein écran`;
        }
      });
    }

    document.addEventListener('click', async (e) => {
      const reminderBtn = e.target.closest('.reminder-btn');
      if (reminderBtn && reminderBtn.dataset.id) {
        e.stopPropagation();
        await this.createReminder(reminderBtn.dataset.id);
      }
    });
  }

  renderAll() {
    this.renderSchedule(this.showAllPrograms);
  }

  renderSchedule(showAll) {
    const scheduleContainer = document.querySelector('.schedule-grid');
    if (!scheduleContainer) return;
    
    const programsToShow = showAll ? this.allDayPrograms : this.upcomingPrograms.slice(0, 3);
    
    if (!programsToShow || programsToShow.length === 0) {
      scheduleContainer.innerHTML = `
        <div class="text-center py-4">
          <i class="bi bi-calendar-x" style="font-size: 2rem; color: #666;"></i>
          <p class="mt-2 text-secondary">Aucun programme à venir</p>
        </div>
      `;
      return;
    }
    
    scheduleContainer.innerHTML = programsToShow.map(program => {
      const hasReminder = this.reminderIds.has(String(program.id));
      return `
      <div class="schedule-card" data-id="${program.id}">
        <div class="schedule-time"><i class="bi bi-clock"></i>${program.timeDisplay} - ${program.endTimeDisplay}</div>
        <div class="schedule-title">${this.escapeHtml(program.title)}</div>
        <div class="schedule-channel"><i class="bi ${program.channelIcon}"></i>${this.escapeHtml(program.channel)}</div>
        <button class="btn-outline mt-2 w-100 justify-content-center reminder-btn${hasReminder ? ' reminder-set' : ''}" data-id="${program.id}" style="font-size:0.8rem;padding:7px"${hasReminder ? ' disabled' : ''}>
          <i class="bi ${hasReminder ? 'bi-bell-fill' : 'bi-bell'}"></i>${hasReminder ? 'Rappel actif' : 'Rappel'}
        </button>
      </div>`;
    }).join('');
  }

  async createReminder(programId) {
    const { isAuthenticated, createReminder } = await import('../../shared/services/api.js');
    if (!isAuthenticated()) {
      this.showToast('Connectez-vous pour créer un rappel', 'error');
      return;
    }
    try {
      const reminder = await createReminder(programId, { minutes_before: 15 });
      if (reminder) {
        // Mémoriser l'ID et mettre à jour le bouton sans re-rendre toute la liste
        this.reminderIds.add(String(programId));
        const btn = document.querySelector(`.reminder-btn[data-id="${programId}"]`);
        if (btn) {
          btn.disabled = true;
          btn.classList.add('reminder-set');
          btn.innerHTML = '<i class="bi bi-bell-fill"></i>Rappel actif';
        }
        this.showToast('Rappel créé avec succès !', 'success');
      }
    } catch (error) {
      console.error('Erreur création rappel:', error);
      if (error?.status === 401 || error?.message?.includes('401')) {
        this.showToast('Connectez-vous pour créer un rappel', 'error');
      } else {
        this.showToast('Impossible de créer le rappel', 'error');
      }
    }
  }

  startAutoRefresh() {
    setInterval(() => {
      this.refreshData();
    }, 60000);
  }

  async refreshData() {
    console.log('🔄 Rafraîchissement des données...');
    await this.loadAllData();
  }

  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.innerHTML = `<div><i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}"></i><span>${this.escapeHtml(message)}</span></div>`;
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  showLoading() {
    const scheduleContainer = document.querySelector('.schedule-grid');
    if (scheduleContainer && this.allDayPrograms.length === 0) {
      scheduleContainer.innerHTML = `
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
    const scheduleContainer = document.querySelector('.schedule-grid');
    if (scheduleContainer) {
      scheduleContainer.innerHTML = `
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

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  const directService = new DirectService();
  directService.init();
});