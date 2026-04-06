/**
 * Pull-to-refresh natif pour pages keep-alive.
 *
 * Usage :
 *   attachPullToRefresh(scrollEl, onRefresh)
 *
 * - scrollEl  : l'élément scrollable de la page (div.ka-page)
 * - onRefresh : fonction async appelée quand l'utilisateur relâche
 *
 * L'indicateur (spinner + texte) est injecté en haut du scrollEl.
 * Il faut ≥ 70 px de glissement depuis le top pour déclencher le refresh.
 */
import { createSnakeLoader } from './snakeLoader.js';

export function attachPullToRefresh(scrollEl, onRefresh) {
  if (!scrollEl || scrollEl._ptrAttached) return;
  scrollEl._ptrAttached = true;

  const THRESHOLD = 72;
  const MAX_PULL  = 115;
  const RESIST    = 0.45;

  // ── Indicateur ─────────────────────────────────────────────────────────────
  const indicator = document.createElement('div');
  indicator.style.cssText =
    'position:absolute;top:0;left:0;right:0;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;' +
    'height:0;overflow:hidden;background:transparent;z-index:10;pointer-events:none;';

  // Snake loader dans l'indicateur
  const snakeWrap = document.createElement('div');
  snakeWrap.style.cssText = 'opacity:0;transition:opacity 0.2s;transform:scale(0.7);transition:opacity 0.2s,transform 0.2s;';
  snakeWrap.appendChild(createSnakeLoader(34));

  const label = document.createElement('span');
  label.style.cssText = 'font-size:11px;color:#888;opacity:0;transition:opacity 0.2s;';
  label.textContent = 'Tirer pour rafraîchir';

  indicator.appendChild(snakeWrap);
  indicator.appendChild(label);

  scrollEl.style.position = 'relative';
  scrollEl.insertBefore(indicator, scrollEl.firstChild);

  // ── État ───────────────────────────────────────────────────────────────────
  let startY = 0, pulling = false, triggered = false, isRefreshing = false;

  function _show(pullY) {
    const h     = Math.min(pullY * RESIST, MAX_PULL);
    const ratio = Math.min(h / THRESHOLD, 1);
    indicator.style.height  = h + 'px';
    snakeWrap.style.opacity = String(ratio);
    snakeWrap.style.transform = `scale(${0.7 + ratio * 0.3})`;
    label.style.opacity     = String(ratio);
    label.textContent = h >= THRESHOLD ? 'Relâcher pour rafraîchir' : 'Tirer pour rafraîchir';
  }

  function _hide() {
    indicator.style.transition = 'height 0.25s ease';
    indicator.style.height = '0';
    snakeWrap.style.opacity = '0';
    label.style.opacity = '0';
    setTimeout(() => { indicator.style.transition = ''; }, 260);
  }

  async function _doRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;

    indicator.style.height  = THRESHOLD + 'px';
    snakeWrap.style.opacity = '1';
    snakeWrap.style.transform = 'scale(1)';
    label.style.opacity     = '1';
    label.textContent       = 'Actualisation…';

    try { await onRefresh(); } catch {}

    _hide();
    isRefreshing = false;
    triggered    = false;
  }

  // ── Touch handlers ─────────────────────────────────────────────────────────
  scrollEl.addEventListener('touchstart', (e) => {
    if (isRefreshing) return;
    if (scrollEl.scrollTop > 0) return; // pas en haut → pas de pull
    startY  = e.touches[0].clientY;
    pulling = true;
    triggered = false;
  }, { passive: true });

  scrollEl.addEventListener('touchmove', (e) => {
    if (!pulling || isRefreshing) return;
    if (scrollEl.scrollTop > 0) { pulling = false; return; }
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { pulling = false; return; }
    _show(dy);
    triggered = dy * RESIST >= THRESHOLD;
  }, { passive: true });

  scrollEl.addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;
    if (triggered) {
      _doRefresh();
    } else {
      _hide();
    }
  }, { passive: true });

  scrollEl.addEventListener('touchcancel', () => {
    pulling = false;
    _hide();
  }, { passive: true });
}
