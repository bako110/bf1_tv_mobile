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

  if (!hamburger || !navLinks) return; // Éléments absents, rien à faire

  // Éviter les doublons d'écouteurs : cloner le bouton
  const freshBtn   = hamburger.cloneNode(true);
  hamburger.parentNode.replaceChild(freshBtn, hamburger);
  const freshLinks = navLinks.cloneNode(true);
  navLinks.parentNode.replaceChild(freshLinks, navLinks);

  const btn   = document.querySelector('.navbar-hamburger');
  const links = document.querySelector('.navbar-links');

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.toggle('open');
    links.classList.toggle('open');
    document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
  });

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('open');
      links.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !links.contains(e.target)) {
      btn.classList.remove('open');
      links.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
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

