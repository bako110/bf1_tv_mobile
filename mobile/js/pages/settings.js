import { getUserSettings, updateUserSettings, resetUserSettings } from '../services/api.js';
import { createPageSpinner } from '../utils/snakeLoader.js';
import { themeManager } from '../utils/themeManager.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function _s(id) { return document.getElementById(id); }

function _toast(msg, isError = false) {
  let t = document.getElementById('_set-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_set-toast';
    t.style.cssText =
      'position:fixed;bottom:calc(80px + env(safe-area-inset-bottom,0px));left:50%;' +
      'transform:translateX(-50%) translateY(14px);background:#1e1e1e;color:#fff;' +
      'padding:10px 20px;border-radius:20px;font-size:13px;z-index:99999;opacity:0;' +
      'transition:opacity .22s,transform .22s;pointer-events:none;white-space:nowrap;' +
      'border:1px solid #2a2a2a;box-shadow:0 4px 16px rgba(0,0,0,.6);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.borderColor = isError ? '#E23E3E' : '#2a2a2a';
  void t.offsetWidth;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._tm);
  t._tm = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(14px)';
  }, 2200);
}

// ─── toggle switch widget ─────────────────────────────────────────────────────

function _makeToggle(id, checked, onchange) {
  return `
    <label style="position:relative;display:inline-block;width:46px;height:26px;flex-shrink:0;">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}
             style="opacity:0;width:0;height:0;position:absolute;"
             onchange="${onchange}">
      <span style="position:absolute;cursor:pointer;inset:0;background:${checked ? '#E23E3E' : '#2a2a2a'};
                   border-radius:26px;transition:background .2s;"
            id="${id}-track">
        <span style="position:absolute;top:3px;left:${checked ? '23px' : '3px'};width:20px;height:20px;
                     background:#fff;border-radius:50%;transition:left .2s;"
              id="${id}-thumb"></span>
      </span>
    </label>`;
}

// ─── render ───────────────────────────────────────────────────────────────────

let _settings = null;

async function _save(key, value) {
  const old = _settings[key];
  // Optimistic update UI
  _settings[key] = value;
  _syncToggleUI(key, value);
  try {
    await updateUserSettings({ [key]: value });
    _toast('Paramètre enregistré');
    
    // ┌─ Appliquer le thème immédiatement si c'est le thème qui change ─┐
    if (key === 'theme') {
      themeManager.setTheme(value, true);
    }
    // └──────────────────────────────────────────────────────────────┘
  } catch {
    _settings[key] = old;
    _syncToggleUI(key, old);
    _toast('Erreur lors de la sauvegarde', true);
  }
}

function _syncToggleUI(key, val) {
  const track = document.getElementById(`tog-${key}-track`);
  const thumb = document.getElementById(`tog-${key}-thumb`);
  if (!track || !thumb) return;
  track.style.background = val ? '#E23E3E' : '#2a2a2a';
  thumb.style.left = val ? '23px' : '3px';
}

function _settingRow(icon, label, desc, toggleId, checked, saveKey) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:14px 14px;background:var(--bg-2);border-radius:14px;border:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
        <div style="width:40px;height:40px;background:rgba(226,62,62,0.12);border-radius:12px;
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;
                    border:1px solid rgba(226,62,62,0.18);">
          <i class="bi ${icon}" style="color:#E23E3E;font-size:18px;"></i>
        </div>
        <div style="min-width:0;">
          <div style="color:var(--text);font-size:14px;font-weight:500;line-height:1.3;">${label}</div>
          <div style="color:var(--text-3);font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${desc}</div>
        </div>
      </div>
      ${_makeToggle(`tog-${toggleId}`, checked, `window._setToggle('${saveKey}', this.checked)`)}
    </div>`;
}

function _sectionTitle(title) {
  return `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 4px 10px;">
      <div style="width:3px;height:14px;background:#E23E3E;border-radius:2px;"></div>
      <span style="font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:1px;">${title}</span>
    </div>`;
}

function _selectorRow(icon, label, value, displayValue, onclick) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:14px 14px;background:var(--bg-2);border-radius:14px;border:1px solid var(--border);cursor:pointer;"
         onclick="${onclick}">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
        <div style="width:40px;height:40px;background:rgba(226,62,62,0.12);border-radius:12px;
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;
                    border:1px solid rgba(226,62,62,0.18);">
          <i class="bi ${icon}" style="color:#E23E3E;font-size:18px;"></i>
        </div>
        <div style="min-width:0;">
          <div style="color:var(--text);font-size:14px;font-weight:500;line-height:1.3;">${label}</div>
          <div style="color:var(--text-3);font-size:12px;margin-top:2px;" id="val-${value}">${displayValue}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
        <i class="bi bi-chevron-right" style="color:var(--text-3);font-size:13px;"></i>
      </div>
    </div>`;
}

function _bottomSheet(id, title, options, current, onSelect) {
  const items = options.map(([val, lbl, icon]) => `
    <div onclick="${onSelect}('${val}')"
         style="display:flex;align-items:center;justify-content:space-between;
                padding:14px 20px;border-bottom:1px solid #111;cursor:pointer;
                background:${current === val ? 'rgba(226,62,62,0.07)' : 'transparent'};">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:20px;">${icon}</span>
        <span style="color:#fff;font-size:14px;">${lbl}</span>
      </div>
      ${current === val ? '<i class="bi bi-check2" style="color:#E23E3E;font-size:18px;"></i>' : ''}
    </div>`).join('');

  return `
    <div id="${id}" onclick="if(event.target===this)this.style.display='none'"
         style="display:none;position:fixed;in²²²²²²²²²²²²²²²²²²set:0;background:rgba(0,0,0,0.7);z-index:99990;
                align-items:flex-end;justify-content:center;">
      <div style="background:#111;border-radius:20px 20px 0 0;width:100%;max-width:480px;
                  padding-bottom:env(safe-area-inset-bottom,16px);
                  transform:translateY(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);"
           id="${id}-sheet">
        <div style="width:36px;height:4px;background:#2a2a2a;border-radius:2px;margin:12px auto 4px;"></div>
        <div style="padding:12px 20px 16px;border-bottom:1px solid #1a1a1a;">
          <span style="color:#fff;font-size:16px;font-weight:700;">${title}</span>
        </div>
        ${items}
      </div>
    </div>`;
}

function _openSheet(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  requestAnimationFrame(() => {
    document.getElementById(id + '-sheet').style.transform = 'translateY(0)';
  });
}
function _closeSheet(id) {
  const sheet = document.getElementById(id + '-sheet');
  if (sheet) sheet.style.transform = 'translateY(100%)';
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }, 320);
}

function renderSettings(container, s) {
  const qualityLabel = { auto: 'Automatique', '360p': '360p', '480p': '480p', '720p': '720p (HD)', '1080p': '1080p (Full HD)' };
  const langLabel   = { fr: '🇫🇷 Français', en: '🇬🇧 English' };
  const themeLabel  = { dark: '🌑 Sombre', light: '☀️ Clair', auto: '⚙️ Automatique' };
  const visLabel    = { public: 'Public', private: 'Privé', friends: 'Amis seulement' };

  container.innerHTML = `
    <!-- En-tête -->
    <div style="background:linear-gradient(160deg,#1a0505 0%,#0d0d0d 60%);padding:28px 16px 20px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:52px;height:52px;background:rgba(226,62,62,0.15);border:2px solid #E23E3E;
                    border-radius:14px;display:flex;align-items:center;justify-content:center;">
          <i class="bi bi-gear-fill" style="font-size:24px;color:#E23E3E;"></i>
        </div>
        <div>
          <h2 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Paramètres</h2>
          <p style="margin:0;font-size:13px;color:#666;">Personnalisez votre expérience</p>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div style="margin:4px 14px 16px;">
      ${_sectionTitle('Notifications')}
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${_settingRow('bi-bell-fill',        'Notifications push',      'Alertes sur votre appareil',      'push',  s.push_notifications,  'push_notifications')}
        ${_settingRow('bi-envelope-fill',    'Notifications email',     'Recevoir des emails',              'email', s.email_notifications, 'email_notifications')}
        ${_settingRow('bi-broadcast',        'Alertes Live',            'Quand un direct démarre',          'live',  s.live_notifications,  'live_notifications')}
        ${_settingRow('bi-newspaper',        'Alertes Actualités',      'Nouvelles informations',           'news',  s.news_notifications,  'news_notifications')}
      </div>
    </div>

    <!-- Lecture vidéo -->
    <div style="margin:0 14px 16px;">
      ${_sectionTitle('Lecture vidéo')}
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${_settingRow('bi-play-circle-fill', 'Lecture automatique',     'Lancer les vidéos automatiquement','auto',  s.auto_play,           'auto_play')}
        ${_settingRow('bi-badge-cc-fill',    'Sous-titres',             'Activer par défaut',               'subs',  s.subtitles_enabled,   'subtitles_enabled')}
        ${_selectorRow('bi-camera-video-fill', 'Qualité vidéo',         'video_quality', qualityLabel[s.video_quality] || 'Automatique', "window._setOpenSheet('sheet-quality')")}
      </div>
    </div>

    <!-- Confidentialité -->
    <div style="margin:0 14px 16px;">
      ${_sectionTitle('Confidentialité')}
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${_settingRow('bi-eye-fill',         "Historique de visionnage", 'Afficher ce que vous avez vu',   'hist',  s.show_watch_history,  'show_watch_history')}
        ${_selectorRow('bi-lock-fill',       'Visibilité du profil',    'profile_visibility', visLabel[s.profile_visibility] || 'Public', "window._setOpenSheet('sheet-vis')")}
      </div>
    </div>

    <!-- Apparence & Langue -->
    <div style="margin:0 14px 16px;">
      ${_sectionTitle('Apparence &amp; Langue')}
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${_selectorRow('bi-palette-fill',    'Thème',                   'theme',    themeLabel[s.theme] || 'Sombre',    "window._setOpenSheet('sheet-theme')")}
        ${_selectorRow('bi-translate',       'Langue',                  'language', langLabel[s.language] || 'Français',"window._setOpenSheet('sheet-lang')")}
      </div>
    </div>

    <!-- Réinitialiser -->
    <div style="margin:0 14px 24px;">
      <button onclick="window._setReset()"
              style="width:100%;background:#110000;border:1px solid rgba(226,62,62,0.25);
                     border-radius:14px;padding:15px;color:#E23E3E;font-size:14px;font-weight:600;
                     cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
                     box-shadow:0 2px 12px rgba(226,62,62,0.06);">
        <i class="bi bi-arrow-counterclockwise" style="font-size:16px;"></i>
        Réinitialiser les paramètres
      </button>
    </div>

    <!-- Bottom sheets -->
    ${_bottomSheet('sheet-quality', 'Qualité vidéo',
      [['auto','Automatique','⚡'],['360p','360p','📱'],['480p','480p','📺'],['720p','720p HD','🖥️'],['1080p','1080p Full HD','🎬']],
      s.video_quality, "window._setSelect('video_quality','val-video_quality',arguments[0],{auto:'Automatique','360p':'360p','480p':'480p','720p':'720p (HD)','1080p':'1080p (Full HD)'},'sheet-quality')"
    )}
    ${_bottomSheet('sheet-vis', 'Visibilité du profil',
      [['public','Public','🌍'],['friends',"Amis seulement",'👥'],['private','Privé','🔒']],
      s.profile_visibility, "window._setSelect('profile_visibility','val-profile_visibility',arguments[0],{public:'Public',private:'Privé',friends:'Amis seulement'},'sheet-vis')"
    )}
    ${_bottomSheet('sheet-theme', 'Thème',
      [['dark','Sombre','🌑'],['light','Clair','☀️'],['auto','Automatique','⚙️']],
      s.theme, "window._setSelect('theme','val-theme',arguments[0],{'dark':'🌑 Sombre','light':'☀️ Clair','auto':'⚙️ Automatique'},'sheet-theme')"
    )}
    ${_bottomSheet('sheet-lang', 'Langue',
      [['fr','Français','🇫🇷'],['en','English','🇬🇧']],
      s.language, "window._setSelect('language','val-language',arguments[0],{'fr':'🇫🇷 Français','en':'🇬🇧 English'},'sheet-lang')"
    )}
  `;

  // ── Global handlers ────────────────────────────────────────────────────────
  window._setToggle = async (key, val) => { await _save(key, val); };

  window._setOpenSheet = (id) => { _openSheet(id); };

  window._setSelect = async (key, valElemId, val, labels, sheetId) => {
    _closeSheet(sheetId);
    const el = document.getElementById(valElemId);
    if (el) el.textContent = labels[val] || val;
    await _save(key, val);
    // Re-highlight rows
    const sheet = document.getElementById(sheetId);
    if (sheet) {
      sheet.querySelectorAll('[onclick*="_setSelect"]').forEach(row => {
        const isThis = row.getAttribute('onclick').includes(`'${val}'`);
        row.style.background = isThis ? 'rgba(226,62,62,0.07)' : 'transparent';
        const chk = row.querySelector('.bi-check2');
        if (!isThis && chk) chk.remove();
      });
    }
  };

  window._setReset = async () => {
    if (!confirm('Réinitialiser tous les paramètres aux valeurs par défaut ?')) return;
    try {
      const fresh = await resetUserSettings();
      _settings = fresh;
      renderSettings(container, fresh);
      _toast('Paramètres réinitialisés');
    } catch {
      _toast('Erreur lors de la réinitialisation', true);
    }
  };
}

// ─── entry point ──────────────────────────────────────────────────────────────

export async function loadSettings() {
  const container = document.getElementById('settings-container');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(createPageSpinner());

  try {
    _settings = await getUserSettings();
    renderSettings(container, _settings);
  } catch {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  padding:60px 20px;gap:16px;">
        <i class="bi bi-exclamation-circle" style="font-size:3rem;color:#E23E3E;"></i>
        <p style="color:#666;font-size:14px;text-align:center;margin:0;">
          Impossible de charger les paramètres.<br>Vérifiez votre connexion.
        </p>
        <button onclick="window.location.reload()"
                style="background:#E23E3E;border:none;border-radius:10px;padding:12px 28px;
                       color:#fff;font-size:14px;font-weight:600;cursor:pointer;">
          Réessayer
        </button>
      </div>`;
  }
}
