import * as api from '../services/api.js';
import { API_CONFIG } from '../config/routes.js';

const API_BASE = API_CONFIG.API_BASE_URL;

export async function loadLogin() {
  const container = document.getElementById('app-content');
  if (!container) return;

  // Redirect si deja connecte
  if (api.isAuthenticated()) {
    window.location.hash = '#/profile';
    return;
  }

  const form = container.querySelector('#login-form');
  if (!form) return;

  // Toggle visibilite mot de passe
  const pwdInput = document.getElementById('login-pwd');
  const pwdEye   = document.getElementById('pwd-eye');
  if (pwdInput && pwdEye) {
    pwdEye.addEventListener('click', () => {
      const isHidden = pwdInput.type === 'password';
      pwdInput.type = isHidden ? 'text' : 'password';
      pwdEye.innerHTML = isHidden
        ? '<i class="bi bi-eye-slash"></i>'
        : '<i class="bi bi-eye"></i>';
    });
  }

  // Soumission du formulaire
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = form.querySelector('[name="identifier"]').value.trim();
    const password   = form.querySelector('[name="password"]').value.trim();
    const msgEl      = document.getElementById('login-message');

    if (!identifier || !password) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-warning">Veuillez remplir tous les champs</div>`;
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Connexion...';

      await api.login(identifier, password);

      if (msgEl) msgEl.innerHTML = `<div class="alert alert-success">Connexion reussie !</div>`;
      window._invalidateKaCache?.();
      setTimeout(() => { window.location.hash = '#/home'; }, 500);
    } catch (err) {
      console.error('Erreur login:', err);
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">${err.message || 'Identifiants invalides'}</div>`;
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Se connecter';
    }
  });

  // Bouton Google → OAuth via modal interne (reste dans l'app)
  const btnGoogle = document.getElementById('btn-google');
  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      btnGoogle.disabled = true;
      btnGoogle.innerHTML = `
        <span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);
                     border-top-color:#fff;border-radius:50%;animation:_gspin .8s linear infinite;
                     margin-right:8px;vertical-align:middle;"></span>
        <span>Connexion Google...</span>
        <style>@keyframes _gspin{to{transform:rotate(360deg)}}</style>`;

      _openGoogleOAuth(`${API_BASE}/users/auth/google`, () => {
        btnGoogle.disabled = false;
        btnGoogle.innerHTML = `
          <img src="https://www.google.com/favicon.ico" width="18" height="18"
               style="margin-right:8px;vertical-align:middle;border-radius:2px;">
          Continuer avec Google`;
      });
    });
  }
}

// ── OAuth Google via AndroidBridge (WebView Dialog natif) ────────────────────
function _openGoogleOAuth(authUrl, onError) {
  // Overlay d'attente
  const overlay = document.createElement('div');
  overlay.id = '_google-oauth-modal';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.85);display:flex;' +
    'flex-direction:column;align-items:center;justify-content:center;gap:16px;';
  overlay.innerHTML = `
    <style>
      @keyframes _gspin2 { to { transform: rotate(360deg); } }
      @keyframes _gfadeIn { from { opacity:0; transform:scale(0.92) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
      @keyframes _gdot { 0%,80%,100% { opacity:0.2; transform:scale(0.7); } 40% { opacity:1; transform:scale(1); } }
    </style>

    <!-- Carte centrale -->
    <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);border-radius:24px;
                padding:36px 32px 28px;width:min(320px,88vw);text-align:center;
                animation:_gfadeIn .35s cubic-bezier(.4,0,.2,1) both;
                box-shadow:0 24px 64px rgba(0,0,0,0.6);">

      <!-- Logo Google animé -->
      <div style="position:relative;width:72px;height:72px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <!-- Cercle spinner -->
        <div style="position:absolute;inset:0;border-radius:50%;border:2.5px solid rgba(255,255,255,0.06);
                    border-top-color:#4285F4;border-right-color:#EA4335;
                    animation:_gspin2 1.1s linear infinite;"></div>
        <!-- Logo Google SVG -->
        <div style="width:40px;height:40px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;
                    box-shadow:0 2px 12px rgba(0,0,0,0.3);">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        </div>
      </div>

      <!-- Texte -->
      <p style="color:#fff;font-size:16px;font-weight:700;margin:0 0 6px;letter-spacing:-.2px;">
        Connexion avec Google
      </p>
      <p style="color:#666;font-size:13px;margin:0 0 24px;line-height:1.5;">
        Une fenêtre Google va s'ouvrir.<br>Suivez les instructions pour vous connecter.
      </p>

      <!-- Points d'attente animés -->
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:28px;">
        <div style="width:7px;height:7px;border-radius:50%;background:#4285F4;animation:_gdot 1.4s ease-in-out infinite;animation-delay:0s;"></div>
        <div style="width:7px;height:7px;border-radius:50%;background:#EA4335;animation:_gdot 1.4s ease-in-out infinite;animation-delay:.18s;"></div>
        <div style="width:7px;height:7px;border-radius:50%;background:#FBBC05;animation:_gdot 1.4s ease-in-out infinite;animation-delay:.36s;"></div>
        <div style="width:7px;height:7px;border-radius:50%;background:#34A853;animation:_gdot 1.4s ease-in-out infinite;animation-delay:.54s;"></div>
      </div>

      <!-- Bouton annuler -->
      <button id="_oauth-cancel"
              style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                     color:#888;border-radius:12px;padding:13px;font-size:14px;cursor:pointer;
                     transition:background .15s,color .15s;"
              onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#ccc'"
              onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.color='#888'">
        Annuler
      </button>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('_oauth-cancel').addEventListener('click', () => {
    _cleanup();
    if (onError) onError();
  });

  // Écouter l'event dispatché par MainActivity quand le token est reçu
  function _tokenHandler(e) {
    const detail = e.detail || {};
    if (detail.cancelled) {
      _cleanup();
      if (onError) onError();
      return;
    }
    const token = detail.token;
    if (token) {
      _cleanup();
      _handleGoogleSuccess(token, detail.user);
    }
  }
  window.addEventListener('bf1GoogleToken', _tokenHandler);

  function _cleanup() {
    window.removeEventListener('bf1GoogleToken', _tokenHandler);
    overlay.remove();
  }

  // Utiliser le bridge Android natif (WebView Dialog)
  if (window.AndroidBridge?.openOAuth) {
    window.AndroidBridge.openOAuth(authUrl, 'bf1.fly.dev');
  } else {
    // Fallback web (développement desktop) : window.open classique
    const win = window.open(authUrl, '_blank', 'width=480,height=640');
    function _msgHandler(e) {
      if (!e.data) return;
      const data = typeof e.data === 'string'
        ? (() => { try { return JSON.parse(e.data); } catch { return null; } })()
        : e.data;
      if (!data) return;
      const token = data.access_token || data.token;
      if (token) {
        window.removeEventListener('message', _msgHandler);
        _cleanup();
        _handleGoogleSuccess(token, data.user);
      }
    }
    window.addEventListener('message', _msgHandler);
    const _poll = setInterval(() => {
      if (win?.closed) { clearInterval(_poll); window.removeEventListener('message', _msgHandler); _cleanup(); if (onError) onError(); }
    }, 800);
  }
}


async function _handleGoogleSuccess(token, user) {
  try {
    const { http } = await import('../services/http.js');
    http.setToken(token);
    localStorage.setItem('bf1_token', token);

    // Récupérer le profil complet depuis l'API
    try {
      const me = await http.get('/users/me');
      if (me) localStorage.setItem('bf1_user', JSON.stringify(me));
    } catch {
      // Fallback : utiliser l'objet user passé par le callback si disponible
      if (user) localStorage.setItem('bf1_user', JSON.stringify(user));
    }

    // Feedback visuel
    const msgEl = document.getElementById('login-message');
    if (msgEl) {
      msgEl.innerHTML = `
        <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);
                    border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;margin-top:8px;">
          <i class="bi bi-check-circle-fill" style="color:#10B981;font-size:18px;"></i>
          <span style="color:#10B981;font-size:14px;font-weight:600;">Connexion Google réussie !</span>
        </div>`;
    }

    // Vider le cache keep-alive pour forcer le rechargement des pages avec le bon état auth
    window._invalidateKaCache?.();
    // Naviguer vers la page d'accueil
    setTimeout(() => { window.location.hash = '#/home'; }, 700);
  } catch (err) {
    console.error('Erreur Google OAuth:', err);
  }
}
