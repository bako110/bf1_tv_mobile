// js/theme.js — Gestion centralisée du thème dark/light
// Auto-init : aucun appel manuel nécessaire depuis les pages.

const KEY = 'bf1_theme';

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(KEY, t);
  updateIcon(t);
}

function updateIcon(t) {
  const i = document.querySelector('.theme-toggle i');
  if (i) i.className = t === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Exposer globalement (appelé par onclick="toggleTheme()" dans header.html)
window.toggleTheme = toggleTheme;

// Appliquer le thème sauvegardé immédiatement
const saved = localStorage.getItem(KEY) || 'dark';
applyTheme(saved);

// Mettre à jour l'icône quand le header est injecté dynamiquement
const _obs = new MutationObserver(() => {
  if (document.querySelector('.theme-toggle')) {
    updateIcon(document.documentElement.getAttribute('data-theme') || 'dark');
    _obs.disconnect();
  }
});
_obs.observe(document.body, { childList: true, subtree: true });
