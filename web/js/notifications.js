// js/notifications.js — Panel notifications header (web)
import * as api from '../../shared/services/api.js';
import { showConfirmModal, showToast } from './ui-helpers.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRelative(d) {
  if (!d) return '';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `${j}j`;
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

// ─── État ─────────────────────────────────────────────────────────────────────

let _notifications = [];

// ─── Badge ──────────────────────────────────────────────────────────────────

function updateBadge() {
  const badge = document.querySelector('.notif-badge');
  const unread = _notifications.filter(n => !n.is_read).length;
  if (!badge) return;
  if (unread > 0) {
    badge.textContent = unread > 99 ? '99+' : unread;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ─── Rendu liste ─────────────────────────────────────────────────────────────

function renderList() {
  const body = document.getElementById('notif-panel-body');
  const actBar = document.getElementById('notif-panel-actions');
  if (!body) return;

  updateBadge();
  if (actBar) actBar.style.display = _notifications.length ? 'flex' : 'none';

  if (!_notifications.length) {
    body.innerHTML = `
      <div class="notif-panel-empty">
        <i class="bi bi-bell-slash"></i>
        <p style="font-size:15px;font-weight:600;margin:0 0 4px;">Aucune notification</p>
        <p style="font-size:13px;margin:0;">Vous êtes à jour !</p>
      </div>`;
    return;
  }

  body.innerHTML = _notifications.map(n => {
    const nid = esc(String(n.id || n._id || ''));
    const unread = !n.is_read;
    return `
    <div class="notif-panel-item ${unread ? 'unread' : ''}" data-id="${nid}">
      <div class="notif-panel-icon ${unread ? 'unread' : 'read'}">
        <i class="bi bi-bell${unread ? '-fill' : ''}"></i>
      </div>
      <div class="notif-panel-content" data-read-id="${nid}" style="cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
          <span class="notif-panel-item-title ${unread ? '' : 'read'}">${esc(n.title)}</span>
          <span class="notif-panel-item-time">${formatRelative(n.created_at)}</span>
        </div>
        ${n.message ? `<span class="notif-panel-item-msg">${esc(n.message)}</span>` : ''}
      </div>
      <button class="notif-panel-del-btn" title="Supprimer" data-del-id="${nid}">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>`;
  }).join('');

  // Câbler les clics via event delegation
  body.querySelectorAll('[data-read-id]').forEach(el => {
    el.addEventListener('click', () => window._notifMarkRead(el.dataset.readId));
  });
  body.querySelectorAll('[data-del-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window._notifDelete(btn.dataset.delId);
    });
  });
}

// ─── Actions (exposées globalement pour les onclick inline) ─────────────────

window._notifMarkRead = async function(notifId) {
  const n = _notifications.find(x => String(x.id || x._id) === notifId);
  if (!n || n.is_read) return;
  const row = document.querySelector(`[data-id="${notifId}"]`);
  if (row) row.style.opacity = '0.5';
  try {
    await api.markNotificationRead(notifId);
    n.is_read = true;
    renderList();
    showToast('Notification marquée comme lue.', 'success');
  } catch (e) {
    if (row) row.style.opacity = '1';
    showToast(e?.status === 401 ? 'Session expirée.' : 'Erreur. Réessayez.', 'error');
    console.error('Erreur marquer lu:', e);
  }
};

window._notifDelete = async function(notifId) {
  const row = document.querySelector(`[data-id="${notifId}"]`);
  if (row) { row.style.opacity = '0.4'; row.style.pointerEvents = 'none'; }
  try {
    await api.deleteNotification(notifId);
    _notifications = _notifications.filter(n => String(n.id || n._id) !== notifId);
    renderList();
    showToast('Notification supprimée.', 'success');
  } catch (e) {
    if (row) { row.style.opacity = '1'; row.style.pointerEvents = ''; }
    showToast(e?.status === 401 ? 'Session expirée.' : 'Erreur lors de la suppression.', 'error');
    console.error('Erreur suppression:', e);
  }
};

window._notifMarkAllRead = async function() {
  try {
    await api.markAllNotificationsRead();
    _notifications.forEach(n => { n.is_read = true; });
    renderList();
    showToast('Toutes les notifications ont été marquées comme lues.', 'success');
  } catch (e) {
    showToast(e?.status === 401 ? 'Session expirée. Reconnectez-vous.' : 'Erreur. Réessayez.', 'error');
    console.error('Erreur tout marquer lu:', e);
  }
};

window._notifDeleteAll = async function() {
  const ok = await showConfirmModal({
    message: 'Supprimer toutes vos notifications ? Cette action est irréversible.',
    title: 'Tout supprimer',
    confirmText: 'Supprimer tout',
    variant: 'danger',
  });
  if (!ok) return;
  try {
    await api.deleteAllNotifications();
    _notifications = [];
    renderList();
    showToast('Toutes les notifications ont été supprimées.', 'success');
  } catch (e) {
    console.error('Erreur suppression globale:', e);
    showToast('Erreur lors de la suppression.', 'error');
  }
};

// ─── Chargement ──────────────────────────────────────────────────────────────

async function loadNotifications() {
  const body = document.getElementById('notif-panel-body');
  if (!body) return;

  body.innerHTML = `<div class="notif-panel-loader"><div class="spinner-border spinner-border-sm text-danger" role="status"></div><p class="mt-2" style="font-size:13px;">Chargement...</p></div>`;

  const token = localStorage.getItem('bf1_token');
  if (!token) {
    body.innerHTML = `
      <div class="notif-panel-empty">
        <i class="bi bi-lock"></i>
        <p style="font-size:14px;font-weight:600;margin:0 0 8px;">Connectez-vous</p>
        <p style="font-size:13px;margin:0 0 16px;">pour voir vos notifications</p>
        <a href="connexion.html" style="display:inline-block;padding:8px 20px;background:var(--red,#E23E3E);color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">Se connecter</a>
      </div>`;
    return;
  }

  try {
    const res = await api.getNotifications();
    _notifications = Array.isArray(res) ? res : (res?.notifications || res?.items || []);
    renderList();
  } catch (e) {
    body.innerHTML = `<div class="notif-panel-empty"><i class="bi bi-exclamation-circle"></i><p>Erreur de chargement</p></div>`;
  }
}

// ─── Panel toggle ─────────────────────────────────────────────────────────────

function openPanel() {
  const panel = document.querySelector('.notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (!panel) return;
  panel.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  loadNotifications();
}

function closePanel() {
  const panel = document.querySelector('.notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (!panel) return;
  panel.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initNotifications() {
  // Injecter l'overlay s'il n'existe pas encore
  if (!document.getElementById('notif-overlay')) {
    const ov = document.createElement('div');
    ov.className = 'notif-overlay';
    ov.id = 'notif-overlay';
    ov.addEventListener('click', closePanel);
    document.body.appendChild(ov);
  }

  // Câbler le bouton cloche
  const btn = document.querySelector('.notif-btn');
  if (btn) {
    btn.removeAttribute('onclick');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = document.querySelector('.notif-panel');
      if (panel?.classList.contains('open')) { closePanel(); } else { openPanel(); }
    });
  }

  // Câbler le bouton fermer
  const closeBtn = document.querySelector('.notif-panel-close');
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Délégation d'événements sur le panel — fonctionne même si les boutons
  // ne sont pas encore visibles au moment de l'init
  const panel = document.querySelector('.notif-panel');
  if (panel) {
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[id]');
      if (!btn) return;
      if (btn.id === 'notif-btn-mark-all') { e.stopPropagation(); window._notifMarkAllRead(); }
      if (btn.id === 'notif-btn-delete-all') { e.stopPropagation(); window._notifDeleteAll(); }
    });
  }

  // Charger le badge au démarrage (si connecté)
  const token = localStorage.getItem('bf1_token');
  if (token) {
    api.getNotifications().then(res => {
      _notifications = Array.isArray(res) ? res : (res?.notifications || res?.items || []);
      updateBadge();
    }).catch(() => {});
  } else {
    const badge = document.querySelector('.notif-badge');
    if (badge) badge.style.display = 'none';
  }
}

// ─── Auto-initialisation ──────────────────────────────────────────────────────
// Se déclenche automatiquement dès que .notif-btn apparaît dans le DOM.
// Aucun appel explicite nécessaire depuis les pages.

(function autoInit() {
  function tryInit() {
    if (document.querySelector('.notif-btn')) {
      initNotifications();
      return true;
    }
    return false;
  }
  if (!tryInit()) {
    const obs = new MutationObserver(() => {
      if (tryInit()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
})();
