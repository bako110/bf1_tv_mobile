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
      setTimeout(() => { window.location.hash = '#/profile'; }, 500);
    } catch (err) {
      console.error('Erreur login:', err);
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">${err.message || 'Identifiants invalides'}</div>`;
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Se connecter';
    }
  });

  // Bouton Google → OAuth backend
  const btnGoogle = document.getElementById('btn-google');
  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      btnGoogle.disabled = true;
      btnGoogle.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;margin-right:8px;"></span><span>Connexion...</span>';
      localStorage.setItem('oauth_source', 'mobile');
      window.location.href = `${API_BASE}/users/auth/google`;
    });
  }
}
