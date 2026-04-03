// connexion.js - Gestion de l'authentification
import * as api from '../../shared/services/api.js';
import { API_CONFIG } from '../../shared/config/config.js';

const API_BASE = API_CONFIG.API_BASE_URL;

// Éléments DOM
const tabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');
const footerText = document.getElementById('footerText');
const alertMessage = document.getElementById('alertMessage');

// États de chargement
let isLoading = false;

// Vérifier si déjà connecté
if (api.isAuthenticated()) {
  window.location.href = 'accueil.html';
}

// Afficher un message d'alerte
function showAlert(message, type = 'error') {
  const icon = alertMessage.querySelector('i');
  const text = alertMessage.querySelector('span');
  icon.className = `bi ${type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`;
  text.textContent = message;
  alertMessage.classList.add('show');
  alertMessage.className = `alert-message ${type} show`;
  setTimeout(() => { alertMessage.classList.remove('show'); }, 5000);
}

// Masquer les erreurs d'un champ
function hideFieldError(fieldId) {
  const errorEl = document.getElementById(`${fieldId}Error`);
  const inputEl = document.getElementById(fieldId);
  if (errorEl) errorEl.classList.remove('show');
  if (inputEl) inputEl.classList.remove('error');
}

// Afficher une erreur de champ
function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}Error`);
  const inputEl = document.getElementById(fieldId);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }
  if (inputEl) inputEl.classList.add('error');
}

// Valider l'email
function validateEmail(email) {
  const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return re.test(email);
}

// Gestion des onglets
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (tabId === 'login') {
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
      footerText.innerHTML = `Vous n'avez pas de compte ? <a href="#" id="switchToRegister">Inscrivez-vous</a>`;
      document.getElementById('switchToRegister').addEventListener('click', switchToRegisterHandler);
    } else {
      loginForm.classList.remove('active');
      registerForm.classList.add('active');
      footerText.innerHTML = `Vous avez déjà un compte ? <a href="#" id="switchToLogin">Connectez-vous</a>`;
      document.getElementById('switchToLogin').addEventListener('click', switchToLoginHandler);
    }
    alertMessage.classList.remove('show');
  });
});

// Switch vers l'inscription
function switchToRegisterHandler(e) {
  e.preventDefault();
  document.querySelector('.auth-tab[data-tab="register"]').click();
}

// Switch vers la connexion
function switchToLoginHandler(e) {
  e.preventDefault();
  document.querySelector('.auth-tab[data-tab="login"]').click();
}

// Initialiser le lien footer
const switchToRegister = document.getElementById('switchToRegister');
if (switchToRegister) switchToRegister.addEventListener('click', switchToRegisterHandler);

// Gestion de la connexion
loginFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isLoading) return;
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;
  hideFieldError('loginIdentifier');
  hideFieldError('loginPassword');
  let hasError = false;
  if (!identifier) { showFieldError('loginIdentifier', "Email ou nom d'utilisateur requis"); hasError = true; }
  if (!password)   { showFieldError('loginPassword', 'Mot de passe requis'); hasError = true; }
  if (hasError) return;
  isLoading = true;
  const loginBtn = document.getElementById('loginBtn');
  const originalText = loginBtn.innerHTML;
  loginBtn.innerHTML = '<div class="spinner-small"></div><span>Connexion...</span>';
  loginBtn.disabled = true;
  try {
    const response = await api.login(identifier, password);
    if (response && response.access_token) {
      showAlert('Connexion réussie ! Redirection...', 'success');
      // Enregistrer le token FCM apres connexion
      try {
        const { requestPushPermission, listenForegroundMessages } = await import('./firebase-push.js');
        await requestPushPermission();
        listenForegroundMessages();
      } catch (_) {}
      setTimeout(() => { window.location.href = 'accueil.html'; }, 1500);
    } else {
      showAlert('Identifiants incorrects. Veuillez réessayer.', 'error');
    }
  } catch (error) {
    let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
    if (error.message === 'Failed to fetch') errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    else if (error.status === 401) errorMessage = 'Email ou mot de passe incorrect.';
    else if (error.message) errorMessage = error.message;
    showAlert(errorMessage, 'error');
  } finally {
    isLoading = false;
    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
  }
});

// Gestion de l'inscription
registerFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isLoading) return;
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  hideFieldError('registerUsername');
  hideFieldError('registerEmail');
  hideFieldError('registerPassword');
  hideFieldError('registerConfirm');
  let hasError = false;
  if (!username) { showFieldError('registerUsername', "Nom d'utilisateur requis"); hasError = true; }
  else if (username.length < 3) { showFieldError('registerUsername', 'Au moins 3 caractères requis'); hasError = true; }
  if (!email) { showFieldError('registerEmail', 'Email requis'); hasError = true; }
  else if (!validateEmail(email)) { showFieldError('registerEmail', 'Email invalide'); hasError = true; }
  if (!password) { showFieldError('registerPassword', 'Mot de passe requis'); hasError = true; }
  else if (password.length < 6) { showFieldError('registerPassword', 'Au moins 6 caractères requis'); hasError = true; }
  if (!confirmPassword) { showFieldError('registerConfirm', 'Confirmation requise'); hasError = true; }
  else if (password !== confirmPassword) { showFieldError('registerConfirm', 'Les mots de passe ne correspondent pas'); hasError = true; }
  if (hasError) return;
  isLoading = true;
  const registerBtn = document.getElementById('registerBtn');
  const originalText = registerBtn.innerHTML;
  registerBtn.innerHTML = '<div class="spinner-small"></div><span>Inscription...</span>';
  registerBtn.disabled = true;
  try {
    const response = await api.register(username, email, password);
    if (response && response.access_token) {
      showAlert('Inscription réussie ! Bienvenue sur BF1 TV !', 'success');
      // Enregistrer le token FCM apres inscription
      try {
        const { requestPushPermission, listenForegroundMessages } = await import('./firebase-push.js');
        await requestPushPermission();
        listenForegroundMessages();
      } catch (_) {}
      setTimeout(() => { window.location.href = 'accueil.html'; }, 1500);
    } else {
      showAlert(response.message || "Erreur lors de l'inscription", 'error');
    }
  } catch (error) {
    let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
    if (error.message === 'Failed to fetch') errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    else if (error.status === 409) errorMessage = 'Cet email ou nom d\'utilisateur est déjà utilisé.';
    else if (error.message) errorMessage = error.message;
    showAlert(errorMessage, 'error');
  } finally {
    isLoading = false;
    registerBtn.innerHTML = originalText;
    registerBtn.disabled = false;
  }
});

// ─── Bouton Google OAuth ───────────────────────────────────────────────────────
const googleBtn = document.getElementById('googleLoginBtn');
if (googleBtn) {
  googleBtn.addEventListener('click', () => {
    googleBtn.disabled = true;
    googleBtn.innerHTML = '<div class="spinner-small" style="width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;display:inline-block;margin-right:8px;"></div><span>Connexion...</span>';
    localStorage.setItem('oauth_source', 'web');
    window.location.href = `${API_BASE}/users/auth/google`;
  });
}

// ─── Bouton Facebook OAuth ─────────────────────────────────────────────────────
const facebookBtn = document.getElementById('facebookLoginBtn');
if (facebookBtn) {
  facebookBtn.addEventListener('click', () => {
    facebookBtn.disabled = true;
    facebookBtn.innerHTML = '<div class="spinner-small" style="width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;display:inline-block;margin-right:8px;"></div><span>Connexion...</span>';
    localStorage.setItem('oauth_source', 'web');
    window.location.href = `${API_BASE}/users/auth/facebook`;
  });
}

// ─── Erreur de retour OAuth ────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
if (params.get('auth_error')) {
  const msg = params.get('auth_error') === 'access_denied'
    ? 'Connexion annulée.'
    : 'Une erreur est survenue lors de la connexion Google.';
  showAlert(msg, 'error');
  history.replaceState(null, '', window.location.pathname);
}
