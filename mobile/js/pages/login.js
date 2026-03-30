import * as api from '../services/api.js';

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

  // Boutons sociaux — toast "bientot disponible"
  const toast = document.getElementById('login-toast');

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 2800);
  }

  const socialMap = {
    'btn-google':   'Google',
    'btn-facebook': 'Facebook',
    'btn-apple':    'Apple',
  };
  Object.entries(socialMap).forEach(([id, label]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        showToast(`Connexion ${label} — bientot disponible`);
      });
    }
  });
}
