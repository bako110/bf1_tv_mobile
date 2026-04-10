/**
 * sortFilter.js — Barre de tri réutilisable (Récents / Anciens)
 *
 * Usage:
 *   import { injectSortBar, applySortFilter } from '../utils/sortFilter.js';
 *
 *   // 1. Injecter la barre dans le sticky header existant
 *   injectSortBar('missed-page', (order) => {
 *     currentOrder = order;
 *     renderList(listEl);
 *   });
 *
 *   // 2. Dans renderList(), appeler applySortFilter avant de render
 *   const sorted = applySortFilter(allItems, currentOrder, 'created_at', 'aired_at');
 */

const SORT_BAR_ID = 'bf1-sort-bar';

const STYLE = `
<style id="bf1-sort-bar-style">
  .bf1-sort-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px 10px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .bf1-sort-bar::-webkit-scrollbar { display: none; }

  .bf1-sort-pill {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: 20px;
    border: 1.5px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.45);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.2px;
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .bf1-sort-pill i {
    font-size: 11px;
    color: inherit !important;
    transition: color 0.22s ease;
  }
  .bf1-sort-pill.active {
    background: linear-gradient(135deg, #E23E3E 0%, #FF6B6B 100%);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 3px 14px rgba(226,62,62,0.38);
  }
  .bf1-sort-pill:not(.active):active {
    background: rgba(226,62,62,0.12);
    border-color: rgba(226,62,62,0.25);
    color: #E23E3E;
  }
  .bf1-sort-divider {
    flex-shrink: 0;
    width: 1px;
    height: 16px;
    background: rgba(255,255,255,0.08);
  }
</style>`;

/**
 * Injecte la barre de tri dans le sticky header de la page.
 * @param {string} pageId      - id du <body> (ex: 'missed-page')
 * @param {Function} onChange  - callback appelé avec 'recent' | 'oldest'
 * @param {string} [initial]   - tri initial: 'recent' (défaut) | 'oldest'
 */
export function injectSortBar(pageId, onChange, initial = 'recent') {
  // Injecter le style une seule fois
  if (!document.getElementById('bf1-sort-bar-style')) {
    document.head.insertAdjacentHTML('beforeend', STYLE);
  }

  // Supprimer une ancienne barre si elle existe
  const existing = document.getElementById(SORT_BAR_ID);
  if (existing) existing.remove();

  // Trouver le sticky header dans la page
  const page = document.getElementById(pageId);
  const sticky = page?.querySelector('.sticky-top') || document.querySelector('.sticky-top');
  if (!sticky) return;

  const bar = document.createElement('div');
  bar.id = SORT_BAR_ID;
  bar.className = 'bf1-sort-bar';
  bar.innerHTML = `
    <button class="bf1-sort-pill${initial === 'recent' ? ' active' : ''}" data-sort="recent">
      <i class="bi bi-arrow-down"></i> Récents
    </button>
    <div class="bf1-sort-divider"></div>
    <button class="bf1-sort-pill${initial === 'oldest' ? ' active' : ''}" data-sort="oldest">
      <i class="bi bi-arrow-up"></i> Anciens
    </button>
  `;

  sticky.appendChild(bar);

  bar.querySelectorAll('.bf1-sort-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.bf1-sort-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.sort);
    });
  });
}

/**
 * Trie un tableau d'items selon l'ordre choisi.
 * @param {Array}    items   - tableau source (non muté)
 * @param {string}   order   - 'recent' | 'oldest'
 * @param {...string} fields - champs de date à essayer dans l'ordre
 * @returns {Array} nouveau tableau trié
 */
export function applySortFilter(items, order, ...fields) {
  if (!Array.isArray(items) || !items.length) return items;
  const dateFields = fields.length ? fields : ['created_at', 'published_at', 'aired_at', 'date'];

  return [...items].sort((a, b) => {
    let dA = null, dB = null;
    for (const f of dateFields) {
      if (a[f]) { dA = new Date(a[f]); break; }
    }
    for (const f of dateFields) {
      if (b[f]) { dB = new Date(b[f]); break; }
    }
    const tA = dA ? dA.getTime() : 0;
    const tB = dB ? dB.getTime() : 0;
    return order === 'oldest' ? tA - tB : tB - tA;
  });
}
