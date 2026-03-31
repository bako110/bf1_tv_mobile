/**
 * Utilitaire pour gérer les slugs et les IDs cachés
 * Permet de masquer les IDs MongoDB dans les URLs
 */

const API_BASE = 'https://bf1.fly.dev/api/v1';

/**
 * Convertir un texte en slug lisible
 * @param {string} text - Texte à convertir
 * @returns {string} Slug sanitisé
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Récupérer le cache slug→ID depuis sessionStorage
 * @returns {Object} Cache des slugs mappés à leurs IDs
 */
export function getSlugCache() {
  try {
    return JSON.parse(sessionStorage.getItem('bf1_slug_cache') || '{}');
  } catch {
    return {};
  }
}

/**
 * Sauvegarder le cache slug→ID dans sessionStorage
 * @param {Object} cache - Cache à sauvegarder
 */
export function setSlugCache(cache) {
  try {
    sessionStorage.setItem('bf1_slug_cache', JSON.stringify(cache));
  } catch (e) {
    console.warn('⚠️ Impossible de sauvegarder le cache slug:', e.message);
  }
}

/**
 * Mettre en cache un programme (slug → ID)
 * @param {Object} prog - Programme avec _id et title
 */
export function cacheProgram(prog) {
  if (!prog || !prog.title) return;
  const cache = getSlugCache();
  const slug = slugify(prog.title);
  cache[slug] = String(prog._id || prog.id);
  setSlugCache(cache);
}

/**
 * Chercher un programme par slug
 * @param {string} slug - Slug du programme
 * @returns {Promise<Object|null>} Programme trouvé ou null
 */
export async function getProgramBySlug(slug) {
  const cache = getSlugCache();
  
  // Si le slug est déjà en cache, utiliser l'ID
  if (cache[slug]) {
    try {
      return await getProgramById(cache[slug]);
    } catch (e) {
      console.warn('Erreur récupération ID caché, fallback recherche complète:', e.message);
    }
  }
  
  // Sinon, chercher dans tous les programmes
  try {
    const token = localStorage.getItem('bf1_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const r = await fetch(`${API_BASE}/programs`, { headers });
    if (!r.ok) throw new Error('Erreur API programmes');
    
    const programs = await r.json();
    const newCache = { ...cache };
    
    // Indexer et chercher
    let found = null;
    for (const prog of Array.isArray(programs) ? programs : (programs?.items || [])) {
      const s = slugify(prog.title);
      newCache[s] = String(prog._id || prog.id);
      if (s === slug) found = prog;
    }
    
    setSlugCache(newCache);
    return found;
  } catch (e) {
    console.error('Erreur recherche programmes:', e);
    return null;
  }
}

/**
 * Récupérer un programme par ID
 * @param {string} id - ID du programme
 * @returns {Promise<Object>} Données du programme
 */
export async function getProgramById(id) {
  const token = localStorage.getItem('bf1_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const r = await fetch(`${API_BASE}/programs/${id}`, { headers });
  if (!r.ok) {
    const e = new Error('Erreur API');
    e.status = r.status;
    throw e;
  }
  return r.json();
}

/**
 * Générer une URL de détail avec slug
 * @param {string} title - Titre du programme
 * @param {string} idFallback - ID (fallback si slug vide)
 * @returns {string} URL programme détail
 */
export function getProgramDetailUrl(title, idFallback) {
  const slug = slugify(title);
  if (slug) {
    return `program-detail.html?slug=${slug}`;
  }
  return `program-detail.html?id=${idFallback}`;
}

/**
 * Générer une URL de détail pour news avec slug
 * @param {string} title - Titre de l'actualité
 * @param {string} idFallback - ID (fallback si slug vide)
 * @returns {string} URL news détail
 */
export function getNewsDetailUrl(title, idFallback) {
  const slug = slugify(title);
  if (slug) {
    return `news-detail.html?slug=${slug}`;
  }
  return `news-detail.html?id=${idFallback}`;
}

/**
 * Générer une URL de détail pour contenu avec slug
 * @param {string} title - Titre du contenu
 * @param {string} idFallback - ID (fallback si slug vide)
 * @returns {string} URL contenu détail
 */
export function getContentDetailUrl(title, idFallback) {
  const slug = slugify(title);
  if (slug) {
    return `detail-contenu.html?slug=${slug}`;
  }
  return `detail-contenu.html?id=${idFallback}`;
}

/**
 * Chercher une news par slug
 * @param {string} slug - Slug de la news
 * @returns {Promise<Object|null>} News trouvée ou null
 */
export async function getNewsBySlug(slug) {
  const cache = getSlugCache();
  
  // Si le slug est déjà en cache, utiliser l'ID
  if (cache[`news_${slug}`]) {
    try {
      return await getNewsById(cache[`news_${slug}`]);
    } catch (e) {
      console.warn('Erreur récupération news cachée, fallback recherche complète:', e.message);
    }
  }
  
  // Sinon, chercher dans tous les actualités
  try {
    const token = localStorage.getItem('bf1_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const r = await fetch(`${API_BASE}/news`, { headers });
    if (!r.ok) throw new Error('Erreur API news');
    
    const news = await r.json();
    const newCache = { ...cache };
    
    // Indexer et chercher
    let found = null;
    for (const item of Array.isArray(news) ? news : (news?.items || [])) {
      const s = slugify(item.title);
      newCache[`news_${s}`] = String(item._id || item.id);
      if (s === slug) found = item;
    }
    
    setSlugCache(newCache);
    return found;
  } catch (e) {
    console.error('Erreur recherche news:', e);
    return null;
  }
}

/**
 * Récupérer une news par ID
 * @param {string} id - ID de la news
 * @returns {Promise<Object>} Données de la news
 */
export async function getNewsById(id) {
  const token = localStorage.getItem('bf1_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const r = await fetch(`${API_BASE}/news/${id}`, { headers });
  if (!r.ok) {
    const e = new Error('Erreur API');
    e.status = r.status;
    throw e;
  }
  return r.json();
}

/**
 * Mapper type → endpoint API
 * @param {string} type - Type de contenu
 * @returns {string} Endpoint API
 */
function getEndpointForType(type) {
  const typeMap = {
    'sport': 'sports',
    'jtandmag': 'jtandmag',
    'divertissement': 'divertissement',
    'reportage': 'reportage',
    'archive': 'archives',
    'movie': 'movies',
    'show': 'shows',
    'series': 'tv',
    'reel': 'reels',
    'breaking_news': 'news',
    'emission_category': 'emission-categories',
    'popular_program': 'shows',
    'program': 'shows',
    'culture': 'categories',
    'musique': 'divertissement'
  };
  return typeMap[type] || 'shows';
}

/**
 * Chercher un contenu (show/émission) par slug
 * @param {string} slug - Slug du contenu
 * @param {string} type - Type de contenu (optionnel, pour une recherche plus précise)
 * @returns {Promise<Object|null>} Contenu trouvé ou null
 */
export async function getContentBySlug(slug, type = 'show') {
  const cache = getSlugCache();
  const cacheKey = `content_${type}_${slug}`;
  
  // Chercher en cache d'abord
  if (cache[cacheKey]) {
    try {
      const id = cache[cacheKey];
      const endpoint = getEndpointForType(type);
      const token = localStorage.getItem('bf1_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const r = await fetch(`${API_BASE}/${endpoint}/${id}`, { headers });
      if (r.ok) return r.json();
    } catch (e) {
      console.warn('Erreur récupération contenu caché, fallback:', e.message);
    }
  }
  
  // Chercher dans l'endpoint approprié au type
  try {
    const endpoint = getEndpointForType(type);
    const token = localStorage.getItem('bf1_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const r = await fetch(`${API_BASE}/${endpoint}`, { headers });
    if (!r.ok) throw new Error(`Erreur API ${endpoint}`);
    
    const items = await r.json();
    const newCache = { ...cache };
    
    let found = null;
    for (const item of Array.isArray(items) ? items : (items?.items || items?.sports || [])) {
      const s = slugify(item.title);
      newCache[`content_${type}_${s}`] = String(item._id || item.id);
      if (s === slug) found = item;
    }
    
    setSlugCache(newCache);
    return found;
  } catch (e) {
    console.error(`Erreur recherche contenu dans ${type}:`, e);
    return null;
  }
}

/**
 * Récupérer un show/contenu par ID
 * @param {string} id - ID du contenu
 * @returns {Promise<Object>} Données du contenu
 */
export async function getShowById(id) {
  const token = localStorage.getItem('bf1_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const r = await fetch(`${API_BASE}/shows/${id}`, { headers });
  if (!r.ok) {
    const e = new Error('Erreur API');
    e.status = r.status;
    throw e;
  }
  return r.json();
}
