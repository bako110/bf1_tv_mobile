import { isAuthenticated, getUser, logout, getMySubscription } from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';
import { themeManager } from '../utils/themeManager.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function getCategoryBadge(category) {
  const map = {
    basic:    { label: 'Basic',    color: '#2196F3', icon: 'bi-star' },
    standard: { label: 'Standard', color: '#9C27B0', icon: 'bi-star-half' },
    premium:  { label: 'Premium',  color: '#FF6F00', icon: 'bi-star-fill' },
  };
  return map[category] || { label: 'Gratuit', color: '#4CAF50', icon: 'bi-gift' };
}

function fmtDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtOffer(offer) {
  return { monthly: 'Mensuel (1 mois)', quarterly: 'Trimestriel (3 mois)', yearly: 'Annuel (1 an)' }[offer] || offer || 'Premium';
}

// ─── Section Thème ──────────────────────────────────────────────────────────

function buildThemeCard() {
  const currentTheme = themeManager.getCurrent();
  
  const themeOptions = [
    { value: 'dark', label: 'Sombre', desc: 'Thème sombre (par défaut)' },
    { value: 'light', label: 'Clair', desc: 'Thème clair' },
    { value: 'auto', label: 'Automatique', desc: 'Suit la préférence du système' }
  ];

  let optionsHtml = themeOptions.map(opt => `
    <div onclick="window._setTheme('${opt.value}')" 
         style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:10px;
                 cursor:pointer;transition:background .2s;background:${currentTheme === opt.value ? 'rgba(226,62,62,0.1)' : 'transparent'};">
      <div style="flex:1;">
        <div style="font-weight:600;color:var(--btn-secondary-text, #fff);font-size:14px;">${opt.label}</div>
        <div style="color:var(--btn-secondary-text, #A0A0A0);font-size:12px;">${opt.desc}</div>
      </div>
      ${currentTheme === opt.value ? '<i class="bi bi-check2" style="color:#E23E3E;font-size:18px;"></i>' : ''}
    </div>
  `).join('');

  return `
    <div class="mx-3 mb-3 rounded p-3" style="background:#1a1a1a;border:1px solid #2a2a2a;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <i class="bi bi-palette-fill" style="font-size:18px;color:#E23E3E;"></i>
        <span style="font-weight:600;color:var(--btn-secondary-text, #fff);font-size:14px;">Thème</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;color:var(--btn-secondary-text, #fff);">
        ${optionsHtml}
      </div>
    </div>`;
}

// ─── écran non connecté ─────────────────────────────────────────────────────

function renderGuest(container) {
  container.innerHTML = `
    <div class="d-flex flex-column align-items-center justify-content-center px-4"
         style="min-height:calc(100vh - 130px);background:radial-gradient(circle at 50% 30%,#1a0505 0%,#0a0a0a 65%);">

      <!-- Logo -->
      <div class="mb-4 text-center">
        <img src="./assets/images/logo.png" alt="BF1 TV"
             style="width:120px;height:120px;object-fit:contain;
                    filter:drop-shadow(0 0 12px rgba(226,62,62,0.4));">
        <p style="color:#A0A0A0;font-size:12px;font-style:italic;margin:6px 0 0;">La chaîne au cœur de nos défis</p>
      </div>

      <h2 class="fw-bold mb-2 text-center" style="font-size:22px;">Bienvenue sur BF1 TV</h2>
      <p class="text-center mb-4" style="color:#A0A0A0;font-size:14px;line-height:1.5;max-width:300px;">
        Connectez-vous pour commenter, recevoir des notifications et profiter d'une expérience personnalisée
      </p>

      <!-- Avantages -->
      <div class="w-100 mb-4" style="max-width:320px;">
        <div class="d-flex align-items-center gap-3 mb-3 p-3 rounded" style="background:rgba(226,62,62,0.08);">
          <i class="bi bi-chat-dots-fill" style="font-size:22px;color:#E23E3E;"></i>
          <span style="font-size:14px;">Commentez les contenus</span>
        </div>
        <div class="d-flex align-items-center gap-3 p-3 rounded" style="background:rgba(226,62,62,0.08);">
          <i class="bi bi-bell-fill" style="font-size:22px;color:#E23E3E;"></i>
          <span style="font-size:14px;">Recevez des notifications</span>
        </div>
      </div>

      <!-- Boutons -->
      <div class="w-100" style="max-width:320px;">
        <a href="#/login" class="btn w-100 mb-3 fw-bold"
           style="background:#E23E3E;color:#fff;border:none;padding:14px;font-size:15px;border-radius:10px;">
          <i class="bi bi-box-arrow-in-right me-2"></i>Se connecter
        </a>
        <a href="#/register" class="btn btn-outline-danger w-100 mb-3 fw-bold"
           style="padding:14px;font-size:15px;border-radius:10px;">
          Créer un compte
        </a>
        <a href="#/home" class="d-block text-center" style="color:#A0A0A0;font-size:13px;text-decoration:none;">
          Continuer en tant qu'invité
        </a>
      </div>
    </div>`;
}

// ─── écran connecté ─────────────────────────────────────────────────────────

async function renderProfile(container, user) {
  const isPremium = user.is_premium;

  // Chargement abonnement (silencieux)
  let subscription = null;
  try {
    const sub = await getMySubscription();
    if (Array.isArray(sub)) subscription = sub.find(s => s.is_active) || sub[0] || null;
    else if (sub) subscription = sub;
  } catch {}

  // ── Header gradient ──
  const header = `
    <div style="background:linear-gradient(160deg,#1a0505 0%,#111 60%);padding:32px 20px 24px;">
      <div class="d-flex flex-column align-items-center">
        <div class="rounded-circle d-flex align-items-center justify-content-center mb-3"
             style="width:80px;height:80px;background:#1e1e1e;border:2.5px solid #E23E3E;">
          <i class="bi bi-person-fill" style="font-size:40px;color:#fff;"></i>
        </div>
        <h2 class="mb-1 fw-bold" style="font-size:20px;">${user.username || user.email}</h2>
        <p style="color:#A0A0A0;font-size:13px;margin:0;">${user.email || ''}</p>
        ${isPremium ? `<span class="badge mt-2" style="background:#FF6F00;font-size:11px;letter-spacing:.5px;"><i class="bi bi-star-fill me-1"></i>Premium</span>` : `<span class="badge mt-2" style="background:#4CAF50;font-size:11px;"><i class="bi bi-gift me-1"></i>Gratuit</span>`}
      </div>
    </div>`;

  // ── Section abonnement ──
  let subSection = '';
  if (isPremium && subscription) {
    const badge = getCategoryBadge(subscription.category);
    subSection = `
      <div class="mx-3 mb-3 p-3 rounded" style="background:#1a1a1a;border:1px solid #2a2a2a;">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-credit-card" style="color:#E23E3E;"></i>
          <span class="fw-bold" style="font-size:15px;">Mon Abonnement</span>
        </div>
        ${subscription.category ? `
        <div class="d-inline-flex align-items-center gap-1 px-2 py-1 rounded mb-3"
             style="background:${badge.color}22;">
          <i class="bi ${badge.icon}" style="color:${badge.color};font-size:14px;"></i>
          <span style="color:${badge.color};font-size:13px;font-weight:600;">${badge.label}</span>
        </div>` : ''}
        ${row('Plan', fmtOffer(subscription.offer))}
        ${row('Début', fmtDate(subscription.start_date))}
        ${row('Fin', subscription.end_date ? fmtDate(subscription.end_date) : 'Illimité')}
        ${subscription.final_price ? row('Prix payé', `${subscription.final_price.toLocaleString()} XOF`) : ''}
        <div class="d-flex justify-content-between align-items-center py-2" style="border-top:1px solid #2a2a2a;">
          <span style="color:#A0A0A0;font-size:13px;">Statut</span>
          <span style="color:${subscription.is_active ? '#4CAF50' : '#E23E3E'};font-size:13px;font-weight:600;">
            <i class="bi bi-${subscription.is_active ? 'check-circle-fill' : 'x-circle-fill'} me-1"></i>
            ${subscription.is_active ? 'Actif' : 'Expiré'}
          </span>
        </div>
      </div>`;
  } else if (!isPremium) {
    subSection = `
      <div class="mx-3 mb-3 p-3 rounded" style="background:#1a1a1a;border:1px solid #2a2a2a;">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-star" style="color:#E23E3E;"></i>
          <span class="fw-bold" style="font-size:15px;">Découvrez nos Plans</span>
        </div>
        <div class="mb-2">
          <span class="badge" style="background:#4CAF5022;color:#4CAF50;font-size:12px;"><i class="bi bi-gift me-1"></i>Gratuit</span>
        </div>
        <p style="color:#A0A0A0;font-size:13px;">Vous utilisez actuellement notre offre gratuite.</p>
        <div class="mb-3">
          <div class="d-flex align-items-center gap-2 mb-1"><i class="bi bi-check text-success"></i><span style="font-size:13px;">Contenu gratuit illimité</span></div>
          <div class="d-flex align-items-center gap-2 mb-1"><i class="bi bi-x" style="color:#E23E3E;"></i><span style="font-size:13px;opacity:.6;">Accès au contenu premium</span></div>
          <div class="d-flex align-items-center gap-2"><i class="bi bi-x" style="color:#E23E3E;"></i><span style="font-size:13px;opacity:.6;">Qualité HD/4K</span></div>
        </div>
        <a href="#/premium" class="btn w-100 fw-bold"
           style="background:#E23E3E;color:#fff;border:none;border-radius:8px;">
          <i class="bi bi-arrow-up me-1"></i>Passer à Premium
        </a>
      </div>`;
  }

  // ── Section thème ──
  const themeSection = buildThemeCard();

  // ── Menu ──
  const menu = `
    <div class="mx-3 mb-3 rounded overflow-hidden" style="background:#1a1a1a;border:1px solid #2a2a2a;">
      ${menuItem('bi-heart-fill', '#E23E3E', 'Mes favoris', '#/favorites')}
      ${menuItem('bi-bell-fill', '#E23E3E', 'Notifications', '#/notifications')}
      ${menuItem('bi-headset', '#A0A0A0', 'Aide &amp; Support', '#/support')}
      ${menuItem('bi-info-circle-fill', '#A0A0A0', 'À propos', '#/about')}
    </div>

    <div class="mx-3 mb-3 rounded overflow-hidden" style="background:#1a1a1a;border:1px solid #E23E3E22;">
      <button onclick="window._bf1Logout()" class="w-100 d-flex align-items-center gap-3 p-3 border-0 bg-transparent"
              style="color:#E23E3E;cursor:pointer;">
        <i class="bi bi-box-arrow-right" style="font-size:20px;"></i>
        <span style="font-size:14px;font-weight:500;">Déconnexion</span>
      </button>
    </div>

    <p class="text-center mb-4" style="color:#444;font-size:11px;">BF1 TV &copy; 2026 &nbsp;·&nbsp; Version 1.0.0</p>`;

  container.innerHTML = header + `<div class="py-3">` + subSection + themeSection + menu + `</div>`;

  window._bf1Logout = () => {
    if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;
    logout();
    window.location.hash = '#/home';
  };

  // ┌─ Gestionnaire de thème ──────────────────────────────────────┐
  window._setTheme = (themeName) => {
    themeManager.setTheme(themeName, true);
    // Rafraîchir le profil pour mettre à jour l'affichage
    setTimeout(() => {
      renderProfile(container, user);
    }, 100);
  };
  // └──────────────────────────────────────────────────────────────┘
}

function row(label, value) {
  return `<div class="d-flex justify-content-between align-items-center py-2" style="border-top:1px solid #2a2a2a;">
    <span style="color:#A0A0A0;font-size:13px;">${label}</span>
    <span style="font-size:13px;font-weight:500;">${value}</span>
  </div>`;
}

function menuItem(icon, iconColor, label, href) {
  return `<a href="${href}" class="d-flex align-items-center justify-content-between p-3 text-decoration-none"
     style="color:#fff;border-top:1px solid #2a2a2a;" onmouseover="this.style.background='rgba(226,62,62,0.07)'" onmouseout="this.style.background=''">
    <div class="d-flex align-items-center gap-3">
      <i class="bi ${icon}" style="font-size:20px;color:${iconColor};"></i>
      <span style="font-size:14px;">${label}</span>
    </div>
    <i class="bi bi-chevron-right" style="color:#444;font-size:14px;"></i>
  </a>`;
}

// ─── point d'entrée ─────────────────────────────────────────────────────────

export async function loadProfile() {
  const container = document.getElementById('profile-content');
  if (!container) return;

  if (!isAuthenticated()) {
    renderGuest(container);
    return;
  }

  // Spinner pendant le chargement de l'abonnement
  container.innerHTML = '';
  container.appendChild(createSnakeLoader(50));

  try {
    const user = getUser();
    await renderProfile(container, user);
  } catch (err) {
    console.error('Erreur loadProfile:', err);
    container.innerHTML = `<div class="alert alert-danger m-3">Erreur: ${err.message}</div>`;
  }
}

// Fonction globale pour recharger le profil (appelée après un abonnement réussi)
window._reloadProfile = async function() {
  console.log('🔄 Rechargement du profil après abonnement...');
  await loadProfile();
};
