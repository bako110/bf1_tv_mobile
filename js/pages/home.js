import * as api from '../services/api.js';

const INITIAL_DISPLAY_COUNT = 10;

// ─── Subscription helpers (mirrors archive.js) ───────────────────────────────
const _SUB_HIERARCHY = { basic: 1, standard: 2, premium: 3 };

function _subBadge(category) {
  if (category === 'basic')    return { label: 'Basic',    color: '#3B82F6' };
  if (category === 'standard') return { label: 'Standard', color: '#9C27B0' };
  if (category === 'premium')  return { label: 'Premium',  color: '#FF6F00' };
  return null;
}

function _canAccess(userCat, requiredCat) {
  if (!requiredCat) return true;
  return (_SUB_HIERARCHY[userCat] || 0) >= (_SUB_HIERARCHY[requiredCat] || 0);
}

// Resolve effective required category for an archive item
function _archiveEffCat(item) {
  return item.required_subscription_category || (item.is_premium ? 'premium' : null);
}

// Trier les éléments par date de publication (plus récents en premier) 📅
function _sortByDate(items, ...dateFields) {
  if (!Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    // Essayer chaque champ de date en ordre de priorité
    for (const field of dateFields) {
      const dateA = a[field] ? new Date(a[field]) : null;
      const dateB = b[field] ? new Date(b[field]) : null;
      if (dateA && dateB) {
        return dateB - dateA; // Descending: plus récent en premier
      }
    }
    return 0;
  });
}

// Open the premium modal (lazy-load if not yet initialised)
function _openPremiumModal(requiredCategory) {
  const open = () => window._showPremiumModal?.({ requiredCategory });
  if (window._showPremiumModal) { open(); return; }
  import('../components/premiumModal.js')
    .then(m => { m.initPremiumModal(); open(); })
    .catch(() => { window.location.hash = '#/premium'; });
}

// Expose globally so inline onclick="window._archiveClick(...)" works from home cards.
// archive.js will overwrite this with the same logic when the archive page loads — that's fine.
window._archiveClick = function(archiveId, requiredCat, isPremium) {
  const effectiveRequired = requiredCat || (isPremium ? 'premium' : null);

  if (!effectiveRequired) {
    window.location.hash = `#/show/archive/${archiveId}`;
    return;
  }

  const badge      = _subBadge(effectiveRequired) || { label: effectiveRequired };
  const isLoggedIn = api.isAuthenticated();

  if (!isLoggedIn) {
    if (window._showLoginModal) {
      window._showLoginModal(
        `Cette archive necessite un abonnement ${badge.label}.\nConnectez-vous pour acceder a nos offres d'abonnement.`
      );
    } else {
      window.location.hash = '#/login';
    }
    return;
  }

  const userCat = api.getUser()?.subscription_category;
  if (_canAccess(userCat, effectiveRequired)) {
    window.location.hash = `#/show/archive/${archiveId}`;
    return;
  }

  _openPremiumModal(effectiveRequired);
};

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

    // Trier chaque section par date (les plus récents en premier) 📅
    const sortedNews = _sortByDate(newsData, 'created_at', 'published_at');
    const sortedJTMag = _sortByDate(jtMagData, 'created_at', 'published_at');
    const sortedDivertissement = _sortByDate(divertissementData, 'created_at', 'published_at');
    const sortedSports = _sortByDate(sportsData, 'created_at', 'published_at');
    const sortedReportages = _sortByDate(reportagesData, 'aired_at', 'created_at');
    const sortedArchives = _sortByDate(archivesData, 'created_at');

    // Charger les autres sections
    await loadHorizontalSection('flashInfo', sortedNews.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.image,
      href: `#/news/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      badge: { icon: 'bi-lightning-fill', text: item.category || item.edition || 'Actualités' },
    }));

    await loadHorizontalSection('jtMag', sortedJTMag.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/jtandmag/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
    }));

    await loadHorizontalSection('divertissements', sortedDivertissement.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/divertissement/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
    }));

    await loadHorizontalSection('sports', sortedSports.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/sport/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
    }));

    await loadHorizontalSection('reportages', sortedReportages.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.thumbnail || item.image_url,
      href: `#/show/reportage/${item.id || item._id}`,
      duration: item.duration_minutes,
      time: formatTime(item.aired_at || item.created_at),
    }));

    await loadHorizontalSection('archives', sortedArchives.slice(0, INITIAL_DISPLAY_COUNT), (item) => {
      const effCat  = _archiveEffCat(item);
      const badge   = _subBadge(effCat);
      const isLoggedIn = api.isAuthenticated();
      const userCat    = api.getUser()?.subscription_category;
      const locked     = effCat && !_canAccess(isLoggedIn ? userCat : null, effCat);
      const id         = item.id || item._id;
      return {
        title: item.title || 'Sans titre',
        image: item.thumbnail || item.image,
        // If locked: intercept click via _archiveClick; if free: navigate directly
        href: locked ? null : `#/show/archive/${id}`,
        onclick: locked
          ? `window._archiveClick('${String(id).replace(/'/g,"\\'")}','${effCat || ''}',${!!item.is_premium})`
          : null,
        subBadge: badge,
        locked,
        duration: item.duration_minutes,
        time: formatTime(item.created_at),
      };
    });

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

    // Build interaction: onclick override takes priority over href
    const interactionAttr = f.onclick
      ? `onclick="${f.onclick}"`
      : `href="${f.href}"`;
    const tag     = f.onclick ? 'div' : 'a';
    const tagEnd  = f.onclick ? 'div' : 'a';
    const baseStyle = `text-decoration:none; flex-shrink:0; display:block; width:${cardW}px; cursor:pointer;`;

    // Subscription tier badge (Basic / Standard / Premium)
    const subBadgeHtml = f.subBadge
      ? `<span style="position:absolute; top:8px; left:8px; background:${f.subBadge.color}; color:#fff;
                      font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:8px;">
           ${f.subBadge.label}
         </span>`
      : '';

    // Lock overlay for inaccessible content
    const lockOverlay = f.locked
      ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
           <div style="width:32px; height:32px; background:rgba(0,0,0,0.7); border-radius:50%;
                       display:flex; align-items:center; justify-content:center; border:1.5px solid rgba(255,255,255,.25);">
             <i class="bi bi-lock-fill" style="font-size:13px; color:#fff;"></i>
           </div>
         </div>`
      : '';

    // Generic badge (news category etc.)
    const genericBadge = (!f.subBadge && f.badge)
      ? `<div style="position:absolute; top:8px; left:8px; display:flex; align-items:center; gap:3px; background:rgba(0,0,0,0.55); padding:2px 6px; border-radius:8px;">
           <i class="bi ${f.badge.icon}" style="color:#fff; font-size:0.6rem;"></i>
           <span style="color:#fff; font-size:0.6rem; font-weight:600;">${f.badge.text}</span>
         </div>`
      : '';

    return `
      <${tag} ${interactionAttr} style="${baseStyle} width:${cardW}px;">
        <div style="width:${cardW}px; height:${cardH}px; border-radius:12px; overflow:hidden; position:relative; background:#1a1a1a;">
          <img src="${f.image}" alt="${f.title}"
               style="width:100%; height:100%; object-fit:cover;${f.locked ? ' filter:brightness(0.45);' : ''}"
               onerror="this.src='https://via.placeholder.com/${cardW}x${cardH}/1a1a1a/E23E3E?text=BF1'">
          <div style="position:absolute; inset:0; background:linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%);"></div>
          ${subBadgeHtml}
          ${genericBadge}
          ${lockOverlay}
          <div style="position:absolute; bottom:8px; left:8px; right:8px;">
            <p style="color:#fff; font-size:0.7rem; font-weight:600; line-height:1.3; margin:0 0 3px;
                      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${f.title}</p>
            <div style="display:flex; align-items:center; gap:3px;">
              <i class="bi bi-clock" style="color:#A0A0A0; font-size:0.55rem;"></i>
              <span style="color:#A0A0A0; font-size:0.6rem;">${f.duration ? f.duration + 'min · ' : ''}${f.time}</span>
            </div>
          </div>
        </div>
      </${tagEnd}>
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
    const diffSec = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Format court pour les cartes (2h, 30m)
    if (diffSec < 60) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } catch {
    return 'Récemment';
  }
}

// Format descriptif pour les détails (Il y a 2 heures 15 minutes)
function formatTimeDetailed(dateString) {
  if (!dateString) return 'Récemment';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSec < 60) return 'À l\'instant';
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h ${diffMins % 60}m`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
    if (diffYears >= 1) return `Il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' });
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
