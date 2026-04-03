// js/firebase-push.js — Notifications push Firebase (web)
import { initializeApp }                      from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getMessaging, getToken, onMessage }  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js';

// ─── Config Firebase ──────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAXJuWKbT23hhhN039WDzPEyftqlhD0NaE',
  authDomain:        'bf1-tv-afb6a.firebaseapp.com',
  projectId:         'bf1-tv-afb6a',
  storageBucket:     'bf1-tv-afb6a.firebasestorage.app',
  messagingSenderId: '1013224901260',
  appId:             '1:1013224901260:web:4bb0c7792012b328e8c9a9',
};

// Cle VAPID — a recuperer dans :
// Firebase Console > ton projet > Paramètres > Cloud Messaging > Web Push certificates > Generer
// Remplace la valeur ci-dessous par ta vraie cle VAPID
const VAPID_KEY = 'BCNl1NKvq90TLk23TtpglMv0zW2YdhLUjofkTk8SWy5b1EQWv8yeXTMT4HNDcnY6f5U2FSOub4cAM31iO0JQCx0';

// ─── Init ─────────────────────────────────────────────────────────────────────
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const messaging   = getMessaging(firebaseApp);

// ─── Demande permission + enregistrement token ────────────────────────────────
export async function requestPushPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[Push] Non supporte par ce navigateur.');
    return null;
  }
  if (Notification.permission === 'denied') {
    console.warn('[Push] Permission refusee par l\'utilisateur.');
    return null;
  }

  try {
    // Enregistrer le service worker
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Permission non accordee.');
      return null;
    }

    // Obtenir le token FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      await _saveFcmToken(token);
      return token;
    }
    console.warn('[Push] Aucun token obtenu — verifier la cle VAPID.');
    return null;

  } catch (err) {
    console.error('[Push] Erreur:', err);
    return null;
  }
}

// ─── Son d'alerte ─────────────────────────────────────────────────────────────
function playAlertSound() {
  try {
    // Remplace /assets/sounds/alert.mp3 par ton fichier audio
    const audio = new Audio('/alert.mpeg');
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Le navigateur bloque autoplay sans interaction utilisateur — normal
    });
  } catch (e) {}
}

// ─── Ecoute des notifications en premier plan (onglet actif) ──────────────────
export function listenForegroundMessages() {
  onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {};

    // Jouer le son d'alerte
    playAlertSound();

    // Notification native
    if (Notification.permission === 'granted') {
      new Notification(title || 'BF1 TV', {
        body: body || '',
        icon: '/logo.png',
      });
    }

    // Toast dans l'UI si disponible
    if (typeof window.showToast === 'function') {
      window.showToast(`${title || 'BF1 TV'} — ${body || ''}`, 'info');
    }
  });
}

// ─── Envoi du token au backend ────────────────────────────────────────────────
async function _saveFcmToken(token) {
  const authToken = localStorage.getItem('bf1_token');
  console.log('[Push] Token FCM obtenu:', token);
  if (!authToken) return;

  try {
    const res = await fetch(`https://bf1.fly.dev/api/v1/users/fcm-token`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcm_token: token, platform: 'web' }),
    });
    if (res.ok) {
      console.log('[Push] Token FCM enregistre cote backend.');
    } else {
      console.warn('[Push] Erreur backend:', res.status);
    }
  } catch (err) {
    console.error('[Push] Impossible d\'envoyer le token:', err);
  }
}

// ─── Auto-init (uniquement si l'utilisateur est connecte) ────────────────────
(function autoInit() {
  if (!localStorage.getItem('bf1_token')) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      requestPushPermission();
      listenForegroundMessages();
    });
  } else {
    requestPushPermission();
    listenForegroundMessages();
  }
})();
