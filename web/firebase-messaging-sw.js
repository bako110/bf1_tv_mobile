// firebase-messaging-sw.js — Service Worker pour les notifications push Firebase
// Ce fichier doit rester a la racine du dossier web/

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAXJuWKbT23hhhN039WDzPEyftqlhD0NaE',
  authDomain:        'bf1-tv-afb6a.firebaseapp.com',
  projectId:         'bf1-tv-afb6a',
  storageBucket:     'bf1-tv-afb6a.firebasestorage.app',
  messagingSenderId: '1013224901260',
  appId:             '1:1013224901260:web:4bb0c7792012b328e8c9a9',
});

const messaging = firebase.messaging();

// Notification recue quand l'onglet est ferme ou en arriere-plan
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || 'BF1 TV', {
    body:    body || '',
    icon:    icon || '/logo.png',
    badge:   '/logo.png',
    data:    data,
    silent:  false,   // Jouer le son systeme du navigateur
    vibrate: [200, 100, 200],  // Vibration sur mobile
    actions: [
      { action: 'open',    title: 'Voir' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  });
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
