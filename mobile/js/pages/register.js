import * as api from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';

export async function loadRegister() {
  const container = document.getElementById('app-content');
  if (!container) return;

  // Check si déjà connecté
  if (api.isAuthenticated()) {
    window.location.hash = '#/profile';
    return;
  }

  const form = container.querySelector('#register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.querySelector('[name="username"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value.trim();
    const msgEl = document.getElementById('register-message');

    if (!username || !email || !password) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-warning">Veuillez remplir tous les champs</div>`;
      return;
    }

    if (password.length < 6) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-warning">Le mot de passe doit contenir au moins 6 caractères</div>`;
      return;
    }

    if (!email.includes('@')) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-warning">Veuillez entrer une adresse email valide</div>`;
      return;
    }

    try {
      const btn = form.querySelector('button[type=\"submit\"]');
      btn.disabled = true;
      btn.innerHTML = '<span class=\"spinner-border spinner-border-sm me-2\" role=\"status\"></span>Chargement...';

      const result = await api.register(username, email, password);

      if (msgEl) msgEl.innerHTML = `<div class="alert alert-success">Inscription réussie! Redirection...</div>`;
      window._invalidateKaCache?.();
      setTimeout(() => {
        window.location.hash = '#/home';
      }, 500);
    } catch (err) {
      console.error('Erreur register:', err);
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">${err.message || 'Erreur lors de l\'inscription'}</div>`;
      const btn = form.querySelector('button[type=\"submit\"]');
      btn.disabled = false;
      btn.innerHTML = 'S\'inscrire';
    }
  });
}
