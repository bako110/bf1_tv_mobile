import * as api from '../services/api.js';
import { injectCardStyles } from '../utils/cardStyles.js';

const INITIAL_DISPLAY_COUNT = 10;

// ─── Subscription helpers (mirrors archive.js) ───────────────────────────────
const _SUB_HIERARCHY = { basic: 1, standard: 2, premium: 3 };

function _subBadge(category) {
  if (category === 'basic')    return { label: 'Basic',    color: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' };
  if (category === 'standard') return { label: 'Standard', color: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)' };
  if (category === 'premium')  return { label: 'Premium',  color: 'linear-gradient(135deg, #FF6F00 0%, #F57C00 100%)' };
  return null;
}

function _canAccess(userCat, requiredCat) {
  if (!requiredCat) return true;
  return (_SUB_HIERARCHY[userCat] || 0) >= (_SUB_HIERARCHY[requiredCat] || 0);
}

// Resolve effective required category for an archive item
// If required_subscription_category is explicitly present (even null = free), respect it.
// Only fall back to is_premium for legacy items where the field is absent entirely.
function _archiveEffCat(item) {
  if ('required_subscription_category' in item) {
    return item.required_subscription_category || null;
  }
  return item.is_premium ? 'premium' : null;
}

// Trier les éléments par date de publication (plus récents en premier) 📅
function _sortByDate(items, ...dateFields) {
  if (!Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    for (const field of dateFields) {
      const dateA = a[field] ? new Date(a[field]) : null;
      const dateB = b[field] ? new Date(b[field]) : null;
      if (dateA && dateB) {
        return dateB - dateA;
      }
    }
    return 0;
  });
}

// Open the premium modal
function _openPremiumModal(requiredCategory) {
  const open = () => window._showPremiumModal?.({ requiredCategory });
  if (window._showPremiumModal) { open(); return; }
  import('../components/premiumModal.js')
    .then(m => { m.initPremiumModal(); open(); })
    .catch(() => { window.location.hash = '#/premium'; });
}

// Archive click handler
window._archiveClick = function(archiveId, requiredCat, isPremium) {
  const effectiveRequired = requiredCat || (isPremium ? 'premium' : null);

  if (!effectiveRequired) {
    window.location.hash = `#/show/archive/${archiveId}`;
    return;
  }

  const badge = _subBadge(effectiveRequired) || { label: effectiveRequired };
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

export function cleanupHome() {
  // 1. Arrêter l'observateur scroll en premier
  if (_liveScrollObserver) {
    _liveScrollObserver.disconnect();
    _liveScrollObserver = null;
  }

  // 2. Couper le flux : mettre src="" sur TOUTE iframe live trouvée (mini ou principale)
  //    C'est la seule façon fiable d'arrêter l'audio dans un WebView Android/iOS
  document.querySelectorAll('#bf1-mini-live-player iframe, #live-content iframe').forEach(f => {
    f.src = '';
  });

  // 3. Supprimer le mini-player
  const mini = document.getElementById('bf1-mini-live-player');
  if (mini) mini.remove();

  // 4. Supprimer le placeholder si présent
  const placeholder = document.getElementById('bf1-iframe-placeholder');
  if (placeholder) placeholder.remove();

  // 5. Reset état
  _miniPlayerDismissed = false;
  _iframeOrigin = null;

  // 6. Vider le container live
  const container = document.getElementById('live-content');
  if (container) {
    container.innerHTML = `
      <div style="margin:0 16px;border-radius:12px;overflow:hidden;position:relative;background:var(--bg);">
        <div style="position:relative;width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:var(--bg-1);">
          <i class="bi bi-broadcast" style="font-size:2rem;color:var(--text-3);"></i>
        </div>
      </div>
    `;
  }
}

export async function reloadHomeLive() {
  try {
    const liveData = await api.getLive().catch(() => null);
    await loadLiveSection(liveData);
    console.log('🔄 Live rechargé sur la page d\'accueil');
  } catch (error) {
    console.error('Erreur rechargement live home:', error);
  }
}

// Skeleton loader moderne avec shimmer effect
function createSkeletonCard() {
  return `
    <div class="bf1-skeleton-card">
      <div class="bf1-skeleton-shimmer"></div>
    </div>
  `;
}

function showSkeletonLoaders() {
  const sections = ['flashInfo-content', 'missed-content', 'jtMag-content', 'reportages-content', 'magazine-content', 'divertissements-content', 'teleRealite-content', 'sports-content', 'archives-content'];
  sections.forEach(sectionId => {
    const container = document.getElementById(sectionId);
    if (container) {
      const skeletons = Array(5).fill(null).map(() => createSkeletonCard()).join('');
      container.innerHTML = skeletons;
    }
  });
  
  const liveContainer = document.getElementById('live-content');
  if (liveContainer) {
    liveContainer.innerHTML = `
      <div style="margin:0;border-radius:0;overflow:hidden;position:relative;background:var(--card-bg);">
        </div>
      </div>
    `;
  }

}

export async function loadHome() {
  try {
    console.log('🏠 Chargement de la page d\'accueil...');
    
    // Injecter les styles des cartes une seule fois
    injectCardStyles();
    
    showSkeletonLoaders();
    
    const [
      newsData,
      missedData,
      jtMagData,
      reportagesData,
      magazineData,
      divertissementData,
      teleRealiteData,
      sportsData,
      archivesData,
      liveData,
      emissionsData
    ] = await Promise.all([
      api.getNews(0, 20).catch((e) => { console.warn('News error:', e); return { items: [] }; }),
      api.getMissed?.(0, 20).catch((e) => { console.warn('Missed error:', e); return { items: [] }; }) || Promise.resolve({ items: [] }),
      api.getJTandMag?.(0, 20).catch((e) => { console.warn('JTandMag error:', e); return { items: [] }; }) || Promise.resolve({ items: [] }),
      api.getReportages?.(0, 20).catch((e) => { console.warn('Reportages error:', e); return { items: [] }; }) || Promise.resolve({ items: [] }),
      api.getMagazine?.(0, 20).catch((e) => { console.warn('Magazine error:', e); return { items: [] }; }) || Promise.resolve({ items: [] }),
      api.getDivertissement?.(0, 20).catch((e) => { console.warn('Divertissement error:', e); return { items: [] }; }) || Promise.resolve({ items: [] }),
      api.getTeleRealite?.(0, 20).catch((e) => { console.warn('TeleRealite error:', e); return { items: [] }; }) || Promise.resolve({ items: [] }),
      api.getSports?.(0, 20).catch((e) => { console.warn('Sports error:', e); return { items: [] }; }) || Promise.resolve({ items: [] }),
      api.getArchive?.(0, 20).catch((e) => { console.warn('Archive error:', e); return { items: [] }; }) || Promise.resolve({ items: [] }),
      api.getLive().catch((e) => { console.warn('Live error:', e); return null; }),
      api.getEmissions().catch((e) => { console.warn('Emissions error:', e); return []; }),
    ]);

    const newsItems = newsData.items || [];
    const missedItems = missedData.items || [];
    const jtMagItems = jtMagData.items || [];
    const reportagesItems = reportagesData.items || [];
    const magazineItems = magazineData.items || [];
    const divertItems = divertissementData.items || [];
    const teleRealiteItems = teleRealiteData.items || [];
    const sportsItems = sportsData.items || [];
    const archivesItems = archivesData.items || [];

    await loadLiveSection(liveData);

    const sortedNews = _sortByDate(newsItems, 'created_at', 'published_at');
    const sortedMissed = _sortByDate(missedItems, 'aired_at', 'created_at', 'published_at');
    const sortedJTMag = _sortByDate(jtMagItems, 'created_at', 'published_at');
    const sortedReportages = _sortByDate(reportagesItems, 'aired_at', 'created_at');
    const sortedMagazine = _sortByDate(magazineItems, 'created_at', 'published_at');
    const sortedDivertissement = _sortByDate(divertItems, 'created_at', 'published_at');
    const sortedTeleRealite = _sortByDate(teleRealiteItems, 'created_at', 'published_at');
    const sortedSports = _sortByDate(sportsItems, 'created_at', 'published_at');
    const sortedArchives = _sortByDate(archivesItems, 'created_at');

    await loadHorizontalSection('flashInfo', sortedNews.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.image,
      href: `#/news/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      views: item.views,
      likes: item.likes,
      badge: { icon: 'bi-lightning-fill', text: item.category || item.edition || 'Actualités' },
    }), sortedNews.length > INITIAL_DISPLAY_COUNT ? '#/news' : null);

    await loadMissedSection('missed', sortedMissed.slice(0, INITIAL_DISPLAY_COUNT), sortedMissed.length > INITIAL_DISPLAY_COUNT ? '#/missed' : null);

    await loadHorizontalSection('jtMag', sortedJTMag.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/jtandmag/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      views: item.views,
      likes: item.likes,
    }), sortedJTMag.length > INITIAL_DISPLAY_COUNT ? '#/jtandmag' : null);

    await loadHorizontalSection('reportages', sortedReportages.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.thumbnail || item.image_url,
      href: `#/show/reportage/${item.id || item._id}`,
      duration: item.duration_minutes,
      time: formatTime(item.aired_at || item.created_at),
      views: item.views || item.views_count,
      likes: item.likes,
    }), sortedReportages.length > INITIAL_DISPLAY_COUNT ? '#/reportages' : null);

    await loadHorizontalSection('magazine', sortedMagazine.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/magazine/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      views: item.views,
      likes: item.likes,
    }), sortedMagazine.length > INITIAL_DISPLAY_COUNT ? '#/magazine' : null);

    await loadHorizontalSection('divertissements', sortedDivertissement.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/divertissement/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      views: item.views,
      likes: item.likes,
    }), sortedDivertissement.length > INITIAL_DISPLAY_COUNT ? '#/divertissement' : null);

    await loadHorizontalSection('teleRealite', sortedTeleRealite.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/tele_realite/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      views: item.views,
      likes: item.likes,
    }), sortedTeleRealite.length > INITIAL_DISPLAY_COUNT ? '#/tele-realite' : null);

    await loadHorizontalSection('sports', sortedSports.slice(0, INITIAL_DISPLAY_COUNT), (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.thumbnail || item.image,
      href: `#/show/sport/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      views: item.views,
      likes: item.likes,
    }), sortedSports.length > INITIAL_DISPLAY_COUNT ? '#/sports' : null);

    await loadHorizontalSection('archives', sortedArchives.slice(0, INITIAL_DISPLAY_COUNT), (item) => {
      const effCat = _archiveEffCat(item);
      const badge = _subBadge(effCat);
      const isLoggedIn = api.isAuthenticated();
      const userCat = api.getUser()?.subscription_category;
      const locked = effCat && !_canAccess(isLoggedIn ? userCat : null, effCat);
      const id = item.id || item._id;
      return {
        title: item.title || 'Sans titre',
        image: item.thumbnail || item.image,
        href: locked ? null : `#/show/archive/${id}`,
        onclick: locked
          ? `window._archiveClick('${String(id).replace(/'/g,"\\'")}','${effCat || ''}',${!!item.is_premium})`
          : null,
        subBadge: badge,
        locked,
        duration: item.duration_minutes,
        time: formatTime(item.created_at),
      };
    }, sortedArchives.length > INITIAL_DISPLAY_COUNT ? '#/archive' : null);

    console.log('✅ Page d\'accueil chargée avec succès!');

  } catch (error) {
    console.error('❌ Erreur loadHome:', error);
    const container = document.getElementById('live-section');
    if (container) {
      container.innerHTML = `<div class="alert alert-danger mt-2">Erreur chargement: ${error.message}</div>`;
    }
  }
}

// ─── Mini-player flottant — déplace l'iframe existant (pas de double flux) ────
let _miniPlayerDismissed = false;
let _liveScrollObserver  = null;
let _iframeOrigin        = null; // placeholder dans le live principal

function _getMainIframe() {
  return document.querySelector('#live-content iframe');
}

function _getOrCreateMini(isOnAir) {
  let mini = document.getElementById('bf1-mini-live-player');
  if (mini) return mini;

  mini = document.createElement('div');
  mini.id = 'bf1-mini-live-player';
  Object.assign(mini.style, {
    position:     'fixed',
    bottom:       '80px',
    right:        '12px',
    width:        '220px',
    zIndex:       '9999',
    borderRadius: '12px',
    overflow:     'hidden',
    boxShadow:    '0 8px 32px rgba(0,0,0,0.6)',
    background:   '#000',
    transform:    'translateY(20px)',
    opacity:      '0',
    transition:   'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
    pointerEvents:'auto',
  });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'6px 8px', background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)',
  });
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;">
      ${isOnAir
        ? `<span style="width:7px;height:7px;background:#E23E3E;border-radius:50%;display:inline-block;animation:livePulse 1.4s ease-in-out infinite;flex-shrink:0;"></span>
           <span style="color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">EN DIRECT</span>`
        : `<span style="color:#999;font-size:11px;font-weight:600;">Hors antenne</span>`}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <button id="bf1-mini-goto-live" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <i class="bi bi-fullscreen" style="font-size:13px;"></i>
      </button>
      <button id="bf1-mini-close" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <i class="bi bi-x-lg" style="font-size:13px;"></i>
      </button>
    </div>`;

  // Zone vidéo (recevra l'iframe déplacée)
  const videoWrap = document.createElement('div');
  videoWrap.id = 'bf1-mini-video-wrap';
  Object.assign(videoWrap.style, {
    position:'relative', width:'100%', paddingBottom:'56.25%', background:'#000',
  });

  mini.appendChild(header);
  mini.appendChild(videoWrap);
  document.body.appendChild(mini);

  header.querySelector('#bf1-mini-close').addEventListener('click', _dismissMiniPlayer);
  header.querySelector('#bf1-mini-goto-live').addEventListener('click', () => {
    const liveSection = document.getElementById('live-section');
    if (liveSection) liveSection.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  return mini;
}

function _moveiFrameToMini(isOnAir) {
  // Ne pas créer le mini si l'observer a été déconnecté (page quittée)
  if (!_liveScrollObserver) return;
  const iframe = _getMainIframe();
  if (!iframe) return;

  const mini     = _getOrCreateMini(isOnAir);
  const videoWrap = mini.querySelector('#bf1-mini-video-wrap');
  if (!videoWrap || videoWrap.contains(iframe)) return;

  // Créer un placeholder dans le live principal pour récupérer l'iframe après
  if (!_iframeOrigin) {
    _iframeOrigin = document.createElement('div');
    _iframeOrigin.id = 'bf1-iframe-placeholder';
    iframe.parentNode.insertBefore(_iframeOrigin, iframe);
  }

  // Styler l'iframe pour le mini-player
  Object.assign(iframe.style, {
    position:'absolute', top:'0', left:'0',
    width:'100%', height:'100%', border:'0',
  });
  videoWrap.appendChild(iframe);

  // Afficher le mini
  requestAnimationFrame(() => {
    mini.style.transform = 'translateY(0)';
    mini.style.opacity   = '1';
  });
}

function _moveiFrameBack() {
  const mini        = document.getElementById('bf1-mini-live-player');
  const placeholder = document.getElementById('bf1-iframe-placeholder');

  // Remettre l'iframe à sa place si possible
  if (mini && placeholder) {
    const iframe = mini.querySelector('iframe');
    if (iframe) {
      Object.assign(iframe.style, {
        position:'absolute', top:'0', left:'0',
        width:'100%', height:'100%', border:'0',
      });
      placeholder.parentNode.insertBefore(iframe, placeholder);
    }
    placeholder.remove();
    _iframeOrigin = null;
  }

  // Supprimer le mini dans tous les cas (même si placeholder absent)
  if (mini) {
    mini.style.transform = 'translateY(20px)';
    mini.style.opacity   = '0';
    setTimeout(() => mini.remove(), 300);
  }
}

function _dismissMiniPlayer() {
  // Fermeture manuelle : remettre l'iframe et marquer comme dismissed
  _moveiFrameBack();
  _miniPlayerDismissed = true;
}

function _setupLiveScrollObserver(isOnAir) {
  if (_liveScrollObserver) {
    _liveScrollObserver.disconnect();
    _liveScrollObserver = null;
  }
  _miniPlayerDismissed = false;

  const liveContent = document.getElementById('live-content');
  if (!liveContent) return;

  _liveScrollObserver = new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting;
    if (visible) {
      // Player visible → remettre l'iframe en place, cacher le mini
      _moveiFrameBack();
      _miniPlayerDismissed = false;
    } else {
      // Player hors écran → déplacer l'iframe dans le mini-player
      if (!_miniPlayerDismissed) {
        _moveiFrameToMini(isOnAir);
      }
    }
  }, { threshold: 0.2 });

  _liveScrollObserver.observe(liveContent);
}

// ─── Verrouillage orientation : portrait pour l'app, landscape pour le live ──
function _lockPortrait() {
  try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch {}
}
function _lockLandscape() {
  try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch {}
}

// Exposer pour usage externe si nécessaire
window._bf1LockPortrait  = _lockPortrait;
window._bf1LockLandscape = _lockLandscape;
// ─────────────────────────────────────────────────────────────────────────────

async function loadLiveSection(liveData) {
  const container = document.getElementById('live-content');
  if (!container) {
    console.warn('⚠️ Container live-content non trouvé');
    return;
  }
  container.style.minHeight = '';
  container.style.display = 'block';

  const isOnAir = liveData?.is_live !== false;
  const viewers = liveData?.viewers || 0;
  const name = liveData?.name || 'BF1 TV - En direct';

  try {
    const streamUrl = await api.getLiveStreamUrl();
    console.log('📺 URL du flux live:', streamUrl);

    container.innerHTML = `
      <div style="margin:0;border-radius:0;overflow:hidden;position:relative;background:var(--bg-1);">
        <div style="position:relative;width:100%;aspect-ratio:16/9;">
          <iframe
            src="${streamUrl}"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
          </iframe>
        </div>
        <div style="position:absolute;top:16px;left:16px;display:flex;align-items:center;gap:8px;z-index:10;pointer-events:none;">
          ${isOnAir
            ? `<div style="display:flex;align-items:center;gap:6px;background:rgba(226,62,62,0.95);padding:6px 12px;border-radius:20px;backdrop-filter:blur(10px);box-shadow:0 4px 12px rgba(226,62,62,0.4);">
                 <span style="width:8px;height:8px;background:var(--text);border-radius:50%;display:inline-block;animation:livePulse 1.4s ease-in-out infinite;"></span>
                 <span style="color:var(--text);font-size:0.75rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">EN DIRECT</span>
               </div>`
            : `<span style="background:rgba(0,0,0,0.8);color:var(--text-secondary);font-size:0.75rem;font-weight:600;padding:6px 12px;border-radius:20px;backdrop-filter:blur(10px);">Hors antenne</span>`
          }
        </div>
      </div>
    `;

    // Activer le scroll observer pour le mini-player flottant
    _setupLiveScrollObserver(isOnAir);

  } catch (error) {
    console.error('❌ Erreur chargement live home:', error);
    container.innerHTML = `
      <div style="margin:0;border-radius:0;overflow:hidden;aspect-ratio:16/9;
                  background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
        <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:#E23E3E;"></i>
        <p style="color:var(--text-4);margin:0;font-size:14px;">Erreur: ${error.message}</p>
      </div>
    `;
  }
}

// ─── Section "Vous l'avez raté?" ─ format NCI-style ────────────────────────────
function _formatFullDate(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' }) +
           ' - ' +
           d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  } catch { return ''; }
}

async function loadMissedSection(sectionName, items, route) {
  const container = document.getElementById(`${sectionName}-content`);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div class="bf1-empty-state"><i class="bi bi-inbox"></i><p>Aucun contenu disponible</p></div>`;
    return;
  }

  const html = items.map((item, index) => {
    const id = item.id || item._id;
    const title = item.title || 'Sans titre';
    const image = item.thumbnail || item.image_url || item.image || '';
    const category = item.category || item.emission_name || item.program_title || 'BF1';
    const duration = item.duration_minutes;
    const views = item.views || 0;
    const date = item.aired_at || item.created_at || item.published_at;

    return `
      <a href="#/show/missed/${id}" class="missed-card" style="text-decoration:none;display:block;flex:0 0 280px;scroll-snap-align:start;">
        <div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#1a1a1a;">
          <img src="${image}" alt="${title}" style="width:100%;height:100%;object-fit:cover;"
               onerror="this.src='https://via.placeholder.com/280x158/1a1a1a/E23E3E?text=BF1'">
          <div style="position:absolute;bottom:8px;left:8px;display:flex;align-items:center;gap:0;z-index:3;">
            <div style="width:3px;height:20px;background:#E23E3E;border-radius:2px;"></div>
            <span style="background:rgba(0,0,0,0.75);color:#fff;font-size:10px;font-weight:700;padding:4px 8px;letter-spacing:0.5px;text-transform:uppercase;">${category}</span>
          </div>
          ${duration ? `<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.75);color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;z-index:3;">${duration}m</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:0 2px;">
          <div style="flex:1;min-width:0;">
            <p style="margin:0;color:var(--text-3,#999);font-size:11px;">${views} vue${views !== 1 ? 's' : ''} - Publiée le ${_formatFullDate(date)}</p>
            <h3 style="margin:4px 0 0;color:var(--text,#fff);font-size:13px;font-weight:700;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${title}</h3>
          </div>
          <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('missed','${id}',this)"
               style="flex:0 0 32px;width:32px;height:32px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;">
            <i class="bi bi-plus-lg" style="color:#fff;font-size:16px;"></i>
          </div>
        </div>
      </a>`;
  }).join('');

  const voirPlusCard = route ? `
    <a href="${route}" class="bf1-voir-plus-card">
      <div class="bf1-voir-plus-inner">
        <i class="bi bi-grid-3x3-gap"></i>
        <span>Voir plus</span>
        <i class="bi bi-chevron-right"></i>
      </div>
    </a>` : '';

  container.innerHTML = html + voirPlusCard;

  // Vérifier favoris
  if (api.isAuthenticated()) {
    items.forEach((item, index) => {
      const id = item.id || item._id || '';
      if (id) {
        api.checkFavorite('missed', id).then(isFav => {
          const cards = container.querySelectorAll('.missed-card');
          const card = cards[index];
          if (card && isFav) {
            const btn = card.querySelector('[onclick*="toggleFavorite"]');
            if (btn) {
              const icon = btn.querySelector('i');
              if (icon) { icon.className = 'bi bi-check-lg'; btn.style.background = 'rgba(14,122,254,0.9)'; }
            }
          }
        }).catch(() => {});
      }
    });
  }
}

async function loadHorizontalSection(sectionName, items, formatItem, route) {
  const container = document.getElementById(`${sectionName}-content`);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="bf1-empty-state">
        <i class="bi bi-inbox"></i>
        <p>Aucun contenu disponible</p>
      </div>`;
    return;
  }

  // Dimensions similaires à l'image: cartes rectangulaires
  const cardW = 240;
  const cardH = 320;

  const html = items.map((item, index) => {
    const f = formatItem(item);

    const interactionAttr = f.onclick
      ? `onclick="${f.onclick}"`
      : `href="${f.href}"`;
    const tag = f.onclick ? 'div' : 'a';
    const tagEnd = f.onclick ? 'div' : 'a';

    // Badge "Nouveau" supprimé
    const nouveauBadge = '';

    // Subscription badge
    const subBadgeHtml = f.subBadge
      ? `<div class="bf1-tier-badge" style="background: ${f.subBadge.color};">
           <i class="bi bi-gem"></i>
           <span>${f.subBadge.label}</span>
         </div>`
      : '';

    // Lock overlay
    const lockOverlay = f.locked
      ? `<div class="bf1-lock-overlay">
           <div class="bf1-lock-icon">
             <i class="bi bi-lock-fill"></i>
           </div>
         </div>
       ` : '';

    // Bouton + pour ajouter (sauf si locked)
    const contentType = sectionName === 'flashInfo' ? 'news' : sectionName === 'missed' ? 'missed' : sectionName === 'jtMag' ? 'jtandmag' : sectionName === 'magazine' ? 'magazine' : sectionName === 'teleRealite' ? 'tele_realite' : sectionName === 'divertissements' ? 'divertissement' : sectionName === 'sports' ? 'sport' : sectionName === 'reportages' ? 'reportage' : 'archive';
    // Extraire l'ID depuis l'item original au lieu de l'URL
    const contentId = item.id || item._id || '';
    const addButton = !f.locked && contentId ? `
      <div class="bf1-add-button" onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('${contentType}','${contentId}',this)" style="cursor:pointer;">
        <i class="bi bi-plus-lg"></i>
      </div>
    ` : '';

    // Metadata avec icônes (durée, date, etc.)
    const metadataItems = [];
    if (f.duration) {
      metadataItems.push(`<span class="bf1-meta-item"><i class="bi bi-clock"></i>${f.duration} min</span>`);
    }
    if (f.time) {
      metadataItems.push(`<span class="bf1-meta-item"><i class="bi bi-calendar3"></i>${f.time}</span>`);
    }
    const metadataHtml = metadataItems.length > 0 ? `
      <div class="bf1-card-metadata">
        ${metadataItems.join('')}
      </div>
    ` : '';

    return `
      <${tag} ${interactionAttr} class="bf1-content-card" style="--card-index: ${index};">
        <div class="bf1-card-inner">
          <div class="bf1-card-image-wrapper">
            <img src="${f.image}" 
                 alt="${f.title}"
                 class="bf1-card-image${f.locked ? ' bf1-card-locked' : ''}"
                 onerror="this.src='https://via.placeholder.com/${cardW}x${cardH}/1a1a1a/E23E3E?text=BF1'">
            ${nouveauBadge}
            ${addButton}
          </div>
          ${subBadgeHtml}
          ${lockOverlay}
          <div class="bf1-card-content">
            <h3 class="bf1-card-title">${f.title}</h3>
            ${metadataHtml}
          </div>
        </div>
      </${tagEnd}>
    `;
  }).join('');

  const voirPlusCard = route ? `
    <a href="${route}" class="bf1-voir-plus-card">
      <div class="bf1-voir-plus-inner">
        <i class="bi bi-grid-3x3-gap"></i>
        <span>Voir plus</span>
        <i class="bi bi-chevron-right"></i>
      </div>
    </a>
  ` : '';

  container.innerHTML = html + voirPlusCard;
  
  // Vérifier l'état des favoris pour chaque élément si l'utilisateur est connecté
  if (api.isAuthenticated()) {
    items.forEach((item, index) => {
      const contentType = sectionName === 'flashInfo' ? 'news' : sectionName === 'missed' ? 'missed' : sectionName === 'jtMag' ? 'jtandmag' : sectionName === 'magazine' ? 'magazine' : sectionName === 'teleRealite' ? 'tele_realite' : sectionName === 'divertissements' ? 'divertissement' : sectionName === 'sports' ? 'sport' : sectionName === 'reportages' ? 'reportage' : 'archive';
      const contentId = item.id || item._id || '';
      
      if (contentId) {
        api.checkFavorite(contentType, contentId).then(isFavorited => {
          const cards = container.querySelectorAll('.bf1-content-card');
          const card = cards[index];
          if (card) {
            const btn = card.querySelector('.bf1-add-button');
            if (btn && isFavorited) {
              const icon = btn.querySelector('i');
              if (icon) {
                icon.className = 'bi bi-check-lg';
                btn.style.background = 'rgba(14,122,254,0.9)';
              }
            }
          }
        }).catch(() => {});
      }
    });
  }
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

    if (diffSec < 60) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } catch {
    return 'Récemment';
  }
}

window.toggleFavorite = async function(contentType, contentId, btn) {
  if (!api.isAuthenticated()) {
    alert('Connectez-vous pour ajouter aux favoris');
    return;
  }
  const icon = btn.querySelector('i');
  const isFavorited = icon.classList.contains('bi-check-lg');
  icon.className = isFavorited ? 'bi bi-plus-lg' : 'bi bi-check-lg';
  btn.style.background = isFavorited ? 'rgba(0,0,0,0.7)' : 'rgba(14,122,254,0.9)';
  try {
    if (isFavorited) {
      await api.removeFavorite(contentType, contentId);
    } else {
      await api.addFavorite(contentType, contentId);
    }
  } catch(e) {
    console.error('Erreur favori:', e);
    icon.className = isFavorited ? 'bi bi-check-lg' : 'bi bi-plus-lg';
    btn.style.background = isFavorited ? 'rgba(14,122,254,0.9)' : 'rgba(0,0,0,0.7)';
  }
};