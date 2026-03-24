import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

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
  // Treat is_premium archives without a category as 'premium' requirement
  const effectiveRequired = requiredCat || (isPremium ? 'premium' : null);

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

  listEl.innerHTML = '';
  listEl.appendChild(createSnakeLoader(40));

  try {
    const data = await api.getArchive().catch(() => []);
    allItems = (Array.isArray(data) ? data : []).sort((a, b) =>
      new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0)
    );

    renderList(listEl);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        currentMode = currentMode === 'grid' ? 'list' : 'grid';
        const icon = document.getElementById('archive-toggle-icon');
        if (icon) icon.className = currentMode === 'grid' ? 'bi bi-list' : 'bi bi-grid';
        renderList(listEl);
      });
    }
  } catch (err) {
    console.error('Erreur Archives:', err);
    listEl.innerHTML = emptyState('bi-collection-play', 'Impossible de charger les archives');
  }
}

// Resolve effective required category for an item
function _effectiveCat(item) {
  return item.required_subscription_category || (item.is_premium ? 'premium' : null);
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
    <div style="background:linear-gradient(135deg,#0d0d1a,#1a0a0a);border:1px solid rgba(226,62,62,0.3);
                border-radius:12px;padding:16px;margin:12px 12px 4px;
                display:flex;align-items:flex-start;gap:12px;">
      <div style="width:44px;height:44px;background:rgba(226,62,62,.15);border-radius:50%;flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;">
        <i class="bi bi-lock-fill" style="font-size:20px;color:#E23E3E;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <p style="color:#fff;font-size:14px;font-weight:700;margin:0 0 4px;">Certaines archives sont reservees aux abonnes</p>
        <p style="color:#aaa;font-size:12px;margin:0 0 10px;line-height:1.5;">
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
  <div style="background:linear-gradient(135deg,#0d0d1a,#110a1f);
              border:1px solid rgba(${neededBadge.rgb},.3);
              border-radius:12px;padding:16px;margin:12px 12px 4px;
              display:flex;align-items:flex-start;gap:12px;">
    <div style="width:44px;height:44px;background:rgba(${neededBadge.rgb},.15);border-radius:50%;flex-shrink:0;
                display:flex;align-items:center;justify-content:center;">
      <i class="bi ${neededBadge.icon}" style="font-size:20px;color:${neededBadge.color};"></i>
    </div>
    <div style="flex:1;min-width:0;">
      <p style="color:#fff;font-size:14px;font-weight:700;margin:0 0 4px;">
        Des archives ${neededBadge.label} sont disponibles
      </p>
      <p style="color:#aaa;font-size:12px;margin:0 0 10px;line-height:1.5;">
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
  const banner = _buildAccessBanner();
  if (currentMode === 'grid') {
    container.innerHTML = `${banner}<div class="px-3 pt-2 pb-3" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${allItems.map(buildGridCard).join('')}</div>`;
  } else {
    container.innerHTML = `${banner}<div class="px-3 pt-2 pb-3">${allItems.map(buildListCard).join('')}</div>`;
  }
}

function buildGridCard(item) {
  const img   = item.thumbnail || item.image_url || item.image || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
  const dur   = item.duration ? formatDuration(item.duration) : null;
  const time  = formatTime(item.created_at || item.date);
  const id    = item.id || item._id;

  const reqCat    = item.required_subscription_category || null;
  const isPremium = !!item.is_premium;
  const effCat    = _effectiveCat(item);
  const badge     = effCat ? getSubscriptionBadge(effCat) : null;

  const isLoggedIn = api.isAuthenticated();
  const userCat    = api.getUser()?.subscription_category;
  // Locked = requires subscription AND current user cannot access
  const locked = effCat && !canAccessContent(isLoggedIn ? userCat : null, effCat);

  return `
    <div style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;"
         onclick="window._archiveClick('${esc(String(id))}','${esc(String(reqCat||''))}',${isPremium})">
      <div style="position:relative;">
        ${img
          ? `<img src="${esc(img)}" alt="" style="width:100%;height:140px;object-fit:cover;display:block;${locked ? 'filter:brightness(0.45);' : ''}">`
          : placeholder('140px')}
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 20%,rgba(0,0,0,0.92) 100%);"></div>
        ${badge ? `
        <div style="position:absolute;top:6px;left:6px;display:inline-flex;align-items:center;gap:3px;
                    background:${badge.color};color:#fff;border-radius:4px;
                    padding:2px 7px;font-size:10px;font-weight:700;z-index:1;">
          <i class="bi ${badge.icon}" style="font-size:9px;"></i> ${badge.label}
        </div>` : ''}
        ${locked ? `
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:40px;height:40px;background:rgba(0,0,0,0.75);border-radius:50%;
                        display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.25);">
              <i class="bi bi-lock-fill" style="font-size:18px;color:#fff;"></i>
            </div>
            ${badge ? `<span style="background:rgba(0,0,0,0.7);color:#fff;font-size:9px;border-radius:4px;padding:2px 6px;font-weight:600;">${badge.label} requis</span>` : ''}
          </div>
        </div>` : ''}
        ${dur ? `<div style="position:absolute;top:6px;right:6px;z-index:1;"><span style="background:rgba(0,0,0,0.75);color:#fff;border-radius:4px;padding:2px 6px;font-size:10px;"><i class="bi bi-clock"></i> ${esc(dur)}</span></div>` : ''}
        <div style="position:absolute;bottom:0;left:0;right:0;padding:8px;z-index:1;">
          <p class="mb-1 fw-semibold" style="font-size:12px;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</p>
          <div class="d-flex align-items-center gap-1" style="font-size:10px;color:#aaa;">
            <i class="bi bi-eye"></i><span>${views}</span>
            <span>&bull;</span><i class="bi bi-clock"></i><span>${time}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function buildListCard(item) {
  const img   = item.thumbnail || item.image_url || item.image || '';
  const title = item.title || 'Sans titre';
  const views = formatViews(item.views || item.view_count || item.views_count || 0);
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
    <div class="d-flex mb-3" style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;"
         onclick="window._archiveClick('${esc(String(id))}','${esc(String(reqCat||''))}',${isPremium})">
      <div style="flex-shrink:0;position:relative;">
        ${img
          ? `<img src="${esc(img)}" alt="" style="width:120px;height:90px;object-fit:cover;${locked ? 'filter:brightness(0.45);' : ''}">`
          : placeholder('90px', '120px')}
        ${locked ? `
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;">
          <i class="bi bi-lock-fill" style="font-size:20px;color:rgba(255,255,255,0.9);"></i>
          ${badge ? `<span style="background:rgba(0,0,0,0.75);color:#fff;font-size:8px;border-radius:3px;padding:1px 5px;font-weight:600;">${badge.label}</span>` : ''}
        </div>` : ''}
        ${dur ? `<span style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.8);color:#fff;border-radius:3px;padding:1px 5px;font-size:9px;"><i class="bi bi-clock"></i> ${esc(dur)}</span>` : ''}
      </div>
      <div class="d-flex flex-column justify-content-between p-2" style="flex:1;overflow:hidden;">
        <div>
          ${badge ? `<span style="display:inline-flex;align-items:center;gap:2px;background:${badge.color};color:#fff;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;margin-bottom:4px;">
            <i class="bi ${badge.icon}" style="font-size:9px;"></i> ${badge.label}
          </span>` : ''}
          <p class="mb-1 fw-semibold" style="font-size:13px;color:#fff;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</p>
        </div>
        <div class="d-flex align-items-center gap-1" style="font-size:11px;color:#888;">
          <i class="bi bi-eye"></i><span>${views}</span>
          <span>&bull;</span><i class="bi bi-clock"></i><span>${time}</span>
        </div>
      </div>
    </div>`;
}

function formatDuration(d) {
  const m = parseInt(d);
  if (isNaN(m)) return '';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h${r}` : `${h}h`;
}
function emptyState(icon, msg) {
  return `<div class="text-center py-5"><i class="bi ${icon}" style="font-size:3rem;color:#444;"></i><p class="mt-3" style="color:#999;">${msg}</p></div>`;
}
function placeholder(h, w = '100%') {
  return `<div style="width:${w};height:${h};background:#2a2a2a;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image text-secondary"></i></div>`;
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