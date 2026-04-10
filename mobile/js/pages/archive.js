import * as api from '../services/api.js';
import { injectCardStyles } from '../utils/cardStyles.js';
import { createPageSpinner } from '../utils/snakeLoader.js';
import { setupInfiniteScroll } from '../utils/infiniteScroll.js';
import { injectSortBar, applySortFilter } from '../utils/sortFilter.js';

const LIMIT = 20;
let currentSkip = 0;
let currentTotal = 0;
let currentSort = 'recent';

// --- Subscription utils ---
const SUBSCRIPTION_HIERARCHY = { basic: 1, standard: 2, premium: 3 };

function canAccessContent(userCategory, requiredCategory) {
  if (!requiredCategory) return true;
  const userLevel = SUBSCRIPTION_HIERARCHY[userCategory] || 0;
  const reqLevel  = SUBSCRIPTION_HIERARCHY[requiredCategory] || 0;
  return userLevel >= reqLevel;
}

function getSubscriptionBadge(category) {
  if (category === 'basic')    return { label: 'Basic',    color: '#3B82F6', rgb: '59,130,246',  icon: 'bi-shield-fill' };
  if (category === 'standard') return { label: 'Standard', color: '#9C27B0', rgb: '156,39,176',  icon: 'bi-shield-fill' };
  if (category === 'premium')  return { label: 'Premium',  color: '#FF6F00', rgb: '255,111,0',   icon: 'bi-star-fill' };
  return                               { label: 'Gratuit',  color: '#4CAF50', rgb: '76,175,80',   icon: 'bi-check-circle-fill' };
}

// Open the premium modal (lazy-load if not yet initialised)
function _openPremiumModal(requiredCategory) {
  const open = () => window._showPremiumModal?.({ requiredCategory });
  if (window._showPremiumModal) { open(); return; }
  import('../components/premiumModal.js')
    .then(m => { m.initPremiumModal(); open(); })
    .catch(() => { window.location.hash = '#/premium'; });
}

// Access-gate click handler (exposed globally for inline onclick)
window._archiveClick = function(archiveId, requiredCat, isPremium) {
  // requiredCat comes from the card onclick: '' means explicitly free (null from API),
  // a non-empty string means a specific tier is required.
  // isPremium fallback is intentionally NOT used here — the admin-set category takes priority.
  const effectiveRequired = requiredCat || null;

  // Free content -> navigate directly
  if (!effectiveRequired) {
    window.location.hash = `#/show/archive/${archiveId}`;
    return;
  }

  const badge      = getSubscriptionBadge(effectiveRequired);
  const isLoggedIn = api.isAuthenticated();

  // Not logged in
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

  // Logged in: check subscription level
  const user    = api.getUser();
  const userCat = user?.subscription_category;

  if (canAccessContent(userCat, effectiveRequired)) {
    window.location.hash = `#/show/archive/${archiveId}`;
    return;
  }

  // Insufficient subscription -> open premium modal with context
  _openPremiumModal(effectiveRequired);
};

let allItems = [];
let currentMode = 'grid';

export async function loadArchive() {
  const listEl    = document.getElementById('archive-list');
  const toggleBtn = document.getElementById('archive-toggle-btn');
  if (!listEl) return;

  allItems = []; currentSkip = 0; currentTotal = 0; currentSort = 'recent';
  listEl.innerHTML = '';
  listEl.appendChild(createPageSpinner());

  injectSortBar('archive-page', (order) => {
    currentSort = order;
    renderList(listEl);
    attachInfiniteScroll(listEl);
  });

  try {
    const data = await api.getArchive(0, LIMIT).catch(() => ({ items: [], total: 0 }));
    allItems = data.items || [];
    currentSkip = allItems.length;
    currentTotal = data.total || 0;

    renderList(listEl);
    attachInfiniteScroll(listEl);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('archive-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
        attachInfiniteScroll(listEl);
      });
    }
    // Injecter les styles des cartes
    injectCardStyles();

  } catch (err) {
    console.error('Erreur Archives:', err);
    listEl.innerHTML = emptyState('bi-collection-play', 'Impossible de charger les archives');
  }
}

function attachInfiniteScroll(listEl) {
  setupInfiniteScroll({
    listEl, sentinelId: 'archive-sentinel',
    fetchFn: (skip, limit) => api.getArchive(skip, limit),
    renderCard: (item) => currentMode === 'grid' ? buildGridCard(item) : buildListCard(item),
    getSkip: () => currentSkip, getTotal: () => currentTotal,
    onNewItems: (items, total) => {
      allItems = [...allItems, ...items];
      currentSkip += items.length;
      if (total) currentTotal = total;
    },
    getMode: () => currentMode, gridCols: 2, limit: LIMIT
  });
}

// Resolve effective required category for an item
// If required_subscription_category is explicitly present (even as null = free), respect it.
// Only fall back to is_premium for legacy items where the field is absent entirely.
function _effectiveCat(item) {
  if ('required_subscription_category' in item) {
    return item.required_subscription_category || null;
  }
  return item.is_premium ? 'premium' : null;
}

function _hasLockedContent() {
  return allItems.some(i => _effectiveCat(i));
}

// Top-of-list access banner
function _buildAccessBanner() {
  const isLoggedIn = api.isAuthenticated();
  const user       = api.getUser();
  const userCat    = user?.subscription_category;

  if (!_hasLockedContent()) return '';

  // User already has the highest tier -> no banner needed
  if (isLoggedIn && SUBSCRIPTION_HIERARCHY[userCat] >= 3) return '';

  // Not logged in
  if (!isLoggedIn) {
    return `
    <div style="background:var(--surface,#111);border:1px solid rgba(226,62,62,0.3);
                border-radius:12px;padding:16px;margin:12px 12px 4px;
                display:flex;align-items:flex-start;gap:12px;">
      <div style="width:44px;height:44px;background:rgba(226,62,62,.15);border-radius:50%;flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;">
        <i class="bi bi-lock-fill" style="font-size:20px;color:#E23E3E;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <p style="color:var(--text,#fff);font-size:14px;font-weight:700;margin:0 0 4px;">Certaines archives sont reservees aux abonnes</p>
        <p style="color:var(--text-2,#aaa);font-size:12px;margin:0 0 10px;line-height:1.5;">
          Connectez-vous pour acceder aux archives Basic, Standard et Premium.
        </p>
        <button onclick="window.location.hash='#/login'"
                style="background:#E23E3E;border:none;border-radius:8px;padding:9px 18px;
                       color:#fff;font-size:13px;font-weight:700;cursor:pointer;">
          <i class="bi bi-box-arrow-in-right me-1"></i> Se connecter
        </button>
      </div>
    </div>`;
  }

  // Logged in but subscription insufficient
  // Find items the user can't access
  const missingItems = allItems.filter(i => {
    const cat = _effectiveCat(i);
    return cat && !canAccessContent(userCat, cat);
  });
  if (!missingItems.length) return ''; // User can access everything

  // Find the lowest missing tier
  const lowestMissingLevel = missingItems.reduce((min, i) => {
    const lvl = SUBSCRIPTION_HIERARCHY[_effectiveCat(i)] || 0;
    return (min === 0 || lvl < min) ? lvl : min;
  }, 0);
  const neededCat   = Object.keys(SUBSCRIPTION_HIERARCHY).find(k => SUBSCRIPTION_HIERARCHY[k] === lowestMissingLevel) || 'basic';
  const neededBadge = getSubscriptionBadge(neededCat);
  const userBadge   = userCat ? getSubscriptionBadge(userCat) : null;

  const currentLine = userBadge
    ? `Votre abonnement actuel : <strong style="color:#fff;">${userBadge.label}</strong> &mdash; `
    : `Vous n'avez pas encore d'abonnement &mdash; `;

  return `
  <div style="background:var(--surface,#111);
              border:1px solid rgba(${neededBadge.rgb},.3);
              border-radius:12px;padding:16px;margin:12px 12px 4px;
              display:flex;align-items:flex-start;gap:12px;">
    <div style="width:44px;height:44px;background:rgba(${neededBadge.rgb},.15);border-radius:50%;flex-shrink:0;
                display:flex;align-items:center;justify-content:center;">
      <i class="bi ${neededBadge.icon}" style="font-size:20px;color:${neededBadge.color};"></i>
    </div>
    <div style="flex:1;min-width:0;">
      <p style="color:var(--text,#fff);font-size:14px;font-weight:700;margin:0 0 4px;">
        Des archives ${neededBadge.label} sont disponibles
      </p>
      <p style="color:var(--text-2,#aaa);font-size:12px;margin:0 0 10px;line-height:1.5;">
        ${currentLine}souscrivez a un abonnement <strong style="color:${neededBadge.color};">${neededBadge.label}</strong> pour y acceder.
      </p>
      <button onclick="window._archiveBannerUpgrade('${neededCat}')"
              style="background:${neededBadge.color};border:none;border-radius:8px;padding:9px 18px;
                     color:#fff;font-size:13px;font-weight:700;cursor:pointer;">
        <i class="bi bi-arrow-up-circle me-1"></i> Voir les offres
      </button>
    </div>
  </div>`;
}

// Exposed globally so the inline onclick works
window._archiveBannerUpgrade = function(cat) {
  _openPremiumModal(cat);
};

function renderList(container) {
  if (!allItems.length) {
    container.innerHTML = emptyState('bi-collection-play', 'Aucune archive disponible');
    return;
  }
  const sorted = applySortFilter(allItems, currentSort, 'created_at', 'date');
  const banner = _buildAccessBanner();
  const isGrid = currentMode === 'grid';
  const wrapStyle = isGrid ? 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' : '';
  container.innerHTML = `${banner}<div class="bf1-cards-wrapper px-3 pt-2 pb-3" style="${wrapStyle}">${sorted.map((item, index) => isGrid ? buildGridCard(item, index) : buildListCard(item, index)).join('')}</div>`;
  
  // Vérifier l'état des favoris si connecté (seulement pour les archives non-locked)
  if (api.isAuthenticated()) {
    const isLoggedIn = api.isAuthenticated();
    const userCat = api.getUser()?.subscription_category;
    
    allItems.forEach((item, index) => {
      const contentId = item.id || item._id || '';
      const effCat = _effectiveCat(item);
      const locked = effCat && !canAccessContent(isLoggedIn ? userCat : null, effCat);
      
      if (contentId && !locked) {
        api.checkFavorite('archive', contentId).then(isFavorited => {
          const cards = container.querySelectorAll('.bf1-content-card');
          const card = cards[index];
          if (card && isFavorited) {
            const btn = card.querySelector('[onclick*="toggleFavorite"]');
            if (btn) {
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

function buildGridCard(item, index = 0) {
  const img   = item.thumbnail || item.image_url || item.image || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const likes = formatViews(item.likes || 0);
  const time  = formatTime(item.created_at || item.date);
  const id    = item.id || item._id;

  const reqCat    = item.required_subscription_category || null;
  const isPremium = !!item.is_premium;
  const effCat    = _effectiveCat(item);
  const badge     = effCat ? getSubscriptionBadge(effCat) : null;

  const isLoggedIn = api.isAuthenticated();
  const userCat    = api.getUser()?.subscription_category;
  const locked = effCat && !canAccessContent(isLoggedIn ? userCat : null, effCat);

  // Badge "Nouveau" supprimé
  const nouveauBadge = '';

  // Bouton + en bas à droite (sauf si locked)
  const addButton = !locked ? `
    <div onclick="event.stopPropagation();event.preventDefault();window.toggleFavorite('archive','${id}',this)" style="position:absolute;bottom:8px;right:8px;width:36px;height:36px;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;z-index:3;border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
      <i class="bi bi-plus-lg"></i>
    </div>
  ` : '';

  // Badge subscription en haut à gauche
  const subBadge = badge ? `
    <div style="position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:4px;background:${badge.color};color:#fff;border-radius:10px;padding:5px 10px;font-size:10px;font-weight:700;z-index:3;backdrop-filter:blur(10px);box-shadow:0 2px 8px rgba(0,0,0,0.3);text-transform:uppercase;letter-spacing:0.3px;">
      <i class="bi ${badge.icon}" style="font-size:9px;"></i> ${badge.label}
    </div>
  ` : '';

  // Lock overlay
  const lockOverlay = locked ? `
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:4;border-radius:16px;">
      <div style="width:44px;height:44px;background:rgba(0,0,0,0.75);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.2);backdrop-filter:blur(10px);">
        <i class="bi bi-lock-fill" style="font-size:18px;color:white;"></i>
      </div>
    </div>
  ` : '';

  return `
    <a href="javascript:void(0)" onclick="window._archiveClick('${esc(String(id))}','${esc(String(reqCat||''))}',${isPremium})" class="bf1-content-card" style="--card-index:${index};text-decoration:none;display:block;width:100%;">
      <div class="bf1-card-inner">
        <div class="bf1-card-image-wrapper">
          ${img ? `<img src="${esc(img)}" alt="${esc(title)}" class="bf1-card-image ${locked ? 'bf1-card-locked' : ''}">` : placeholder('320px')}
          ${subBadge}
          ${nouveauBadge}
          ${addButton}
          ${lockOverlay}
        </div>
        <div class="bf1-card-content">
          <h3 class="bf1-card-title">${esc(title)}</h3>
          <div class="bf1-card-stats">
            <span><i class="bi bi-eye-fill"></i> ${views}</span>
            <span class="bf1-likes"><i class="bi bi-heart-fill"></i> ${likes}</span>
            <span><i class="bi bi-clock-fill"></i> ${time}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

function buildListCard(item, index = 0) {
  const img   = item.thumbnail || item.image_url || item.image || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const likes = formatViews(item.likes || 0);
  const dur   = item.duration ? formatDuration(item.duration) : null;
  const time  = formatTime(item.created_at || item.date);
  const id    = item.id || item._id;

  const reqCat    = item.required_subscription_category || null;
  const isPremium = !!item.is_premium;
  const effCat    = _effectiveCat(item);
  const badge     = effCat ? getSubscriptionBadge(effCat) : null;

  const isLoggedIn = api.isAuthenticated();
  const userCat    = api.getUser()?.subscription_category;
  const locked     = effCat && !canAccessContent(isLoggedIn ? userCat : null, effCat);

  return `
    <a href="javascript:void(0)" onclick="window._archiveClick('${esc(String(id))}','${esc(String(reqCat||''))}',${isPremium})" class="bf1-list-card-link" style="--card-index:${index};text-decoration:none;">
      <div class="d-flex" style="background:#0a0a0a;border-radius:10px;overflow:hidden;cursor:pointer;box-shadow:0 2px 16px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);">
        <div style="flex-shrink:0;position:relative;">
          ${img ? `<img src="${esc(img)}" alt="" style="width:120px;height:90px;object-fit:cover;transition:transform 0.3s ease;${locked ? 'filter:brightness(0.45);' : ''}">` : placeholder('90px','120px')}
          ${locked ? `
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
            <i class="bi bi-lock-fill" style="font-size:20px;color:rgba(255,255,255,0.9);"></i>
          </div>` : ''}
        </div>
        <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
          ${badge ? `<span style="display:inline-flex;align-items:center;gap:2px;background:${badge.color};color:#fff;border-radius:4px;padding:2px 6px;font-size:9px;font-weight:700;margin-bottom:4px;">
            <i class="bi ${badge.icon}" style="font-size:8px;"></i> ${badge.label}
          </span>` : ''}
          <p class="mb-1 fw-semibold" style="font-size:0.85rem;font-weight:700;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${esc(title)}</p>
          <div class="d-flex align-items-center gap-2" style="font-size:0.65rem;color:rgba(255,255,255,0.7);font-weight:500;">
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-eye" style="color:rgba(255,255,255,0.6);"></i>${views}</span>
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-heart-fill" style="color:#E23E3E;"></i>${likes}</span>
            <span style="display:flex;align-items:center;gap:3px;"><i class="bi bi-clock" style="color:rgba(255,255,255,0.6);"></i>${time}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

function formatDuration(d) {
  const m = parseInt(d);
  if (isNaN(m)) return '';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h${r}` : `${h}h`;
}

// Styles de cartes gérés par cardStyles.js (importé en haut)

function _removedInjectCardStyles() {
  // SUPPRIMÉ - Utiliser import { injectCardStyles } from '../utils/cardStyles.js'
  const oldStyle = document.getElementById('bf1-card-styles');
  if (oldStyle) oldStyle.remove();
  
  const style = document.createElement('style');
  style.id = 'bf1-card-styles';
  style.textContent = `
    /* ===== CARDS GRID ===== */
    .bf1-content-card {
      flex-shrink: 0;
      text-decoration: none;
      display: block;
      cursor: pointer;
      animation: cardFadeIn 0.5s ease-out forwards;
      animation-delay: calc(var(--card-index) * 0.05s);
      opacity: 0;
    }

    .bf1-card-inner {
      position: relative;
      width: 100%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bf1-content-card:active .bf1-card-inner {
      transform: scale(0.97);
    }

    .bf1-card-image-wrapper {
      position: relative;
      width: 100%;
      height: 240px;
      border-radius: 16px;
      overflow: hidden;
      background: #1a1a1a;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .bf1-card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bf1-content-card:hover .bf1-card-image {
      transform: scale(1.05);
    }

    .bf1-card-image.bf1-card-locked {
      filter: brightness(0.5) saturate(0.7);
    }

    .bf1-card-content {
      padding: 12px 0 0;
    }

    .bf1-card-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 8px;
      color: white;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      letter-spacing: -0.2px;
    }

    .bf1-card-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 500;
    }

    .bf1-card-stats span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .bf1-card-stats i {
      font-size: 11px;
    }

    .bf1-likes {
      color: #E23E3E !important;
    }

    .bf1-likes i {
      color: #E23E3E !important;
    }

    /* ===== LIST CARDS ===== */
    .bf1-list-card-link {
      display: block;
      margin-bottom: 12px;
      animation: cardFadeIn 0.5s ease-out forwards;
      animation-delay: calc(var(--card-index) * 0.05s);
      opacity: 0;
    }

    .bf1-list-card-link > div:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) !important;
    }

    .bf1-list-card-link > div:hover img {
      transform: scale(1.1) !important;
    }

    .bf1-list-card-link:active > div {
      transform: scale(0.98);
    }

    /* ===== ANIMATIONS ===== */
    @keyframes cardFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ===== EMPTY STATE ===== */
    .bf1-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #999;
    }

    .bf1-empty-state i {
      font-size: 64px;
      color: #333;
      margin-bottom: 16px;
    }

    .bf1-empty-state p {
      font-size: 15px;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}

function emptyState(icon, msg) {
  return `<div class="bf1-empty-state"><i class="bi ${icon}"></i><p>${msg}</p></div>`;
}

function placeholder(h, w = '100%') {
  return `<div style="width:${w};height:${h};background:#2a2a2a;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image" style="font-size:32px;color:#555;"></i></div>`;
}
function formatViews(n) {
  if (!n) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
function formatTime(d) {
  if (!d) return 'Recemment';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "A l'instant";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `${j}j`;
    return new Date(d).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } catch { return 'Recemment'; }
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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