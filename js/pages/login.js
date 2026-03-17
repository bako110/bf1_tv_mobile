import * as api from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

export async function loadLogin() {
  const container = document.getElementById('app-content');
  if (!container) return;

  // Check si déjà connecté
  if (api.isAuthenticated()) {
    window.location.hash = '#/profile';
    return;
  }

  const form = container.querySelector('#login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = form.querySelector('[name="identifier"]').value.trim();
    const password = form.querySelector('[name="password"]').value.trim();
    const msgEl = document.getElementById('login-message');

    if (!identifier || !password) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-warning">Veuillez remplir tous les champs</div>`;
      return;
    }

    try {
      const btn = form.querySelector('button[type=\"submit\"]');
      btn.disabled = true;
      btn.innerHTML = '<span class=\"spinner-border spinner-border-sm me-2\" role=\"status\"></span>Chargement...';

      const result = await api.login(identifier, password);

      if (msgEl) msgEl.innerHTML = `<div class="alert alert-success">Connexion réussie!</div>`;
      setTimeout(() => {
        window.location.hash = '#/profile';
      }, 500);
    } catch (err) {
      console.error('Erreur login:', err);
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger">${err.message || 'Identifiants invalides'}</div>`;
      const btn = form.querySelector('button[type=\"submit\"]');
      btn.disabled = false;
      btn.innerHTML = 'Se connecter';
    }
  });
}
