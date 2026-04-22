import { API_CONFIG } from '../config/routes.js';

let token = localStorage.getItem('bf1_token');

// Cache mémoire pour les requêtes GET — TTL 5 minutes
const _cache = new Map();
const _CACHE_TTL = 5 * 60 * 1000;

async function request(path, options = {}) {
  const isGet = !options.method || options.method === 'GET';

  // Retourner le cache si valide
  if (isGet) {
    const cached = _cache.get(path);
    if (cached && Date.now() - cached.ts < _CACHE_TTL) {
      return cached.data;
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_CONFIG.API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    // Only clear token on 401 (truly unauthorized/expired), NOT on 403 (forbidden/insufficient rights)
    if (response.status === 401) {
      token = null;
      localStorage.removeItem('bf1_token');
      localStorage.removeItem('bf1_user');
    }
    const err = new Error(data?.detail || data?.message || 'Erreur API');
    err.status = response.status;
    err.data = data;
    throw err;
  }

  // Mettre en cache les GET réussis
  if (isGet) {
    _cache.set(path, { data, ts: Date.now() });
  }

  return data;
}

export const http = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  setToken: (t) => { token = t; },
  getToken: () => token,
  // Vider le cache (après login/logout)
  clearCache: () => _cache.clear(),
  // Invalider une entrée spécifique (ex: après une action d'écriture)
  invalidate: (path) => _cache.delete(path),
};
