import { http } from './http.js';

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

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('bf1_user') || 'null');
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(http.getToken());
}

// SERVICES DE CONTENU
export async function getNews() {
  return http.get('/news') || [];
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
    default:              return http.get(`/shows/${id}`);
  }
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

export async function getMySubscription() {
  return http.get('/subscriptions/me');
}

export async function getFavorites() {
  return http.get('/favorites') || [];
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
export async function getLikesCount(contentType, contentId) {
  try {
    const res = await http.get(`/likes/content/${contentType}/${contentId}/count`);
    return (res && typeof res.count === 'number') ? res.count : 0;
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
