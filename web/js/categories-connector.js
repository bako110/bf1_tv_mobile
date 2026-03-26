/**
 * Câblage des Web Services pour les catégories
 * Charge les vraies données du backend pour chaque section
 */

import * as api from '../../shared/services/api.js';

console.log('🔧 Chargement categories-connector.js');

const CATEGORIES_CONFIG = {
  sport: {
    apiMethod: 'getSports',
    title: 'SPORT',
    accent: 'FOOTBALL',
    link: 'sport.html',
    category: 'sport'
  },
  divertissement: {
    apiMethod: 'getDivertissement',
    title: 'DIVERTISSEMENT',
    accent: 'SPECTACLE',
    link: 'divertissement.html',
    category: 'divertissement'
  },
  reportage: {
    apiMethod: 'getReportages',
    title: 'REPORTAGE',
    accent: 'DÉCOUVERTE',
    link: 'reportage.html',
    category: 'reportage'
  },
  archive: {
    apiMethod: 'getArchive',
    title: 'ARCHIVE',
    accent: 'HISTOIRE',
    link: 'archive.html',
    category: 'archive'
  },
  jtandmag: {
    apiMethod: 'getJTandMag',
    title: 'JOURNAL',
    accent: 'MAGAZINE',
    link: 'journal-magazine.html',
    category: 'jtandmag'
  },
  flashinfo: {
    apiMethod: 'getNews',
    title: 'FLASHINFO',
    accent: 'EN DIRECT',
    link: 'flashinfo.html',
    category: 'actualites'
  }
};

function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-bf1tv.onrender.com${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Create card inner HTML from item data
 */
function createCardFromItem(item, config) {
  const title = item.title || item.name || 'Sans titre';
  const imageUrl = getImageUrl(item.image_url || item.image || item.thumbnail);
  const views = item.views ? formatNumber(item.views) : Math.floor(Math.random() * 200000);
  const badge = item.live ? 'EN DIRECT' : config.accent;
  
  return `
    <div class="bp-thumb bp-thumb--category" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center; cursor: pointer;" data-link="${config.link}">
      <img src="${imageUrl}" alt="${title}" style="display:none;"/>
      <div class="bp-gradient"></div>
      <div class="bp-label-overlay">
        <span class="bp-label-title">${config.title}</span>
        <span class="bp-label-accent">${badge}</span>
      </div>
      <div class="bp-hover-veil">
        <div class="bp-hover-content">
          <div class="bp-hover-title">${title}</div>
          <div class="bp-hover-meta">
            ${config.accent.toLowerCase()}
            <span class="mx-2">·</span>
            ${views} vues
          </div>
          <div class="bp-hover-desc">${item.description || item.desc || 'Découvrez ce contenu exclusif sur BF1 TV.'}</div>
          <div class="bp-hover-btn">
            Voir plus
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load categories data
 */
export async function loadCategoriesData() {
  try {
    console.log('📡 Chargement des données des catégories...');
    
    // Charger toutes les catégories en parallèle
    const [sports, divertissement, reportages, archives, jtandmag, news] = await Promise.all([
      api.getSports().catch(e => { console.warn('⚠️ Sport API:', e); return null; }),
      api.getDivertissement().catch(e => { console.warn('⚠️ Divertissement API:', e); return null; }),
      api.getReportages().catch(e => { console.warn('⚠️ Reportages API:', e); return null; }),
      api.getArchive().catch(e => { console.warn('⚠️ Archive API:', e); return null; }),
      api.getJTandMag().catch(e => { console.warn('⚠️ JT&Mag API:', e); return null; }),
      api.getNews().catch(e => { console.warn('⚠️ News API:', e); return null; })
    ]);

    console.log('✅ Données des catégories reçues');

    // Traiter Sport
    if (sports) {
      const sportItems = (sports && sports.sports) ? sports.sports : (Array.isArray(sports) ? sports : []);
      if (Array.isArray(sportItems) && sportItems[0]) {
        updateCategory('sport', sportItems[0], CATEGORIES_CONFIG.sport);
      }
    }

    // Traiter Divertissement
    if (divertissement) {
      const divItems = Array.isArray(divertissement) ? divertissement : [];
      if (divItems[0]) {
        updateCategory('divertissement', divItems[0], CATEGORIES_CONFIG.divertissement);
      }
    }

    // Traiter Reportage
    if (reportages) {
      const repItems = reportages.reportages || (Array.isArray(reportages) ? reportages : []);
      if (Array.isArray(repItems) && repItems[0]) {
        updateCategory('reportage', repItems[0], CATEGORIES_CONFIG.reportage);
      }
    }

    // Traiter Archive
    if (archives) {
      const archItems = archives.archives || (Array.isArray(archives) ? archives : []);
      if (Array.isArray(archItems) && archItems[0]) {
        updateCategory('archive', archItems[0], CATEGORIES_CONFIG.archive);
      }
    }

    // Traiter JT & Magazine
    if (jtandmag) {
      const jtItems = Array.isArray(jtandmag) ? jtandmag : [];
      if (jtItems[0]) {
        updateCategory('jtandmag', jtItems[0], CATEGORIES_CONFIG.jtandmag);
      }
    }

    // Traiter FlashInfo (News)
    if (news) {
      const newsItems = Array.isArray(news) ? news : [];
      if (newsItems[0]) {
        updateCategory('flashinfo', newsItems[0], CATEGORIES_CONFIG.flashinfo);
      }
    }

    console.log('✅ Catégories mises à jour');

  } catch (error) {
    console.error('❌ Erreur chargement catégories:', error);
  }
}

/**
 * Update category card with real data
 */
function updateCategory(categoryKey, item, config) {
  try {
    const trackId = `track-categories`;
    const track = document.getElementById(trackId);
    
    if (!track) {
      console.warn(`⚠️ Track ${trackId} non trouvé`);
      return;
    }

    // Trouver la position de cette catégorie (basée sur l'ordre dans la section)
    const categoryIndex = {
      'sport': 0,
      'divertissement': 1,
      'reportage': 2,
      'archive': 3,
      'jtandmag': 4,
      'flashinfo': 5
    }[categoryKey];

    const cards = track.querySelectorAll('.bpc');
    if (cards[categoryIndex]) {
      cards[categoryIndex].innerHTML = createCardFromItem(item, config);
      
      // Ajouter event listener au clic
      const thumb = cards[categoryIndex].querySelector('.bp-thumb');
      if (thumb) {
        thumb.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const link = this.getAttribute('data-link');
          if (link) {
            console.log(`🔗 Navigation vers: ${link}`);
            window.location.href = link;
          }
        });
      }
      
      console.log(`✅ Catégorie ${categoryKey} mise à jour`);
    }

  } catch (error) {
    console.error(`❌ Erreur mise à jour ${categoryKey}:`, error);
  }
}

// Auto-init - attendre que le DOM soit complètement chargé ET que les cartes soient présentes
function initWhenReady() {
  const track = document.getElementById('track-categories');
  if (!track) {
    // Réessayer après 500ms
    setTimeout(initWhenReady, 500);
    return;
  }
  
  console.log('✅ Cartes trouvées, chargement des données...');
  loadCategoriesData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
  initWhenReady();
}
