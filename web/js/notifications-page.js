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

function getId(n) {
  return String(n.id || n._id || '');
}

// ─── État ─────────────────────────────────────────────────────────────────────

let _notifs = [];

// ─── Rendu ────────────────────────────────────────────────────────────────────

function render() {
  const list = document.getElementById('notif-list');
  const label = document.getElementById('notif-unread-label');
  const actBar = document.getElementById('notif-actions-bar');
  if (!list) return;

  const unreadCount = _notifs.filter(n => !n.is_read).length;
  if (label) label.textContent = unreadCount > 0 ? `${unreadCount} non lue${unreadCount !== 1 ? 's' : ''}` : 'Tout est lu';
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
    const nid = getId(n);
    const isUnread = !n.is_read;
    return `
    <div class="notif-page-item ${isUnread ? 'unread' : ''}" data-id="${esc(nid)}">
      <div class="notif-page-icon ${isUnread ? 'unread' : 'read'}">
        <i class="bi bi-bell${isUnread ? '-fill' : ''}"></i>
      </div>
      <div class="notif-page-content">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <span class="notif-page-title ${isUnread ? '' : 'read'}">${esc(n.title)}</span>
          <span class="notif-page-time">${formatRelative(n.created_at)}</span>
        </div>
        ${n.message ? `<span class="notif-page-msg">${esc(n.message)}</span>` : ''}
      </div>
      <div class="notif-item-actions">
        ${isUnread ? `<button class="notif-read-btn" title="Marquer comme lu" data-id="${esc(nid)}"><i class="bi bi-check2"></i></button>` : ''}
        <button class="notif-del-btn" title="Supprimer" data-id="${esc(nid)}"><i class="bi bi-trash3"></i></button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.notif-read-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _npMarkRead(btn.dataset.id);
    });
  });
  list.querySelectorAll('.notif-del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _npDelete(btn.dataset.id);
    });
  });
}

// ─── Actions individuelles ─────────────────────────────────────────────────────

async function _npMarkRead(notifId) {
  if (!notifId) return;
  const n = _notifs.find(x => getId(x) === notifId);
  if (!n || n.is_read) return;

  const row = document.querySelector(`.notif-page-item[data-id="${notifId}"]`);
  if (row) row.style.opacity = '0.5';

  try {
    await api.markNotificationRead(notifId);
    n.is_read = true;
    render();
    showToast('Notification marquée comme lue.', 'success');
  } catch (e) {
    if (row) row.style.opacity = '1';
    const msg = e?.status === 401
      ? 'Session expirée. Reconnectez-vous.'
      : e?.status === 404
        ? 'Notification introuvable.'
        : 'Impossible de marquer comme lu. Réessayez.';
    showToast(msg, 'error');
    console.error('Erreur marquer lu:', e);
  }
}

async function _npDelete(notifId) {
  if (!notifId) return;
  const row = document.querySelector(`.notif-page-item[data-id="${notifId}"]`);
  if (row) { row.style.opacity = '0.4'; row.style.pointerEvents = 'none'; }

  try {
    await api.deleteNotification(notifId);
    _notifs = _notifs.filter(n => getId(n) !== notifId);
    render();
    showToast('Notification supprimée.', 'success');
  } catch (e) {
    if (row) { row.style.opacity = '1'; row.style.pointerEvents = ''; }
    const msg = e?.status === 401
      ? 'Session expirée. Reconnectez-vous.'
      : e?.status === 403 || e?.status === 404
        ? 'Impossible de supprimer cette notification.'
        : 'Erreur lors de la suppression. Réessayez.';
    showToast(msg, 'error');
    console.error('Erreur suppression:', e);
  }
}

// ─── Export principal ──────────────────────────────────────────────────────────

export async function loadNotificationsPage() {
  const list = document.getElementById('notif-list');
  const label = document.getElementById('notif-unread-label');
  if (!list) return;

  list.innerHTML = `
    <div style="text-align:center;padding:60px 20px;">
      <div class="spinner-border text-danger" role="status"></div>
      <p class="mt-3 text-secondary" style="font-size:14px;">Chargement des notifications...</p>
    </div>`;

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

    const btnMarkAll = document.getElementById('btn-mark-all');
    const btnDeleteAll = document.getElementById('btn-delete-all');

    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', async () => {
        btnMarkAll.disabled = true;
        try {
          await api.markAllNotificationsRead();
          _notifs.forEach(n => { n.is_read = true; });
          render();
          showToast('Toutes les notifications ont été marquées comme lues.', 'success');
        } catch (e) {
          const msg = e?.status === 401 ? 'Session expirée. Reconnectez-vous.' : 'Erreur. Réessayez.';
          showToast(msg, 'error');
          console.error(e);
        }
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
          const msg = e?.status === 401 ? 'Session expirée. Reconnectez-vous.' : 'Erreur lors de la suppression.';
          showToast(msg, 'error');
          console.error(e);
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
        <button onclick="window.location.reload()" style="margin-top:16px;padding:9px 22px;background:var(--red,#E23E3E);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Réessayer</button>
      </div>`;
    console.error('Erreur chargement notifications:', e);
  }
}
