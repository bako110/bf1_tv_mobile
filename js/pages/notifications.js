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
    const _NOTIF_KEY = 'bf1_notif_accepted';
    const accepted = localStorage.getItem(_NOTIF_KEY) === '1';

    container.innerHTML = `
      <style>
        @keyframes _nsBell {
          0%,100% { transform:rotate(0deg); }
          15%      { transform:rotate(14deg); }
          30%      { transform:rotate(-12deg); }
          45%      { transform:rotate(8deg); }
          60%      { transform:rotate(-6deg); }
          75%      { transform:rotate(3deg); }
        }
        #_ns-bell { animation: _nsBell 2.8s ease-in-out infinite; display:inline-block; }
      </style>

      <!-- Header -->
      <div style="padding:16px 16px 0;display:flex;align-items:center;gap:10px;">
        <i class="bi bi-bell-fill" style="font-size:22px;color:#E23E3E;"></i>
        <h2 style="font-size:20px;font-weight:700;margin:0;">Notifications</h2>
      </div>

      <!-- Carte principale -->
      <div style="margin:24px 16px;background:#0f0f0f;border-radius:16px;
                  border:1px solid #1e1e1e;overflow:hidden;">

        <!-- Illustration -->
        <div style="background:linear-gradient(135deg,#1a0000,#0f0f0f);padding:32px 24px 24px;
                    text-align:center;border-bottom:1px solid #1a1a1a;">
          <span id="_ns-bell"><i class="bi bi-bell-fill" style="font-size:52px;color:#E23E3E;"></i></span>
          <h3 style="font-size:17px;font-weight:700;margin:16px 0 6px;">
            Restez informé en temps réel
          </h3>
          <p style="color:#666;font-size:13px;margin:0;line-height:1.5;">
            Recevez les dernières actualités,<br>
            breaking news et alertes BF1 TV.
          </p>
        </div>

        <!-- Ce que vous recevrez -->
        <div style="padding:20px 20px 16px;">
          <p style="font-size:11px;font-weight:700;color:#444;letter-spacing:.7px;
                    text-transform:uppercase;margin:0 0 12px;">Ce que vous recevrez</p>
          ${[
            ['bi-newspaper',    '#E23E3E', 'Actualités & Breaking news'],
            ['bi-broadcast',    '#E23E3E', 'Alertes émissions en direct'],
            ['bi-star-fill',    '#E23E3E', 'Nouveaux contenus exclusifs'],
            ['bi-chat-dots-fill','#E23E3E','Réponses à vos commentaires'],
          ].map(([ic, col, txt]) => `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
              <div style="width:34px;height:34px;border-radius:8px;flex-shrink:0;
                          background:rgba(226,62,62,.1);
                          display:flex;align-items:center;justify-content:center;">
                <i class="bi ${ic}" style="color:${col};font-size:15px;"></i>
              </div>
              <span style="font-size:14px;color:#ccc;">${txt}</span>
            </div>`).join('')}
        </div>

        <!-- Conditions -->
        <div style="margin:0 20px 20px;background:#161616;border-radius:10px;
                    padding:12px 14px;border:1px solid #222;">
          <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
            <input type="checkbox" id="_notif-accept-cb"
                   ${accepted ? 'checked' : ''}
                   style="margin-top:3px;width:18px;height:18px;accent-color:#E23E3E;
                          flex-shrink:0;cursor:pointer;">
            <span style="font-size:12px;color:#777;line-height:1.6;">
              J'accepte de recevoir des notifications de <strong style="color:#aaa;">BF1 TV</strong>
              et je comprends que je peux les désactiver à tout moment depuis les
              paramètres de l'application.
            </span>
          </label>
        </div>

        <!-- Bouton -->
        <div style="padding:0 20px 24px;">
          <button id="_notif-connect-btn"
                  onclick="window._notifConnect()"
                  style="width:100%;background:${accepted ? '#E23E3E' : '#1a1a1a'};
                         border:none;border-radius:12px;padding:15px;
                         color:${accepted ? '#fff' : '#555'};
                         font-size:15px;font-weight:700;cursor:pointer;
                         transition:background .2s,color .2s;
                         display:flex;align-items:center;justify-content:center;gap:8px;">
            <i class="bi bi-box-arrow-in-right"></i>
            Se connecter pour activer
          </button>
          <p style="text-align:center;margin:12px 0 0;font-size:12px;color:#383838;">
            Pas encore de compte ?
            <a href="#/register"
               style="color:#E23E3E;text-decoration:none;font-weight:600;">
              S'inscrire gratuitement
            </a>
          </p>
        </div>
      </div>`;

    // Activer/désactiver le bouton selon la case
    const cb  = document.getElementById('_notif-accept-cb');
    const btn = document.getElementById('_notif-connect-btn');
    cb?.addEventListener('change', () => {
      const ok = cb.checked;
      localStorage.setItem(_NOTIF_KEY, ok ? '1' : '0');
      if (btn) {
        btn.style.background = ok ? '#E23E3E' : '#1a1a1a';
        btn.style.color      = ok ? '#fff'    : '#555';
      }
    });

    // Rediriger vers login si accepté
    window._notifConnect = function() {
      const cb2 = document.getElementById('_notif-accept-cb');
      if (!cb2?.checked) {
        // Faire vibrer la case
        if (cb2) {
          cb2.style.outline = '2px solid #E23E3E';
          setTimeout(() => { cb2.style.outline = ''; }, 1200);
        }
        return;
      }
      localStorage.setItem(_NOTIF_KEY, '1');
      window.location.hash = '#/login';
    };

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
      <div id="notif-list" style="padding-bottom:16px;"></div>`;

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
