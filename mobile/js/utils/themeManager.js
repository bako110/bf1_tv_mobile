/**
 * Theme Manager - Gère le basculement entre les thèmes Light/Dark/Auto
 * Applique les CSS variables et les classes correspondantes
 */

const THEME_STORAGE_KEY = 'bf1_theme_preference';

const THEME_CONFIG = {
  dark: {
    name: 'dark',
    label: '🌑 Sombre',
    vars: {
      '--primary': '#E23E3E',
      '--bg': '#070707',
      '--surface': '#0a0a0a',
      '--text': '#FFFFFF',
      '--text-secondary': '#A0A0A0',
      '--card-bg': '#1a1a1a',
      '--border': '#2a2a2a',
      '--hover-bg': '#111111',
    }
  },
  light: {
    name: 'light',
    label: '☀️ Clair',
    vars: {
      '--primary': '#E23E3E',
      '--bg': '#FFFFFF',
      '--surface': '#F5F5F5',
      '--text': '#1a1a1a',
      '--text-secondary': '#666666',
      '--card-bg': '#EEEEEE',
      '--border': '#DDDDDD',
      '--hover-bg': '#E8E8E8',
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
    // Déterminer le thème à appliquer
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
    // Gérer le mode 'auto' → traduire en dark ou light selon la préférence système
    if (themeName === 'auto') {
      this.currentTheme = 'auto';
      try { localStorage.setItem(THEME_STORAGE_KEY, 'auto'); } catch(e) {}
      const resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      this.applyTheme(resolved);
      if (triggerEvent) window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: resolved } }));
      return;
    }

    if (!THEME_CONFIG[themeName]) {
      console.warn(`Thème invalide: ${themeName}`);
      return;
    }

    const config = THEME_CONFIG[themeName];
    this.currentTheme = themeName;

    // Appliquer les CSS variables
    const root = document.documentElement;
    Object.entries(config.vars).forEach(([varName, value]) => {
      root.style.setProperty(varName, value);
    });

    // Appliquer la classe sur <html> pour que [data-theme="light"] body fonctionne
    document.documentElement.setAttribute('data-theme', themeName);

    // Sauvegarder localement
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (e) {
      console.warn('Impossible de sauvegarder le thème en localStorage', e);
    }

    // Déclencher un événement personnalisé pour que d'autres modules s'ajustent
    if (triggerEvent) {
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }));
    }
  }

  /**
   * Appliquer un thème sans sauvegarder (pour éviter les boucles infinies)
   */
  applyTheme(themeName) {
    this.setTheme(themeName, false);
  }

  /**
   * Basculer entre Dark et Light
   */
  toggle() {
    const next = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  /**
   * Récupérer le thème actuel
   */
  getCurrent() {
    return this.currentTheme;
  }

  /**
   * Récupérer la préférence système
   */
  getSystemPreference() {
    return this.systemPrefersDark ? 'dark' : 'light';
  }
}

// Export singleton
export const themeManager = new ThemeManager();
