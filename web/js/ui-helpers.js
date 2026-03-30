// ui-helpers.js — Système global de toasts et modals de confirmation
// Utilisé dans toutes les pages web de BF1 TV

// ─── Conteneur toast ──────────────────────────────────────────────────────────
function getToastContainer() {
  let c = document.getElementById('bf1-toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'bf1-toast-container';
    document.body.appendChild(c);
  }
  return c;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
/**
 * Affiche une notification toast.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration  ms avant fermeture automatique (0 = permanent)
 * @returns {Function}  fonction de fermeture manuelle
 */
export function showToast(message, type = 'success', duration = 4000) {
  const icons = {
    success: 'bi-check-circle-fill',
    error:   'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info:    'bi-info-circle-fill',
  };

  const toast = document.createElement('div');
  toast.className = `bf1-toast bf1-toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <i class="bi ${icons[type] || icons.info} bf1-toast-icon"></i>
    <span class="bf1-toast-text">${message}</span>
    <button class="bf1-toast-close" aria-label="Fermer"><i class="bi bi-x"></i></button>
  `;

  const dismiss = () => {
    if (!toast.isConnected) return;
    toast.classList.add('bf1-toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.bf1-toast-close').addEventListener('click', dismiss);
  getToastContainer().appendChild(toast);

  // Déclenche l'animation d'entrée
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('bf1-toast-in')));

  if (duration > 0) setTimeout(dismiss, duration);
  return dismiss;
}

// ─── Modal de confirmation ────────────────────────────────────────────────────
/**
 * Affiche un modal de confirmation. Retourne une Promise<boolean>.
 * @param {object}  options
 * @param {string}  options.message        Texte de la question
 * @param {string}  [options.title]        Titre du modal (défaut : "Confirmation")
 * @param {string}  [options.confirmText]  Label bouton OK (défaut : "Confirmer")
 * @param {string}  [options.cancelText]   Label bouton annuler (défaut : "Annuler")
 * @param {'danger'|'warning'|'primary'} [options.variant]  Couleur du bouton (défaut : "danger")
 * @returns {Promise<boolean>}
 *
 * @example
 *   const ok = await showConfirmModal({ message: 'Supprimer ce commentaire ?' });
 *   if (ok) { ... }
 */
export function showConfirmModal({
  message,
  title       = 'Confirmation',
  confirmText = 'Confirmer',
  cancelText  = 'Annuler',
  variant     = 'danger',
} = {}) {
  return new Promise((resolve) => {
    const variantIcon = { danger: 'bi-exclamation-triangle-fill', warning: 'bi-exclamation-circle-fill', primary: 'bi-question-circle-fill' };

    const overlay = document.createElement('div');
    overlay.className = 'bf1-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="bf1-modal">
        <div class="bf1-modal-header">
          <i class="bi ${variantIcon[variant] || variantIcon.danger} bf1-modal-icon bf1-modal-icon-${variant}"></i>
          <h6 class="bf1-modal-title">${title}</h6>
        </div>
        <p class="bf1-modal-message">${message}</p>
        <div class="bf1-modal-actions">
          <button class="bf1-modal-btn bf1-modal-cancel">${cancelText}</button>
          <button class="bf1-modal-btn bf1-modal-confirm bf1-modal-confirm-${variant}">${confirmText}</button>
        </div>
      </div>
    `;

    const finish = (result) => {
      overlay.classList.add('bf1-modal-out');
      overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
      document.removeEventListener('keydown', keyHandler);
      resolve(result);
    };

    const keyHandler = (e) => { if (e.key === 'Escape') finish(false); };

    overlay.querySelector('.bf1-modal-cancel').addEventListener('click', () => finish(false));
    overlay.querySelector('.bf1-modal-confirm').addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
    document.addEventListener('keydown', keyHandler);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('bf1-modal-in')));
  });
}
