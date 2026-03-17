import * as api from '../services/api.js';

const INITIAL_DISPLAY_COUNT = 10;

export async function loadHome() {
  try {
    console.log('📱 Chargement de la page d\'accueil...');
    
    // Charger toutes les données en parallèle
    const [
      newsData,
      jtMagData,
      divertissementData,
      sportsData,
      reportagesData,
      archivesData,
      liveData,
      emissionsData
    ] = await Promise.all([
      api.getNews().catch((e) => { console.warn('News error:', e); return []; }),
      api.getJTandMag?.().catch((e) => { console.warn('JTandMag error:', e); return []; }) || Promise.resolve([]),
      api.getDivertissement?.().catch((e) => { console.warn('Divertissement error:', e); return []; }) || Promise.resolve([]),
      api.getSports?.().catch((e) => { console.warn('Sports error:', e); return []; }) || Promise.resolve([]),
      api.getReportages?.().catch((e) => { console.warn('Reportages error:', e); return []; }) || Promise.resolve([]),
      api.getArchive?.().catch((e) => { console.warn('Archive error:', e); return []; }) || Promise.resolve([]),
      api.getLive().catch((e) => { console.warn('Live error:', e); return null; }),
      api.getEmissions().catch((e) => { console.warn('Emissions error:', e); return []; }),
    ]);

    console.log('✅ Données reçues:', {
      news: newsData.length,
      jtMag: jtMagData.length,
      divertissement: divertissementData.length,
      sports: sportsData.length,
      reportages: reportagesData.length,
      archives: archivesData.length,
      live: !!liveData,
      emissions: emissionsData.length,
    });

    // Charger le LIVE BF1
    await loadLiveSection(liveData);

    // Charger les autres sections
    await loadHorizontalSection('flashInfo', newsData.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.image,
      href: `#/news/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      badge: { icon: 'bi-lightning-fill', text: item.category || item.edition || 'Actualités' },
    }));

    await loadHorizontalSection('jtMag', jtMagData.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/jtandmag/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
    }));

    await loadHorizontalSection('divertissements', divertissementData.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/divertissement/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
    }));

    await loadHorizontalSection('sports', sportsData.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/sport/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
    }));

    await loadHorizontalSection('reportages', reportagesData.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.thumbnail || item.image_url,
      href: `#/show/reportage/${item.id || item._id}`,
      duration: item.duration_minutes,
      time: formatTime(item.aired_at || item.created_at),
    }));

    await loadHorizontalSection('archives', archivesData.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.thumbnail || item.image,
      href: `#/show/archive/${item.id || item._id}`,
      premium: item.required_subscription_category || item.is_premium,
      duration: item.duration_minutes,
      time: formatTime(item.created_at),
    }));

    // Attacher les listeners de scroll-to-end
    attachScrollListeners();

    console.log('✅ Page d\'accueil chargée avec succès!');

  } catch (error) {
    console.error('❌ Erreur loadHome:', error);
    const container = document.getElementById('live-section');
    if (container) {
      container.innerHTML = `<div class="alert alert-danger mt-2">Erreur chargement: ${error.message}</div>`;
    }
  }
}

async function loadLiveSection(liveData) {
  const container = document.getElementById('live-content');
  if (!container) return;

  if (!liveData) {
    container.innerHTML = `
      <div class="card bg-secondary border-0 w-100" style="aspect-ratio: 16/9; border-radius: 8px; overflow: hidden;">
        <div class="card-body d-flex align-items-center justify-content-center">
          <div class="text-center">
            <i class="bi bi-broadcast" style="font-size: 3rem; color: rgba(226,62,62,0.5);"></i>
            <p class="text-muted mt-3 mb-0">Chargement BF1 TV...</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const videoUrl = liveData.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const viewers = liveData.viewers || 0;

  container.innerHTML = `
    <div style="position: relative; margin: 0 16px; border-radius: 12px; overflow: hidden; background: #000;">
      <video
        src="${videoUrl}"
        autoplay
        muted
        loop
        playsinline
        style="width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block;"
      ></video>
      <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%); pointer-events: none;"></div>
      <div style="position: absolute; bottom: 12px; left: 12px; right: 12px; pointer-events: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${liveData.isLive !== false ? `<span style="width: 8px; height: 8px; background: #E23E3E; border-radius: 50%; display: inline-block; animation: pulse 1.4s ease-in-out infinite;"></span>` : ''}
          <span style="color:#fff; font-size:0.85rem; font-weight:600;">En direct</span>
        </div>
      </div>
    </div>
  `;
}

async function loadHorizontalSection(sectionName, items, formatItem) {
  const container = document.getElementById(`${sectionName}-content`);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<p style="color:#A0A0A0; font-size:13px; padding: 8px 0;">Aucun contenu disponible</p>`;
    return;
  }

  // Largeur identique à l'app native: width * 0.75 ≈ 260px pour flashInfo, width * 0.4 ≈ 150px compact
  const isNews = sectionName === 'flashInfo';
  const cardW = isNews ? 220 : 140;
  const cardH = isNews ? 160 : 110;

  const html = items.map(item => {
    const f = formatItem(item);
    return `
      <a href="${f.href}" style="text-decoration:none; flex-shrink:0; display:block; width:${cardW}px;">
        <div style="width:${cardW}px; height:${cardH}px; border-radius:12px; overflow:hidden; position:relative; background:#1a1a1a;">
          <img src="${f.image}" alt="${f.title}"
               style="width:100%; height:100%; object-fit:cover;"
               onerror="this.src='https://via.placeholder.com/${cardW}x${cardH}/1a1a1a/E23E3E?text=BF1'">
          <div style="position:absolute; inset:0; background:linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%);"></div>
          ${f.premium ? `<span style="position:absolute; top:8px; left:8px; background:#E23E3E; color:#fff; font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:8px;">Premium</span>` : ''}
          ${f.badge ? `<div style="position:absolute; top:8px; left:8px; display:flex; align-items:center; gap:3px; background:rgba(0,0,0,0.55); padding:2px 6px; border-radius:8px;"><i class="bi ${f.badge.icon}" style="color:#fff; font-size:0.6rem;"></i><span style="color:#fff; font-size:0.6rem; font-weight:600;">${f.badge.text}</span></div>` : ''}
          <div style="position:absolute; bottom:8px; left:8px; right:8px;">
            <p style="color:#fff; font-size:0.7rem; font-weight:600; line-height:1.3; margin:0 0 3px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${f.title}</p>
            <div style="display:flex; align-items:center; gap:3px;"><i class="bi bi-clock" style="color:#A0A0A0; font-size:0.55rem;"></i><span style="color:#A0A0A0; font-size:0.6rem;">${f.duration ? f.duration + 'min · ' : ''}${f.time}</span></div>
          </div>
        </div>
      </a>
    `;
  }).join('');

  container.innerHTML = html;
}

function formatTime(dateString) {
  if (!dateString) return 'Récemment';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } catch {
    return 'Récemment';
  }
}

function formatViewers(count) {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
}

function attachScrollListeners() {
  const sectionMap = {
    'flashInfo-content':      '#/news',
    'jtMag-content':         '#/jtandmag',
    'divertissements-content': '#/divertissement',
    'sports-content':        '#/sports',
    'reportages-content':    '#/reportages',
    'archives-content':      '#/archive',
  };

  Object.entries(sectionMap).forEach(([id, href]) => {
    const el = document.getElementById(id);
    if (!el) return;

    let redirected = false;
    el.addEventListener('scroll', () => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 40;
      if (atEnd && !redirected) {
        redirected = true;
        setTimeout(() => { window.location.hash = href; }, 150);
        setTimeout(() => { redirected = false; }, 2000);
      }
    });
  });
}
