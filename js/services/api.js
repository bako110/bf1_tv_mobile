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
