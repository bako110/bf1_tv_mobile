import { http } from '../services/http.js';

export async function loadForgotPassword() {
  const btn = document.getElementById('fp-btn');
  const emailInput = document.getElementById('fp-email');
  const msgEl = document.getElementById('fp-message');
  const formWrap = document.getElementById('fp-form-wrap');
  const successEl = document.getElementById('fp-success');

  if (!btn || !emailInput) return;

  btn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
      msgEl.innerHTML = `<div class="alert alert-warning">Veuillez saisir votre adresse email.</div>`;
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msgEl.innerHTML = `<div class="alert alert-warning">Veuillez saisir une adresse email valide.</div>`;
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Envoi en cours...';
    msgEl.innerHTML = '';

    try {
      await http.post('/users/forgot-password', { email });
    } catch (err) {
      // On absorbe silencieusement pour ne pas divulguer l'existence du compte
      console.log('[ForgotPassword] response:', err?.status);
    } finally {
      // Toujours afficher le succes (securite : ne pas reveler si l'email existe)
      formWrap.style.display = 'none';
      successEl.style.display = 'block';
    }
  });
}
