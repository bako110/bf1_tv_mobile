// profil.js
import * as api from '../../shared/services/api.js';
import { showConfirmModal, showToast } from './ui-helpers.js';

// État de l'utilisateur
let currentUser = null;

// Éléments DOM
const profileNameEl = document.querySelector('.profile-name');
const profileEmailEl = document.querySelector('.profile-email');
const profileAvatarEl = document.querySelector('.profile-avatar');
const planTypeEl = document.querySelector('.plan-type');
const planDescEl = document.querySelector('.plan-desc');
const planFeatures = document.querySelectorAll('.plan-feature');
const upgradeBtn = document.querySelector('.btn-red');
const statsNumbers = document.querySelectorAll('.profile-stat-num');
const logoutBtn = document.querySelector('.profile-menu-item.danger');

// Éléments de menu
const favoritesBtn = document.getElementById('favoritesBtn');
const notificationsBtn = document.querySelector('.profile-menu-item:nth-child(2)');
const supportBtn = document.querySelector('.profile-menu-item:nth-child(3)');
const aboutBtn = document.querySelector('.profile-menu-item:nth-child(4)');
const termsBtn = document.querySelector('.profile-menu-item:nth-child(5)');

// ===== FONCTIONS UTILITAIRES =====

// Récupérer les initiales du nom
function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Générer une couleur aléatoire basée sur le nom
function getAvatarColor(name) {
  if (!name) return '#e50914';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

// Mettre à jour l'avatar
function updateAvatar(user) {
  if (!profileAvatarEl) return;
  
  const username = user?.username || user?.email || 'Utilisateur';
  const initials = getInitials(username);
  const color = getAvatarColor(username);
  
  profileAvatarEl.innerHTML = `
    <div style="
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      font-weight: bold;
      color: white;
    ">${initials}</div>
  `;
}

// Mettre à jour les informations du profil
function updateProfileInfo(user) {
  if (!user) return;
  
  // Mettre à jour le nom et email
  if (profileNameEl) {
    profileNameEl.textContent = user.username || user.email?.split('@')[0] || 'Utilisateur';
  }
  if (profileEmailEl) {
    profileEmailEl.textContent = user.email || 'email@exemple.com';
  }
  
  // Mettre à jour l'avatar
  updateAvatar(user);
  
  // Mettre à jour les informations d'abonnement
  updateSubscriptionInfo(user);
}

// Mettre à jour les informations d'abonnement
function updateSubscriptionInfo(user) {
  const subscription = user.subscription || user.plan;
  const isPremium = user.is_premium === true
    || subscription?.type === 'premium'
    || subscription?.plan === 'premium'
    || subscription?.category === 'premium';
  
  if (planTypeEl) {
    planTypeEl.innerHTML = isPremium 
      ? '<i class="bi bi-crown-fill" style="color:#f5a623"></i> Premium'
      : '<i class="bi bi-gift-fill"></i> Gratuit';
  }
  
  if (planDescEl) {
    planDescEl.textContent = isPremium
      ? 'Vous bénéficiez de notre offre premium avec tous les avantages.'
      : 'Vous utilisez actuellement notre offre gratuite. Passez à Premium pour plus de contenu !';
  }
  
  // Mettre à jour les fonctionnalités du plan
  if (planFeatures && planFeatures.length >= 3) {
    // Feature 1: Contenu gratuit
    planFeatures[0].innerHTML = `<i class="bi bi-check-lg yes"></i>Contenu gratuit illimité`;
    planFeatures[0].style.color = 'var(--text-2)';
    
    if (isPremium) {
      planFeatures[1].innerHTML = `<i class="bi bi-check-lg yes"></i>Accès au contenu premium`;
      planFeatures[2].innerHTML = `<i class="bi bi-check-lg yes"></i>Qualité HD/4K`;
      planFeatures[1].style.color = 'var(--text-2)';
      planFeatures[2].style.color = 'var(--text-2)';
      
      if (upgradeBtn) {
        upgradeBtn.style.display = 'none';
      }
    } else {
      planFeatures[1].innerHTML = `<i class="bi bi-x-lg no"></i>Accès au contenu premium`;
      planFeatures[2].innerHTML = `<i class="bi bi-x-lg no"></i>Qualité HD/4K`;
      planFeatures[1].style.color = 'var(--text-3)';
      planFeatures[2].style.color = 'var(--text-3)';
      
      if (upgradeBtn) {
        upgradeBtn.style.display = 'flex';
      }
    }
  }
}

// Charger les statistiques utilisateur
async function loadUserStats() {
  try {
    // Charger les favoris
    const favorites = await api.getMyFavorites();
    const favoritesCount = favorites?.length || 0;
    
    // Charger les commentaires (via l'API si disponible)
    let commentsCount = 0;
    try {
      const comments = await api.getComments('user', currentUser?.id);
      commentsCount = comments?.length || 0;
    } catch (err) {
      console.warn('Impossible de charger les commentaires:', err);
    }
    
    // Charger les likes (via l'API si disponible)
    let likesCount = 0;
    try {
      const likes = await api.getMyLikes('all');
      likesCount = likes?.length || 0;
    } catch (err) {
      console.warn('Impossible de charger les likes:', err);
    }
    
    // Mettre à jour l'affichage
    if (statsNumbers && statsNumbers.length >= 3) {
      statsNumbers[0].textContent = favoritesCount;
      statsNumbers[1].textContent = commentsCount;
      statsNumbers[2].textContent = likesCount;
    }
    
    return { favoritesCount, commentsCount, likesCount };
  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error);
    return { favoritesCount: 0, commentsCount: 0, likesCount: 0 };
  }
}

// Gérer la déconnexion
async function handleLogout() {
  const ok = await showConfirmModal({
    message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
    title: 'Déconnexion',
    confirmText: 'Se déconnecter',
    cancelText: 'Annuler',
    variant: 'danger',
  });
  if (ok) {
    api.logout();
    window.location.href = 'accueil.html';
  }
}

// Gérer l'upgrade vers premium
async function handleUpgrade() {
  try {
    // Récupérer les plans d'abonnement
    const plans = await api.getSubscriptionPlans();
    const premiumPlan = plans.find(p => p.type === 'premium' || p.name?.toLowerCase().includes('premium'));
    
    if (premiumPlan) {
      // Rediriger vers la page d'abonnement
      window.location.href = `abonnement.html?plan=${premiumPlan.id}`;
    } else {
      // Fallback vers une page générique
      window.location.href = 'abonnement.html';
    }
  } catch (error) {
    console.error('Erreur lors du chargement des plans:', error);
    window.location.href = 'abonnement.html';
  }
}

// Rediriger vers les favoris
function goToFavorites() {
  window.location.href = 'favoris.html';
}

// Rediriger vers les notifications
function goToNotifications() {
  window.location.href = 'notifications.html';
}

// Rediriger vers l'aide
function goToSupport() {
  window.location.href = 'aide.html';
}

// Rediriger vers à propos
function goToAbout() {
  window.location.href = 'a-propos.html';
}

// Rediriger vers les conditions
function goToTerms() {
  window.location.href = 'conditions.html';
}

// Vérifier si l'utilisateur est connecté
function checkAuth() {
  if (!api.isAuthenticated()) {
    // Rediriger vers la page de connexion
    window.location.href = 'connexion.html';
    return false;
  }
  return true;
}

// Charger les données utilisateur
async function loadUserData() {
  try {
    // Vérifier l'authentification
    if (!checkAuth()) return;
    
    // Toujours rafraîchir depuis l'API pour avoir les données à jour (is_premium, abonnement)
    try {
      const fresh = await api.refreshUser();
      if (fresh) currentUser = fresh;
    } catch (err) {
      console.warn('Rafraîchissement API échoué, utilisation du cache:', err);
    }

    // Fallback sur le cache local
    if (!currentUser) currentUser = api.getUser();
    
    // Si toujours pas d'utilisateur, rediriger
    if (!currentUser) {
      window.location.href = 'connexion.html';
      return;
    }
    
    // Mettre à jour l'interface
    updateProfileInfo(currentUser);
    
    // Charger les statistiques
    await loadUserStats();
    
  } catch (error) {
    console.error('Erreur lors du chargement des données utilisateur:', error);
    window.location.href = 'connexion.html';
  }
}

// Rafraîchir les données utilisateur
async function refreshUserData() {
  try {
    const userData = await api.refreshUser();
    if (userData) {
      currentUser = userData;
      updateProfileInfo(currentUser);
      await loadUserStats();
    }
  } catch (error) {
    console.error('Erreur lors du rafraîchissement des données:', error);
  }
}

// Initialisation
async function init() {
  console.log('🚀 Initialisation de la page profil...');
  
  // Charger les données utilisateur
  await loadUserData();
  
  // Hook global — appelé par abonnement.js après un abonnement réussi
  window._reloadProfile = async function() {
    console.log('🔄 Rechargement du profil après abonnement...');
    await loadUserData();
  };
  
  // Ajouter les écouteurs d'événements
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  if (favoritesBtn) {
    favoritesBtn.addEventListener('click', goToFavorites);
  }
  
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', handleUpgrade);
  }
  
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', goToNotifications);
  }
  
  if (supportBtn) {
    supportBtn.addEventListener('click', goToSupport);
  }
  
  if (aboutBtn) {
    aboutBtn.addEventListener('click', goToAbout);
  }
  
  if (termsBtn) {
    termsBtn.addEventListener('click', goToTerms);
  }
}

// Exporter les fonctions pour utilisation externe
export {
  loadUserData,
  refreshUserData,
  handleLogout,
  handleUpgrade,
  goToFavorites,
  getInitials,
  updateAvatar
};

// Démarrer l'application
document.addEventListener('DOMContentLoaded', init);