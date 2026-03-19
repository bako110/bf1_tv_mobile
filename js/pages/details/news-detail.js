import * as api from '../../services/api.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function formatRelative(d) {
  if (!d) return 'Récemment';
  try {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `${j}j`;
    return formatDate(d);
  } catch { return 'Récemment'; }
}

// ─── Rendu commentaires ───────────────────────────────────────────────────────

function renderComments(comments, currentUserId) {
  if (!comments.length) {
    return `<p style="color:#666;font-size:14px;text-align:center;padding:20px 0;">Aucun commentaire pour l'instant. Soyez le premier !</p>`;
  }
  return comments.map(c => {
    const isOwn = currentUserId && String(c.user_id) === String(currentUserId);
    const username = c.username || c.user?.username || 'Utilisateur';
    const avatar = (username[0] || 'U').toUpperCase();
    return `
    <div class="nd-comment" data-id="${esc(c.id || c._id)}" style="display:flex;gap:10px;margin-bottom:16px;">
      <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:#E23E3E;
                  display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;">
        ${esc(avatar)}
      </div>
      <div style="flex:1;background:#1a1a1a;border-radius:12px;border-top-left-radius:4px;padding:10px 12px;">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span style="font-size:13px;font-weight:600;color:#fff;">${esc(username)}</span>
          <div class="d-flex align-items-center gap-2">
            <span style="font-size:11px;color:#555;">${formatRelative(c.created_at)}</span>
            ${isOwn ? `<button onclick="deleteNdComment('${esc(c.id || c._id)}')" style="background:none;border:none;color:#E23E3E;cursor:pointer;padding:0;font-size:13px;" title="Supprimer"><i class="bi bi-trash"></i></button>` : ''}
          </div>
        </div>
        <p style="font-size:14px;color:#ccc;margin:0;line-height:1.5;">${esc(c.text)}</p>
      </div>
    </div>`;
  }).join('');
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function loadNewsDetail(id) {
  const container = document.getElementById('nd-container');
  const headerTitle = document.getElementById('nd-header-title');
  if (!container) return;

  const CONTENT_TYPE = 'breaking_news';

  try {
    const [news, related, comments, likesCount] = await Promise.all([
      api.getNewsById(id).catch(() => null),
      api.getRelatedByType('news', id).catch(() => []),
      api.getComments(CONTENT_TYPE, id).catch(() => []),
      api.getLikesCount(CONTENT_TYPE, id).catch(() => 0),
    ]);

    if (!news) {
      container.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center py-5"><i class="bi bi-exclamation-circle text-danger" style="font-size:3rem;"></i><p class="mt-3 text-secondary">Actualité introuvable</p><button onclick="history.back()" style="background:#E23E3E;color:#fff;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;margin-top:8px;">Retour</button></div>`;
      return;
    }

    let userLiked = false;
    let userFavorited = false;
    const user = (() => { try { return JSON.parse(localStorage.getItem('bf1_user') || 'null'); } catch { return null; } })();
    if (user) {
      [userLiked, userFavorited] = await Promise.all([
        api.checkLiked(CONTENT_TYPE, id).catch(() => false),
        api.checkFavorite(CONTENT_TYPE, id).catch(() => false),
      ]);
    }

    // titre déjà affiché dans le contenu — header garde juste le label fixe

    const img   = news.image_url || news.image || '';
    const cat   = news.category || news.edition || '';
    const title = news.title || 'Sans titre';
    const desc  = news.content || news.description || '';

    container.innerHTML = `

      ${img ? `
      <div style="position:relative;width:100%;max-height:260px;overflow:hidden;">
        <img src="${esc(img)}" alt="" style="width:100%;object-fit:cover;display:block;max-height:260px;" onerror="this.style.display='none'">
        <div style="position:absolute;inset:0;background:linear-gradient(transparent 40%,#000 100%);"></div>
        <div style="position:absolute;top:12px;left:12px;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(226,62,62,0.9);color:#fff;border-radius:4px;padding:3px 9px;font-size:11px;font-weight:700;">
            <i class="bi bi-lightning-fill" style="font-size:10px;"></i>FLASH INFO
          </span>
        </div>
      </div>` : ''}

      <div class="px-3 pt-3">

        <div class="d-flex align-items-center flex-wrap gap-2 mb-2">
          ${cat ? `<span style="background:#1a1a1a;color:#E23E3E;border-radius:4px;padding:3px 9px;font-size:12px;font-weight:600;">${esc(cat)}</span>` : ''}
          ${news.created_at ? `<span style="font-size:12px;color:#666;">${formatDate(news.created_at)}</span>` : ''}
        </div>

        <h1 id="nd-title-h1" style="font-size:20px;font-weight:700;color:#fff;line-height:1.35;margin-bottom:12px;
             overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(title)}</h1>

        ${news.author ? `
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-person-circle" style="color:#555;font-size:20px;"></i>
          <span style="font-size:13px;color:#888;">Par ${esc(news.author)}</span>
        </div>` : ''}

        <div class="d-flex align-items-center gap-3 mb-3 pb-3" style="border-bottom:1px solid #1e1e1e;">
          <button id="nd-like-btn" onclick="toggleNdLike()"
                  style="display:inline-flex;align-items:center;gap:6px;background:${userLiked ? '#E23E3E' : '#1a1a1a'};
                         border:none;border-radius:20px;padding:7px 14px;color:${userLiked ? '#fff' : '#888'};cursor:pointer;font-size:13px;">
            <i class="bi ${userLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
            <span id="nd-like-count">${likesCount}</span>
          </button>
          <button onclick="openNdComments()"
                  style="display:inline-flex;align-items:center;gap:6px;background:#1a1a1a;border:none;border-radius:20px;padding:7px 14px;color:#888;cursor:pointer;font-size:13px;">
            <i class="bi bi-chat-dots"></i>
            <span id="nd-cm-count-btn">${comments.length} commentaire${comments.length !== 1 ? 's' : ''}</span>
          </button>
          <button id="nd-fav-btn" onclick="toggleNdFavorite()"
                  style="display:inline-flex;align-items:center;gap:6px;background:${userFavorited ? '#F59E0B' : '#1a1a1a'};
                         border:none;border-radius:20px;padding:7px 14px;color:${userFavorited ? '#fff' : '#888'};cursor:pointer;font-size:13px;" title="Favoris">
            <i class="bi ${userFavorited ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i>
          </button>
        </div>

        ${desc ? `
        <div style="margin-bottom:24px;">
          <div id="nd-desc-wrap" onclick="_ndToggleDesc()"
               style="position:relative;overflow:hidden;max-height:calc(1.75em * 5);cursor:pointer;">
            <p id="nd-desc-text" style="font-size:15px;color:#d0d0d0;line-height:1.75;white-space:pre-wrap;margin:0;">${esc(desc)}</p>
            <div id="nd-desc-fade" style="position:absolute;bottom:0;left:0;right:0;height:40px;
                 background:linear-gradient(transparent,#000);pointer-events:none;"></div>
          </div>
        </div>` : ''}
        ${news.edition ? `<div class="d-flex align-items-center gap-2 mb-4"><i class="bi bi-newspaper" style="color:#555;"></i><span style="font-size:13px;color:#888;">Édition : ${esc(news.edition)}</span></div>` : ''}

        <div style="margin-bottom:28px;">
          <p style="font-size:12px;font-weight:600;color:#555;margin-bottom:10px;text-transform:uppercase;letter-spacing:.6px;">Partager</p>
          <div class="d-flex gap-2 flex-wrap">
            <button onclick="window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href),'_blank')"
                    style="display:inline-flex;align-items:center;gap:6px;background:#1877F2;border:none;border-radius:8px;padding:8px 14px;color:#fff;cursor:pointer;font-size:13px;">
              <i class="bi bi-facebook"></i> Facebook
            </button>
            <button onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.title+' '+location.href),'_blank')"
                    style="display:inline-flex;align-items:center;gap:6px;background:#25D366;border:none;border-radius:8px;padding:8px 14px;color:#fff;cursor:pointer;font-size:13px;">
              <i class="bi bi-whatsapp"></i> WhatsApp
            </button>
            <button onclick="navigator.share ? navigator.share({title:document.title,url:location.href}) : navigator.clipboard?.writeText(location.href)"
                    style="display:inline-flex;align-items:center;gap:6px;background:#333;border:none;border-radius:8px;padding:8px 14px;color:#fff;cursor:pointer;font-size:13px;">
              <i class="bi bi-share-fill"></i> Plus
            </button>
          </div>
        </div>

        ${related.length > 0 ? `
        <div style="margin-bottom:28px;">
          <div class="d-flex align-items-center gap-2 mb-3">
            <i class="bi bi-lightning-fill" style="color:#E23E3E;font-size:16px;"></i>
            <h3 style="font-size:15px;font-weight:700;color:#fff;margin:0;">Autres flash info (${related.length})</h3>
          </div>
          ${related.map(item => {
            const rId  = item.id || item._id;
            const rImg = item.image_url || item.image || '';
            return `
            <div class="d-flex mb-3" style="background:#1a1a1a;border-radius:10px;overflow:hidden;cursor:pointer;"
                 onclick="window.location.hash='#/news/${rId}'">
              ${rImg ? `<img src="${esc(rImg)}" alt="" style="width:110px;height:80px;object-fit:cover;flex-shrink:0;">` : `<div style="width:110px;height:80px;background:#2a2a2a;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><i class="bi bi-image text-secondary"></i></div>`}
              <div class="p-2" style="flex:1;overflow:hidden;">
                <p style="font-size:13px;font-weight:600;color:#fff;margin:0 0 5px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${esc(item.title || '')}</p>
                <span style="font-size:11px;color:#555;"><i class="bi bi-clock"></i> ${formatRelative(item.created_at)}${item.category ? ` · <span style="color:#E23E3E;">${esc(item.category)}</span>` : ''}</span>
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}

      </div>`;

    // Toggle description
    window._ndToggleDesc = function() {
      const wrap = document.getElementById('nd-desc-wrap');
      const fade = document.getElementById('nd-desc-fade');
      const btn  = document.getElementById('nd-desc-btn');
      if (!wrap) return;
      const open = wrap.style.maxHeight === 'none';
      wrap.style.maxHeight = open ? 'calc(1.75em * 5)' : 'none';
      if (fade) fade.style.display = open ? 'block' : 'none';
      if (btn)  btn.innerHTML = open
        ? 'Lire la suite <i class="bi bi-chevron-down" style="font-size:11px;"></i>'
        : 'Réduire <i class="bi bi-chevron-up" style="font-size:11px;"></i>';
    };

    // Hide 'Lire la suite' if desc is short enough
    requestAnimationFrame(() => {
      const wrap = document.getElementById('nd-desc-wrap');
      const btn  = document.getElementById('nd-desc-btn');
      if (wrap && btn && wrap.scrollHeight <= wrap.offsetHeight + 4) {
        wrap.style.maxHeight = 'none';
        const fade = document.getElementById('nd-desc-fade');
        if (fade) fade.style.display = 'none';
        btn.style.display = 'none';
      }
    });

    // Toggle favori
    let currentlyFavorited = userFavorited;
    window.toggleNdFavorite = async function() {
      if (!localStorage.getItem('bf1_token')) {
        window._showLoginModal?.('Connectez-vous pour sauvegarder cet article dans vos favoris');
        return;
      }
      const btn = document.getElementById('nd-fav-btn');
      if (!btn) return;
      btn.disabled = true;
      try {
        if (currentlyFavorited) {
          await api.removeFavorite(CONTENT_TYPE, id);
          currentlyFavorited = false;
        } else {
          await api.addFavorite(CONTENT_TYPE, id);
          currentlyFavorited = true;
        }
        btn.style.background = currentlyFavorited ? '#F59E0B' : '#1a1a1a';
        btn.style.color      = currentlyFavorited ? '#fff' : '#888';
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'bi ' + (currentlyFavorited ? 'bi-bookmark-fill' : 'bi-bookmark');
      } catch(e) { console.error('Erreur favori:', e); }
      btn.disabled = false;
    };

    // Toggle like
    let currentlyLiked = userLiked;
    let currentLikesCount = likesCount;
    window.toggleNdLike = async function() {
      if (!localStorage.getItem('bf1_token')) {
        window._showLoginModal?.('Connectez-vous pour liker cet article');
        return;
      }
      const btn = document.getElementById('nd-like-btn');
      const countEl = document.getElementById('nd-like-count');
      if (!btn) return;
      btn.disabled = true;
      try {
        const res = await api.toggleLike(CONTENT_TYPE, id);
        currentlyLiked = res?.liked ?? !currentlyLiked;
        currentLikesCount = res?.count ?? (currentlyLiked ? currentLikesCount + 1 : Math.max(0, currentLikesCount - 1));
        btn.style.background = currentlyLiked ? '#E23E3E' : '#1a1a1a';
        btn.style.color      = currentlyLiked ? '#fff' : '#888';
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'bi ' + (currentlyLiked ? 'bi-heart-fill' : 'bi-heart');
        if (countEl) countEl.textContent = Math.max(0, currentLikesCount);
      } catch(e) { console.error('Erreur like:', e); }
      btn.disabled = false;
    };

    // ─── Modal Commentaires ─────────────────────────────────────────────────
    const _ndCmOrig = {};

    function renderNdCmList(cmts) {
      const listEl = document.getElementById('nd-cm-list');
      if (!listEl) return;
      if (!cmts.length) {
        listEl.innerHTML = `<p style="color:#666;font-size:14px;text-align:center;padding:30px 0;"><i class="bi bi-chat-dots" style="font-size:28px;display:block;color:#333;margin-bottom:10px;"></i>Aucun commentaire. Soyez le premier !</p>`;
        return;
      }
      listEl.innerHTML = cmts.map(c => {
        const isOwn = user && String(c.user_id) === String(user.id);
        const uname = c.username || c.user?.username || 'Utilisateur';
        const cid = esc(String(c.id || c._id));
        return `
        <div class="nd-cm-comment" data-id="${cid}" style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid #1a0000;">
          <div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;background:#E23E3E;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;">${esc((uname[0]||'U').toUpperCase())}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;">
              <span style="font-size:13px;font-weight:600;color:#fff;">${esc(uname)}</span>
              <div class="nd-cm-actions" style="display:flex;gap:6px;flex-shrink:0;align-items:center;">
                <span style="font-size:11px;color:#555;">${formatRelative(c.created_at)}</span>
                ${isOwn ? `
                <button onclick="editNdCmComment('${cid}')" style="background:none;border:none;color:#888;cursor:pointer;padding:2px;font-size:14px;line-height:1;" title="Modifier"><i class="bi bi-pencil"></i></button>
                <button onclick="deleteNdCmComment('${cid}')" style="background:none;border:none;color:#E23E3E;cursor:pointer;padding:2px;font-size:14px;line-height:1;" title="Supprimer"><i class="bi bi-trash"></i></button>
                ` : ''}
              </div>
            </div>
            <p class="nd-cm-text" style="font-size:14px;color:#ccc;margin:0;line-height:1.5;word-break:break-word;">${esc(c.text)}</p>
          </div>
        </div>`;
      }).join('');
    }

    window.openNdComments = async function() {
      const existing = document.getElementById('nd-comments-modal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'nd-comments-modal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;flex-direction:column;justify-content:flex-end;';
      modal.innerHTML = `
        <style>#nd-comments-modal .nd-cm-sheet{animation:ndSlideUp 0.3s ease}@keyframes ndSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
        <div class="nd-cm-sheet" style="background:#000;border-radius:20px 20px 0 0;height:80vh;display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #1a0000;">
            <span style="color:#fff;font-size:17px;font-weight:700;">Commentaires (<span id="nd-cm-count">...</span>)</span>
            <button onclick="closeNdComments()" style="background:none;border:none;color:#fff;font-size:26px;cursor:pointer;line-height:1;padding:0 4px;">✕</button>
          </div>
          <div id="nd-cm-list" style="flex:1;overflow-y:auto;padding:0 16px;">
            <div style="text-align:center;padding:30px;"><i class="bi bi-hourglass-split" style="color:#E23E3E;font-size:28px;"></i></div>
          </div>
          ${user ? `
          <div style="padding:10px 16px;border-top:1px solid #1a0000;background:#000;display:flex;align-items:flex-end;gap:10px;">
            <textarea id="nd-cm-input" maxlength="1000" placeholder="Ajouter un commentaire..."
                      style="flex:1;background:#1a0000;border-radius:20px;border:none;padding:10px 16px;color:#fff;font-size:14px;resize:none;height:42px;max-height:100px;outline:none;line-height:1.4;"></textarea>
            <button onclick="submitNdCmComment()"
                    style="flex-shrink:0;background:#1a0000;border:none;border-radius:50%;width:42px;height:42px;color:#E23E3E;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">
              <i class="bi bi-send-fill"></i>
            </button>
          </div>` : `
          <div style="padding:14px 16px;border-top:1px solid #1a0000;text-align:center;">
            <button onclick="closeNdComments();setTimeout(()=>window._showLoginModal?.('Connectez-vous pour laisser un commentaire'),350);" style="background:#E23E3E;border:none;border-radius:8px;padding:9px 24px;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">Se connecter pour commenter</button>
          </div>`}
        </div>`;
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';
      modal.addEventListener('click', e => { if (e.target === modal) closeNdComments(); });
      const inp = document.getElementById('nd-cm-input');
      if (inp) {
        inp.addEventListener('input', function() { this.style.height='42px'; this.style.height=Math.min(this.scrollHeight,100)+'px'; });
        inp.addEventListener('keydown', function(e) { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); submitNdCmComment(); } });
      }
      try {
        const cmts = await api.getComments(CONTENT_TYPE, id);
        renderNdCmList(cmts);
        const cEl = document.getElementById('nd-cm-count');
        if (cEl) cEl.textContent = cmts.length;
      } catch(e) {
        const lEl = document.getElementById('nd-cm-list');
        if (lEl) lEl.innerHTML = `<p style="color:#666;text-align:center;padding:30px;">Erreur de chargement</p>`;
      }
    };

    window.closeNdComments = function() {
      const m = document.getElementById('nd-comments-modal');
      if (m) m.remove();
      document.body.style.overflow = '';
    };

    window.submitNdCmComment = async function() {
      const inp = document.getElementById('nd-cm-input');
      if (!inp || !inp.value.trim()) return;
      if (!localStorage.getItem('bf1_token')) {
        closeNdComments();
        window._showLoginModal?.('Connectez-vous pour laisser un commentaire');
        return;
      }
      const text = inp.value.trim();
      inp.disabled = true;
      try {
        await api.addComment(CONTENT_TYPE, id, text);
        inp.value = ''; inp.style.height = '42px';
        const cmts = await api.getComments(CONTENT_TYPE, id);
        renderNdCmList(cmts);
        const cEl = document.getElementById('nd-cm-count');
        if (cEl) cEl.textContent = cmts.length;
        const btn = document.getElementById('nd-cm-count-btn');
        if (btn) btn.textContent = `${cmts.length} commentaire${cmts.length !== 1 ? 's' : ''}`;
      } catch(e) { console.error('Erreur envoi:', e); }
      inp.disabled = false;
    };

    window.deleteNdCmComment = async function(commentId) {
      if (!confirm('Supprimer ce commentaire ?')) return;
      try {
        await api.deleteComment(commentId);
        const cmts = await api.getComments(CONTENT_TYPE, id);
        renderNdCmList(cmts);
        const cEl = document.getElementById('nd-cm-count');
        if (cEl) cEl.textContent = cmts.length;
        const btn = document.getElementById('nd-cm-count-btn');
        if (btn) btn.textContent = `${cmts.length} commentaire${cmts.length !== 1 ? 's' : ''}`;
      } catch(e) { console.error('Erreur suppression:', e); }
    };

    window.editNdCmComment = function(commentId) {
      const el = document.querySelector(`#nd-cm-list .nd-cm-comment[data-id="${commentId}"]`);
      if (!el) return;
      const textEl = el.querySelector('.nd-cm-text');
      const actEl = el.querySelector('.nd-cm-actions');
      if (!textEl) return;
      _ndCmOrig[commentId] = textEl.textContent.trim();
      textEl.innerHTML = `<textarea id="nd-cm-edit-${commentId}" style="width:100%;background:#000;border:1px solid #E23E3E;border-radius:8px;padding:8px;color:#fff;font-size:14px;resize:none;min-height:60px;outline:none;">${esc(_ndCmOrig[commentId])}</textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
          <button onclick="cancelNdCmEdit('${commentId}')" style="background:#1a1a1a;border:none;border-radius:8px;padding:6px 14px;color:#aaa;cursor:pointer;font-size:12px;">Annuler</button>
          <button onclick="updateNdCmComment('${commentId}')" style="background:#E23E3E;border:none;border-radius:8px;padding:6px 14px;color:#fff;cursor:pointer;font-size:12px;font-weight:600;">Enregistrer</button>
        </div>`;
      if (actEl) actEl.style.display = 'none';
      const ta = document.getElementById(`nd-cm-edit-${commentId}`);
      if (ta) ta.focus();
    };

    window.cancelNdCmEdit = function(commentId) {
      const el = document.querySelector(`#nd-cm-list .nd-cm-comment[data-id="${commentId}"]`);
      if (!el) return;
      const textEl = el.querySelector('.nd-cm-text');
      const actEl = el.querySelector('.nd-cm-actions');
      if (textEl) textEl.innerHTML = esc(_ndCmOrig[commentId] || '');
      if (actEl) actEl.style.display = '';
      delete _ndCmOrig[commentId];
    };

    window.updateNdCmComment = async function(commentId) {
      const ta = document.getElementById(`nd-cm-edit-${commentId}`);
      if (!ta || !ta.value.trim()) return;
      const newText = ta.value.trim();
      ta.disabled = true;
      try {
        await api.updateComment(commentId, newText);
        const cmts = await api.getComments(CONTENT_TYPE, id);
        renderNdCmList(cmts);
        const cEl = document.getElementById('nd-cm-count');
        if (cEl) cEl.textContent = cmts.length;
      } catch(e) {
        console.error('Erreur modification:', e);
        if (ta) ta.disabled = false;
        return;
      }
      delete _ndCmOrig[commentId];
    };

  } catch (err) {
    console.error('Erreur loadNewsDetail:', err);
    container.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center py-5"><i class="bi bi-exclamation-circle text-danger" style="font-size:3rem;"></i><p class="mt-3 text-secondary">Erreur lors du chargement</p><button onclick="history.back()" style="background:#E23E3E;color:#fff;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;margin-top:8px;">Retour</button></div>`;
  }
}
