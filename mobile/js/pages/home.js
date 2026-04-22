import * as api from '../services/api.js';
import { LIVE_STREAM_URL } from '../services/api.js';
import { injectCardStyles } from '../utils/cardStyles.js';

const INITIAL_DISPLAY_COUNT = 10;

// ─── Cards d'émissions par section ───────────────────────────────────────────
//
// Chaque section affiche UNE card par sous-catégorie (émission).
// L'image de la card = la dernière image dispo dans cette catégorie.
// Au clic → page filtrée : #/jtandmag?cat=LE+13H  etc.
//
// Les pages jtandmag.js / divertissement.js / etc. lisent window._homeCatFilter
// au chargement pour filtrer automatiquement.

const _EMISSION_SECTIONS = {
  jtMag: {
    section: 'jtandmag',
    fetchFn: (cat) => api.getJTandMag(0, 5, cat),
    route: '#/jtandmag',
    filterParam: 'jtandmag',
  },
  divertissements: {
    section: 'divertissement',
    fetchFn: (cat) => api.getDivertissement(0, 5, cat),
    route: '#/divertissement',
    filterParam: 'divertissement',
  },
  magazine: {
    section: 'magazine',
    fetchFn: (cat) => api.getMagazine(0, 5, cat),
    route: '#/magazine',
    filterParam: 'magazine',
  },
  sports: {
    section: 'sport',
    fetchFn: (cat) => api.getSports(0, 5, cat),
    route: '#/sports',
    filterParam: 'sports',
  },
  teleRealite: {
    section: 'tele_realite',
    fetchFn: (cat) => api.getTeleRealite(0, 5, cat),
    route: '#/tele-realite',
    filterParam: 'tele-realite',
  },
};

function _injectEmissionCardStyle() {
  if (document.getElementById('bf1-emission-card-style')) return;
  const s = document.createElement('style');
  s.id = 'bf1-emission-card-style';
  s.textContent = `
    .bf1-emission-card {
      flex-shrink: 0;
      width: 42vw;
      max-width: 240px;
      min-width: 160px;
      text-decoration: none;
      display: block;
      cursor: pointer;
      scroll-snap-align: start;
      animation: cardFadeIn 0.55s cubic-bezier(0.22,1,0.36,1) both;
      animation-delay: calc(var(--card-index, 0) * 0.07s);
      opacity: 0;
    }
    .bf1-emission-card-inner {
      position: relative;
      width: 100%;
      height: 320px;
      border-radius: 16px;
      overflow: hidden;
      background: #1a1a1a;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      transition: box-shadow 0.4s ease;
    }
    .bf1-emission-card:hover .bf1-emission-card-inner {
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      transform: translateY(-4px);
    }
    .bf1-emission-card:active .bf1-emission-card-inner {
      transform: scale(0.97) translateY(-2px);
    }
    .bf1-emission-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.6s cubic-bezier(0.4,0,0.2,1);
    }
    .bf1-emission-card:hover .bf1-emission-card-img {
      transform: scale(1.08);
    }
    .bf1-emission-card-fallback {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #1a1a1a 0%, #2a0a0a 100%);
    }
    .bf1-emission-card-fallback i {
      font-size: 44px;
      color: rgba(226,62,62,0.4);
    }
    .bf1-emission-card-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 50%, transparent 100%);
    }
    .bf1-emission-card-count {
      position: absolute;
      top: 10px; right: 10px;
      background: #E23E3E;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
    }
    .bf1-emission-card-play {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -55%);
      width: 46px; height: 46px;
      background: rgba(226,62,62,0.92);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 22px rgba(226,62,62,0.55);
      animation: emPlayPulse 2s ease-in-out infinite;
      z-index: 1;
    }
    .bf1-emission-card-play i {
      font-size: 20px; color: #fff; margin-left: 3px;
    }
    @keyframes emPlayPulse {
      0%,100% { transform: translate(-50%,-55%) scale(1); box-shadow: 0 4px 22px rgba(226,62,62,.55); }
      50%      { transform: translate(-50%,-55%) scale(1.1); box-shadow: 0 6px 28px rgba(226,62,62,.75); }
    }
    @keyframes emSnake {
      0%   { stroke-dashoffset: 326; }
      50%  { stroke-dashoffset: 80; }
      100% { stroke-dashoffset: -326; }
    }
    .bf1-emission-card-content {
      padding: 14px 0 0;
    }
    .bf1-emission-card-name {
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.35;
      margin: 0 0 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      letter-spacing: -0.3px;
    }
    @keyframes cardFadeIn {
      from { opacity: 0; transform: translateY(22px) scale(0.94); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
  `;
  document.head.appendChild(s);
}

// Charge les cards d'émissions pour une section
async function _loadEmissionSection(sectionKey, dynamicItems, allSectionCats = []) {
  const cfg = _EMISSION_SECTIONS[sectionKey];
  const container = document.getElementById(`${sectionKey}-content`);
  if (!cfg || !container) return;

  // Filtrer les catégories depuis le cache déjà chargé
  let cats = allSectionCats
    .filter(c => c.section === cfg.section && c.is_active !== false)
    .map(c => c.name)
    .filter(Boolean);

  // Fallback : extraire depuis les items dynamiques
  if (!cats.length) {
    const seen = new Set();
    (dynamicItems || []).forEach(item => {
      const c = (item.sport_type || item.subcategory || item.category || '').trim();
      if (c && c !== cfg.filterParam && c !== cfg.section && !seen.has(c)) { seen.add(c); cats.push(c); }
    });
  }

  if (!cats.length) {
    const sectionEl = document.getElementById(`${sectionKey}-section`);
    if (sectionEl) sectionEl.style.display = 'none';
    return;
  }

  // Pour chaque catégorie, récupérer la première image dispo
  const catData = await Promise.all(
    cats.map(async (cat) => {
      try {
        const data = await cfg.fetchFn(cat);
        const items = data.items || [];
        let img = '';
        for (const item of items) {
          img = item.image_url || item.thumbnail || item.image || item.image_main || '';
          if (img) break;
        }
        return { cat, img, count: data.total || items.length };
      } catch {
        return { cat, img: '', count: 0 };
      }
    })
  );

  container.innerHTML = catData.map((d, index) => {
    const catEncoded = encodeURIComponent(d.cat);
    const filterPath = `/${cfg.filterParam}?category=${encodeURIComponent(d.cat)}`;
    const fpEncoded = btoa(unescape(encodeURIComponent(filterPath)));
    const href = `#/emission-category/${catEncoded}?fp=${fpEncoded}`;
    const countBadge = '';
    const imgHtml = d.img
      ? `<img src="${d.img}" alt="${d.cat}" class="bf1-emission-card-img"
              onerror="this.style.display='none';this.parentElement.querySelector('.bf1-emission-card-fallback').style.display='flex';">
         <div class="bf1-emission-card-fallback" style="display:none;">
           <i class="bi bi-tv-fill"></i>
         </div>`
      : `<div class="bf1-emission-card-fallback">
           <i class="bi bi-tv-fill"></i>
         </div>`;
    return `
      <a href="${href}" class="bf1-emission-card" style="--card-index:${index};">
        <div class="bf1-emission-card-inner">
          ${imgHtml}
          <div class="bf1-emission-card-overlay"></div>
          ${countBadge}
          <!-- Cercle snake autour du play -->
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);width:72px;height:72px;pointer-events:none;">
            <svg viewBox="0 0 120 120" style="width:100%;height:100%;">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(226,62,62,.2)" stroke-width="4"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke="#E23E3E" stroke-width="4"
                stroke-dasharray="326" stroke-dashoffset="326" stroke-linecap="round"
                transform="rotate(-90 60 60)"
                style="animation:emSnake 2.5s ease-in-out infinite;"/>
            </svg>
          </div>
          <div class="bf1-emission-card-play"><i class="bi bi-play-fill"></i></div>
        </div>
        <div class="bf1-emission-card-content">
          <p class="bf1-emission-card-name">${d.cat}</p>
        </div>
      </a>`;
  }).join('');
}

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

export function pauseLive() {
  if (!_liveIframe) return;
  try { _liveIframe.contentWindow?.postMessage('{"command":"pause"}', '*'); } catch {}
}

export function resumeLive() {
  if (!_liveIframe) return;
  try { _liveIframe.contentWindow?.postMessage('{"command":"play"}', '*'); } catch {}
}

export function cleanupHome() {
  if (_liveScrollObserver) { _liveScrollObserver.disconnect(); _liveScrollObserver = null; }
  if (window._liveResizeObs) { window._liveResizeObs.disconnect(); window._liveResizeObs = null; }

  // Supprimer le mini-hud s'il existe
  const hud = document.getElementById('bf1-mini-hud');
  if (hud) { hud.remove(); }

  // Stopper et supprimer l'iframe (son + vidéo)
  if (_liveIframe && document.body.contains(_liveIframe)) {
    try { _liveIframe.src = 'about:blank'; } catch {}
    _liveIframe.remove();
  }
  _liveIframe = null;
  _miniPlayerDismissed = false;
}

// Appelé au retour sur la page home (keep-alive) — replace l'iframe ou la recrée
export function restoreHomeLive() {
  // Si l'iframe a été détruite (quitter home coupe le stream), la recréer
  if (!_liveIframe || !document.body.contains(_liveIframe)) {
    const container = document.getElementById('live-content');
    if (container) {
      api.getLive()
        .then(liveData => loadLiveSection(liveData))
        .catch(() => loadLiveSection(null));
    }
    return;
  }

  // Supprimer le mini-hud résiduel
  const hud = document.getElementById('bf1-mini-hud');
  if (hud) hud.remove();
  _miniPlayerDismissed = false;

  const doSync = () => {
    const playerDiv = document.querySelector('[data-live-player]');
    if (playerDiv) _positionIframeOver(playerDiv);
  };

  _setupLiveScrollObserver(true);

  // Le ResizeObserver sur playerDiv va se déclencher automatiquement
  // quand la page ka repasse de display:none → display:'' et recalcule ses dimensions.
  // On force quand même une passe rAF×2 au cas où le RO ne se déclenche pas.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    doSync();
    setTimeout(doSync, 100);
  }));
}

export async function reloadHomeLive() {
  if (_liveIframe && document.body.contains(_liveIframe)) return;
  try {
    const liveData = await api.getLive().catch(() => null);
    await loadLiveSection(liveData);
  } catch (error) {
    console.error('Erreur rechargement live home:', error);
  }
}

// Skeleton loader moderne avec shimmer effect
function createSkeletonCard(landscape = false) {
  return landscape
    ? `<div class="bf1-skeleton-card bf1-skeleton-landscape"><div class="bf1-skeleton-shimmer"></div></div>`
    : `<div class="bf1-skeleton-card"><div class="bf1-skeleton-shimmer"></div></div>`;
}

function showSkeletonLoaders() {
  const portraitSections = ['flashInfo-content', 'jtMag-content', 'reportages-content', 'magazine-content', 'divertissements-content', 'teleRealite-content', 'sports-content', 'archives-content'];
  portraitSections.forEach(sectionId => {
    const container = document.getElementById(sectionId);
    if (container) {
      container.innerHTML = Array(5).fill(null).map(() => createSkeletonCard(false)).join('');
    }
  });

  const missedContainer = document.getElementById('missed-content');
  if (missedContainer) {
    missedContainer.innerHTML = Array(4).fill(null).map(() => createSkeletonCard(true)).join('');
  }
  
  // Ne pas écraser live-content si l'iframe existe déjà dans body
  const hasIframe = _liveIframe && document.body.contains(_liveIframe);
  if (!hasIframe) {
    const liveContainer = document.getElementById('live-content');
    if (liveContainer) {
      liveContainer.innerHTML = `
        <div style="margin:0;border-radius:0;overflow:hidden;position:relative;background:var(--card-bg);">
          </div>
        </div>
      `;
    }
  }

}

export async function loadHome() {
  try {
    console.log('🏠 Chargement de la page d\'accueil...');

    injectCardStyles();
    showSkeletonLoaders();


    const [
      newsData, missedData, jtMagData, reportagesData,
      magazineData, divertissementData, teleRealiteData,
      sportsData, archivesData, liveData,
    ] = await Promise.all([
      api.getNews(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })),
      api.getMissed?.(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })) || Promise.resolve({ items: [] }),
      api.getJTandMag(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })),
      api.getReportages(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })),
      api.getMagazine(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })),
      api.getDivertissement(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })),
      api.getTeleRealite(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })),
      api.getSports(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })),
      api.getArchive(0, INITIAL_DISPLAY_COUNT).catch(() => ({ items: [] })),
      Promise.resolve({ is_live: true }),
    ]);

    // Live
    const existingIframe = _liveIframe && document.body.contains(_liveIframe);
    if (!existingIframe) await loadLiveSection(liveData);
    else _setupLiveScrollObserver(true);

    // Flash info / Rattrapage — pas de sous-catégories
    const sortedNews   = _sortByDate(newsData.items || [], 'created_at', 'published_at');
    const sortedMissed = _sortByDate(missedData.items || [], 'aired_at', 'created_at', 'published_at');
    await loadHorizontalSection('flashInfo', sortedNews, (item) => ({
      title: item.title || 'Sans titre',
      image: item.image_url || item.image,
      href: `#/news/${item.id || item._id}`,
      time: formatTime(item.created_at || item.published_at),
      views: item.views, likes: item.likes,
      badge: { icon: 'bi-lightning-fill', text: item.category || item.edition || 'Actualités' },
    }), '#/news');
    await loadMissedSection('missed', sortedMissed, '#/missed');

    // Charger les section-categories une seule fois pour toutes les sections
    let _sectionCats = [];
    try {
      const apiCats = await api.getCategories();
      _sectionCats = Array.isArray(apiCats) ? apiCats : (apiCats?.items || []);
    } catch { _sectionCats = []; }

    // Sections émissions — une card par sous-catégorie
    _injectEmissionCardStyle();
    await _loadEmissionSection('jtMag',          jtMagData.items || [],          _sectionCats);
    await _loadEmissionSection('divertissements', divertissementData.items || [], _sectionCats);
    await _loadEmissionSection('magazine',        magazineData.items || [],       _sectionCats);

    // Reportages — cards normales (pas de sous-catégories)
    const sortedReportages = _sortByDate(reportagesData.items || [], 'aired_at', 'created_at');
    await loadHorizontalSection('reportages', sortedReportages, (item) => ({
      title: item.title || 'Sans titre',
      image: item.thumbnail || item.image_url,
      href: `#/show/reportage/${item.id || item._id}`,
      duration: item.duration_minutes,
      time: formatTime(item.aired_at || item.created_at),
      views: item.views || item.views_count,
      likes: item.likes,
    }), '#/reportages');

    // Sports et Télé réalité — cards d'émissions (catégories dynamiques)
    await _loadEmissionSection('sports',      sportsData.items || [],      _sectionCats);
    await _loadEmissionSection('teleRealite', teleRealiteData.items || [], _sectionCats);

    // Archives — pas de sous-catégories, logique premium conservée
    const sortedArchives = _sortByDate(archivesData.items || [], 'created_at');
    await loadHorizontalSection('archives', sortedArchives, (item) => {
      const effCat = _archiveEffCat(item);
      const badge  = _subBadge(effCat);
      const locked = effCat && !_canAccess(api.isAuthenticated() ? api.getUser()?.subscription_category : null, effCat);
      const id = item.id || item._id;
      return {
        title: item.title || 'Sans titre',
        image: item.thumbnail || item.image,
        href: locked ? null : `#/show/archive/${id}`,
        onclick: locked ? `window._archiveClick('${String(id).replace(/'/g,"\\'")}','${effCat || ''}',${!!item.is_premium})` : null,
        subBadge: badge, locked,
        duration: item.duration_minutes,
        time: formatTime(item.created_at),
      };
    }, '#/archive');

    console.log('✅ Page d\'accueil chargée avec succès!');

  } catch (error) {
    console.error('❌ Erreur loadHome:', error);
    const container = document.getElementById('live-section');
    if (container) container.innerHTML = `<div class="alert alert-danger mt-2">Erreur chargement: ${error.message}</div>`;
  }
}

// ─── Mini-player flottant ────────────────────────────────────────────────────
// L'iframe vit dans document.body depuis sa création (position:fixed).
// Elle se positionne par-dessus #live-content quand visible (mode plein),
// et en petit coin bas-droite quand #live-content est hors viewport (mode mini).
// ZÉRO déplacement DOM = zéro rechargement du flux.
let _miniPlayerDismissed = false;
let _liveScrollObserver  = null;
let _liveIframe          = null; // référence unique à l'iframe

function _getOrCreateIframe(streamUrl) {
  if (_liveIframe && document.body.contains(_liveIframe)) return _liveIframe;

  const iframe = document.createElement('iframe');
  iframe.src = streamUrl;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.style.cssText = 'position:fixed;border:0;z-index:800;';
  document.body.appendChild(iframe);
  _liveIframe = iframe;
  return iframe;
}

function _positionIframeOver(targetEl) {
  if (!_liveIframe) return;
  const r = targetEl.getBoundingClientRect();
  if (r.width === 0) return;
  Object.assign(_liveIframe.style, {
    left:   r.left + 'px',
    top:    r.top  + 'px',
    width:  r.width  + 'px',
    height: r.height + 'px',
    right:  '',
    bottom: '',
    borderRadius: '0',
    boxShadow: 'none',
    opacity: '1',
    pointerEvents: 'auto',
  });
}

function _positionIframeMini() {
  if (!_liveIframe) return;
  Object.assign(_liveIframe.style, {
    left:   'auto',
    right:  '12px',
    top:    'auto',
    bottom: '116px',
    width:  '220px',
    height: '124px',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    opacity: '1',
    pointerEvents: 'auto',
  });
}

// Repositionne l'iframe sur le player principal (utile au scroll/resize)
function _syncIframeToPlayer() {
  const liveContent = document.getElementById('live-content');
  if (!liveContent || !_liveIframe) return;
  const playerDiv = liveContent.querySelector('[data-live-player]');
  if (playerDiv) _positionIframeOver(playerDiv);
}

function _showMini() {
  if (_miniPlayerDismissed || !_liveIframe) return;
  _positionIframeMini();

  let hud = document.getElementById('bf1-mini-hud');
  if (hud) { hud.style.opacity = '1'; hud.style.transform = 'translateY(0)'; return; }

  hud = document.createElement('div');
  hud.id = 'bf1-mini-hud';
  Object.assign(hud.style, {
    position:'fixed', bottom:'80px', right:'12px',
    width:'220px', zIndex:'9999',
    borderRadius:'10px 10px 0 0',
    background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)',
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'5px 8px',
    transform:'translateY(10px)', opacity:'0',
    transition:'transform 0.3s ease, opacity 0.3s ease',
    boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
  });
  hud.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="width:7px;height:7px;background:#E23E3E;border-radius:50%;display:inline-block;animation:livePulse 1.4s ease-in-out infinite;flex-shrink:0;"></span>
      <span style="color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">EN DIRECT</span>
    </div>
    <div style="display:flex;gap:6px;">
      <button id="bf1-mini-goto" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <i class="bi bi-fullscreen" style="font-size:12px;"></i>
      </button>
      <button id="bf1-mini-close" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
        <i class="bi bi-x-lg" style="font-size:12px;"></i>
      </button>
    </div>`;
  document.body.appendChild(hud);

  hud.querySelector('#bf1-mini-close').addEventListener('click', () => {
    _miniPlayerDismissed = true;
    hud.style.opacity = '0';
    if (_liveIframe) _liveIframe.style.opacity = '0';
    setTimeout(() => { hud.remove(); }, 300);
  });
  hud.querySelector('#bf1-mini-goto').addEventListener('click', () => {
    const ls = document.getElementById('live-section');
    if (ls) ls.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  requestAnimationFrame(() => { hud.style.opacity = '1'; hud.style.transform = 'translateY(0)'; });
}

function _hideMini() {
  const hud = document.getElementById('bf1-mini-hud');
  if (hud) { hud.style.opacity = '0'; hud.style.transform = 'translateY(10px)'; setTimeout(() => hud.remove(), 300); }

  // Attendre que le scroll soit terminé avant de repositionner l'iframe
  _syncIframeAfterScroll();
}

function _syncIframeAfterScroll() {
  // Annuler le timer précédent si appelé plusieurs fois
  if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }

  const doSync = () => {
    const liveContent = document.getElementById('live-content');
    if (!liveContent || !_liveIframe) return;
    const playerDiv = liveContent.querySelector('[data-live-player]');
    if (!playerDiv) return;
    _positionIframeOver(playerDiv);
  };

  // Plusieurs rAF pour laisser le layout se stabiliser après le scroll
  requestAnimationFrame(() => requestAnimationFrame(() => {
    doSync();
    // Re-sync encore après 300ms au cas où le scroll smooth est encore en cours
    _syncTimer = setTimeout(doSync, 350);
  }));
}
let _syncTimer = null;

function _dismissMiniPlayer() {
  _miniPlayerDismissed = true;
  const hud = document.getElementById('bf1-mini-hud');
  if (hud) { hud.style.opacity = '0'; setTimeout(() => hud.remove(), 300); }
  if (_liveIframe) _liveIframe.style.opacity = '0';
}

function _setupLiveScrollObserver(isOnAir) {
  if (_liveScrollObserver) { _liveScrollObserver.disconnect(); _liveScrollObserver = null; }
  _miniPlayerDismissed = false;

  const liveContent = document.getElementById('live-content');
  if (!liveContent) return;

  _liveScrollObserver = new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting;
    if (visible) {
      _hideMini();
      _miniPlayerDismissed = false;
    } else {
      if (!_miniPlayerDismissed) _showMini();
    }
  }, { threshold: 0.1 });

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

// Remplit le conteneur jtMag avec les items filtrés (même logique que loadHorizontalSection)
async function loadLiveSection(liveData) {
  const container = document.getElementById('live-content');
  if (!container) return;

  // Si l'iframe existe déjà dans body, juste re-synchroniser sa position
  if (_liveIframe && document.body.contains(_liveIframe)) {
    _setupLiveScrollObserver(liveData?.is_live !== false);
    return;
  }

  container.style.minHeight = '';
  container.style.display = 'block';

  const isOnAir = liveData?.is_live !== false;

  try {
    // Injecter le placeholder dans le DOM (sans iframe — l'iframe vit dans body)
    container.innerHTML = `
      <div style="margin:0;border-radius:0;overflow:hidden;position:relative;background:var(--bg-1);">
        <div data-live-player style="position:relative;width:100%;aspect-ratio:16/9;background:#000;"></div>
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

    // Créer l'iframe une seule fois dans document.body (jamais déplacée)
    const playerDiv = container.querySelector('[data-live-player]');
    const iframe = _getOrCreateIframe(LIVE_STREAM_URL);

    // Positionner l'iframe par-dessus le player div — sans transition, immédiat
    const syncPos = () => {
      if (!playerDiv || !iframe) return;
      const r = playerDiv.getBoundingClientRect();
      if (r.width === 0) return; // DOM pas encore rendu
      Object.assign(iframe.style, {
        left: r.left + 'px', top: r.top + 'px',
        width: r.width + 'px', height: r.height + 'px',
        borderRadius: '0', boxShadow: 'none', right: '', bottom: '',
        opacity: '1', pointerEvents: 'auto',
      });
    };
    // Re-sync à chaque scroll de la page ka
    const kaPage = container.closest('.ka-page');
    if (kaPage) {
      kaPage._liveSyncScroll = () => {
        if (!document.getElementById('bf1-mini-hud')) syncPos();
      };
      kaPage.addEventListener('scroll', kaPage._liveSyncScroll, { passive: true });
    }

    // ResizeObserver : se déclenche quand le playerDiv reçoit ses dimensions
    // (notamment au retour sur home après display:none → display:'')
    window._liveResizeObs = new ResizeObserver((entries) => {
      if (document.getElementById('bf1-mini-hud')) return;
      const r = entries[0].contentRect;
      if (r.width > 0) syncPos();
    });
    window._liveResizeObs.observe(playerDiv);

    // Passe initiale après layout stabilisé
    requestAnimationFrame(() => requestAnimationFrame(() => {
      syncPos();
    }));

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
    const sectionEl = document.getElementById(`${sectionName}-section`);
    if (sectionEl) sectionEl.style.display = 'none';
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
      <a href="#/show/missed/${id}" class="missed-card" style="text-decoration:none;flex:0 0 260px;display:flex;flex-direction:column;border-radius:12px;overflow:hidden;background:#111;scroll-snap-align:start;box-shadow:0 2px 12px rgba(0,0,0,0.4);animation:cardFadeIn 0.55s cubic-bezier(0.22,1,0.36,1) both;animation-delay:${index * 70}ms;opacity:0;">
        <div style="position:relative;width:100%;height:146px;flex-shrink:0;">
          <img src="${image}" alt="${title}" style="width:100%;height:100%;object-fit:cover;"
               onerror="this.style.display='none'">
          <div style="position:absolute;bottom:8px;left:8px;display:flex;align-items:center;gap:0;z-index:3;">
            <div style="width:3px;height:18px;background:#E23E3E;border-radius:2px;"></div>
            <span style="background:rgba(0,0,0,0.75);color:#fff;font-size:10px;font-weight:700;padding:3px 7px;letter-spacing:0.5px;text-transform:uppercase;">${category}</span>
          </div>
          ${duration ? `<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.75);color:#fff;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;z-index:3;">${duration}m</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;flex:1;">
          <div style="flex:1;min-width:0;">
            <p style="margin:0 0 3px;color:#888;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${views} vue${views !== 1 ? 's' : ''} · ${_formatFullDate(date)}</p>
            <h3 style="margin:0;color:#fff;font-size:13px;font-weight:700;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${title}</h3>
          </div>
          <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('missed','${id}',this)"
               style="flex:0 0 30px;width:30px;height:30px;background:rgba(255,255,255,0.08);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:10px;border:1px solid rgba(255,255,255,0.1);">
            <i class="bi bi-plus-lg" style="color:#fff;font-size:14px;"></i>
          </div>
        </div>
      </a>`;
  }).join('');

  const voirPlusCard = route ? `
    <a href="${route}" class="bf1-voir-plus-card" style="height:216px;border-radius:12px;width:100px;">
      <div class="bf1-voir-plus-inner">
        <i class="bi bi-grid-3x3-gap"></i>
        <span>Voir plus</span>
        <i class="bi bi-chevron-right"></i>
      </div>
    </a>` : '';

  container.innerHTML = html + voirPlusCard;

  // Vérifier favoris en un seul appel
  if (api.isAuthenticated() && items.length) {
    api.getMyFavorites?.('missed').then(favs => {
      if (!favs?.length) return;
      const favIds = new Set(favs.map(f => String(f.content_id || f.id || f._id)));
      const cards = container.querySelectorAll('.missed-card');
      items.forEach((item, index) => {
        const id = String(item.id || item._id || '');
        if (id && favIds.has(id) && cards[index]) {
          const btn = cards[index].querySelector('[onclick*="toggleFavorite"]');
          if (btn) {
            const icon = btn.querySelector('i');
            if (icon) { icon.className = 'bi bi-check-lg'; btn.style.background = 'rgba(14,122,254,0.9)'; }
          }
        }
      });
    }).catch(() => {});
  }
}

async function loadHorizontalSection(sectionName, items, formatItem, route) {
  const container = document.getElementById(`${sectionName}-content`);
  if (!container) return;

  if (!items || items.length === 0) {
    const sectionEl = document.getElementById(`${sectionName}-section`);
    if (sectionEl) sectionEl.style.display = 'none';
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
  
  // Vérifier l'état des favoris en un seul appel groupé
  if (api.isAuthenticated() && items.length) {
    const contentType = sectionName === 'flashInfo' ? 'news' : sectionName === 'missed' ? 'missed' : sectionName === 'jtMag' ? 'jtandmag' : sectionName === 'magazine' ? 'magazine' : sectionName === 'teleRealite' ? 'tele_realite' : sectionName === 'divertissements' ? 'divertissement' : sectionName === 'sports' ? 'sport' : sectionName === 'reportages' ? 'reportage' : 'archive';
    api.getMyFavorites?.(contentType).then(favs => {
      if (!favs?.length) return;
      const favIds = new Set(favs.map(f => String(f.content_id || f.id || f._id)));
      const cards = container.querySelectorAll('.bf1-content-card');
      items.forEach((item, index) => {
        const id = String(item.id || item._id || '');
        if (id && favIds.has(id) && cards[index]) {
          const btn = cards[index].querySelector('.bf1-add-button');
          if (btn) {
            const icon = btn.querySelector('i');
            if (icon) { icon.className = 'bi bi-check-lg'; btn.style.background = 'rgba(14,122,254,0.9)'; }
          }
        }
      });
    }).catch(() => {});
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