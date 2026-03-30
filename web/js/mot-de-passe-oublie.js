// mot-de-passe-oublie.js — Réinitialisation du mot de passe
import * as api from '../../shared/services/api.js';
import { showToast } from './ui-helpers.js';

// Éléments DOM
const stepForm      = document.getElementById('stepForm');
const stepSuccess   = document.getElementById('stepSuccess');
const forgotForm    = document.getElementById('forgotForm');
const emailInput    = document.getElementById('emailInput');
const emailError    = document.getElementById('emailError');
const submitBtn     = document.getElementById('submitBtn');
const alertMessage  = document.getElementById('alertMessage');
const sentEmailEl   = document.getElementById('sentEmail');
const resendBtn     = document.getElementById('resendBtn');

// Si déjà connecté, rediriger
if (api.isAuthenticated()) {
  window.location.href = 'accueil.html';
}

// ─── Alert inline ─────────────────────────────────────────────────────────────
function showAlert(message, type = 'error') {
  const icon = alertMessage.querySelector('i');
  const text = alertMessage.querySelector('span');
  icon.className = `bi ${type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`;
  text.textContent = message;
  alertMessage.className = `alert-message ${type} show`;
  setTimeout(() => alertMessage.classList.remove('show'), 6000);
}

function hideAlert() {
  alertMessage.classList.remove('show');
}

// ─── Validation email ─────────────────────────────────────────────────────────
function validateEmail(value) {
  if (!value.trim()) return 'L\'adresse e-mail est requise.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Veuillez saisir une adresse e-mail valide.';
  return null;
}

function setFieldError(msg) {
  emailError.textContent = msg || '';
  emailError.classList.toggle('show', !!msg);
  emailInput.classList.toggle('error', !!msg);
}

// ─── Soumission du formulaire ─────────────────────────────────────────────────
async function handleSubmit(email) {
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span class="spinner-small"></span>
    <span>Envoi en cours…</span>
  `;
  hideAlert();

  try {
    await api.forgotPassword(email);
    // Succès : afficher l'étape 2
    sentEmailEl.textContent = email;
    stepForm.style.display = 'none';
    stepSuccess.style.display = 'block';
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) {
      // Le serveur ne reconnaît pas l'endpoint — fonctionnalité à venir
      showAlert('Cette fonctionnalité n\'est pas encore disponible. Contactez le support.', 'error');
    } else if (status === 429) {
      showAlert('Trop de tentatives. Veuillez réessayer dans quelques minutes.', 'error');
    } else if (status >= 500) {
      showAlert('Une erreur serveur est survenue. Veuillez réessayer plus tard.', 'error');
    } else {
      // Réponse ambiguë (404 = email inconnu) — on affiche toujours le succès
      // pour ne pas révéler si l'email est enregistré (sécurité)
      sentEmailEl.textContent = email;
      stepForm.style.display = 'none';
      stepSuccess.style.display = 'block';
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <i class="bi bi-send-fill"></i>
      <span>Envoyer le lien de réinitialisation</span>
    `;
  }
}

// ─── Événements ───────────────────────────────────────────────────────────────
emailInput.addEventListener('input', () => setFieldError(null));

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const err = validateEmail(email);
  if (err) { setFieldError(err); emailInput.focus(); return; }
  setFieldError(null);
  await handleSubmit(email);
});

// Bouton "Renvoyer"
let resendCooldown = false;
resendBtn.addEventListener('click', async () => {
  if (resendCooldown) return;
  const email = emailInput.value.trim();

  resendCooldown = true;
  resendBtn.disabled = true;
  resendBtn.innerHTML = `<span class="spinner-small"></span><span>Envoi…</span>`;

  try {
    await api.forgotPassword(email);
    showToast('E-mail renvoyé avec succès !', 'success');
  } catch {
    showToast('Impossible de renvoyer l\'e-mail. Réessayez plus tard.', 'error');
  } finally {
    // Cooldown 60 s
    let remaining = 60;
    const interval = setInterval(() => {
      remaining--;
      resendBtn.innerHTML = `<i class="bi bi-arrow-clockwise"></i><span>Renvoyer (${remaining}s)</span>`;
      if (remaining <= 0) {
        clearInterval(interval);
        resendCooldown = false;
        resendBtn.disabled = false;
        resendBtn.innerHTML = `<i class="bi bi-arrow-clockwise"></i><span>Renvoyer l'e-mail</span>`;
      }
    }, 1000);
  }
});
