// Gestionnaire de deep links pour BF1 TV
// Gère les liens bf1tv://show/sport/123, bf1tv://news/456, etc.

export function initDeepLinkHandler() {
  // Écouter les événements de deep link (Capacitor App Plugin)
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('appUrlOpen', (event) => {
      handleDeepLink(event.url);
    });
  }

  // Vérifier si l'app a été ouverte avec un deep link au démarrage
  checkInitialDeepLink();
}

function checkInitialDeepLink() {
  // Vérifier si l'URL de démarrage contient un deep link
  const url = window.location.href;
  if (url.includes('bf1tv://')) {
    const deepLinkUrl = url.split('bf1tv://')[1];
    if (deepLinkUrl) {
      handleDeepLink('bf1tv://' + deepLinkUrl);
    }
  }
}

export function handleDeepLink(url) {
  console.log('Deep link reçu:', url);
  
  if (!url || !url.startsWith('bf1tv://')) {
    console.warn('URL de deep link invalide:', url);
    return;
  }

  // Extraire le chemin du deep link
  // Exemple: bf1tv://show/sport/123 -> show/sport/123
  const path = url.replace('bf1tv://', '');
  
  // Convertir en hash route
  // show/sport/123 -> #/show/sport/123
  const hashRoute = '#/' + path;
  
  console.log('Navigation vers:', hashRoute);
  
  // Naviguer vers la route
  window.location.hash = hashRoute;
}
