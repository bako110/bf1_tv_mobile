// abonnement.js — Page Abonnement Premium (web)
// Inspiré de mobile/js/components/premiumModal.js
import * as api from '../../shared/services/api.js';

// ─── Hiérarchie & styles par catégorie ───────────────────────────────────────
const CAT_STYLE = {
  basic:    { rgb: '59,130,246',  hex: '#3B82F6' },
  standard: { rgb: '34,197,94',   hex: '#22C55E' },
  premium:  { rgb: '234,179,8',   hex: '#EAB308' },
  default:  { rgb: '226,62,62',   hex: '#E23E3E' },
};

async function _getPriceMultiplier() {
  try {
    const resp = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const d = await resp.json();
    const isInBF = d.country_code === 'BF';
    return { multiplier: isInBF ? 1 : 2, isInCountry: isInBF };
  } catch {
    return { multiplier: 1, isInCountry: true };
  }
}

function _fmtPrice(n) {
  return Math.round(n).toLocaleString('fr-FR');
}

function _featsByMonths(months) {
  const f = [
    'Accès à tous les contenus premium',
    'Visionnage en haute qualité',
    'Sans publicité',
    'Accès prioritaire aux nouveautés',
    'Téléchargement des archives',
  ];
  if (months >= 3)  f.push('Support prioritaire');
  if (months >= 12) f.push('Support prioritaire 24h/24', 'Meilleure offre de l\'année');
  return f;
}

function _savings(months, basePrice) {
  if (months <= 1) return null;
  const eco = 3000 * months - basePrice;
  return eco > 0 ? `Économisez ${_fmtPrice(eco)} FCFA` : null;
}

function _badge(months) {
  if (months >= 12) return { label: 'Meilleur prix', color: '#EAB308' };
  if (months >= 3)  return { label: 'Populaire',     color: '#22C55E' };
  return null;
}

function _catOf(plan) {
  const s = (plan.code || plan.name || '').toLowerCase();
  if (s.includes('premium'))  return 'premium';
  if (s.includes('standard')) return 'standard';
  return 'basic';
}

// ─── État ─────────────────────────────────────────────────────────────────────
let _state = { step: 1, plan: null, paymentMethod: null, paymentData: null };

// ─── Conteneur principal ──────────────────────────────────────────────────────
function _container() { return document.getElementById('plans-container'); }

function _setStepUI(n) {
  _state.step = n;
  [1, 2, 3].forEach(i => {
    const dot  = document.getElementById(`ab-dot-${i}`);
    const line = document.getElementById(`ab-line-${i}`);
    if (dot) {
      dot.classList.toggle('active', i <= n);
      dot.classList.toggle('done',   i <  n);
    }
    if (line) line.classList.toggle('active', i < n);
  });
  const backBtn = document.getElementById('ab-back');
  if (backBtn) backBtn.style.display = (n > 1 && n < 4) ? 'flex' : 'none';
}

// ─── Étape 1 : Choix du plan ──────────────────────────────────────────────────
async function renderStep1() {
  _setStepUI(1);
  const box = document.getElementById('ab-step-body');
  document.getElementById('ab-step-title').textContent = 'Choisissez votre plan';
  document.getElementById('ab-step-sub').textContent   = 'Accédez à tous les contenus exclusifs BF1 TV. Sans engagement.';
  if (!box) return;

  box.innerHTML = `<div class="ab-loader"><div class="ab-spinner"></div></div>`;

  if (!api.isAuthenticated()) {
    box.innerHTML = `
      <div class="ab-auth-wall">
        <i class="bi bi-lock-fill ab-auth-icon"></i>
        <h3 class="ab-auth-title">Connexion requise</h3>
        <p class="ab-auth-desc">Connectez-vous pour accéder aux offres premium et profiter de tous les avantages BF1 TV.</p>
        <a href="connexion.html" class="ab-btn-red">
          <i class="bi bi-box-arrow-in-right"></i> Se connecter
        </a>
      </div>`;
    return;
  }

  try {
    const [rawPlans, { multiplier, isInCountry }, curSub] = await Promise.all([
      api.getSubscriptionPlans(),
      _getPriceMultiplier(),
      api.getMySubscription().catch(() => null),
    ]);

    // Abonnement déjà actif
    if (curSub && curSub.is_active) {
      const exp = curSub.end_date ? new Date(curSub.end_date).toLocaleDateString('fr-FR') : '—';
      box.innerHTML = `
        <div class="ab-active-card">
          <div class="ab-active-icon"><i class="bi bi-shield-fill-check"></i></div>
          <h3 class="ab-active-title">Abonnement actif</h3>
          <p class="ab-active-plan">${curSub.offer || curSub.plan_name || 'Plan Premium'}</p>
          <p class="ab-active-exp">Expire le ${exp}</p>
          <a href="profil.html" class="ab-btn-outline">
            <i class="bi bi-person-fill"></i> Voir mon profil
          </a>
        </div>`;
      return;
    }

    const plans = (Array.isArray(rawPlans) ? rawPlans : []).map(p => {
      const base = (p.price_cents || 0) / 100;
      return {
        ...p,
        basePrice: base,
        price:     base * multiplier,
        multiplier, isInCountry,
        features:  _featsByMonths(p.duration_months || 1),
        savings:   _savings(p.duration_months || 1, base * multiplier),
        badge:     _badge(p.duration_months || 1),
        category:  _catOf(p),
      };
    });

    if (!plans.length) {
      box.innerHTML = `<div class="ab-empty"><i class="bi bi-exclamation-circle"></i><p>Aucun plan disponible pour le moment.</p></div>`;
      return;
    }

    box.innerHTML = `
      ${!isInCountry ? `
        <div class="ab-intl-notice">
          <i class="bi bi-geo-alt-fill"></i>
          <span>Tarif international appliqué (×${multiplier})</span>
        </div>` : ''}
      <div class="ab-plans-grid">
        ${plans.map(p => {
          const cs = CAT_STYLE[p.category] || CAT_STYLE.default;
          return `
          <div class="ab-plan-card${p.badge ? ' ab-plan-featured' : ''}" style="--plan-color:${cs.hex};--plan-rgb:${cs.rgb};">
            ${p.badge ? `<div class="ab-plan-badge" style="background:${p.badge.color};">${p.badge.label}</div>` : ''}
            <div class="ab-plan-header">
              <div class="ab-plan-icon"><i class="bi bi-star-fill"></i></div>
              <div class="ab-plan-name">${p.name || p.code}</div>
              ${p.savings ? `<span class="ab-plan-savings">${p.savings}</span>` : ''}
            </div>
            <div class="ab-plan-price">
              <span class="ab-plan-amount">${_fmtPrice(p.price)}</span>
              <span class="ab-plan-currency"> ${p.currency || 'FCFA'} / ${p.duration_months || 1} mois</span>
            </div>
            ${!p.isInCountry && p.basePrice !== p.price ? `
              <div class="ab-plan-intl-price">Prix BF : ${_fmtPrice(p.basePrice)} FCFA</div>` : ''}
            <ul class="ab-plan-features">
              ${p.features.map(f => `<li><i class="bi bi-check-circle-fill"></i><span>${f}</span></li>`).join('')}
            </ul>
            <button class="ab-btn-red ab-plan-cta"
                    onclick="window._abSelectPlan(${JSON.stringify(p).replace(/"/g, '&quot;')})">
              Choisir ce plan <i class="bi bi-arrow-right"></i>
            </button>
          </div>`;
        }).join('')}
      </div>
      <p class="ab-no-commitment">Résiliez à tout moment. Aucun engagement.</p>`;
  } catch {
    box.innerHTML = `<div class="ab-empty ab-error"><i class="bi bi-exclamation-circle"></i><p>Impossible de charger les plans. Réessayez.</p></div>`;
  }
}

// ─── Étape 2 : Mode de paiement ───────────────────────────────────────────────
function renderStep2() {
  _setStepUI(2);
  const p = _state.plan;
  const box = document.getElementById('ab-step-body');
  document.getElementById('ab-step-title').textContent = 'Mode de paiement';
  document.getElementById('ab-step-sub').textContent   = 'Choisissez votre méthode de paiement préférée';

  const _row = (method, icon, colorRgb, name, desc) => `
    <button class="ab-payment-row" onclick="window._abSelectPayment('${method}')">
      <div class="ab-payment-icon" style="background:rgba(${colorRgb},.12);border-color:rgba(${colorRgb},.25);">
        <i class="bi ${icon}" style="color:rgb(${colorRgb});"></i>
      </div>
      <div class="ab-payment-info">
        <div class="ab-payment-name">${name}</div>
        <div class="ab-payment-desc">${desc}</div>
      </div>
      <i class="bi bi-chevron-right ab-payment-arrow"></i>
    </button>`;

  box.innerHTML = `
    <div class="ab-recap">
      <div>
        <div class="ab-recap-label">Plan sélectionné</div>
        <div class="ab-recap-name">${p.name || p.code}</div>
      </div>
      <div class="ab-recap-price">
        <div class="ab-recap-amount">${_fmtPrice(p.price)} ${p.currency || 'FCFA'}</div>
        <div class="ab-recap-period">/ ${p.duration_months || 1} mois</div>
      </div>
    </div>
    <div class="ab-payment-methods">
      ${_row('orange', 'bi-phone-fill',               '255,102,0',  'Orange Money',  'Paiement via Orange Money')}
      ${_row('moov',   'bi-phone-fill',               '0,102,204',  'Moov Money',    'Paiement via Moov Money')}
      ${_row('card',   'bi-credit-card-2-front-fill', '226,62,62',  'Carte bancaire','Visa, Mastercard')}
    </div>`;
}

// ─── Étape 3 : Détails paiement ───────────────────────────────────────────────
function renderStep3() {
  _setStepUI(3);
  const m = _state.paymentMethod;
  const p = _state.plan;
  const label = m === 'orange' ? 'Orange Money' : m === 'moov' ? 'Moov Money' : 'Carte bancaire';
  document.getElementById('ab-step-title').textContent = 'Détails de paiement';
  document.getElementById('ab-step-sub').textContent   = label;

  const _field = (id, lbl, type, placeholder, extra = '') => `
    <div class="ab-field">
      <label for="${id}">${lbl}</label>
      <input id="${id}" type="${type}" placeholder="${placeholder}" ${extra}
             onfocus="this.classList.add('focus')" onblur="this.classList.remove('focus')">
    </div>`;

  const mobileForm = `
    ${_field('ab-phone', 'Numéro de téléphone', 'tel', 'Ex : 70 12 34 56', 'maxlength="8" inputmode="numeric"')}
    ${_field('ab-otp',   'Code OTP',            'text','Entrez le code reçu','maxlength="6" inputmode="numeric"')}
    <div class="ab-otp-hint">
      <i class="bi bi-info-circle-fill"></i>
      <span>Composez <strong>#${m === 'orange' ? '144' : '555'}#</strong> depuis votre téléphone pour obtenir votre code OTP.</span>
    </div>`;

  const cardForm = `
    ${_field('ab-cardnum',  'Numéro de carte',         'text',    '1234 5678 9012 3456', 'maxlength="16" inputmode="numeric"')}
    <div class="ab-field-row">
      ${_field('ab-expiry', 'Date expiration', 'text', 'MM/AA', 'maxlength="5"')}
      ${_field('ab-cvv',    'CVV',             'password', '123', 'maxlength="3" inputmode="numeric"')}
    </div>
    ${_field('ab-cardname', 'Titulaire de la carte', 'text', 'NOM PRÉNOM', '')}`;

  const box = document.getElementById('ab-step-body');
  box.innerHTML = `
    <div class="ab-recap">
      <div>
        <div class="ab-recap-label">Récapitulatif</div>
        <div class="ab-recap-name">${p.name || p.code}</div>
      </div>
      <div class="ab-recap-price">
        <div class="ab-recap-amount">${_fmtPrice(p.price)} ${p.currency || 'FCFA'}</div>
        <div class="ab-recap-period">/ ${p.duration_months || 1} mois</div>
      </div>
    </div>
    <div class="ab-form">
      ${m === 'card' ? cardForm : mobileForm}
      <div id="ab-err" class="ab-form-error" style="display:none;"></div>
      <button id="ab-submit" class="ab-btn-red ab-submit-btn" onclick="window._abSubmit()">
        <i class="bi bi-lock-fill"></i> Confirmer le paiement
      </button>
      <p class="ab-secure-notice">
        <i class="bi bi-shield-check"></i> Paiement sécurisé — Données chiffrées
      </p>
    </div>`;
}

// ─── Étape 4 : Succès ─────────────────────────────────────────────────────────
function renderStep4(planName) {
  _setStepUI(4);
  document.getElementById('ab-step-title').textContent = '';
  document.getElementById('ab-step-sub').textContent   = '';
  document.getElementById('ab-step-body').innerHTML = `
    <div class="ab-success">
      <div class="ab-success-icon"><i class="bi bi-check-lg"></i></div>
      <h2 class="ab-success-title">Abonnement activé !</h2>
      <p class="ab-success-plan">${planName}</p>
      <p class="ab-success-desc">Votre accès premium est maintenant actif.<br>Profitez de tous les contenus exclusifs BF1 TV.</p>
      <button class="ab-btn-green" onclick="window._reloadProfile?.(); window.location.href='profil.html';">
        <i class="bi bi-check-circle-fill"></i> Voir mon profil
      </button>
    </div>`;
}

// ─── Handlers globaux ──────────────────────────────────────────────────────────
window._abSelectPlan = (plan) => {
  _state.plan = plan;
  renderStep2();
};

window._abSelectPayment = (method) => {
  _state.paymentMethod = method;
  renderStep3();
};

window._abBack = () => {
  if (_state.step === 3) { _state.paymentMethod = null; renderStep2(); }
  else if (_state.step === 2) { _state.plan = null; renderStep1(); }
};

window._abSubmit = async () => {
  const m   = _state.paymentMethod;
  const p   = _state.plan;
  const err = document.getElementById('ab-err');
  const btn = document.getElementById('ab-submit');

  if (m === 'orange' || m === 'moov') {
    const phone = document.getElementById('ab-phone')?.value.trim();
    const otp   = document.getElementById('ab-otp')?.value.trim();
    if (!phone || phone.length < 8) { err.textContent = 'Numéro de téléphone invalide (8 chiffres requis).'; err.style.display = 'block'; return; }
    if (!otp || otp.length < 4)     { err.textContent = 'Code OTP invalide (minimum 4 chiffres).'; err.style.display = 'block'; return; }
    _state.paymentData = { phoneNumber: phone, otp };
  } else {
    const num  = document.getElementById('ab-cardnum')?.value.replace(/\s/g, '');
    const exp  = document.getElementById('ab-expiry')?.value.trim();
    const cvv  = document.getElementById('ab-cvv')?.value.trim();
    const name = document.getElementById('ab-cardname')?.value.trim();
    if (!num || num.length < 16)              { err.textContent = 'Numéro de carte invalide (16 chiffres).'; err.style.display = 'block'; return; }
    if (!exp || !/^\d{2}\/\d{2}$/.test(exp)) { err.textContent = "Date d'expiration invalide (MM/AA)."; err.style.display = 'block'; return; }
    if (!cvv || cvv.length < 3)              { err.textContent = 'CVV invalide (3 chiffres).'; err.style.display = 'block'; return; }
    if (!name)                                { err.textContent = 'Nom du titulaire requis.'; err.style.display = 'block'; return; }
    _state.paymentData = { cardNumber: num, cardExpiry: exp, cardCvv: cvv, cardName: name };
  }

  err.style.display = 'none';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="ab-btn-spinner"></div> Traitement en cours...';
  }

  try {
    const user = api.getUser();
    const now  = new Date();
    const end  = new Date();
    end.setMonth(end.getMonth() + (p.duration_months || 1));
    const txId = `${m.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await api.createSubscription({
      user_id:          user?.id,
      plan_id:          p.id,
      start_date:       now.toISOString(),
      end_date:         end.toISOString(),
      is_active:        true,
      payment_method:   m,
      transaction_id:   txId,
      offer:            p.code,
      is_in_country:    p.isInCountry,
      price_multiplier: p.multiplier,
      final_price:      Math.round(p.price),
      payment_details:  { method: m, ..._state.paymentData },
    });

    await api.refreshUser();
    renderStep4(p.name || p.code);

  } catch (e) {
    err.textContent = e?.message || e?.detail || 'Impossible de finaliser le paiement. Réessayez.';
    err.style.display = 'block';
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-lock-fill"></i> Confirmer le paiement'; }
  }
};

// ─── Initialisation ───────────────────────────────────────────────────────────
export async function loadAbonnement() {
  const container = _container();
  if (!container) return;

  container.innerHTML = `
    <div class="ab-wizard">
      <!-- Indicateur d'étapes -->
      <div class="ab-steps" id="ab-steps-bar">
        <div class="ab-step-dot active" id="ab-dot-1">1</div>
        <div class="ab-step-line" id="ab-line-1"></div>
        <div class="ab-step-dot" id="ab-dot-2">2</div>
        <div class="ab-step-line" id="ab-line-2"></div>
        <div class="ab-step-dot" id="ab-dot-3">3</div>
      </div>

      <!-- En-tête étape -->
      <div class="ab-step-header">
        <button class="ab-back-btn" id="ab-back" style="display:none;" onclick="window._abBack()">
          <i class="bi bi-arrow-left"></i> Retour
        </button>
        <h2 class="ab-step-title" id="ab-step-title"></h2>
        <p class="ab-step-sub"   id="ab-step-sub"></p>
      </div>

      <!-- Corps -->
      <div id="ab-step-body"></div>
    </div>`;

  renderStep1();
}
