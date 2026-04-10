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

  // Auto-suggestion du username depuis l'email
  const emailInput    = form.querySelector('#reg-email');
  const usernameInput = form.querySelector('#reg-username');
  const hintEl        = document.getElementById('reg-username-hint');

  if (emailInput && usernameInput) {
    let _suggestTimer = null;
    async function _suggestUsername() {
      const email = emailInput.value.trim();
      if (!email.includes('@')) return;
      if (hintEl) { hintEl.textContent = '⏳ suggestion...'; hintEl.style.color = '#888'; }
      try {
        const res = await fetch('https://bf1.fly.dev/api/v1/username/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.username) {
            usernameInput.value = data.username;
            if (hintEl) { hintEl.textContent = '✓ suggéré'; hintEl.style.color = '#4CAF50'; }
          }
        }
      } catch (e) {
        if (hintEl) hintEl.textContent = '';
      }
    }

    emailInput.addEventListener('blur', () => _suggestUsername());

    // Validation en temps réel du username saisi manuellement
    usernameInput.addEventListener('input', () => {;
      const val = usernameInput.value.trim();
      if (!val) { if (hintEl) hintEl.textContent = ''; return; }
      const hasLetter = /[a-zA-Z]/.test(val);
      const hasDigit  = /[0-9]/.test(val);
      if (!hasLetter || !hasDigit) {
        if (hintEl) { hintEl.textContent = 'Doit contenir lettres et chiffres'; hintEl.style.color = '#E23E3E'; }
        usernameInput.style.borderColor = '#E23E3E';
      } else {
        if (hintEl) { hintEl.textContent = '✓ valide'; hintEl.style.color = '#4CAF50'; }
        usernameInput.style.borderColor = '#4CAF50';
      }
    });
  }

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

    const hasLetter = /[a-zA-Z]/.test(username);
    const hasDigit  = /[0-9]/.test(username);
    if (!hasLetter || !hasDigit) {
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-warning">Le nom d'utilisateur doit contenir des lettres et des chiffres</div>`;
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
