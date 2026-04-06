/**
 * Infinite scroll helper
 * @param {object} opts
 *   listEl       - conteneur DOM
 *   sentinelId   - id unique du sentinel
 *   fetchFn      - async (skip, limit) => { items, total }
 *   renderCard   - (item) => htmlString
 *   getSkip      - () => number
 *   getTotal     - () => number
 *   onNewItems   - (items) => void  (met à jour le tableau local)
 *   getMode      - () => 'grid'|'list'
 *   gridCols     - nb colonnes grid (défaut 2)
 *   limit        - items par page (défaut 20)
 */

// Injecter le style skeleton une seule fois
(function ensureSkeletonStyle() {
  if (document.getElementById('bf1-skeleton-style')) return;
  const s = document.createElement('style');
  s.id = 'bf1-skeleton-style';
  s.textContent = `@keyframes bf1-pulse{0%,100%{opacity:.35}50%{opacity:.75}}`;
  document.head.appendChild(s);
})();

export function buildSkeletonCards(count = 3, mode = 'list') {
  const wrap = document.createElement('div');
  wrap.className = 'px-3';
  if (mode === 'grid') {
    wrap.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
    wrap.innerHTML = Array.from({length: count}).map(() => `
      <div style="border-radius:10px;overflow:hidden;animation:bf1-pulse 1.2s infinite;">
        <div style="width:100%;height:140px;background:#2a2a2a;"></div>
        <div style="padding:8px;display:flex;flex-direction:column;gap:6px;">
          <div style="height:11px;border-radius:5px;background:#2a2a2a;width:85%;"></div>
          <div style="height:10px;border-radius:5px;background:#2a2a2a;width:55%;"></div>
        </div>
      </div>`).join('');
  } else {
    wrap.innerHTML = Array.from({length: count}).map(() => `
      <div style="display:flex;gap:10px;margin-bottom:12px;animation:bf1-pulse 1.2s infinite;">
        <div style="width:120px;height:90px;border-radius:8px;background:#2a2a2a;flex-shrink:0;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center;">
          <div style="height:12px;border-radius:6px;background:#2a2a2a;width:80%;"></div>
          <div style="height:10px;border-radius:6px;background:#2a2a2a;width:60%;"></div>
          <div style="height:10px;border-radius:6px;background:#2a2a2a;width:40%;"></div>
        </div>
      </div>`).join('');
  }
  return wrap;
}

export function setupInfiniteScroll({
  listEl, sentinelId, fetchFn, renderCard,
  getSkip, getTotal, onNewItems, getMode,
  gridCols = 2, limit = 20
}) {
  // Nettoyer ancien sentinel
  const old = document.getElementById(sentinelId);
  if (old) old.remove();

  if (getSkip() >= getTotal()) return;

  const sentinel = document.createElement('div');
  sentinel.id = sentinelId;
  sentinel.style.height = '1px';
  listEl.appendChild(sentinel);

  let loading = false;
  const obs = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting || loading || getSkip() >= getTotal()) return;
    loading = true;

    const skeleton = buildSkeletonCards(3, getMode());
    listEl.insertBefore(skeleton, document.getElementById(sentinelId));

    try {
      const data = await fetchFn(getSkip(), limit);
      const newItems = data.items || [];
      skeleton.remove();
      onNewItems(newItems, data.total);

      // Trouver le wrapper de cartes
      const wrapper = listEl.querySelector('.bf1-cards-wrapper');
      const isGrid = getMode() === 'grid';

      newItems.forEach((item, i) => {
        const div = document.createElement('div');
        div.style.cssText = `opacity:0;transform:translateY(16px);transition:opacity .3s ease ${i*60}ms,transform .3s ease ${i*60}ms;`;
        div.innerHTML = renderCard(item);
        wrapper.appendChild(div);
        requestAnimationFrame(() => {
          div.style.opacity = '1';
          div.style.transform = 'translateY(0)';
        });
      });

      // Re-observe ou message fin
      if (getSkip() < getTotal()) {
        setupInfiniteScroll({ listEl, sentinelId, fetchFn, renderCard, getSkip, getTotal, onNewItems, getMode, gridCols, limit });
      } else {
        const endMsg = document.createElement('div');
        endMsg.style.cssText = 'text-align:center;padding:16px 0 24px;font-size:12px;color:#555;';
        endMsg.textContent = 'Tout est chargé';
        listEl.appendChild(endMsg);
      }
    } catch {
      skeleton.remove();
    }
    loading = false;
    obs.disconnect();
  }, { rootMargin: '250px' });

  obs.observe(sentinel);
}
