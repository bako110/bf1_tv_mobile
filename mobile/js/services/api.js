// shared/services/api.js
import { http } from './http.js';

export const LIVE_STREAM_URL = 'https://geo.dailymotion.com/player/xtv3w.html?video=xa4kdv6&ui-logo=0&ui-start-screen-info=0&sharing-enable=0&endscreen-enable=0&queue-enable=0&ui-theme=dark&syndication=0';

export async function login(identifier, password) {
  const res = await http.post('/users/login', { identifier, password });
  if (res.access_token) {
    http.setToken(res.access_token);
    http.clearCache();
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
  http.clearCache();
  try {
    localStorage.removeItem('bf1_token');
    localStorage.removeItem('bf1_user');
  } catch (err) {
    console.warn('⚠️ Impossible de supprimer les données (tracking prevention):', err.message);
  }
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('bf1_user') || 'null');
  } catch {
    return null;
  }
}

export function setUser(userData) {
  try {
    localStorage.setItem('bf1_user', JSON.stringify(userData));
  } catch (err) {
    console.warn('⚠️ Impossible de mettre à jour l\'utilisateur en cache:', err.message);
  }
}

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

// ===== SERVICES DE CONTENU =====
export async function getNews(skip = 0, limit = 20) {
  const res = await http.get(`/news?skip=${skip}&limit=${limit}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0 };
}

export async function getCategories() {
  return http.get('/section-categories').catch(() => []);
}

export async function getEmissions() {
  const categories = await http.get('/emission-categories').catch(() => []);
  return (Array.isArray(categories) ? categories : [])
    .filter(item => item.is_active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getMovies(skip = 0, limit = 20) {
  const res = await http.get(`/movies?skip=${skip}&limit=${limit}`).catch(() => ({}));
  return { items: res.items || res.movies || (Array.isArray(res) ? res : []), total: res.total || 0 };
}

export async function getSeries(skip = 0, limit = 20) {
  const res = await http.get(`/series?skip=${skip}&limit=${limit}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0 };
}

export async function getPrograms() {
  return http.get('/programs') || [];
}

export async function getProgramWeek(weeksAhead = 0, type = null) {
  const params = new URLSearchParams();
  params.append('weeks_ahead', weeksAhead);
  if (type) params.append('type', type);
  return http.get(`/programs/grid/weekly?${params.toString()}`).catch(() => ({ days: [] }));
}

export async function getProgramGrid(startDate = null, endDate = null, type = null) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (type) params.append('type', type);
  return http.get(`/programs/grid/daily?${params.toString()}`).catch(() => ({ days: [] }));
}

export async function getSports(skip = 0, limit = 20, category = null) {
  const cat = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await http.get(`/sports?skip=${skip}&limit=${limit}${cat}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
}

export async function getDivertissement(skip = 0, limit = 20, category = null) {
  const cat = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await http.get(`/divertissement?skip=${skip}&limit=${limit}${cat}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
}

export async function getTeleRealite(skip = 0, limit = 20, category = null) {
  const cat = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await http.get(`/tele-realite?skip=${skip}&limit=${limit}${cat}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
}

export async function getReportages(skip = 0, limit = 20, category = null) {
  const cat = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await http.get(`/reportage?skip=${skip}&limit=${limit}${cat}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
}

export async function getArchive(skip = 0, limit = 20) {
  const res = await http.get(`/archives?skip=${skip}&limit=${limit}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
}

export async function checkArchiveAccess(id) {
  return http.get(`/archives/${id}/check-access`);
}

export async function getJTandMag(skip = 0, limit = 20, category = null) {
  const cat = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await http.get(`/jtandmag?skip=${skip}&limit=${limit}${cat}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
}

export async function getMagazine(skip = 0, limit = 20, category = null) {
  const cat = category ? `&category=${encodeURIComponent(category)}` : '';
  const res = await http.get(`/magazine?skip=${skip}&limit=${limit}${cat}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
}

export async function getMissed(skip = 0, limit = 20) {
  const res = await http.get(`/missed?skip=${skip}&limit=${limit}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
}

// ===== DÉTAILS PAR ID =====
export async function getNewsById(id) {
  return http.get(`/news/${id}`);
}

export async function getShowById(id, type) {
  switch (type) {
    case 'sport':         return http.get(`/sports/${id}`);
    case 'jtandmag':      return http.get(`/jtandmag/${id}`);
    case 'magazine':      return http.get(`/magazine/${id}`);
    case 'divertissement':return http.get(`/divertissement/${id}`);
    case 'reportage':     return http.get(`/reportage/${id}`);
    case 'archive':       return http.get(`/archives/${id}`);
    case 'tele_realite':  return http.get(`/tele-realite/${id}`);
    case 'movie':         return http.get(`/movies/${id}`);
    case 'missed':        return http.get(`/missed/${id}`);
    default:              return http.get(`/shows/${id}`);
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

// Mapping endpoint → contentType pour getShowsByFilterPath
const ENDPOINT_CONTENT_TYPE = {
  '/magazine':       'magazine',
  '/jtandmag':       'jtandmag',
  '/divertissement': 'divertissement',
  '/reportage':      'reportage',
  '/tele-realite':   'tele_realite',
  '/sport':          'sport',
  '/sports':         'sport',
  '/flash-infos':    'flash_infos',
};

export function getCategoryEndpoint(category) {
  const name = (category || '').toLowerCase();
  if (name.includes('sport')) return { endpoint: '/sports', contentType: 'sport' };
  if (name.includes('jt') || name.includes('journal')) return { endpoint: '/jtandmag', contentType: 'jtandmag' };
  if (name.includes('mag')) return { endpoint: '/magazine', contentType: 'magazine' };
  if (name.includes('divertissement')) return { endpoint: '/divertissement', contentType: 'divertissement' };
  if (name.includes('reportage')) return { endpoint: '/reportage', contentType: 'reportage' };
  if (
    name.includes('tele') || name.includes('télé') ||
    name.includes('realite') || name.includes('réalité') ||
    name.includes('evenement') || name.includes('événement') || name.includes('event')
  ) return { endpoint: '/tele-realite', contentType: 'tele_realite' };
  return { endpoint: null, contentType: 'show' };
}

export async function getShowsByCategory(category, skip = 0, limit = 20) {
  const { endpoint, contentType } = getCategoryEndpoint(category);
  if (!endpoint) return { items: [], total: 0, contentType };
  const extract = (res) => res?.items || (Array.isArray(res) ? res : []);
  const res = await http.get(`${endpoint}?skip=${skip}&limit=${limit}`).catch(() => ({}));
  const items = extract(res).map(item => ({ ...item, id: item._id || item.id, _contentType: contentType }));
  return { items, total: res.total || 0, contentType };
}

export async function getShowsByFilterPath(filterPath, categoryFallback, skip = 0, limit = 20) {
  const extract = (res) => res?.items || (Array.isArray(res) ? res : []);

  if (filterPath) {
    // Supprimer le préfixe /api/v1 si présent (déjà ajouté par http.js)
    const cleanPath = filterPath.replace(/^\/api\/v1/, '');
    const baseUrl = cleanPath.split('?')[0];
    // Remplacer skip/limit directement dans la string pour préserver l'encodage exact
    let query = (cleanPath.split('?')[1] || '')
      .replace(/(?:^|&)skip=[^&]*/,  '')
      .replace(/(?:^|&)limit=[^&]*/, '')
      .replace(/^&/, '');
    query = `skip=${skip}&limit=${limit}${query ? '&' + query : ''}`;
    const contentType = ENDPOINT_CONTENT_TYPE[baseUrl] || baseUrl.replace(/^\//, '').replace(/-/g, '_');
    const res = await http.get(`${baseUrl}?${query}`).catch(() => ({}));
    const items = extract(res).map(item => ({ ...item, id: item._id || item.id, _contentType: contentType }));
    return { items, total: res.total || 0, contentType };
  }

  // Fallback si pas de filter_path
  return getShowsByCategory(categoryFallback, skip, limit);
}

export async function getRelatedByType(type, excludeId) {
  const extract = (res) => res?.items || (Array.isArray(res) ? res : []);
  let items = [];
  switch (type) {
    case 'news':           items = extract(await http.get('/news?skip=0&limit=20').catch(() => ({}))); break;
    case 'sport':          items = extract(await http.get('/sports?skip=0&limit=20').catch(() => ({}))); break;
    case 'jtandmag':       items = extract(await http.get('/jtandmag?skip=0&limit=20').catch(() => ({}))); break;
    case 'magazine':       items = extract(await http.get('/magazine?skip=0&limit=20').catch(() => ({}))); break;
    case 'divertissement': items = extract(await http.get('/divertissement?skip=0&limit=20').catch(() => ({}))); break;
    case 'reportage':      items = extract(await http.get('/reportage?skip=0&limit=20').catch(() => ({}))); break;
    case 'archive':        items = extract(await http.get('/archives?skip=0&limit=20').catch(() => ({}))); break;
    case 'tele_realite':   items = extract(await http.get('/tele-realite?skip=0&limit=20').catch(() => ({}))); break;
    case 'movie':          items = extract(await http.get('/movies?skip=0&limit=20').catch(() => ({}))); break;
    case 'missed':         items = extract(await http.get('/missed?skip=0&limit=20').catch(() => ({}))); break;
    default:               items = []; break;
  }
  return items
    .filter(i => String(i.id || i._id) !== String(excludeId))
    .sort((a, b) => new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0))
    .slice(0, 20);
}

export async function getLive() {
  return http.get('/livestream/status');
}

/**
 * Retourne l'URL du flux HLS depuis l'endpoint /status.
 */
export async function getLiveStreamUrl() {
  try {
    const liveData = await getLive();
    let url = liveData?.live_dailymotion_url || LIVE_STREAM_URL;

    // Ajouter des paramètres pour masquer les métadonnées Dailymotion
    if (url && url.includes('dailymotion')) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}ui-logo=0&ui-start-screen-info=0&sharing-enable=0&endscreen-enable=0&queue-enable=0&ui-theme=dark&syndication=0`;
    }

    return url;
  } catch (error) {
    console.error('Erreur récupération URL stream:', error);
    return '';
  }
}

export async function getReels(skip = 0, limit = 20) {
  const res = await http.get(`/reels?skip=${skip}&limit=${limit}`).catch(() => ({}));
  return { items: res.items || (Array.isArray(res) ? res : []), total: res.total || 0, skip, limit };
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
  const res = await http.post('/comments', { content_type: contentType, content_id: contentId, text });
  http.invalidatePrefix(`/comments/content/${contentType}/${contentId}`);
  return res;
}

export async function deleteComment(commentId) {
  const res = await http.delete(`/comments/${commentId}`);
  http.invalidatePrefix('/comments/content/');
  return res;
}

// ===== COMMENTAIRES LIVE =====
export async function getLiveComments(skip = 0, limit = 50) {
  const res = await http.get(`/livestream/comments?skip=${skip}&limit=${limit}`).catch(() => ({ comments: [] }));
  return res.comments || [];
}

export async function addLiveComment(text) {
  return http.post('/livestream/comments', { text });
}

export async function deleteLiveComment(commentId) {
  return http.delete(`/livestream/comments/${commentId}`);
}

export async function updateComment(commentId, text) {
  return http.put(`/comments/${commentId}`, { text });
}

export async function incrementView(contentType, contentId) {
  const user = getUser();
  return http.post('/views/increment', {
    content_type: contentType,
    content_id: contentId,
    user_id: user?.id ? String(user.id) : null,
  }).catch(() => null); // silencieux — ne jamais bloquer l'UI
}

export async function deleteMyChatMessage(messageId) {
  return http.delete(`/ws/chat/my/${messageId}`);
}

export async function editMyChatMessage(messageId, text) {
  return http.patch(`/ws/chat/my/${messageId}`, { text });
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

export async function toggleLike(contentType, contentId) {
  const res = await http.post('/likes/toggle', { content_type: contentType, content_id: contentId });
  http.invalidatePrefix(`/likes/content/${contentType}/${contentId}`);
  return res;
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
  return http.patch(`/notifications/${notifId}/read`);
}

export async function markAllNotificationsRead() {
  return http.patch('/notifications/mark-all-read');
}

export async function deleteNotification(notifId) {
  return http.delete(`/notifications/${notifId}`);
}

export async function deleteAllNotifications() {
  return http.delete('/notifications/delete-all');
}

// ===== PROFIL UTILISATEUR =====
export async function updateProfile(patch) {
  const res = await http.patch('/users/me', patch);
  if (res) {
    const current = getUser() || {};
    setUser({ ...current, ...res });
  }
  return res;
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

// ===== PROGRAM REMINDERS =====
export async function createReminder(programId, data) {
  return http.post(`/programs/${programId}/reminders`, data);
}

export async function getMyReminders(status = null, upcomingOnly = false) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (upcomingOnly) params.append('upcoming_only', 'true');
  const url = `/programs/reminders/my${params.toString() ? `?${params.toString()}` : ''}`;
  return http.get(url).catch(() => []);
}

export async function cancelReminder(reminderId) {
  return http.post(`/programs/reminders/${reminderId}/cancel`);
}

export async function deleteReminder(reminderId) {
  return http.delete(`/programs/reminders/${reminderId}`);
}

export async function updateReminder(reminderId, data) {
  return http.patch(`/programs/reminders/${reminderId}`, data);
}