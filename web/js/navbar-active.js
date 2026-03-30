/**
 * Marquer l'onglet actif du navbar selon la page actuelle
 */
function markActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'accueil.html';
  const navLinks = document.querySelectorAll('.navbar-links .nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Initialiser le menu hamburger mobile
 */
function initMobileMenu() {
  const hamburger = document.querySelector('.navbar-hamburger');
  const navLinks   = document.querySelector('.navbar-links');
  const backdrop   = document.querySelector('.navbar-menu-backdrop');

  if (!hamburger || !navLinks) return;

  const freshBtn   = hamburger.cloneNode(true);
  hamburger.parentNode.replaceChild(freshBtn, hamburger);
  const freshLinks = navLinks.cloneNode(true);
  navLinks.parentNode.replaceChild(freshLinks, navLinks);

  const btn   = document.querySelector('.navbar-hamburger');
  const links = document.querySelector('.navbar-links');
  const bd    = document.querySelector('.navbar-menu-backdrop');

  function closeMenu() {
    btn.classList.remove('open');
    links.classList.remove('open');
    if (bd) bd.classList.remove('open');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const opening = !links.classList.contains('open');
    this.classList.toggle('open');
    links.classList.toggle('open');
    if (bd) bd.classList.toggle('open');
    document.body.style.overflow = opening ? 'hidden' : '';
  });

  if (bd) bd.addEventListener('click', closeMenu);

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

function initMobileSearch() {
  const mobileBtn = document.querySelector('.search-mobile-btn');
  const searchBar = document.querySelector('.navbar-search');
  const closeBtn  = document.querySelector('.search-close-btn');
  const input     = document.querySelector('.navbar-search .search-input');

  if (!mobileBtn || !searchBar) return;

  function openSearch() {
    searchBar.classList.add('open');
    if (input) setTimeout(() => input.focus(), 50);
  }
  function closeSearch() {
    searchBar.classList.remove('open');
  }

  mobileBtn.addEventListener('click', openSearch);
  if (closeBtn) closeBtn.addEventListener('click', closeSearch);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });
  document.addEventListener('click', (e) => {
    if (searchBar.classList.contains('open') &&
        !searchBar.contains(e.target) &&
        !mobileBtn.contains(e.target)) {
      closeSearch();
    }
  });

  // Sur search.html sur mobile : ouvrir directement
  if (window.innerWidth <= 768 && window.location.pathname.includes('search.html')) {
    openSearch();
  }
}

// Observer le changement du header et marquer l'onglet actif + init menu
function initHeaderObserver() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  
  if (!headerPlaceholder) return;

  let menuReady = false;

  // Observer les changements dans le header-placeholder
  const observer = new MutationObserver(() => {
    markActiveNavLink();
    if (!menuReady && document.querySelector('.navbar-hamburger') && document.querySelector('.navbar-links')) {
      observer.disconnect(); // Arrêter l'observation AVANT de modifier le DOM
      menuReady = true;
      initMobileMenu();
      initMobileSearch();
    }
  });
  
  observer.observe(headerPlaceholder, {
    childList: true,
    subtree: true
  });
  
  // Première exécution
  markActiveNavLink();
}

// Exécuter quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeaderObserver);
} else {
  initHeaderObserver();
}

