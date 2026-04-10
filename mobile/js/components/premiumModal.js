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

function _featsByCategory(category, months) {
  const base = {
    basic: [
      'Accès aux contenus Basic',
      'Qualité SD/HD',
      'Sans publicité',
    ],
    standard: [
      'Accès aux contenus Basic + Standard',
      'Qualité HD',
      'Sans publicité',
      'Visionnage hors-ligne',
    ],
    premium: [
      'Accès à TOUS les contenus',
      'Qualité HD et 4K',
      'Sans publicité',
      'Visionnage hors-ligne',
      'Accès prioritaire aux nouveautés',
    ],
  };
  const f = [...(base[category] || base.basic)];
  if (months >= 3)  f.push('Support prioritaire');
  if (months >= 12) f.push('Meilleure offre de l\'année 🏆');
  return f;
}

// Calcule promo depuis original_price_cents fixé par l'admin
function _promoInfo(priceCents, originalPriceCents, multiplier) {
  if (!originalPriceCents || originalPriceCents === priceCents) return null;
  const promoXof = Math.min(priceCents, originalPriceCents) / 100 * multiplier;
  const origXof  = Math.max(priceCents, originalPriceCents) / 100 * multiplier;
  const eco = origXof - promoXof;
  const pct = Math.round((eco / origXof) * 100);
  return { eco, pct, origXof, promoXof };
}

function _badge(months) {
  if (months >= 12) return { label: 'Meilleur prix', color: '#EAB308', dark: '#000' };
  if (months >= 3)  return { label: 'Populaire',     color: '#22C55E', dark: '#000' };
  return null;
}

function _catOf(plan) {
  // Utiliser le champ category du backend en priorité (toujours présent)
  if (plan.category && ['basic','standard','premium'].includes(plan.category)) return plan.category;
  // Fallback: détecter depuis le code ou le nom
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
      'transform:translateX(-50%) translateY(14px);background:var(--surface,#1e1e1e);color:var(--text,#fff);' +
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
         style="background:var(--surface,#0f0f0f);border-radius:24px 24px 0 0;width:100%;max-width:520px;
                max-height:90dvh;display:flex;flex-direction:column;
                transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);
                padding-bottom:env(safe-area-inset-bottom,16px);">

      <!-- Drag handle zone (swipe to close) -->
      <div id="_pm-handle" style="flex-shrink:0;padding:12px 20px 0;position:relative;cursor:grab;">
        <div style="width:36px;height:4px;background:var(--divider,#2a2a2a);border-radius:2px;margin:0 auto 16px;"></div>
        <button id="_pm-close"
                style="position:absolute;top:8px;right:16px;background:none;border:none;
                       color:var(--text-3,#666);font-size:26px;cursor:pointer;padding:4px;line-height:1;"
                onclick="window._closePremiumModal()">×</button>

        <!-- Indicateur d'étapes -->
        <div id="_pm-steps" style="display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:16px;">
          ${[1,2,3].map((n,i) => `
            <div id="_pm-sdot-${n}"
                 style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
                        justify-content:center;font-size:12px;font-weight:700;
                        background:${n===1?'#E23E3E':'var(--bg,#1a1a1a)'};
                        color:${n===1?'#fff':'var(--text-3,#555)'};
                        border:2px solid ${n===1?'#E23E3E':'var(--divider,#2a2a2a)'};
                        transition:all .25s;">${n}</div>
            ${i<2?`<div id="_pm-sline-${n}" style="width:32px;height:2px;background:${n===1?'#E23E3E':'var(--divider,#2a2a2a)'};transition:background .25s;"></div>`:''}
          `).join('')}
        </div>

        <!-- Titre + sous-titre -->
        <div id="_pm-title" style="font-size:22px;font-weight:800;color:var(--text,#fff);text-align:center;margin-bottom:4px;"></div>
        <div id="_pm-sub"   style="font-size:13px;color:var(--text-3,#666);text-align:center;margin-bottom:16px;line-height:1.5;"></div>

        <!-- Bouton retour -->
        <button id="_pm-back"
                style="display:none;position:absolute;top:8px;left:16px;
                       background:none;border:none;color:var(--text-2,#888);font-size:13px;
                       cursor:pointer;align-items:center;gap:4px;padding:4px;"
                onclick="window._pmBack()">
          <i class="bi bi-arrow-left"></i> Retour
        </button>
      </div>

      <!-- Corps scrollable -->
      <div id="_pm-body" style="flex:1;overflow-y:auto;padding:0 16px 8px;-webkit-overflow-scrolling:touch;">
        <div style="display:flex;justify-content:center;padding:40px 0;">
          <div style="width:32px;height:32px;border:3px solid var(--divider,#1a1a1a);border-top-color:#E23E3E;
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
      dot.style.background    = active ? '#E23E3E' : 'var(--bg,#1a1a1a)';
      dot.style.color         = active ? '#fff'    : 'var(--text-3,#555)';
      dot.style.borderColor   = active ? '#E23E3E' : 'var(--divider,#2a2a2a)';
    }
    if (line) line.style.background = i < n ? '#E23E3E' : 'var(--divider,#2a2a2a)';
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
      <div style="background:var(--bg,#111);border:2px solid #E23E3E;border-radius:18px;
                  padding:32px 20px;text-align:center;margin:8px 0 16px;">
        <i class="bi bi-lock-fill" style="font-size:3rem;color:#E23E3E;"></i>
        <h3 style="color:var(--text,#fff);font-size:18px;font-weight:700;margin:16px 0 8px;">Connexion requise</h3>
        <p style="color:var(--text-3,#666);font-size:14px;line-height:1.55;margin:0 0 24px;">
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
        <div style="background:var(--surface,#111);
                    border:1px solid rgba(34,197,94,.4);border-radius:18px;
                    padding:28px 20px;text-align:center;margin:8px 0 20px;
                    animation:pmFadeUp .3s ease;">
          <div style="width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,.15);
                      display:flex;align-items:center;justify-content:center;margin:0 auto 16px;
                      border:2px solid rgba(34,197,94,.4);">
            <i class="bi bi-shield-fill-check" style="font-size:28px;color:#22C55E;"></i>
          </div>
          <h3 style="color:var(--text,#fff);font-size:18px;font-weight:700;margin:0 0 6px;">Abonnement actif</h3>
          <p style="color:#22C55E;font-size:16px;font-weight:600;margin:0 0 4px;">${curSub.offer || curSub.plan_name || 'Plan Premium'}</p>
          <p style="color:var(--text-3,#666);font-size:13px;margin:0 0 24px;">Expire le ${exp}</p>
          <button onclick="window._closePremiumModal()"
                  style="background:var(--bg,#1a1a1a);border:1px solid var(--divider,#2a2a2a);border-radius:10px;
                         padding:12px 32px;color:var(--text-2,#aaa);font-size:14px;cursor:pointer;">
            Fermer
          </button>
        </div>`;
      return;
    }

    const rawPlansList = Array.isArray(rawPlans) ? rawPlans : [];

    const allPlans = rawPlansList.map(p => {
      const pc = _catOf(p);
      const promo = _promoInfo(p.price_cents || 0, p.original_price_cents || 0, multiplier);
      const displayPrice = promo ? promo.promoXof : (p.price_cents || 0) / 100 * multiplier;
      const origDisplayPrice = promo ? promo.origXof : null;
      return {
        ...p,
        price:        displayPrice,
        origPrice:    origDisplayPrice,
        multiplier, isInCountry,
        features:     _featsByCategory(pc, p.duration_months || 1),
        promo,
        badge:        _badge(p.duration_months || 1),
        category:     pc,
      };
    });

    // Si une catégorie est requise, filtrer directement par p.category (champ fiable du backend)
    const forcedCat = cat;
    const filteredForced = forcedCat
      ? allPlans.filter(p => p.category === forcedCat)
      : null;

    if (filteredForced !== null && !filteredForced.length) {
      body.innerHTML = `
        <div style="text-align:center;padding:40px 0;">
          <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:var(--text-3,#555);"></i>
          <p style="color:var(--text-2,#888);margin:12px 0 0;font-size:14px;">Aucun plan disponible pour le moment.</p>
        </div>`;
      return;
    }

    // Grouper par catégorie
    const CATS_ORDER = ['basic','standard','premium'];
    const byCategory = {};
    allPlans.forEach(p => {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    });

    // Onglet actif : catégorie requise ou 'basic' par défaut
    const defaultTab = forcedCat || CATS_ORDER.find(c => byCategory[c]?.length) || 'basic';
    _state._activeTab = defaultTab;

    const _buildPlanCards = (plans) => plans.map(p => {
      const cs      = CAT_STYLE[p.category] || CAT_STYLE.basic;
      const months  = p.duration_months || 1;
      const hasPromo = !!p.promo;
      // Prix mensuel équivalent
      const perMonth = _fmtPrice(p.price / months);

      return `
      <div style="background:var(--surface,#111);
                  border:2px solid rgba(${cs.rgb},${hasPromo ? '.5' : '.25'});
                  border-radius:20px;padding:20px;margin-bottom:16px;
                  position:relative;animation:pmFadeUp .3s ease;" class="_pm-plan">

        <!-- Badge durée (Populaire / Meilleur prix) -->
        ${p.badge ? `
        <div style="position:absolute;top:-1px;right:20px;
                    background:${p.badge.color};color:${p.badge.dark};
                    font-size:10px;font-weight:800;padding:4px 12px;
                    border-radius:0 0 10px 10px;letter-spacing:.5px;text-transform:uppercase;">
          ${p.badge.label}
        </div>` : ''}

        <!-- En-tête : icône + nom + badge réduction -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:10px;
                        background:rgba(${cs.rgb},.15);border:1px solid rgba(${cs.rgb},.35);
                        display:flex;align-items:center;justify-content:center;">
              <i class="bi bi-star-fill" style="font-size:14px;color:${cs.hex};"></i>
            </div>
            <div>
              <div style="color:var(--text,#fff);font-size:15px;font-weight:700;">${p.name || p.code}</div>
              <div style="color:var(--text-3,#666);font-size:11px;">${months} mois d'accès</div>
            </div>
          </div>
          ${hasPromo ? `
          <div style="background:rgba(226,62,62,.15);border:1px solid rgba(226,62,62,.3);
                      border-radius:20px;padding:4px 10px;text-align:center;">
            <div style="color:#E23E3E;font-size:13px;font-weight:800;">−${p.promo.pct}%</div>
          </div>` : ''}
        </div>

        <!-- Bloc prix -->
        <div style="background:rgba(${cs.rgb},.07);border-radius:14px;padding:14px 16px;margin-bottom:16px;">
          <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">
            ${hasPromo ? `
            <span style="font-size:14px;color:var(--text-3,#555);text-decoration:line-through;">
              ${_fmtPrice(p.origPrice)} FCFA
            </span>` : ''}
            <span style="font-size:32px;font-weight:900;color:${cs.hex};line-height:1;">
              ${_fmtPrice(p.price)}
            </span>
            <span style="font-size:13px;color:var(--text-3,#666);">FCFA / ${months} mois</span>
          </div>
          <!-- Prix mensuel équivalent -->
          <div style="margin-top:6px;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;color:var(--text-3,#666);">
              Soit <strong style="color:${cs.hex};">${perMonth} FCFA/mois</strong>
            </span>
            ${hasPromo ? `
            <span style="font-size:11px;font-weight:700;color:#22C55E;">
              Économie : ${_fmtPrice(p.promo.eco)} FCFA
            </span>` : ''}
          </div>
        </div>

        <!-- Features -->
        <div style="margin-bottom:18px;">
          ${p.features.map(f => `
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;">
            <i class="bi bi-check-circle-fill" style="color:${cs.hex};font-size:13px;flex-shrink:0;"></i>
            <span style="color:var(--text-2,#bbb);font-size:13px;">${f}</span>
          </div>`).join('')}
        </div>

        <!-- Bouton -->
        <button onclick="window._pmSelectPlan(${JSON.stringify(p).replace(/"/g,'&quot;')})"
                style="width:100%;background:${cs.hex};border:none;border-radius:14px;
                       padding:15px;color:#000;font-size:15px;font-weight:800;cursor:pointer;
                       display:flex;align-items:center;justify-content:center;gap:8px;
                       box-shadow:0 4px 15px rgba(${cs.rgb},.35);"
                class="_pm-ripple">
          Choisir ce plan &nbsp;<i class="bi bi-arrow-right"></i>
        </button>
      </div>`;
    }).join('');

    // Labels d'onglets
    const TAB_LABELS = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };
    const availableTabs = CATS_ORDER.filter(c => byCategory[c]?.length);

    const _renderTabs = (activeTab) => {
      return availableTabs.map(c => {
        const cs = CAT_STYLE[c] || CAT_STYLE.basic;
        const isActive = c === activeTab;
        return `
        <button onclick="window._pmSwitchTab('${c}')"
                id="_pm-tab-${c}"
                style="flex:1;border:none;border-radius:10px;padding:9px 6px;
                       font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;
                       background:${isActive ? cs.hex : 'var(--bg,#1a1a1a)'};
                       color:${isActive ? '#000' : 'var(--text-3,#666)'};
                       border:1px solid ${isActive ? cs.hex : 'var(--divider,#2a2a2a)'};">
          ${TAB_LABELS[c] || c}
        </button>`;
      }).join('');
    };

    window._pmSwitchTab = (tabCat) => {
      _state._activeTab = tabCat;
      // Mettre à jour les onglets
      availableTabs.forEach(c => {
        const btn = document.getElementById(`_pm-tab-${c}`);
        if (!btn) return;
        const cs = CAT_STYLE[c] || CAT_STYLE.basic;
        const active = c === tabCat;
        btn.style.background = active ? cs.hex : 'var(--bg,#1a1a1a)';
        btn.style.color = active ? '#000' : 'var(--text-3,#666)';
        btn.style.borderColor = active ? cs.hex : 'var(--divider,#2a2a2a)';
      });
      // Mettre à jour les cartes
      const plansContainer = document.getElementById('_pm-plans-container');
      if (plansContainer) {
        plansContainer.innerHTML = _buildPlanCards(byCategory[tabCat] || []);
      }
    };

    body.innerHTML = `
      ${!isInCountry ? `
        <div style="display:flex;align-items:center;gap:8px;background:var(--surface,#1a1a1a);
                    border:1px solid rgba(226,62,62,0.3);border-radius:10px;
                    padding:10px 14px;margin-bottom:12px;">
          <i class="bi bi-geo-alt-fill" style="color:#E23E3E;font-size:14px;"></i>
          <span style="color:var(--text-2,#aaa);font-size:12px;">Tarif international appliqué (×${multiplier})</span>
        </div>` : ''}
      ${forcedCat ? '' : `
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          ${_renderTabs(defaultTab)}
        </div>`}
      <div id="_pm-plans-container">
        ${_buildPlanCards((forcedCat ? filteredForced : byCategory[defaultTab]) || [])}
      </div>
      <p style="text-align:center;color:var(--text-3,#555);font-size:12px;margin:8px 0 4px;">
        Résiliez à tout moment. Aucun engagement.
      </p>`;
  } catch {
    body.innerHTML = `
      <div style="text-align:center;padding:40px 0;">
        <i class="bi bi-exclamation-circle" style="font-size:2.5rem;color:#E23E3E;"></i>
        <p style="color:var(--text-2,#888);margin:12px 0 0;font-size:14px;">Impossible de charger les plans.</p>
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
            style="width:100%;background:var(--bg,#111);border:1px solid var(--divider,#1e1e1e);border-radius:14px;
                   padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:10px;
                   cursor:pointer;" class="_pm-ripple">
      <div style="width:48px;height:48px;border-radius:12px;background:rgba(${color},.12);
                  display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(${color},.25);">
        <i class="bi ${icon}" style="font-size:22px;color:rgb(${color});"></i>
      </div>
      <div style="text-align:left;flex:1;">
        <div style="color:var(--text,#fff);font-size:15px;font-weight:600;">${name}</div>
        <div style="color:var(--text-3,#666);font-size:12px;margin-top:2px;">${desc}</div>
      </div>
      <i class="bi bi-chevron-right" style="color:var(--text-3,#555);"></i>
    </button>`;

  body.innerHTML = `
    <!-- Récapitulatif plan -->
    <div style="background:var(--surface,#1a1a1a);border:1px solid rgba(226,62,62,0.2);border-radius:12px;
                padding:12px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="color:var(--text-3,#888);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Plan sélectionné</div>
        <div style="color:var(--text,#fff);font-size:15px;font-weight:700;margin-top:2px;">${p.name||p.code}</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#E23E3E;font-size:18px;font-weight:800;">${_fmtPrice(p.price)} ${p.currency||'FCFA'}</div>
        <div style="color:var(--text-3,#666);font-size:11px;">/ ${p.duration_months||1} mois</div>
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
      <label style="display:block;color:var(--text-3,#666);font-size:12px;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">${lbl}</label>
      <input id="${id}" type="${type}" placeholder="${placeholder}" ${extra}
             style="width:100%;background:var(--bg,#111);border:1px solid var(--divider,#222);border-radius:10px;
                    padding:13px 14px;color:var(--text,#fff);font-size:14px;outline:none;box-sizing:border-box;"
             onfocus="this.style.borderColor='#E23E3E'" onblur="this.style.borderColor='var(--divider,#222)'">
    </div>`;

  const mobileForm = `
    ${_field('_pm-phone','Numéro de téléphone','tel','Ex : 70 12 34 56','maxlength="8" inputmode="numeric"')}
    ${_field('_pm-otp','Code OTP','text','Entrez le code reçu','maxlength="6" inputmode="numeric"')}
    <div style="background:var(--bg,#111);border-radius:10px;padding:10px 14px;margin-bottom:16px;
                border:1px solid var(--divider,#1e1e1e);display:flex;align-items:center;gap:8px;">
      <i class="bi bi-info-circle-fill" style="color:#E23E3E;font-size:14px;flex-shrink:0;"></i>
      <span style="color:var(--text-3,#666);font-size:12px;line-height:1.4;flex:1;">
        Composez depuis votre téléphone pour obtenir votre code OTP :
        <br>
        <span id="_pm-ussd-code" style="color:var(--text-2,#aaa);font-weight:700;letter-spacing:.5px;">
          ${m==='orange'?'*144*4*6*montant*code#':'*555*6#'}
        </span>
        <button onclick="navigator.clipboard.writeText('${m==='orange'?'*144*4*6*montant*code#':'*555*6#'}').then(()=>{this.innerHTML='<i class=\\'bi bi-check-lg\\'></i>';setTimeout(()=>{this.innerHTML='<i class=\\'bi bi-copy\\'></i>'},1500)})"
                style="background:none;border:none;cursor:pointer;color:#E23E3E;font-size:13px;
                       padding:2px 6px;margin-left:4px;vertical-align:middle;">
          <i class="bi bi-copy"></i>
        </button>
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
    <div style="background:var(--surface,#1a1a1a);border:1px solid rgba(226,62,62,0.2);border-radius:12px;
                padding:12px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="color:var(--text-3,#888);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Récapitulatif</div>
        <div style="color:var(--text,#fff);font-size:15px;font-weight:700;margin-top:2px;">${p.name||p.code}</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#E23E3E;font-size:18px;font-weight:800;">${_fmtPrice(p.price)} ${p.currency||'FCFA'}</div>
        <div style="color:var(--text-3,#666);font-size:11px;">/ ${p.duration_months||1} mois</div>
      </div>
    </div>
    ${m === 'card' ? cardForm : mobileForm}
    <div id="_pm-err" style="display:none;color:#E23E3E;font-size:13px;margin-bottom:12px;
                              background:rgba(226,62,62,0.08);border-radius:8px;padding:10px 12px;border-left:3px solid #E23E3E;"></div>
    <button id="_pm-submit"
            onclick="window._pmSubmit()"
            style="width:100%;background:#E23E3E;border:none;border-radius:12px;padding:15px;
                   color:#fff;font-size:15px;font-weight:700;cursor:pointer;
                   display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">
      <i class="bi bi-lock-fill"></i> Confirmer le paiement
    </button>
    <p style="text-align:center;color:var(--text-3,#555);font-size:11px;margin:4px 0;">
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
      <h2 style="color:var(--text,#fff);font-size:22px;font-weight:800;margin:0 0 8px;">Abonnement activé !</h2>
      <p style="color:#22C55E;font-size:16px;font-weight:600;margin:0 0 8px;">${planName}</p>
      <p style="color:var(--text-3,#666);font-size:14px;line-height:1.6;margin:0 0 28px;">
        Votre accès premium est maintenant actif.<br>Profitez de tous les contenus exclusifs BF1.
      </p>
      <button onclick="window._closePremiumModal(); window._reloadProfile?.(); window.location.hash='#/profile';"
              style="background:#22C55E;border:none;border-radius:12px;padding:14px 40px;
                     color:#000;font-size:15px;font-weight:700;cursor:pointer;
                     display:inline-flex;align-items:center;gap:8px;"
              class="_pm-ripple">
        <i class="bi bi-check-circle-fill"></i> Voir mon profil
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

    // Rafraîchir l'utilisateur depuis le serveur pour mettre à jour is_premium et subscription_category
    const { refreshUser } = await import('../services/api.js');
    await refreshUser();
    
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
