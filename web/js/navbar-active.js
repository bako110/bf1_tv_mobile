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

// Observer le changement du header et marquer l'onglet actif
function initHeaderObserver() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  
  if (!headerPlaceholder) return;
  
  // Observer les changements dans le header-placeholder
  const observer = new MutationObserver(() => {
    markActiveNavLink();
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

