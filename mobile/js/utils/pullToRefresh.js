/**
 * Pull-to-refresh natif pour pages keep-alive.
 *
 * Usage :
 *   attachPullToRefresh(scrollEl, onRefresh)
 *
 * - scrollEl  : l'élément scrollable de la page (div.ka-page)
 * - onRefresh : fonction async appelée quand l'utilisateur relâche après avoir tiré
 *
 * Règles strictes :
 *   1. Le pull ne s'active QUE si scrollTop === 0 au moment du touchstart
 *   2. Le premier mouvement doit être vers le bas (dy > 0)
 *   3. Si à n'importe quel moment scrollTop redevient > 0, on annule
 *   4. L'utilisateur doit tirer ≥ THRESHOLD px avant de relâcher
 */
import { createSnakeLoader } from './snakeLoader.js';

export function attachPullToRefresh(scrollEl, onRefresh) {
  if (!scrollEl || scrollEl._ptrAttached) return;
  scrollEl._ptrAttached = true;

  const THRESHOLD   = 72;   // px résistés nécessaires pour déclencher
  const MAX_PULL    = 110;  // hauteur max de l'indicateur
  const RESIST      = 0.42; // facteur de résistance (pull physique)
  const MIN_MOVE_PX = 8;    // mouvement minimal pour considérer un début de pull

  // ── Indicateur ───────────────────────────────────────────────────────────────
  const indicator = document.createElement('div');
  indicator.style.cssText =
    'position:absolute;top:0;left:0;right:0;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;' +
    'height:0;overflow:hidden;background:transparent;z-index:20;pointer-events:none;' +
    'will-change:height;';

  const snakeWrap = document.createElement('div');
  snakeWrap.style.cssText = 'opacity:0;transform:scale(0.6);transition:opacity 0.15s,transform 0.15s;';
  snakeWrap.appendChild(createSnakeLoader(34));

  const label = document.createElement('span');
  label.style.cssText = 'font-size:11px;color:#888;opacity:0;transition:opacity 0.15s;';
  label.textContent = 'Tirer pour rafraîchir';

  indicator.appendChild(snakeWrap);
  indicator.appendChild(label);

  scrollEl.style.position = 'relative';
  scrollEl.insertBefore(indicator, scrollEl.firstChild);

  // ── État ─────────────────────────────────────────────────────────────────────
  let startY        = 0;
  let startScrollTop = 0;   // scrollTop capturé au touchstart
  let canPull       = false; // true uniquement si scrollTop était 0 au départ
  let pulling       = false; // true si on est en train de tirer vers le bas
  let triggered     = false; // true si seuil atteint
  let isRefreshing  = false;

  function _update(pullY) {
    const h     = Math.min(pullY * RESIST, MAX_PULL);
    const ratio = Math.min(h / THRESHOLD, 1);
    indicator.style.height     = h + 'px';
    snakeWrap.style.opacity    = String(ratio);
    snakeWrap.style.transform  = `scale(${0.6 + ratio * 0.4})`;
    label.style.opacity        = String(ratio);
    label.textContent = h >= THRESHOLD
      ? 'Relâcher pour rafraîchir ↑'
      : 'Tirer pour rafraîchir ↓';
    triggered = h >= THRESHOLD;
  }

  function _reset(animate = true) {
    if (animate) {
      indicator.style.transition = 'height 0.22s ease';
      setTimeout(() => { indicator.style.transition = ''; }, 230);
    }
    indicator.style.height   = '0';
    snakeWrap.style.opacity  = '0';
    snakeWrap.style.transform = 'scale(0.6)';
    label.style.opacity      = '0';
    canPull   = false;
    pulling   = false;
    triggered = false;
  }

  async function _doRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;

    // Garder l'indicateur visible pendant le chargement
    indicator.style.height     = THRESHOLD + 'px';
    snakeWrap.style.opacity    = '1';
    snakeWrap.style.transform  = 'scale(1)';
    label.style.opacity        = '1';
    label.textContent          = 'Actualisation…';

    try { await onRefresh(); } catch {}

    _reset(true);
    isRefreshing = false;
  }

  // ── Touch handlers ────────────────────────────────────────────────────────────

  scrollEl.addEventListener('touchstart', (e) => {
    if (isRefreshing) return;

    // Capturer le scrollTop au moment exact du touch
    startScrollTop = scrollEl.scrollTop;

    // Autoriser le pull UNIQUEMENT si on est tout en haut (scrollTop == 0)
    if (startScrollTop !== 0) {
      canPull = false;
      return;
    }

    startY  = e.touches[0].clientY;
    canPull = true;
    pulling = false;
    triggered = false;
  }, { passive: true });

  scrollEl.addEventListener('touchmove', (e) => {
    if (!canPull || isRefreshing) return;

    // Si le scroll a bougé depuis le départ, annuler
    if (scrollEl.scrollTop > 2) {
      _reset(false);
      return;
    }

    const dy = e.touches[0].clientY - startY;

    // Ignorer les petits mouvements et les mouvements vers le haut
    if (dy < MIN_MOVE_PX) {
      if (pulling) _reset(false);
      return;
    }

    pulling = true;
    _update(dy);
  }, { passive: true });

  scrollEl.addEventListener('touchend', () => {
    if (!canPull) return;
    canPull = false;

    if (!pulling) return;

    if (triggered) {
      _doRefresh();
    } else {
      _reset(true);
    }
  }, { passive: true });

  scrollEl.addEventListener('touchcancel', () => {
    _reset(false);
  }, { passive: true });
}
