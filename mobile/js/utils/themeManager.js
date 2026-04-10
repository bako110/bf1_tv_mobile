const THEME_STORAGE_KEY = 'bf1_theme_preference';

// Configuration simplifiée - les variables CSS sont définies dans css/themes.css
const THEME_CONFIG = {
  dark: {
    name: 'dark',
    label: '🌑 Sombre'
  },
  light: {
    name: 'light',
    label: '☀️ Clair'
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
    // Lire le thème déjà appliqué par le script inline dans index.html
    const currentDataTheme = document.documentElement.getAttribute('data-theme');
    
    let themeToApply = savedTheme;

    if (savedTheme === 'auto') {
      themeToApply = this.systemPrefersDark ? 'dark' : 'light';
    }

    // Si un thème est déjà appliqué dans le DOM, synchroniser avec celui-ci
    if (currentDataTheme && (currentDataTheme === 'dark' || currentDataTheme === 'light')) {
      this.currentTheme = currentDataTheme;
      // Sauvegarder dans localStorage si ce n'est pas déjà fait
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (!stored || stored !== currentDataTheme) {
          localStorage.setItem(THEME_STORAGE_KEY, currentDataTheme);
        }
      } catch(e) {
        console.warn('Impossible de sauvegarder le thème en localStorage', e);
      }
    } else {
      // Sinon, appliquer le thème sauvegardé
      this.setTheme(themeToApply, false);
    }

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

    this.currentTheme = themeName;

    // Appliquer data-theme sur <html> - les variables CSS sont définies dans css/themes.css
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