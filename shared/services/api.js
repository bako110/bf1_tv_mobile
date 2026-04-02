import { http } from './http.js';
// v2
export async function login(identifier, password) {
  const res = await http.post('/users/login', { identifier, password });
  if (res.access_token) {
    http.setToken(res.access_token);
    try {
      localStorage.setItem('bf1_token', res.access_token);
      localStorage.setItem('bf1_user', JSON.stringify(res.user));
    } catch (err) {
      console.warn('⚠️ Impossible de sauvegarder le token (tracking prevention):', err.message);
    }
  }
  return res;
}

export async function register(username, email, password) {
  const res = await http.post('/users/register', { username, email, password });
  if (res.access_token) {
    http.setToken(res.access_token);
    try {
      localStorage.setItem('bf1_token', res.access_token);
      localStorage.setItem('bf1_user', JSON.stringify(res.user));
    } catch (err) {
      console.warn('⚠️ Impossible de sauvegarder l\u0027inscription (tracking prevention):', err.message);
    }
  }
  return res;
}

export function logout() {
  http.setToken(null);
  try {
    localStorage.removeItem('bf1_token');
    localStorage.removeItem('bf1_user');
  } catch (err) {
    console.warn('⚠️ Impossible de supprimer les données (tracking prevention):', err.message);
  }
}

export async function forgotPassword(email) {
  return await http.post('/users/forgot-password', { email });
}

/**
 * Retourne l'URL du proxy HLS.
 * Le vrai lien du flux n'est jamais transmis au frontend — le backend fait le relais.
 * Aucun JWT requis : l'URL réelle reste côté serveur uniquement.
 */
export function getLiveStreamUrl() {
  // Retourner directement l'URL de production pour éviter les problèmes de chargement de config
  return 'https://bf1.fly.dev/api/v1/livestream/stream-proxy';
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('bf1_user') || 'null');
  } catch {
    return null;
  }
}

// Mettre à jour le cache utilisateur après un changement (ex: nouveau subscription_category)
export function setUser(userData) {
  try {
    localStorage.setItem('bf1_user', JSON.stringify(userData));
  } catch (err) {
    console.warn('⚠️ Impossible de mettre à jour l\'utilisateur en cache:', err.message);
  }
}

// Rafraîchir les données utilisateur depuis le serveur (appel après abonnement)
export async function refreshUser() {
  try {
    const userData = await http.get('/users/me');
    if (userData) {
      setUser(userData);
      return userData;
    }
  } catch (err) {
    console.warn('⚠️ Impossible de rafraîchir l\'utilisateur:', err.message);
  }
  return getUser();
}

export function isAuthenticated() {
  return Boolean(http.getToken());
}

// SERVICES DE CONTENU
export async function getNews() {
  return http.get('/news') || [];
}

export async function getCarousel() {
  return http.get('/carousel') || [];
}

export async function getCategories() {
  return http.get('/categories') || [];
}

export async function getEmissions() {
  const categories = await http.get('/emission-categories');
  return (categories || [])
    .filter(item => item.is_active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getMovies() {
  return http.get('/movies') || [];
}

export async function getSeries() {
  return http.get('/series') || [];
}

export async function getPrograms() {
  return http.get('/programs') || [];
}

export async function getProgramById(programId) {
  return http.get(`/programs/${programId}`);
}

// Récupérer la grille des programmes de la semaine (groupés par jour)
export async function getProgramWeek(weeksAhead = 0, type = null) {
  const params = new URLSearchParams();
  params.append('weeks_ahead', weeksAhead);
  if (type) params.append('type', type);
  
  return http.get(`/programs/grid/weekly?${params.toString()}`).catch(() => ({ days: [] }));
}

// Récupérer la grille des programmes par plage de dates
export async function getProgramGrid(startDate = null, endDate = null, type = null) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (type) params.append('type', type);
  
  return http.get(`/programs/grid/daily?${params.toString()}`).catch(() => ({ days: [] }));
}

// Créer un rappel pour un programme
export async function createReminder(programId, { minutes_before = 15, reminder_type = 'push' } = {}) {
  return http.post(`/programs/${programId}/reminders`, { program_id: programId, minutes_before, reminder_type });
}

export async function getMyReminders(status = null, upcomingOnly = false) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (upcomingOnly) params.set('upcoming_only', 'true');
  const qs = params.toString();
  return http.get(`/programs/reminders/my${qs ? `?${qs}` : ''}`);
}

export async function getSports() {
  // L'API retourne { sports: [...], total, page, ... }
  const res = await http.get('/sports');
  return (res && res.sports) ? res.sports : (Array.isArray(res) ? res : []);
}

export async function getDivertissement() {
  return http.get('/divertissement') || [];
}

export async function getReportages() {
  // Route singulier: /reportage
  return http.get('/reportage') || [];
}

export async function getArchive() {
  // Route pluriel: /archives
  return http.get('/archives') || [];
}

export async function checkArchiveAccess(id) {
  return http.get(`/archives/${id}/check-access`);
}

export async function getJTandMag() {
  return http.get('/jtandmag') || [];
}

// ===== DÉTAILS PAR ID =====
export async function getNewsById(id) {
  return http.get(`/news/${id}`);
}

export async function getShowById(id, type) {
  switch (type) {
    case 'sport':         return http.get(`/sports/${id}`);
    case 'jtandmag':      return http.get(`/jtandmag/${id}`);
    case 'divertissement':return http.get(`/divertissement/${id}`);
    case 'reportage':     return http.get(`/reportage/${id}`);
    case 'archive':       return http.get(`/archives/${id}`);
    case 'movie':         return http.get(`/movies/${id}`);
    case 'show':          return http.get(`/shows/${id}`);
    case 'series':        return http.get(`/tv/${id}`);
    case 'reel':          return http.get(`/reels/${id}`);
    case 'breaking_news':     return http.get(`/news/${id}`);
    case 'emission_category':  return http.get(`/emission-categories/${id}`);
    case 'popular_program':    return http.get(`/shows/${id}`);
    case 'program':            return http.get(`/shows/${id}`);
    default:                   return http.get(`/shows/${id}`);
  }
}

export async function getMovieById(id) {
  return http.get(`/movies/${id}`);
}

export async function getSeriesById(id) {
  return http.get(`/series/${id}`);
}

export async function getSeriesSeasons(seriesId) {
  const r = await http.get(`/series/${seriesId}/seasons`).catch(() => null);
  return r?.seasons || (Array.isArray(r) ? r : []);
}

export async function getSeriesEpisodes(seriesId) {
  const r = await http.get(`/series/${seriesId}/episodes`).catch(() => null);
  return r?.episodes || (Array.isArray(r) ? r : []);
}

export async function getSeasonEpisodes(seasonId) {
  return http.get(`/seasons/${seasonId}/episodes`).catch(() => []);
}

export async function getShowsByCategory(category) {
  const name = (category || '').toLowerCase();
  let items, contentType;
  if (name.includes('sport')) {
    const r = await http.get('/sports').catch(() => ({}));
    items = r?.sports || (Array.isArray(r) ? r : []);
    contentType = 'sport';
  } else if (name.includes('jt') || name.includes('mag')) {
    items = await http.get('/jtandmag').catch(() => []);
    contentType = 'jtandmag';
  } else if (name.includes('divertissement')) {
    items = await http.get('/divertissement').catch(() => []);
    contentType = 'divertissement';
  } else if (name.includes('reportage')) {
    items = await http.get('/reportage').catch(() => []);
    contentType = 'reportage';
  } else {
    items = [];
    contentType = 'show';
  }
  return (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    id: item._id || item.id,
    _contentType: contentType
  }));
}

export async function getRelatedByType(type, excludeId) {
  let items = [];
  switch (type) {
    case 'news':          items = await http.get('/news') || []; break;
    case 'sport':         const r = await http.get('/sports'); items = r?.sports || (Array.isArray(r) ? r : []); break;
    case 'jtandmag':      items = await http.get('/jtandmag') || []; break;
    case 'divertissement':items = await http.get('/divertissement') || []; break;
    case 'reportage':     items = await http.get('/reportage') || []; break;
    case 'archive':       items = await http.get('/archives') || []; break;
    case 'movie':         const mv = await http.get('/movies'); items = Array.isArray(mv) ? mv : (mv?.items || mv?.movies || []); break;
    default:              items = await http.get('/shows') || []; break;
  }
  return (Array.isArray(items) ? items : [])
    .filter(i => String(i.id || i._id) !== String(excludeId))
    .sort((a, b) => new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0))
    .slice(0, 20);
}

export async function getLive() {
  return http.get('/livestream/status');
}

export async function getReels() {
  return http.get('/reels') || [];
}

export async function getCurrentUser() {
  return http.get('/users/me');
}

// ===== ABONNEMENTS & PLANS =====
export async function getSubscriptionPlans() {
  return http.get('/subscription-plans?active_only=true').catch(() => []);
}

export async function createSubscription(payload) {
  return http.post('/subscriptions', payload);
}

export async function getMySubscription() {
  return http.get('/subscriptions/me');
}

export async function getFavorites() {
  return http.get('/favorites') || [];
}

export async function getMyFavorites(contentType = null) {
  const url = contentType ? `/favorites/me?content_type=${contentType}` : '/favorites/me';
  return http.get(url).catch(() => []);
}

// ===== COMMENTAIRES =====
export async function getComments(contentType, contentId) {
  return http.get(`/comments/content/${contentType}/${contentId}?limit=50`).catch(() => []);
}

export async function addComment(contentType, contentId, text) {
  return http.post('/comments', { content_type: contentType, content_id: contentId, text });
}

export async function deleteComment(commentId) {
  return http.delete(`/comments/${commentId}`);
}

export async function updateComment(commentId, text) {
  return http.put(`/comments/${commentId}`, { text });
}

// ===== LIKES =====
export async function getMyLikes(contentType) {
  try {
    const res = await http.get(`/likes/my-likes?content_type=${encodeURIComponent(contentType)}`);
    return Array.isArray(res) ? res : (res?.items || []);
  } catch { return []; }
}

export async function getLikesCount(contentType, contentId) {
  try {
    const res = await http.get(`/likes/content/${contentType}/${contentId}/count`);
    return (res && typeof res.count === 'number') ? res.count : 0;
  } catch { return 0; }
}

export async function getViewsCount(contentType, contentId) {
  try {
    const res = await http.get(`/views/${contentType}/${contentId}`);
    return (res && typeof res.views === 'number') ? res.views : 0;
  } catch { return 0; }
}

export async function toggleLike(contentType, contentId) {
  return http.post('/likes/toggle', { content_type: contentType, content_id: contentId });
}

export async function checkLiked(contentType, contentId) {
  try {
    const res = await http.get(`/likes/check/${contentType}/${contentId}`);
    return res?.liked ?? false;
  } catch { return false; }
}

// ===== FAVORIS =====
export async function checkFavorite(contentType, contentId) {
  try {
    const favs = await http.get(`/favorites/me?content_type=${contentType}`);
    if (!Array.isArray(favs)) return false;
    return favs.some(f => String(f.content_id) === String(contentId));
  } catch { return false; }
}

export async function addFavorite(contentType, contentId) {
  return http.post('/favorites', { content_type: contentType, content_id: contentId });
}

export async function removeFavorite(contentType, contentId) {
  return http.delete(`/favorites/content/${contentType}/${contentId}`);
}

// ===== RECHERCHE =====
export async function searchContent(q, limit = 10) {
  return http.get(`/search?q=${encodeURIComponent(q)}&limit=${limit}`).catch(() => ({ items: [] }));
}

// ===== NOTIFICATIONS =====
export async function getNotifications() {
  return http.get('/notifications/me').catch(() => []);
}

export async function markNotificationRead(notifId) {
  return http.patch(`/notifications/${notifId}/read`, {});
}

export async function markAllNotificationsRead() {
  try {
    const result = await http.patch('/notifications/mark-all-read', {});
    return result;
  } catch (error) {
    console.error('❌ Erreur détaillée:', error);
    throw error;
  }
}

export async function deleteNotification(notifId) {
  return http.delete(`/notifications/${notifId}`);
}

export async function deleteAllNotifications() {
  return http.delete('/notifications/delete-all');
}

// ===== PARAMÈTRES UTILISATEUR =====
export async function getUserSettings() {
  return http.get('/settings/my-settings');
}

export async function updateUserSettings(patch) {
  return http.put('/settings/my-settings', patch);
}

export async function resetUserSettings() {
  return http.post('/settings/my-settings/reset', {});
}

// ===== CONTACT =====
export async function sendContactMessage({ name, email, subject, message }) {
  return http.post('/contact', { name, email, subject, message });
}
