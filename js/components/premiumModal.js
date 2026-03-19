/**
 * PremiumModal — bottom sheet 3 étapes
 * Étape 1 : choix du plan
 * Étape 2 : choix méthode de paiement
 * Étape 3 : détails de paiement + confirmation
 *
 * Usage : window._showPremiumModal({ requiredCategory: 'basic'|'standard'|'premium' })
 *         window._closePremiumModal()
 */

import { getSubscriptionPlans, createSubscription, getMySubscription, isAuthenticated, getUser } from '../services/api.js';

// ─── Hiérarchie ─────────────────────────────────────────────────────────────
const HIERARCHY = { basic: 1, standard: 2, premium: 3 };

// ─── Couleurs par catégorie (comme RN ArchiveScreen) ─────────────────────────
const CAT_STYLE = {
  basic:    { rgb: '59,130,246',  hex: '#3B82F6' },
  standard: { rgb: '34,197,94',   hex: '#22C55E' },
  premium:  { rgb: '234,179,8',   hex: '#EAB308' },
};

// ─── Prix multiplié selon localisation (Burkina = x1, étranger = x2) ─────────
async function _getPriceMultiplier() {
  try {
    const resp = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const d = await resp.json();
    const isInBF = d.country_code === 'BF';
    return { multiplier: isInBF ? 1 : 2, isInCountry: isInBF };
  } catch {
    return { multiplier: 1, isInCountry: true }; // fallback
  }
}

function _fmtPrice(n) {
  return Math.round(n).toLocaleString('fr-FR');
}

function _featsByMonths(months) {
  const f = [
    'Accès à tous les contenus premium',
    'Visionnage hors-ligne',
    'Qualité HD et 4K',
    'Sans publicité',
    'Accès prioritaire aux nouveautés',
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
  if (months >= 12) return { label: 'Meilleur prix', color: '#EAB308', dark: '#000' };
  if (months >= 3)  return { label: 'Populaire',     color: '#22C55E', dark: '#000' };
  return null;
}

function _catOf(plan) {
  const s = (plan.code || plan.name || '').toLowerCase();
  if (s.includes('premium'))  return 'premium';
  if (s.includes('standard')) return 'standard';
  return 'basic';
}

// ─── Toast interne ────────────────────────────────────────────────────────────
function _pmToast(msg, isErr = false) {
  let t = document.getElementById('_pm-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_pm-toast';
    t.style.cssText =
      'position:fixed;bottom:calc(90px + env(safe-area-inset-bottom,0px));left:50%;' +
      'transform:translateX(-50%) translateY(14px);background:#1e1e1e;color:#fff;' +
      'padding:10px 20px;border-radius:20px;font-size:13px;z-index:999999;opacity:0;' +
      'transition:opacity .22s,transform .22s;pointer-events:none;white-space:nowrap;' +
      'box-shadow:0 4px 16px rgba(0,0,0,.6);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.borderLeft = isErr ? '3px solid #E23E3E' : '3px solid #4CAF50';
  void t.offsetWidth;
  t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._tm);
  t._tm = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(14px)'; }, 2400);
}

// ─── Swipe to close ─────────────────────────────────────────────────────────
function _initSwipe(sheet) {
  let y0 = 0, dy = 0, dragging = false;
  const start = e => { y0 = (e.touches ? e.touches[0] : e).clientY; dragging = true; sheet.style.transition = 'none'; };
  const move  = e => { if (!dragging) return; dy = Math.max(0, (e.touches ? e.touches[0] : e).clientY - y0); sheet.style.transform = `translateY(${dy}px)`; };
  const end   = () => {
    if (!dragging) return; dragging = false;
    sheet.style.transition = 'transform .35s cubic-bezier(.4,0,.2,1)';
    if (dy > 110) window._closePremiumModal();
    else sheet.style.transform = 'translateY(0)';
    dy = 0;
  };
  const handle = sheet.querySelector('#_pm-handle');
  if (handle) {
    handle.addEventListener('touchstart', start, { passive: true });
    handle.addEventListener('touchmove',  move,  { passive: true });
    handle.addEventListener('touchend',   end);
  }
}

// ─── Inject HTML ──────────────────────────────────────────────────────────────
function _inject() {
  if (document.getElementById('_pm-overlay')) return;

  const el = document.createElement('div');
  el.id = '_pm-overlay';
  el.style.cssText =
    'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99980;' +
    'align-items:flex-end;justify-content:center;';
  el.innerHTML = `
    <div id="_pm-sheet"
         style="background:#0a0a0a;border-radius:24px 24px 0 0;width:100%;max-width:520px;
                max-height:90dvh;display:flex;flex-direction:column;
                transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);
                padding-bottom:env(safe-area-inset-bottom,16px);">

      <!-- Drag handle zone (swipe to close) -->
      <div id="_pm-handle" style="flex-shrink:0;padding:12px 20px 0;position:relative;cursor:grab;">
        <div style="width:36px;height:4px;background:#222;border-radius:2px;margin:0 auto 16px;"></div>
        <button id="_pm-close"
                style="position:absolute;top:8px;right:16px;background:none;border:none;
                       color:#444;font-size:26px;cursor:pointer;padding:4px;line-height:1;"
                onclick="window._closePremiumModal()">×</button>

        <!-- Indicateur d'étapes -->
        <div id="_pm-steps" style="display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:16px;">
          ${[1,2,3].map((n,i) => `
            <div id="_pm-sdot-${n}"
                 style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
                        justify-content:center;font-size:12px;font-weight:700;
                        background:${n===1?'#E23E3E':'#1a1a1a'};
                        color:${n===1?'#fff':'#444'};
                        border:2px solid ${n===1?'#E23E3E':'#222'};
                        transition:all .25s;">${n}</div>
            ${i<2?`<div id="_pm-sline-${n}" style="width:32px;height:2px;background:${n===1?'#E23E3E':'#1a1a1a'};transition:background .25s;"></div>`:''}
          `).join('')}
        </div>

        <!-- Titre + sous-titre -->
        <div id="_pm-title" style="font-size:22px;font-weight:800;color:#fff;text-align:center;margin-bottom:4px;"></div>
        <div id="_pm-sub"   style="font-size:13px;color:#666;text-align:center;margin-bottom:16px;line-height:1.5;"></div>

        <!-- Bouton retour -->
        <button id="_pm-back"
                style="display:none;position:absolute;top:8px;left:16px;
                       background:none;border:none;color:#888;font-size:13px;
                       cursor:pointer;align-items:center;gap:4px;padding:4px;"
                onclick="window._pmBack()">
          <i class="bi bi-arrow-left"></i> Retour
        </button>
      </div>

      <!-- Corps scrollable -->
      <div id="_pm-body" style="flex:1;overflow-y:auto;padding:0 16px 8px;-webkit-overflow-scrolling:touch;">
        <div style="display:flex;justify-content:center;padding:40px 0;">
          <div style="width:32px;height:32px;border:3px solid #1a1a1a;border-top-color:#E23E3E;
                      border-radius:50%;animation:pmSpin 0.75s linear infinite;"></div>
        </div>
      </div>
    </div>
    <style>
      @keyframes pmSpin   { to   { transform:rotate(360deg); } }
      @keyframes pmPop    { 0%   { transform:scale(0) } 70% { transform:scale(1.15) } 100% { transform:scale(1) } }
      @keyframes pmFadeUp { from { opacity:0;transform:translateY(16px) } to { opacity:1;transform:translateY(0) } }
      ._pm-ripple { transition:opacity .15s; }
      ._pm-ripple:active { opacity:.72; }
    </style>
  `;
  el.addEventListener('click', e => { if (e.target === el) window._closePremiumModal(); });
  document.body.appendChild(el);
  _initSwipe(document.getElementById('_pm-sheet'));
}

// ─── State & helpers ─────────────────────────────────────────────────────────
let _state = {};

function _setStep(n) {
  _state.step = n;
  // Met à jour les dots
  [1,2,3].forEach(i => {
    const dot   = document.getElementById(`_pm-sdot-${i}`);
    const line  = document.getElementById(`_pm-sline-${i}`);
    if (dot) {
      const active = i <= n;
      dot.style.background    = active ? '#E23E3E' : '#1a1a1a';
      dot.style.color         = active ? '#fff'    : '#444';
      dot.style.borderColor   = active ? '#E23E3E' : '#222';
    }
    if (line) line.style.background = i < n ? '#E23E3E' : '#1a1a1a';
  });
  // Bouton retour
  const steps = document.getElementById('_pm-steps');
  if (steps) steps.style.display = n === 4 ? 'none' : 'flex';
  const back = document.getElementById('_pm-back');
  if (back) back.style.display = (n > 1 && n < 4) ? 'flex' : 'none';
}

function _setHeader(title, sub) {
  const t = document.getElementById('_pm-title'); if (t) t.textContent = title;
  const s = document.getElementById('_pm-sub');   if (s) s.textContent = sub;
}

// ── Étape 1 : Plans ───────────────────────────────────────────────────────────
async function _renderStep1() {
  _setStep(1);
  const cat = _state.requiredCategory;
  _setHeader(
    cat ? `Abonnement ${cat.charAt(0).toUpperCase()+cat.slice(1)} requis` : 'Passez à Premium',
    cat ? `Ce contenu nécessite un abonnement ${cat}. Choisissez votre plan.`
        : 'Accédez à tous les contenus exclusifs. Sans engagement.'
  );

  const body = document.getElementById('_pm-body');
  body.innerHTML = `
    <div style="display:flex;justify-content:center;padding:40px 0;">
      <div style="width:32px;height:32px;border:3px solid #1a1a1a;border-top-color:#E23E3E;
                  border-radius:50%;animation:pmSpin 0.75s linear infinite;"></div>
    </div>`;

  // Auth check
  if (!isAuthenticated()) {
    body.innerHTML = `
      <div style="background:#111;border:2px solid #E23E3E;border-radius:18px;
                  padding:32px 20px;text-align:center;margin:8px 0 16px;">
        <i class="bi bi-lock-fill" style="font-size:3rem;color:#E23E3E;"></i>
        <h3 style="color:#fff;font-size:18px;font-weight:700;margin:16px 0 8px;">Connexion requise</h3>
        <p style="color:#666;font-size:14px;line-height:1.55;margin:0 0 24px;">
          Connectez-vous pour accéder aux offres premium et profiter de tous les avantages.
        </p>
        <button onclick="window._closePremiumModal();window.location.hash='#/login';"
                style="background:#E23E3E;border:none;border-radius:12px;padding:14px 32px;
                       color:#fff;font-size:15px;font-weight:700;cursor:pointer;
                       display:inline-flex;align-items:center;gap:8px;">
          <i class="bi bi-box-arrow-in-right"></i> Se connecter
        </button>
      </div>`;
    return;
  }

  try {
    const [rawPlans, { multiplier, isInCountry }, curSub] = await Promise.all([
      getSubscriptionPlans(),
      _getPriceMultiplier(),
      getMySubscription().catch(() => null),
    ]);

    // Abonnement déjà actif
    if (curSub && curSub.is_active) {
      const exp = curSub.end_date ? new Date(curSub.end_date).toLocaleDateString('fr-FR') : '—';
      body.innerHTML = `
        <div style="background:linear-gradient(135deg,#0d1a0d,#0f0f0f);
                    border:1px solid rgba(34,197,94,.4);border-radius:18px;
                    padding:28px 20px;text-align:center;margin:8px 0 20px;
                    animation:pmFadeUp .3s ease;">
          <div style="width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,.15);
                      display:flex;align-items:center;justify-content:center;margin:0 auto 16px;
                      border:2px solid rgba(34,197,94,.4);">
            <i class="bi bi-shield-fill-check" style="font-size:28px;color:#22C55E;"></i>
          </div>
          <h3 style="color:#fff;font-size:18px;font-weight:700;margin:0 0 6px;">Abonnement actif</h3>
          <p style="color:#22C55E;font-size:16px;font-weight:600;margin:0 0 4px;">${curSub.offer || curSub.plan_name || 'Plan Premium'}</p>
          <p style="color:#555;font-size:13px;margin:0 0 24px;">Expire le ${exp}</p>
          <button onclick="window._closePremiumModal()"
                  style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;
                         padding:12px 32px;color:#aaa;font-size:14px;cursor:pointer;">
            Fermer
          </button>
        </div>`;
      return;
    }

    let plans = (Array.isArray(rawPlans) ? rawPlans : []).map(p => {
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

    if (cat) {
      plans = plans.filter(p => (p.code || '').toLowerCase().startsWith(cat.toLowerCase()));
    }

    if (!plans.length) {
      body.innerHTML = `
        <div style="text-align:center;padding:40px 0;color:#555;">
          <i class="bi bi-exclamation-circle" style="font-size:2.5rem;"></i>
          <p style="margin:12px 0 0;font-size:14px;">Aucun plan disponible pour le moment.</p>
        </div>`;
      return;
    }

    body.innerHTML = `
      ${!isInCountry ? `
        <div style="display:flex;align-items:center;gap:8px;background:#1a0a00;
                    border:1px solid rgba(226,62,62,0.3);border-radius:10px;
                    padding:10px 14px;margin-bottom:16px;">
          <i class="bi bi-geo-alt-fill" style="color:#E23E3E;font-size:14px;"></i>
          <span style="color:#aaa;font-size:12px;">Tarif international appliqué (×${multiplier})</span>
        </div>` : ''}
      ${plans.map(p => {
        const cs = CAT_STYLE[p.category] || CAT_STYLE.basic;
        return `
        <div style="background:linear-gradient(145deg,#111,#0e0e0e);
                    border:1px solid rgba(${cs.rgb},.28);border-radius:18px;
                    padding:20px;margin-bottom:14px;position:relative;
                    animation:pmFadeUp .3s ease;" class="_pm-plan">
          ${p.badge ? `
          <div style="position:absolute;top:-1px;right:18px;background:${p.badge.color};
                      color:${p.badge.dark};font-size:11px;font-weight:700;
                      padding:4px 10px;border-radius:0 0 8px 8px;letter-spacing:.4px;">
            ${p.badge.label}
          </div>` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:9px;background:rgba(${cs.rgb},.14);
                          display:flex;align-items:center;justify-content:center;
                          border:1px solid rgba(${cs.rgb},.3);">
                <i class="bi bi-star-fill" style="font-size:13px;color:${cs.hex};"></i>
              </div>
              <span style="color:#fff;font-size:16px;font-weight:700;">${p.name || p.code}</span>
            </div>
            ${p.savings ? `
            <span style="background:rgba(226,62,62,.14);color:#E23E3E;
                         font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;">
              ${p.savings}
            </span>` : ''}
          </div>
          <div style="margin-bottom:14px;">
            <span style="font-size:28px;font-weight:800;color:${cs.hex};">${_fmtPrice(p.price)}</span>
            <span style="color:#555;font-size:13px;"> ${p.currency||'FCFA'} / ${p.duration_months||1} mois</span>
            ${!p.isInCountry && p.basePrice !== p.price ? `
            <div style="font-size:11px;color:#444;margin-top:3px;">Prix BF : ${_fmtPrice(p.basePrice)} FCFA</div>` : ''}
          </div>
          <div style="margin-bottom:18px;">
            ${p.features.map(f => `
              <div style="display:flex;align-items:center;gap:9px;margin-bottom:7px;">
                <i class="bi bi-check-circle-fill" style="color:${cs.hex};font-size:13px;flex-shrink:0;"></i>
                <span style="color:#aaa;font-size:13px;">${f}</span>
              </div>`).join('')}
          </div>
          <button onclick="window._pmSelectPlan(${JSON.stringify(p).replace(/"/g,'&quot;')})"
                  style="width:100%;background:${cs.hex};border:none;border-radius:12px;
                         padding:14px;color:#000;font-size:15px;font-weight:700;cursor:pointer;
                         display:flex;align-items:center;justify-content:center;gap:8px;"
                  class="_pm-ripple">
            Choisir ce plan <i class="bi bi-arrow-right"></i>
          </button>
        </div>`;}).join('')}
      <p style="text-align:center;color:#333;font-size:12px;margin:8px 0 4px;">
        Résiliez à tout moment. Aucun engagement.
      </p>`;
  } catch {
    body.innerHTML = `
      <div style="text-align:center;padding:40px 0;color:#555;">
        <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:#E23E3E;"></i>
        <p style="margin:12px 0 0;font-size:14px;">Impossible de charger les plans.</p>
      </div>`;
  }
}

// ── Étape 2 : Mode de paiement ────────────────────────────────────────────────
function _renderStep2() {
  _setStep(2);
  const p = _state.plan;
  _setHeader('Mode de paiement', 'Choisissez votre méthode de paiement préférée');

  const body = document.getElementById('_pm-body');

  const _pmrow = (method, icon, color, name, desc) => `
    <button onclick="window._pmSelectPayment('${method}')"
            style="width:100%;background:#111;border:1px solid #1e1e1e;border-radius:14px;
                   padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:10px;
                   cursor:pointer;" class="_pm-ripple">
      <div style="width:48px;height:48px;border-radius:12px;background:rgba(${color},.12);
                  display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(${color},.25);">
        <i class="bi ${icon}" style="font-size:22px;color:rgb(${color});"></i>
      </div>
      <div style="text-align:left;flex:1;">
        <div style="color:#fff;font-size:15px;font-weight:600;">${name}</div>
        <div style="color:#555;font-size:12px;margin-top:2px;">${desc}</div>
      </div>
      <i class="bi bi-chevron-right" style="color:#333;"></i>
    </button>`;

  body.innerHTML = `
    <!-- Récapitulatif plan -->
    <div style="background:#1a0505;border:1px solid rgba(226,62,62,0.2);border-radius:12px;
                padding:12px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Plan sélectionné</div>
        <div style="color:#fff;font-size:15px;font-weight:700;margin-top:2px;">${p.name||p.code}</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#E23E3E;font-size:18px;font-weight:800;">${_fmtPrice(p.price)} ${p.currency||'FCFA'}</div>
        <div style="color:#555;font-size:11px;">/ ${p.duration_months||1} mois</div>
      </div>
    </div>
    ${_pmrow('orange', 'bi-phone-fill', '255,102,0',   'Orange Money',  'Paiement via Orange Money')}
    ${_pmrow('moov',   'bi-phone-fill', '0,102,204',   'Moov Money',    'Paiement via Moov Money')}
    ${_pmrow('card',   'bi-credit-card-2-front-fill', '226,62,62', 'Carte bancaire', 'Visa, Mastercard')}
  `;
}

// ── Étape 3 : Détails de paiement ─────────────────────────────────────────────
function _renderStep3() {
  _setStep(3);
  const m = _state.paymentMethod;
  const p = _state.plan;
  const label = m === 'orange' ? 'Orange Money' : m === 'moov' ? 'Moov Money' : 'Carte bancaire';
  _setHeader('Détails de paiement', label);

  const _field = (id, lbl, type, placeholder, extra='') => `
    <div style="margin-bottom:14px;">
      <label style="display:block;color:#666;font-size:12px;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">${lbl}</label>
      <input id="${id}" type="${type}" placeholder="${placeholder}" ${extra}
             style="width:100%;background:#111;border:1px solid #222;border-radius:10px;
                    padding:13px 14px;color:#fff;font-size:14px;outline:none;box-sizing:border-box;"
             onfocus="this.style.borderColor='#E23E3E'" onblur="this.style.borderColor='#222'">
    </div>`;

  const mobileForm = `
    ${_field('_pm-phone','Numéro de téléphone','tel','Ex : 70 12 34 56','maxlength="8" inputmode="numeric"')}
    ${_field('_pm-otp','Code OTP','text','Entrez le code reçu','maxlength="6" inputmode="numeric"')}
    <div style="background:#111;border-radius:10px;padding:10px 14px;margin-bottom:16px;
                display:flex;align-items:center;gap:8px;">
      <i class="bi bi-info-circle-fill" style="color:#E23E3E;font-size:14px;flex-shrink:0;"></i>
      <span style="color:#555;font-size:12px;line-height:1.4;">
        Composez <strong style="color:#aaa;">#${m==='orange'?'144':'555'}#</strong> depuis votre téléphone pour obtenir votre code OTP.
      </span>
    </div>`;

  const cardForm = `
    ${_field('_pm-cardnum','Numéro de carte','text','1234 5678 9012 3456','maxlength="16" inputmode="numeric"')}
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">${_field('_pm-expiry','Date expiration','text','MM/AA','maxlength="5"')}</div>
      <div style="flex:1;">${_field('_pm-cvv','CVV','password','123','maxlength="3" inputmode="numeric"')}</div>
    </div>
    ${_field('_pm-cardname','Titulaire de la carte','text','NOM PRÉNOM','')}`;

  const body = document.getElementById('_pm-body');
  body.innerHTML = `
    <!-- Récapitulatif -->
    <div style="background:#1a0505;border:1px solid rgba(226,62,62,0.2);border-radius:12px;
                padding:12px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Récapitulatif</div>
        <div style="color:#fff;font-size:15px;font-weight:700;margin-top:2px;">${p.name||p.code}</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#E23E3E;font-size:18px;font-weight:800;">${_fmtPrice(p.price)} ${p.currency||'FCFA'}</div>
        <div style="color:#555;font-size:11px;">/ ${p.duration_months||1} mois</div>
      </div>
    </div>
    ${m === 'card' ? cardForm : mobileForm}
    <div id="_pm-err" style="display:none;color:#E23E3E;font-size:13px;margin-bottom:12px;
                              background:#1a0505;border-radius:8px;padding:10px 12px;border-left:3px solid #E23E3E;"></div>
    <button id="_pm-submit"
            onclick="window._pmSubmit()"
            style="width:100%;background:#E23E3E;border:none;border-radius:12px;padding:15px;
                   color:#fff;font-size:15px;font-weight:700;cursor:pointer;
                   display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">
      <i class="bi bi-lock-fill"></i> Confirmer le paiement
    </button>
    <p style="text-align:center;color:#333;font-size:11px;margin:4px 0;">
      <i class="bi bi-shield-check" style="margin-right:3px;color:#4CAF50;"></i>
      Paiement sécurisé — Données chiffrées
    </p>`;
}

// ── Étape 4 : Succès ─────────────────────────────────────────────────────────
function _renderStep4(planName) {
  _setStep(4);
  _setHeader('', '');
  document.getElementById('_pm-body').innerHTML = `
    <div style="text-align:center;padding:32px 16px 28px;animation:pmFadeUp .4s ease;">
      <div style="width:80px;height:80px;border-radius:50%;background:rgba(34,197,94,.14);
                  border:3px solid #22C55E;display:flex;align-items:center;justify-content:center;
                  margin:0 auto 20px;animation:pmPop .5s cubic-bezier(.4,0,.2,1);">
        <i class="bi bi-check-lg" style="font-size:36px;color:#22C55E;"></i>
      </div>
      <h2 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px;">Abonnement activé !</h2>
      <p style="color:#22C55E;font-size:16px;font-weight:600;margin:0 0 8px;">${planName}</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 28px;">
        Votre accès premium est maintenant actif.<br>Profitez de tous les contenus exclusifs BF1.
      </p>
      <button onclick="window._closePremiumModal()"
              style="background:#22C55E;border:none;border-radius:12px;padding:14px 40px;
                     color:#000;font-size:15px;font-weight:700;cursor:pointer;
                     display:inline-flex;align-items:center;gap:8px;"
              class="_pm-ripple">
        <i class="bi bi-play-fill"></i> Commencer à regarder
      </button>
    </div>`;
}

// ─── Handlers globaux ─────────────────────────────────────────────────────────
window._pmSelectPlan = (plan) => {
  _state.plan = plan;
  _renderStep2();
};

window._pmSelectPayment = (method) => {
  _state.paymentMethod = method;
  _renderStep3();
};

window._pmBack = () => {
  if (_state.step === 3) { _state.paymentMethod = null; _renderStep2(); }
  else if (_state.step === 2) { _state.plan = null; _renderStep1(); }
};

window._pmSubmit = async () => {
  const m   = _state.paymentMethod;
  const p   = _state.plan;
  const err = document.getElementById('_pm-err');
  const btn = document.getElementById('_pm-submit');

  // Validation
  if (m === 'orange' || m === 'moov') {
    const phone = document.getElementById('_pm-phone')?.value.trim();
    const otp   = document.getElementById('_pm-otp')?.value.trim();
    if (!phone || phone.length < 8) { err.textContent = 'Numéro de téléphone invalide (8 chiffres requis).'; err.style.display='block'; return; }
    if (!otp || otp.length < 4)     { err.textContent = 'Code OTP invalide (minimum 4 chiffres).'; err.style.display='block'; return; }
    _state.paymentData = { phoneNumber: phone, otp };
  } else {
    const num  = document.getElementById('_pm-cardnum')?.value.replace(/\s/g,'');
    const exp  = document.getElementById('_pm-expiry')?.value.trim();
    const cvv  = document.getElementById('_pm-cvv')?.value.trim();
    const name = document.getElementById('_pm-cardname')?.value.trim();
    if (!num || num.length < 16)        { err.textContent = 'Numéro de carte invalide (16 chiffres).'; err.style.display='block'; return; }
    if (!exp || !/^\d{2}\/\d{2}$/.test(exp)) { err.textContent = "Date d'expiration invalide (MM/AA)."; err.style.display='block'; return; }
    if (!cvv || cvv.length < 3)         { err.textContent = 'CVV invalide (3 chiffres).'; err.style.display='block'; return; }
    if (!name)                           { err.textContent = 'Nom du titulaire requis.'; err.style.display='block'; return; }
    _state.paymentData = { cardNumber: num, cardExpiry: exp, cardCvv: cvv, cardName: name };
  }

  err.style.display = 'none';
  if (btn) { btn.disabled = true; btn.innerHTML = '<div style="width:20px;height:20px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:pmSpin .7s linear infinite;"></div>'; }

  try {
    const user = getUser();
    const now  = new Date();
    const end  = new Date();
    end.setMonth(end.getMonth() + (p.duration_months || 1));

    const txId = `${m.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

    await createSubscription({
      user_id:        user?.id,
      plan_id:        p.id,
      start_date:     now.toISOString(),
      end_date:       end.toISOString(),
      is_active:      true,
      payment_method: m,
      transaction_id: txId,
      offer:          p.code,
      is_in_country:  p.isInCountry,
      price_multiplier: p.multiplier,
      final_price:    Math.round(p.price),
      payment_details: { method: m, ..._state.paymentData },
    });

    _renderStep4(p.name || p.code);
    if (_state.onSuccess) _state.onSuccess(p);

  } catch (e) {
    err.textContent = e?.message || e?.detail || 'Impossible de finaliser le paiement. Réessayez.';
    err.style.display = 'block';
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-lock-fill"></i> Confirmer le paiement'; }
  }
};

// ─── API publique ─────────────────────────────────────────────────────────────
window._showPremiumModal = function({ requiredCategory = null, onSuccess = null } = {}) {
  _inject();
  _state = { requiredCategory, onSuccess, step: 1, plan: null, paymentMethod: null, paymentData: null };

  const overlay = document.getElementById('_pm-overlay');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => {
    const sheet = document.getElementById('_pm-sheet');
    if (sheet) sheet.style.transform = 'translateY(0)';
  });

  _renderStep1();
};

window._closePremiumModal = function() {
  const sheet = document.getElementById('_pm-sheet');
  if (sheet) sheet.style.transform = 'translateY(100%)';
  setTimeout(() => {
    const overlay = document.getElementById('_pm-overlay');
    if (overlay) overlay.style.display = 'none';
  }, 380);
};

// ─── Export pour app.js ─────────────────────────────────────────────────────
export function initPremiumModal() {
  _inject(); // pré-injecter le DOM au démarrage
}

// Auto-initialiser dès que le module est importé
_inject();
