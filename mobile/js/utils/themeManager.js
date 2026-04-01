const THEME_STORAGE_KEY = 'bf1_theme_preference';

const THEME_CONFIG = {
  dark: {
    name: 'dark',
    label: '🌑 Sombre',
    vars: {
      // Variables principales
      '--primary': '#E23E3E',
      '--bg': '#070707',
      '--surface': '#0a0a0a',
      '--text': '#FFFFFF',
      '--text-secondary': '#A0A0A0',
      '--card-bg': '#1a1a1a',
      '--border': '#2a2a2a',
      '--hover-bg': '#111111',
      
      // Variable spécifique pour les icônes (claires en mode sombre)
      '--icon-color': '#FFFFFF',

      // Variables pour les descriptions sur les cartes
      '--description-color': '#CCCCCC',
      '--description-secondary': '#A0A0A0',
      '--card-description-bg': 'rgba(255, 255, 255, 0.05)',
      '--card-description-border': '#2a2a2a',

      // Variables utilisées dans loadShowDetail
      '--text-1': '#FFFFFF',
      '--text-2': '#CCCCCC',
      '--text-3': '#A0A0A0',
      '--text-4': '#CCCCCC',
      '--bg-1': '#000000',
      '--bg-2': '#0d0d0d',
      '--bg-3': '#1a1a1a',

      // Titres (h1, h2, h3...)
      '--heading-color': '#FFFFFF',
      '--subheading-color': '#CCCCCC',

      // Paragraphes / corps de texte
      '--body-color': '#CCCCCC',
      '--body-muted': '#A0A0A0',

      // Header sticky
      '--header-bg': '#000000',
      '--header-border': '#1e1e1e',
      '--header-text': '#FFFFFF',
      '--header-back-btn': '#FFFFFF',

      // Badges / tags
      '--badge-bg': '#2a2a2a',
      '--badge-text': '#CCCCCC',

      // Overlay / gradient hero
      '--hero-overlay': 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)',

      // Separateurs
      '--divider': '#2a2a2a',

      // Boutons secondaires
      '--btn-secondary-bg': '#1a1a1a',
      '--btn-secondary-text': '#FFFFFF',
      '--btn-secondary-border': '#2a2a2a',

      // Variables spécifiques pour les cartes
      '--description-list-color': '#CCCCCC',
      '--description-grid-color': '#FFFFFF',
      '--search-text-title': '#FFFFFF',
      '--description-news-list-color': '#CCCCCC',
      '--header-text-color': '#FFFFFF',
    }
  },
  light: {
    name: 'light',
    label: '☀️ Clair',
    vars: {
      // Variables principales
      '--primary': '#E23E3E',
      '--bg': '#FFFFFF',
      '--surface': '#F5F5F5',
      '--text': '#1a1a1a',
      '--text-secondary': '#666666',
      '--card-bg': '#EEEEEE',
      '--border': '#DDDDDD',
      '--hover-bg': '#E8E8E8',
      
      // Variable spécifique pour les icônes (noires en mode clair)
      '--icon-color': '#000000',

      // Variables pour les descriptions sur les cartes
      '--description-color': '#444444',
      '--description-secondary': '#666666',
      '--card-description-bg': 'rgba(0, 0, 0, 0.03)',
      '--card-description-border': '#DDDDDD',

      // Variables utilisées dans loadShowDetail
      '--text-1': '#1a1a1a',
      '--text-2': '#444444',
      '--text-3': '#666666',
      '--text-4': '#FFFFFF',
      '--bg-1': '#FFFFFF',
      '--bg-2': '#F5F5F5',
      '--bg-3': '#EEEEEE',

      // Titres (h1, h2, h3...)
      '--heading-color': '#1a1a1a',
      '--subheading-color': '#333333',

      // Paragraphes / corps de texte
      '--body-color': '#444444',
      '--body-muted': '#666666',

      // Header sticky
      '--header-bg': '#FFFFFF',
      '--header-border': '#DDDDDD',
      '--header-text': '#1a1a1a',
      '--header-back-btn': '#E23E3E',

      // Badges / tags
      '--badge-bg': '#EEEEEE',
      '--badge-text': '#444444',

      // Overlay / gradient hero
      '--hero-overlay': 'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.7) 100%)',

      // Separateurs
      '--divider': '#DDDDDD',

      // Boutons secondaires
      '--btn-secondary-bg': '#F0F0F0',
      '--btn-secondary-text': '#1a1a1a',
      '--btn-secondary-border': '#DDDDDD',
      
      // Variables spécifiques pour les cartes
      '--description-list-color': '#444444',
      '--description-grid-color': '#FFFFFF',
      '--description-news-list-color': '#FFFFFF',
      '--search-text-title': '#000000',
      '--header-text-color': '#1a1a1a',
    }
  }
};

class ThemeManager {
  constructor() {
    this.currentTheme = 'dark';
    this.systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Initialiser le thème au démarrage
   * @param {string} savedTheme - Le thème sauvegardé en base de données
   */
  init(savedTheme = 'dark') {
    let themeToApply = savedTheme;

    if (savedTheme === 'auto') {
      themeToApply = this.systemPrefersDark ? 'dark' : 'light';
    }

    this.setTheme(themeToApply, false);

    // Écouter les changements de préférence système
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentTheme === 'auto' || savedTheme === 'auto') {
        const newTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(newTheme);
      }
    });
  }

  /**
   * Appliquer un thème (avec sauvegarde locale optionnelle)
   */
  setTheme(themeName, triggerEvent = true) {
    if (themeName === 'auto') {
      this.currentTheme = 'auto';
      try { 
        localStorage.setItem(THEME_STORAGE_KEY, 'auto'); 
      } catch(e) {
        console.warn('Impossible de sauvegarder le thème en localStorage', e);
      }
      const resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      this.applyTheme(resolved);
      if (triggerEvent) {
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: resolved } }));
      }
      return;
    }

    if (!THEME_CONFIG[themeName]) {
      console.warn(`Thème invalide: ${themeName}`);
      return;
    }

    const config = THEME_CONFIG[themeName];
    this.currentTheme = themeName;

    // Appliquer les CSS variables sur :root
    const root = document.documentElement;
    Object.entries(config.vars).forEach(([varName, value]) => {
      root.style.setProperty(varName, value);
    });

    // Appliquer data-theme sur <html> pour les sélecteurs CSS
    document.documentElement.setAttribute('data-theme', themeName);

    // Sauvegarder localement
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (e) {
      console.warn('Impossible de sauvegarder le thème en localStorage', e);
    }

    if (triggerEvent) {
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }));
    }
  }

  applyTheme(themeName) {
    this.setTheme(themeName, false);
  }

  toggle() {
    const next = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  getCurrent() {
    return this.currentTheme;
  }

  getSystemPreference() {
    return this.systemPrefersDark ? 'dark' : 'light';
  }
}

// Export singleton
export const themeManager = new ThemeManager();