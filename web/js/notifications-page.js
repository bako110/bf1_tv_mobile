// js/notifications-page.js — Page notifications complète (web)
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

let _notifs = [];

// ─── Rendu ────────────────────────────────────────────────────────────────────

function render() {
  const list = document.getElementById('notif-list');
  const label = document.getElementById('notif-unread-label');
  const actBar = document.getElementById('notif-actions-bar');
  if (!list) return;

  const unread = _notifs.filter(n => !n.is_read).length;
  if (label) label.textContent = unread > 0 ? `${unread} non lue${unread !== 1 ? 's' : ''}` : 'Tout est lu';
  if (actBar) actBar.style.display = _notifs.length ? 'flex' : 'none';

  if (!_notifs.length) {
    list.innerHTML = `
      <div class="notif-empty">
        <i class="bi bi-bell-slash"></i>
        <p style="font-size:16px;font-weight:600;margin:0 0 6px;color:var(--text-2);">Aucune notification</p>
        <p style="font-size:14px;margin:0;">Vous êtes à jour !</p>
      </div>`;
    return;
  }

  list.innerHTML = _notifs.map(n => {
    const nid = esc(String(n.id || n._id || ''));
    const unread = !n.is_read;
    return `
    <div class="notif-page-item ${unread ? 'unread' : ''}" data-id="${nid}">
      <div class="notif-page-icon ${unread ? 'unread' : 'read'}">
        <i class="bi bi-bell${unread ? '-fill' : ''}"></i>
      </div>
      <div class="notif-page-content" onclick="window._npMarkRead('${nid}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <span class="notif-page-title ${unread ? '' : 'read'}">${esc(n.title)}</span>
          <span class="notif-page-time">${formatRelative(n.created_at)}</span>
        </div>
        ${n.message ? `<span class="notif-page-msg">${esc(n.message)}</span>` : ''}
      </div>
      <button class="notif-del-btn" title="Supprimer" onclick="window._npDelete('${nid}')">
        <i class="bi bi-trash3"></i>
      </button>
    </div>`;
  }).join('');
}

// ─── Actions ──────────────────────────────────────────────────────────────────

window._npMarkRead = async function(notifId) {
  const n = _notifs.find(x => String(x.id || x._id) === notifId);
  if (!n || n.is_read) return;
  try {
    await api.markNotificationRead(notifId);
    n.is_read = true;
    render();
  } catch (e) { console.error('Erreur marquer lu:', e); }
};

window._npDelete = async function(notifId) {
  const row = document.querySelector(`.notif-page-item[data-id="${notifId}"]`);
  if (row) { row.style.opacity = '0.4'; row.style.pointerEvents = 'none'; }
  try {
    await api.deleteNotification(notifId);
    _notifs = _notifs.filter(n => String(n.id || n._id) !== notifId);
    render();
  } catch (e) {
    console.error('Erreur suppression:', e);
    if (row) { row.style.opacity = '1'; row.style.pointerEvents = ''; }
  }
};

// ─── Export principal ──────────────────────────────────────────────────────────

export async function loadNotificationsPage() {
  const list = document.getElementById('notif-list');
  const label = document.getElementById('notif-unread-label');
  if (!list) return;

  // Afficher un loader
  list.innerHTML = `
    <div style="text-align:center;padding:60px 20px;">
      <div class="spinner-border text-danger" role="status"></div>
      <p class="mt-3 text-secondary" style="font-size:14px;">Chargement des notifications...</p>
    </div>`;

  // Vérifier la connexion
  const token = localStorage.getItem('bf1_token');
  if (!token) {
    if (label) label.textContent = '';
    list.innerHTML = `
      <div class="notif-empty">
        <i class="bi bi-lock"></i>
        <p style="font-size:16px;font-weight:600;margin:0 0 8px;color:var(--text-2);">Connectez-vous</p>
        <p style="font-size:14px;margin:0 0 20px;">pour accéder à vos notifications</p>
        <a href="connexion.html" style="display:inline-block;padding:10px 24px;background:var(--red,#E23E3E);color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">Se connecter</a>
      </div>`;
    return;
  }

  try {
    const res = await api.getNotifications();
    _notifs = Array.isArray(res) ? res : (res?.notifications || res?.items || []);
    render();

    // Câbler les boutons d'actions
    const btnMarkAll = document.getElementById('btn-mark-all');
    const btnDeleteAll = document.getElementById('btn-delete-all');

    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', async () => {
        btnMarkAll.disabled = true;
        try {
          await api.markAllNotificationsRead();
          _notifs.forEach(n => { n.is_read = true; });
          render();
        } catch (e) { console.error(e); }
        btnMarkAll.disabled = false;
      });
    }

    if (btnDeleteAll) {
      btnDeleteAll.addEventListener('click', async () => {
        const ok = await showConfirmModal({
          message: 'Supprimer toutes vos notifications ? Cette action est irréversible.',
          title: 'Tout supprimer',
          confirmText: 'Supprimer tout',
          variant: 'danger',
        });
        if (!ok) return;
        btnDeleteAll.disabled = true;
        try {
          await api.deleteAllNotifications();
          _notifs = [];
          render();
          showToast('Toutes les notifications ont été supprimées.', 'success');
        } catch (e) {
          console.error(e);
          showToast('Erreur lors de la suppression.', 'error');
        }
        btnDeleteAll.disabled = false;
      });
    }

  } catch (e) {
    list.innerHTML = `
      <div class="notif-empty">
        <i class="bi bi-exclamation-circle"></i>
        <p style="font-size:15px;margin:0;">Erreur de chargement</p>
        <p style="font-size:13px;margin:4px 0 0;">Vérifiez votre connexion et réessayez</p>
      </div>`;
    console.error('Erreur chargement notifications:', e);
  }
}
