import * as api from '../services/api.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

// ─── Rendu liste ──────────────────────────────────────────────────────────────

function renderList(notifs) {
  const list = document.getElementById('notif-list');
  const badge = document.getElementById('notif-unread-count');
  if (!list) return;

  const unread = notifs.filter(n => !n.is_read).length;
  if (badge) badge.textContent = unread > 0 ? `${unread} non lue${unread !== 1 ? 's' : ''}` : 'Tout lu';

  // Boutons header
  const actBar = document.getElementById('notif-actions');
  if (actBar) {
    actBar.style.display = notifs.length ? 'flex' : 'none';
  }

  if (!notifs.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <i class="bi bi-bell-slash" style="font-size:52px;color:#333;display:block;margin-bottom:16px;"></i>
        <p style="color:#666;font-size:15px;margin:0;">Aucune notification</p>
        <p style="color:#444;font-size:13px;margin:4px 0 0;">Vous êtes à jour !</p>
      </div>`;
    return;
  }

  list.innerHTML = notifs.map(n => {
    const nid = esc(String(n.id || n._id || ''));
    const isUnread = !n.is_read;
    return `
    <div class="notif-item" data-id="${nid}"
         style="display:flex;gap:12px;padding:14px 16px;cursor:pointer;transition:background .15s;
                background:${isUnread ? 'rgba(226,62,62,0.06)' : 'transparent'};border-bottom:1px solid #111;"
         onclick="markNotifRead('${nid}', this)"
         onmouseover="this.style.background='#0d0d0d'" onmouseout="this.style.background='${isUnread ? 'rgba(226,62,62,0.06)' : 'transparent'}'">
      <!-- Icône -->
      <div style="flex-shrink:0;width:44px;height:44px;border-radius:50%;
                  background:${isUnread ? '#E23E3E' : '#1a1a1a'};
                  display:flex;align-items:center;justify-content:center;">
        <i class="bi bi-bell${isUnread ? '-fill' : ''}" style="color:${isUnread ? '#fff' : '#555'};font-size:18px;"></i>
      </div>
      <!-- Contenu -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <p style="margin:0;font-size:14px;font-weight:${isUnread ? '700' : '500'};color:${isUnread ? '#fff' : '#ccc'};
                    overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;">${esc(n.title)}</p>
          <span style="flex-shrink:0;font-size:11px;color:#555;">${formatRelative(n.created_at)}</span>
        </div>
        <p style="margin:0;font-size:13px;color:#888;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.4;">${esc(n.message)}</p>
      </div>
      <!-- Supprimer -->
      <button onclick="event.stopPropagation();deleteNotif('${nid}', this.closest('.notif-item'))"
              style="flex-shrink:0;background:none;border:none;color:#333;cursor:pointer;padding:4px;font-size:16px;align-self:center;"
              title="Supprimer">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>`;
  }).join('');
}

// ─── Actions ──────────────────────────────────────────────────────────────────

window.markNotifRead = async function(notifId, rowEl) {
  const n = _notifications.find(x => String(x.id || x._id) === notifId);
  if (!n || n.is_read) return;
  try {
    await api.markNotificationRead(notifId);
    n.is_read = true;
    if (rowEl) {
      rowEl.style.background = 'transparent';
      rowEl.setAttribute('onmouseout', `this.style.background='transparent'`);
      const icon = rowEl.querySelector('.bi-bell-fill');
      if (icon) { icon.className = 'bi bi-bell'; icon.style.color = '#555'; }
      const circle = rowEl.querySelector('[style*="border-radius:50%"]');
      if (circle) circle.style.background = '#1a1a1a';
      const title = rowEl.querySelector('p');
      if (title) { title.style.fontWeight = '500'; title.style.color = '#ccc'; }
    }
    const badge = document.getElementById('notif-unread-count');
    const unread = _notifications.filter(x => !x.is_read).length;
    if (badge) badge.textContent = unread > 0 ? `${unread} non lue${unread !== 1 ? 's' : ''}` : 'Tout lu';
  } catch(e) { console.error('Erreur marquer lu:', e); }
};

window.deleteNotif = async function(notifId, rowEl) {
  if (rowEl) { rowEl.style.opacity = '0.4'; rowEl.style.pointerEvents = 'none'; }
  try {
    await api.deleteNotification(notifId);
    _notifications = _notifications.filter(n => String(n.id || n._id) !== notifId);
    renderList(_notifications);
  } catch(e) {
    console.error('Erreur suppression:', e);
    if (rowEl) { rowEl.style.opacity = '1'; rowEl.style.pointerEvents = ''; }
  }
};

window.markAllRead = async function() {
  const btn = document.getElementById('notif-mark-all-btn');
  if (btn) btn.disabled = true;
  try {
    await api.markAllNotificationsRead();
    _notifications.forEach(n => { n.is_read = true; });
    renderList(_notifications);
  } catch(e) { console.error('Erreur tout marquer lu:', e); }
  if (btn) btn.disabled = false;
};

window.deleteAllNotifs = async function() {
  if (!confirm('Supprimer toutes les notifications ?')) return;
  const btn = document.getElementById('notif-delete-all-btn');
  if (btn) btn.disabled = true;
  try {
    await api.deleteAllNotifications();
    _notifications = [];
    renderList(_notifications);
  } catch(e) { console.error('Erreur suppression globale:', e); }
  if (btn) btn.disabled = false;
};

// ─── Export principal ──────────────────────────────────────────────────────────

export async function loadNotifications() {
  const container = document.getElementById('notif-container');
  if (!container) return;

  const token = localStorage.getItem('bf1_token');
  if (!token) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  min-height:calc(100vh - 130px);padding:0 24px;text-align:center;">
        <i class="bi bi-bell" style="font-size:56px;color:#E23E3E;margin-bottom:20px;"></i>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Notifications</h2>
        <p style="color:#888;font-size:14px;margin-bottom:24px;max-width:280px;">
          Connectez-vous pour recevoir vos notifications BF1
        </p>
        <button onclick="window.location.hash='#/login'"
                style="background:#E23E3E;border:none;border-radius:10px;padding:14px 40px;
                       color:#fff;font-size:15px;font-weight:600;cursor:pointer;">
          Se connecter
        </button>
      </div>`;
    return;
  }

  // Loader
  container.innerHTML = `
    <div style="text-align:center;padding:60px;">
      <div style="display:inline-block;width:40px;height:40px;border:3px solid #1a1a1a;
                  border-top-color:#E23E3E;border-radius:50%;animation:notifSpin 0.7s linear infinite;"></div>
    </div>
    <style>@keyframes notifSpin{to{transform:rotate(360deg)}}</style>`;

  try {
    const data = await api.getNotifications();
    _notifications = Array.isArray(data) ? data : [];

    const unread = _notifications.filter(n => !n.is_read).length;

    container.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px;">
        <div>
          <h2 style="font-size:20px;font-weight:700;margin:0;">Notifications</h2>
          <span id="notif-unread-count" style="font-size:13px;color:#666;">
            ${unread > 0 ? `${unread} non lue${unread !== 1 ? 's' : ''}` : 'Tout lu'}
          </span>
        </div>
        <i class="bi bi-bell-fill" style="font-size:24px;color:#E23E3E;"></i>
      </div>

      <!-- Barre d'actions  -->
      <div id="notif-actions" style="display:${_notifications.length ? 'flex' : 'none'};
           gap:8px;padding:0 16px 12px;border-bottom:1px solid #111;">
        <button id="notif-mark-all-btn" onclick="markAllRead()"
                style="display:inline-flex;align-items:center;gap:6px;background:#1a1a1a;
                       border:none;border-radius:8px;padding:8px 14px;color:#aaa;cursor:pointer;font-size:13px;">
          <i class="bi bi-check2-all"></i> Tout marquer lu
        </button>
        <button id="notif-delete-all-btn" onclick="deleteAllNotifs()"
                style="display:inline-flex;align-items:center;gap:6px;background:#1a1a1a;
                       border:none;border-radius:8px;padding:8px 14px;color:#E23E3E;cursor:pointer;font-size:13px;">
          <i class="bi bi-trash3"></i> Tout supprimer
        </button>
      </div>

      <!-- Liste -->
      <div id="notif-list" style="padding-bottom:90px;"></div>`;

    renderList(_notifications);

  } catch(e) {
    console.error('Erreur notifications:', e);
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <i class="bi bi-exclamation-circle" style="font-size:40px;color:#E23E3E;"></i>
        <p style="color:#888;margin-top:12px;">Erreur lors du chargement</p>
        <button onclick="loadNotificationsPage()" style="background:#E23E3E;border:none;border-radius:8px;
                padding:9px 24px;color:#fff;cursor:pointer;margin-top:12px;">Réessayer</button>
      </div>`;
  }
}
