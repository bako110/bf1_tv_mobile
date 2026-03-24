// Fonction pour détecter si on est dans Capacitor (app mobile)
function isCapacitor() {
  return window.Capacitor !== undefined;
}

// Fonction pour détecter si on est sur un appareil mobile (navigateur)
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Fonction de redirection
function redirect() {
  if (isCapacitor()) {
    window.location.href = '/mobile/index.html';
  } else if (isMobileDevice()) {
    window.location.href = '/mobile/index.html';
  } else {
    window.location.href = '/web/index.html';
  }
}

// Exécution immédiate
if (window.Capacitor) {
  redirect();
} else {
  setTimeout(redirect, 50);
}