import * as api from '../../shared/services/api.js';

let reportageData = [];
let currentFilter = 'Tous';
let isLoading = false;
let currentPage = 1;
let itemsPerPage = 9;
let totalPages = 1;

export async function loadReportageContent() {
  const container = document.getElementById('reportageArticles');
  const filterContainer = document.querySelector('.filter-pills');
  
  if (!container) {
    console.error('❌ Container non trouvé');
    return;
  }

  isLoading = true;
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-danger" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="mt-3 text-secondary">Chargement des reportages...</p>
    </div>
  `;

  try {
    console.log('📡 Appel API getReportages()...');
    const response = await api.getReportages();
    console.log('📦 Réponse API brute:', response);
    console.log('📦 Type de réponse:', typeof response);
    console.log('📦 Est un tableau?', Array.isArray(response));
    
    // Traiter les données - différents formats possibles
    let rawData = [];
    
    if (Array.isArray(response)) {
      rawData = response;
      console.log('✅ Cas 1: Tableau direct,', rawData.length, 'éléments');
    } else if (response && response.data && Array.isArray(response.data)) {
      rawData = response.data;
      console.log('✅ Cas 2: response.data,', rawData.length, 'éléments');
    } else if (response && response.items && Array.isArray(response.items)) {
      rawData = response.items;
      console.log('✅ Cas 3: response.items,', rawData.length, 'éléments');
    } else if (response && response.reportages && Array.isArray(response.reportages)) {
      rawData = response.reportages;
      console.log('✅ Cas 4: response.reportages,', rawData.length, 'éléments');
    } else if (response && response.results && Array.isArray(response.results)) {
      rawData = response.results;
      console.log('✅ Cas 5: response.results,', rawData.length, 'éléments');
    } else if (response && typeof response === 'object') {
      // Essayer de collecter toutes les propriétés qui semblent être des articles
      const possibleItems = [];
      for (const key in response) {
        if (response[key] && typeof response[key] === 'object' && response[key].title) {
          possibleItems.push(response[key]);
        }
      }
      if (possibleItems.length > 0) {
        rawData = possibleItems;
        console.log('✅ Cas 6: Objet avec propriétés,', rawData.length, 'éléments');
      }
    }
    
    console.log('📊 Données brutes après extraction:', rawData.length, 'éléments');
    
    // Si toujours vide, essayer getNews() comme fallback
    if (rawData.length === 0) {
      console.log('🔄 Tentative avec getNews()...');
      const newsData = await api.getNews();
      if (Array.isArray(newsData)) {
        rawData = newsData.filter(item => 
          (item.category === 'Reportage' || 
           item.category === 'reportage' ||
           item.edition === 'Reportage' || 
           item.type === 'reportage' ||
           (item.tags && item.tags.includes('reportage')))
        );
        console.log('✅ Données reportages filtrées depuis news:', rawData.length);
      }
    }
    
    // Mapper toutes les données
    reportageData = rawData.map((item, index) => ({
      ...item,
      _id: item._id || item.id || index,
      title: item.title || item.name || 'Sans titre',
      description: item.description || item.content || item.excerpt || '',
      image: getImageUrl(item.image_url || item.image || item.thumbnail || item.poster),
      category: item.category || item.type || item.edition || 'Reportage',
      subcategory: item.subcategory || item.theme || item.topic || '',
      author: item.author || item.created_by || 'Équipe Reportage',
      views: item.views || item.view_count || 0,
      likes: item.likes || item.like_count || 0,
      date: item.created_at || item.published_at || item.date || new Date(),
      duration: item.duration || item.length || '',
      location: item.location || item.place || '',
      tags: item.tags || [],
      urgent: item.urgent || false
    }));
    
    console.log(`✅ ${reportageData.length} reportages mappés`);
    
    // Afficher les titres pour vérification
    if (reportageData.length > 0) {
      console.log('📝 Liste des reportages:');
      reportageData.slice(0, 10).forEach((item, i) => {
        console.log(`   ${i+1}. ${item.title}`);
      });
    } else {
      console.warn('⚠️ Aucun reportage trouvé!');
    }

    // Construire les filtres dynamiquement
    if (filterContainer) {
      renderFiltersFromData(filterContainer);
    }
    
    currentPage = 1;
    renderReportageList(container);

  } catch (error) {
    console.error('❌ Erreur détaillée chargement reportage:', error);
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-camera-fill" style="font-size:3rem;color:#666;"></i>
        <p class="mt-3 text-secondary">Erreur: ${error.message || 'Impossible de charger les reportages'}</p>
        <button class="btn btn-outline-danger btn-sm mt-2" onclick="window.loadReportageContent()">
          <i class="bi bi-arrow-clockwise"></i> Réessayer
        </button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-bf1tv.onrender.com${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
}

function renderFiltersFromData(container) {
  // Extraire les thèmes et sous-catégories uniques des données
  const filtersSet = new Set(['Tous']);
  
  reportageData.forEach(item => {
    // Ajouter la sous-catégorie/thème
    if (item.subcategory && item.subcategory !== '') {
      filtersSet.add(item.subcategory);
    }
    // Ajouter les tags
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => {
        if (tag && tag !== 'Reportage') {
          filtersSet.add(tag);
        }
      });
    }
  });
  
  // Si pas assez de filtres, utiliser les filtres par défaut
  let filters = Array.from(filtersSet);
  if (filters.length <= 1) {
    filters = ['Tous', 'Société', 'Économie', 'Environnement', 'Santé', 'Éducation', 'Culture'];
  }
  
  console.log('📋 Filtres disponibles:', filters);
  
  container.innerHTML = '';
  
  filters.forEach(filter => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-pill';
    if (filter === currentFilter) {
      btn.classList.add('active');
    }
    btn.innerHTML = `<i class="bi bi-camera-fill"></i>${filter}`;
    
    btn.addEventListener('click', () => {
      currentFilter = filter;
      currentPage = 1;
      container.querySelectorAll('.filter-pill').forEach(b => {
        if (b.textContent.includes(filter)) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      const mainContainer = document.getElementById('reportageArticles');
      if (mainContainer) renderReportageList(mainContainer);
    });

    container.appendChild(btn);
  });
}

function renderReportageList(container) {
  let filtered = reportageData;
  
  // Filtrer par thème ou catégorie
  if (currentFilter !== 'Tous') {
    filtered = filtered.filter(item => {
      const subcat = (item.subcategory || '').toLowerCase();
      const tags = (item.tags || []).map(t => t.toLowerCase());
      const filterLower = currentFilter.toLowerCase();
      
      return subcat === filterLower || 
             subcat.includes(filterLower) ||
             tags.includes(filterLower);
    });
    console.log(`🎯 Après filtre "${currentFilter}": ${filtered.length} éléments`);
  }

  // Trier par date (plus récent en premier)
  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateB - dateA;
  });

  // Calculer la pagination
  totalPages = Math.ceil(sorted.length / itemsPerPage);
  if (totalPages === 0) totalPages = 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = sorted.slice(startIndex, endIndex);

  if (pageItems.length > 0) {
    const articlesHTML = pageItems.map((item, index) => buildReportageCard(item, startIndex + index)).join('');
    const paginationHTML = renderPagination(sorted.length);
    
    container.innerHTML = `
      <div class="reportage-grid">
        ${articlesHTML}
      </div>
      ${paginationHTML}
      <div class="reportage-stats">
        <i class="bi bi-camera-fill"></i> ${sorted.length} reportage${sorted.length > 1 ? 's' : ''} au total
      </div>
    `;
    
    updateTrendsSection(sorted);
  } else {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-camera-fill" style="font-size:3rem;color:#666;"></i>
        <p class="mt-3 text-secondary">Aucun reportage disponible</p>
        <p class="text-secondary small">${reportageData.length} éléments au total</p>
      </div>
    `;
  }
}

function buildReportageCard(item, index) {
  const imageUrl = item.image || '';
  const category = item.category || 'Reportage';
  const title = item.title || 'Sans titre';
  const description = (item.description || '').substring(0, 120);
  const author = item.author || 'Équipe Reportage';
  const time = formatTime(item.date);
  const views = item.views || 0;
  const likes = item.likes || 0;
  const location = item.location || '';
  const duration = item.duration || '';

  return `
    <div class="reportage-card anim-up d${(index % 9) + 1}" 
         onclick="window.location.href='detail-contenu.html?id=${item._id}&type=reportage'">
      <div class="reportage-card-image">
        <img src="${imageUrl || '/logo.png'}" 
             alt="${escapeHtml(title)}" 
             onerror="this.src='/logo.png'"/>
        ${duration ? '<span class="duration-badge">🎬 ' + duration + '</span>' : ''}
        <div class="reportage-card-overlay">
          <div class="card-play"><i class="bi bi-play-fill"></i></div>
        </div>
      </div>
      <div class="reportage-card-content">
        <div class="reportage-card-category">
          <i class="bi bi-camera-fill"></i> ${escapeHtml(category)}
        </div>
        <h3 class="reportage-card-title">${escapeHtml(title)}</h3>
        <p class="reportage-card-description">${escapeHtml(description)}${description.length >= 120 ? '...' : ''}</p>
        <div class="reportage-card-meta">
          <span><i class="bi bi-person-fill"></i> ${escapeHtml(author)}</span>
          <span><i class="bi bi-clock-fill"></i> ${time}</span>
          ${location ? `<span><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(location)}</span>` : ''}
          <span><i class="bi bi-heart-fill"></i> ${formatNumber(likes)}</span>
          <span><i class="bi bi-eye-fill"></i> ${formatNumber(views)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderPagination(totalItems) {
  if (totalPages <= 1) return '';
  
  let paginationHTML = '<div class="pagination-container">';
  
  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  paginationHTML += `
    <button class="pagination-btn ${prevDisabled}" onclick="window.changeReportagePage(${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i> Précédent
    </button>
  `;
  
  paginationHTML += '<div class="pagination-numbers">';
  
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  
  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  }
  if (currentPage >= totalPages - 2) {
    startPage = Math.max(1, totalPages - 4);
  }
  
  if (startPage > 1) {
    paginationHTML += `<button class="pagination-number" onclick="window.changeReportagePage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === currentPage ? 'active' : '';
    paginationHTML += `<button class="pagination-number ${activeClass}" onclick="window.changeReportagePage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
    paginationHTML += `<button class="pagination-number" onclick="window.changeReportagePage(${totalPages})">${totalPages}</button>`;
  }
  
  paginationHTML += '</div>';
  
  const nextDisabled = currentPage === totalPages ? 'disabled' : '';
  paginationHTML += `
    <button class="pagination-btn ${nextDisabled}" onclick="window.changeReportagePage(${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>
      Suivant <i class="bi bi-chevron-right"></i>
    </button>
  `;
  
  paginationHTML += '</div>';
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  paginationHTML += `
    <div class="pagination-info">
      Affichage de ${startItem} à ${endItem} sur ${totalItems} reportages
    </div>
  `;
  
  return paginationHTML;
}

function updateTrendsSection(allData) {
  const trendsContainer = document.querySelector('.flash-layout > div:last-child div[style*="flex-direction"]');
  
  if (!trendsContainer) {
    console.log('⚠️ Conteneur des tendances non trouvé');
    return;
  }
  
  const trends = [...allData]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  if (trends.length > 0) {
    trendsContainer.innerHTML = trends.map((item, idx) => {
      const img = item.image_url || item.image || item.thumbnail || '';
      const title = item.title || 'Sans titre';
      const views = item.views || 0;
      const duration = item.duration || '';
      
      return `
        <div class="news-item" style="padding:10px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid var(--border);cursor:pointer;transition:all var(--transition)"
             onclick="window.location.href='detail-contenu.html?id=${item._id}&type=reportage'">
          <img class="news-thumb" src="${img || 'https://images.unsplash.com/photo-1523551335684-37898b6baf30?w=120&q=60'}" 
               alt="${escapeHtml(title)}" 
               style="width:70px;height:50px;border-radius:var(--radius-sm);object-fit:cover"
               onerror="this.src='https://images.unsplash.com/photo-1523551335684-37898b6baf30?w=120&q=60'"/>
          <div>
            <span class="news-cat" style="font-size:0.6rem;padding:2px 6px">
              <i class="bi bi-eye-fill"></i> ${formatNumber(views)} vues
              ${duration ? `<span class="ms-2"><i class="bi bi-clock"></i> ${duration}</span>` : ''}
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

window.changeReportagePage = function(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  const mainContainer = document.getElementById('reportageArticles');
  if (mainContainer) renderReportageList(mainContainer);
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
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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

window.loadReportageContent = loadReportageContent;