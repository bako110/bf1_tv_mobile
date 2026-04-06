import * as api from '../../shared/services/api.js';
import { slugify } from '/js/slugUtils.js';

let sportData = [];
let currentFilter = 'Tous';
let isLoading = false;

// Variables de pagination
let currentPage = 1;
let itemsPerPage = 9; // 9 articles par page (3x3)
let totalPages = 1;

export async function loadSportContent() {
  const container = document.getElementById('sportArticles');
  const filterContainer = document.querySelector('.filter-pills');
  
  console.log('🔍 Container trouvé:', container);
  
  if (!container) {
    console.error('❌ Container non trouvé');
    return;
  }

  // Afficher loader
  isLoading = true;
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="mt-3 text-secondary">Chargement du contenu sport...</p>
    </div>
  `;

  try {
    // Charger les données sport depuis l'API
    console.log('📡 Appel API getSports()...');
    const sportsResponse = await api.getSports();
    console.log('📦 Réponse API brute:', sportsResponse);
    
    // Traiter les données sport
    let rawData = [];
    
    if (sportsResponse && sportsResponse.sports) {
      rawData = sportsResponse.sports;
      console.log('✅ Données trouvées dans sportsResponse.sports:', rawData.length);
    } else if (Array.isArray(sportsResponse)) {
      rawData = sportsResponse;
      console.log('✅ Données trouvées dans tableau:', rawData.length);
    } else {
      console.log('⚠️ Format de réponse inattendu:', sportsResponse);
      rawData = [];
    }
    
    // Si pas de données, essayer getNews() comme fallback
    if (rawData.length === 0) {
      console.log('🔄 Tentative avec getNews()...');
      const newsData = await api.getNews(50);
      console.log('📦 News API brute:', newsData);
      
      if (Array.isArray(newsData)) {
        rawData = newsData.filter(item => 
          item.category === 'Sport' || 
          item.edition === 'Sport' ||
          (item.tags && item.tags.includes('sport'))
        );
        console.log('✅ Données sport filtrées depuis news:', rawData.length);
      }
    }
    
    sportData = rawData;
    
    console.log(`📊 Total des données brutes: ${rawData.length}`);
    
    // Filtrer par catégorie Sport
    const filteredBySport = sportData.filter(item => {
      const category = item.category || item.edition || item.type || '';
      const tags = item.tags || [];
      return category === 'Sport' || 
             category === 'sport' ||
             item.sport_type ||
             tags.includes('sport') ||
             tags.includes('Sport');
    });
    
    console.log(`🎯 Après filtrage catégorie Sport: ${filteredBySport.length}`);
    
    if (filteredBySport.length > 0) {
      sportData = filteredBySport;
    } else if (sportData.length > 0) {
      console.log('⚠️ Aucun élément avec catégorie "Sport", utilisation de toutes les données');
    }

    // Construire les filtres dynamiquement
    if (filterContainer) {
      renderFilters(filterContainer);
    }

    // Réinitialiser la pagination
    currentPage = 1;
    
    // Afficher le contenu avec pagination
    renderSportList(container);

  } catch (error) {
    console.error('❌ Erreur détaillée chargement sport:', error);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-trophy-fill" style="font-size:3rem;color:#666;"></i>
        <p class="mt-3 text-secondary">Erreur: ${error.message || 'Impossible de charger le contenu sport'}</p>
        <button class="btn btn-outline-danger btn-sm mt-2" onclick="window.location.reload()">
          <i class="bi bi-arrow-clockwise"></i> Réessayer
        </button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

function renderFilters(container) {
  // Extraire les sous-catégories uniques des données
  const subcategories = new Set(['Tous']);
  
  sportData.forEach(item => {
    const subcat = item.subcategory || item.sport_type || item.discipline || item.category;
    if (subcat && subcat !== 'Sport' && subcat !== 'sport') {
      subcategories.add(subcat);
    }
  });
  
  const categories = Array.from(subcategories);

  if (sportData.length > 0) {
    container.innerHTML = '';
    
    categories.forEach(category => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-pill';
      if (category === currentFilter) {
        btn.classList.add('active');
      }
      btn.innerHTML = `<i class="bi bi-trophy-fill"></i>${category}`;
      
      btn.addEventListener('click', () => {
        currentFilter = category;
        currentPage = 1; // Réinitialiser la page lors du changement de filtre
        container.querySelectorAll('.filter-pill').forEach(b => {
          if (b.textContent.includes(category)) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
      const mainContainer = document.getElementById('sportArticles');
        if (mainContainer) renderSportList(mainContainer);
      });

      container.appendChild(btn);
    });
  } else {
    container.innerHTML = '<div class="text-center py-3 text-secondary">Aucun filtre disponible</div>';
  }
}

function renderSportList(container) {
  let filtered = sportData;
  
  if (currentFilter !== 'Tous') {
    filtered = filtered.filter(item => {
      const subcat = item.subcategory || item.sport_type || item.discipline || item.category;
      const tags = item.tags || [];
      return subcat === currentFilter || 
             tags.includes(currentFilter) ||
             tags.includes(currentFilter.toLowerCase());
    });
  }

  // Trier par date (plus récent en premier)
  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.created_at || a.published_at || 0);
    const dateB = new Date(b.created_at || b.published_at || 0);
    return dateB - dateA;
  });

  // Calculer la pagination
  totalPages = Math.ceil(sorted.length / itemsPerPage);
  
  // S'assurer que currentPage est valide
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = sorted.slice(startIndex, endIndex);

  if (pageItems.length > 0) {
    const articlesHTML = pageItems.map((item, index) => buildSportCard(item, startIndex + index)).join('');
    const paginationHTML = renderPagination(sorted.length);
    
    container.innerHTML = `
      <div class="sport-grid">
        ${articlesHTML}
      </div>
      ${paginationHTML}
      <div class="sport-stats">
        <i class="bi bi-trophy-fill"></i> ${sorted.length} article${sorted.length > 1 ? 's' : ''} au total
      </div>
    `;
    
    updateTrendsSection(sorted);
  } else {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-trophy-fill" style="font-size:3rem;color:#666;"></i>
        <p class="mt-3 text-secondary">Aucun contenu sport disponible</p>
      </div>
    `;
  }
}

function renderPagination(totalItems) {
  if (totalPages <= 1) return '';
  
  let paginationHTML = '<div class="pagination-container">';
  
  // Bouton précédent
  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  paginationHTML += `
    <button class="pagination-btn ${prevDisabled}" onclick="window.changeSportPage(${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i> Précédent
    </button>
  `;
  
  paginationHTML += '<div class="pagination-numbers">';
  
  // Afficher les numéros de page
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  
  // Ajuster pour les premiers pages
  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  }
  // Ajuster pour les dernières pages
  if (currentPage >= totalPages - 2) {
    startPage = Math.max(1, totalPages - 4);
  }
  
  // Première page si pas dans le début
  if (startPage > 1) {
    paginationHTML += `<button class="pagination-number" onclick="window.changeSportPage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
  }
  
  // Pages intermédiaires
  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === currentPage ? 'active' : '';
    paginationHTML += `<button class="pagination-number ${activeClass}" onclick="window.changeSportPage(${i})">${i}</button>`;
  }
  
  // Dernière page si pas dans la fin
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
    paginationHTML += `<button class="pagination-number" onclick="window.changeSportPage(${totalPages})">${totalPages}</button>`;
  }
  
  paginationHTML += '</div>';
  
  // Bouton suivant
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';
  paginationHTML += `
    <button class="pagination-btn ${nextDisabled}" onclick="window.changeSportPage(${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>
      Suivant <i class="bi bi-chevron-right"></i>
    </button>
  `;
  
  paginationHTML += '</div>';
  
  // Information de pagination
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  paginationHTML += `
    <div class="pagination-info">
      Affichage de ${startItem} à ${endItem} sur ${totalItems} articles
    </div>
  `;
  
  return paginationHTML;
}

function buildSportCard(item, index) {
  const img = item.image_url || item.image || item.thumbnail || '';
  const category = item.subcategory || item.sport_type || item.category || 'Sport';
  const title = item.title || 'Sans titre';
  const description = item.description || item.content || '';
  const author = item.author || item.created_by || 'Rédaction Sport';
  const time = formatTime(item.created_at || item.published_at || item.time);
  const views = item.views || 0;
  const isUrgent = item.priority === 'urgent' || item.is_breaking_news || item.urgent;

  let imageUrl = img;
  if (img && !img.startsWith('http') && !img.startsWith('data:')) {
    imageUrl = `https://backend-bf1tv.onrender.com${img.startsWith('/') ? img : '/' + img}`;
  }

  return `
    <div class="sport-card anim-up d${(index % 9) + 1} ${isUrgent ? 'urgent-flash' : ''}" 
         onclick="window.location.href='detail-contenu.html?slug=${slugify(title)}&type=sport'">
      <div class="sport-card-image">
        <img src="${imageUrl || '/logo.png'}" 
             alt="${escapeHtml(title)}" 
             onerror="this.src='/logo.png'"/>
        ${isUrgent ? '<span class="urgent-badge">⚡ URGENT</span>' : ''}
        <div class="sport-card-overlay">
          <div class="card-play"><i class="bi bi-play-fill"></i></div>
        </div>
      </div>
      <div class="sport-card-content">
        <div class="sport-card-category">
          <i class="bi bi-trophy-fill"></i> ${escapeHtml(category)}
        </div>
        <h3 class="sport-card-title">${escapeHtml(title)}</h3>
        <p class="sport-card-description">${escapeHtml(description.substring(0, 120))}${description.length > 120 ? '...' : ''}</p>
        <div class="sport-card-meta">
          <span><i class="bi bi-person-fill"></i> ${escapeHtml(author)}</span>
          <span><i class="bi bi-clock-fill"></i> ${time}</span>
          <span><i class="bi bi-eye-fill"></i> ${formatNumber(views)}</span>
        </div>
      </div>
    </div>
  `;
}

function updateTrendsSection(allSportData) {
  const trendsContainer = document.querySelector('.flash-layout > div:last-child div[style*="flex-direction"]');
  
  if (!trendsContainer) {
    console.log('⚠️ Conteneur des tendances non trouvé');
    return;
  }
  
  // Prendre les 5 articles les plus vus
  const trends = [...allSportData]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  if (trends.length > 0) {
    trendsContainer.innerHTML = trends.map((item, idx) => {
      const img = item.image_url || item.image || item.thumbnail || '';
      const title = item.title || 'Sans titre';
      const views = item.views || 0;
      const category = item.subcategory || item.sport_type || 'Sport';
      
      return `
        <div class="news-item" style="padding:10px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid var(--border);cursor:pointer;transition:all var(--transition)"
             onclick="window.location.href='detail-contenu.html?slug=${slugify(title)}&type=sport'">
          <img class="news-thumb" src="${img || 'https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=120&q=60'}" 
               alt="${escapeHtml(title)}" 
               style="width:70px;height:50px;border-radius:var(--radius-sm);object-fit:cover"
               onerror="this.src='https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=120&q=60'"/>
          <div>
            <span class="news-cat" style="font-size:0.6rem;padding:2px 6px">
              <i class="bi bi-eye-fill"></i> ${formatNumber(views)} vues
            </span>
            <div class="news-title" style="font-size:0.8rem">${escapeHtml(title)}</div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    trendsContainer.innerHTML = `
      <div class="text-center text-secondary py-3">
        <i class="bi bi-bar-chart-line" style="font-size:1.5rem;"></i>
        <p class="mt-2 small">Pas assez de données</p>
      </div>
    `;
  }
}

// Fonction pour changer de page (accessible globalement)
window.changeSportPage = function(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  const mainContainer = document.getElementById('sportArticles');
  if (mainContainer) renderSportList(mainContainer);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatTime(dateString) {
  if (!dateString) return 'À l\'instant';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } catch {
    return 'Récemment';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Exporter la fonction
window.loadSportContent = loadSportContent;