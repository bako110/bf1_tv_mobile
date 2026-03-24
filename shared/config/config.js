export const API_CONFIG = {
  IS_PRODUCTION: true,
  PRODUCTION_API_URL: 'https://bf1.fly.dev',
  LOCAL_API_URL: 'http://192.168.137.1:8000',
  
  get API_URL() {
    return this.IS_PRODUCTION ? this.PRODUCTION_API_URL : this.LOCAL_API_URL;
  },
  
  get API_BASE_URL() {
    return `${this.API_URL}/api/v1`;
  }
};

export const ROUTES = {
  HOME: '#/home',
  LIVE: '#/live',
  EMISSIONS: '#/emissions',
  REELS: '#/reels',
  PROFILE: '#/profile',
  LOGIN: '#/login',
  REGISTER: '#/register',
  NEWS: '#/news',
  MOVIES: '#/movies',
  SERIES: '#/series',
  PROGRAMS: '#/programs',
  SPORTS: '#/sports',
  DIVERTISSEMENT: '#/divertissement',
  REPORTAGES: '#/reportages',
  ARCHIVE: '#/archive',
  JTANDMAG: '#/jtandmag',
  FAVORITES: '#/favorites',
  NOTIFICATIONS: '#/notifications',
  SETTINGS: '#/settings',
  SEARCH: '#/search',
  SUPPORT: '#/support',
  UGC: '#/ugc',
  ABOUT: '#/about',
};

export const TAB_ROUTES = [
  ROUTES.HOME,
  ROUTES.EMISSIONS,
  ROUTES.LIVE,
  ROUTES.REELS,
  ROUTES.PROFILE,
];
