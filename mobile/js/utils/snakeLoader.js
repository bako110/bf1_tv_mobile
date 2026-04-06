/**
 * SnakeLoader Pro - Loader animé style TikTok
 * Version autonome : injecte le HTML et les styles dans la page
 * @version 3.0.0
 */

(function(global) {
  'use strict';

  // ==================== STYLES CSS INJECTÉS ====================
  const styles = `
    /* SnakeLoader Pro - Styles */
    .snake-loader-pro-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      min-height: 120px;
      position: relative;
    }
    
    .snake-loader-pro {
      position: relative;
      animation: snakeRotatePro 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      will-change: transform;
    }
    
    .snake-loader-pro-dot {
      position: absolute;
      border-radius: 50%;
      will-change: transform, opacity;
      pointer-events: none;
      transition: box-shadow 0.3s ease;
    }
    
    @keyframes snakeRotatePro {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
    
    @keyframes snakeDotPulsePro {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
      }
      50% {
        transform: translate(-50%, -50%) scale(1.25);
      }
    }
    
    @keyframes snakeFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .snake-loader-fade-out {
      opacity: 0;
      transition: opacity 0.3s ease-out;
    }
    
    .snake-loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: snakeFadeIn 0.2s ease-out;
    }
    
    .snake-loader-message {
      margin-top: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #ffffff;
      text-align: center;
      animation: snakeFadeIn 0.3s ease-out;
    }
    
    /* Réduction de mouvement pour accessibilité */
    @media (prefers-reduced-motion: reduce) {
      .snake-loader-pro,
      .snake-loader-pro-dot {
        animation: none !important;
      }
    }
  `;

  // ==================== CLASSE PRINCIPALE ====================
  class SnakeLoader {
    /**
     * @param {Object} options - Options de configuration
     * @param {number} options.size - Taille en pixels (défaut: 48)
     * @param {string} options.color - Couleur principale (défaut: '#E23E3E')
     * @param {string} options.secondaryColor - Couleur secondaire (défaut: '#FF6B6B')
     * @param {number} options.dotSize - Taille des points (défaut: 6)
     * @param {number} options.speed - Vitesse d'animation en secondes (défaut: 1.2)
     * @param {number} options.pointCount - Nombre de points (défaut: 10)
     * @param {boolean} options.trail - Effet de traînée (défaut: true)
     * @param {boolean} options.glow - Effet de lueur (défaut: true)
     * @param {boolean} options.pulse - Effet de pulsation (défaut: true)
     */
    constructor(options = {}) {
      this.options = {
        size: options.size ?? 48,
        color: options.color ?? '#E23E3E',
        secondaryColor: options.secondaryColor ?? '#FF6B6B',
        dotSize: options.dotSize ?? 6,
        speed: options.speed ?? 1.2,
        pointCount: options.pointCount ?? 10,
        trail: options.trail ?? true,
        glow: options.glow ?? true,
        pulse: options.pulse ?? true,
        ...options
      };
      
      this.container = null;
      this.loaderElement = null;
      this.isVisible = true;
      
      // Injecter les styles une seule fois
      this._injectStyles();
    }
    
    /**
     * Injecte les styles CSS dans la page
     */
    _injectStyles() {
      if (document.querySelector('style[data-snake-loader]')) {
        return;
      }
      
      const style = document.createElement('style');
      style.setAttribute('data-snake-loader', 'true');
      style.textContent = styles;
      document.head.appendChild(style);
    }
    
    /**
     * Crée un point individuel
     */
    _createDot(index, total, center, radius) {
      const dot = document.createElement('div');
      dot.className = 'snake-loader-pro-dot';
      
      const angle = (Math.PI * 2 / total) * index;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      
      // Calcul de l'opacité pour l'effet de traînée
      let opacity = 1;
      if (this.options.trail) {
        opacity = 0.3 + ((index + 1) / total) * 0.7;
      }
      
      // Dégradé circulaire
      const gradientAngle = angle * (180 / Math.PI);
      
      dot.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        width: ${this.options.dotSize}px;
        height: ${this.options.dotSize}px;
        background: linear-gradient(${gradientAngle}deg, ${this.options.color}, ${this.options.secondaryColor});
        opacity: ${opacity};
        transform: translate(-50%, -50%);
        ${this.options.glow ? `box-shadow: 0 0 ${this.options.dotSize * 0.8}px ${this.options.color}, 0 0 ${this.options.dotSize * 0.4}px ${this.options.secondaryColor};` : ''}
        ${this.options.pulse ? `animation: snakeDotPulsePro 1.2s ease-in-out ${(index / total) * 0.8}s infinite;` : ''}
      `;
      
      return dot;
    }
    
    /**
     * Crée le loader et le rend dans le conteneur
     */
    render(container) {
      if (!container) {
        throw new Error('[SnakeLoader] Un conteneur HTML est requis');
      }
      
      this.container = container;
      this.container.innerHTML = '';
      
      // Créer le wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'snake-loader-pro-container';
      
      const loader = document.createElement('div');
      loader.className = 'snake-loader-pro';
      loader.style.cssText = `
        width: ${this.options.size}px;
        height: ${this.options.size}px;
        animation-duration: ${this.options.speed}s;
      `;
      
      const center = this.options.size / 2;
      const radius = this.options.size * 0.38;
      
      // Créer tous les points
      for (let i = 0; i < this.options.pointCount; i++) {
        const dot = this._createDot(i, this.options.pointCount, center, radius);
        loader.appendChild(dot);
      }
      
      wrapper.appendChild(loader);
      this.container.appendChild(wrapper);
      this.loaderElement = wrapper;
      
      return this;
    }
    
    /**
     * Affiche le loader
     */
    show() {
      if (this.loaderElement) {
        this.loaderElement.style.display = 'flex';
        this.loaderElement.classList.remove('snake-loader-fade-out');
        this.isVisible = true;
      }
      return this;
    }
    
    /**
     * Masque le loader avec animation
     */
    hide(duration = 300) {
      return new Promise((resolve) => {
        if (!this.loaderElement) {
          resolve();
          return;
        }
        
        this.loaderElement.classList.add('snake-loader-fade-out');
        this.isVisible = false;
        
        setTimeout(() => {
          if (this.loaderElement) {
            this.loaderElement.style.display = 'none';
          }
          resolve();
        }, duration);
      });
    }
    
    /**
     * Détruit le loader
     */
    destroy() {
      if (this.container && this.loaderElement) {
        this.container.innerHTML = '';
      }
      this.container = null;
      this.loaderElement = null;
    }
    
    /**
     * Met à jour les options
     */
    updateOptions(options) {
      this.options = { ...this.options, ...options };
      if (this.container) {
        this.render(this.container);
      }
    }
  }
  
  // ==================== FONCTIONS UTILITAIRES ====================
  
  /**
   * Injecte Bootstrap dans la page si nécessaire
   */
  function injectBootstrap() {
    if (document.querySelector('link[href*="bootstrap"]')) {
      return Promise.resolve(true);
    }
    
    return new Promise((resolve) => {
      const bootstrapCss = document.createElement('link');
      bootstrapCss.rel = 'stylesheet';
      bootstrapCss.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
      bootstrapCss.onload = () => resolve(true);
      document.head.appendChild(bootstrapCss);
      
      const bootstrapJs = document.createElement('script');
      bootstrapJs.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';
      document.head.appendChild(bootstrapJs);
    });
  }
  
  /**
   * Injecte Font Awesome si nécessaire
   */
  function injectFontAwesome() {
    if (document.querySelector('link[href*="font-awesome"]') || 
        document.querySelector('link[href*="fontawesome"]')) {
      return;
    }
    
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);
  }
  
  /**
   * Crée un loader dans un conteneur
   */
  function createLoader(container, options = {}) {
    const loader = new SnakeLoader(options);
    loader.render(container);
    return loader;
  }
  
  /**
   * Affiche un loader temporaire avec message
   */
  function showTemporaryLoader(container, options = {}) {
    const message = options.message || 'Chargement en cours...';
    const duration = options.duration || 2000;
    
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    
    const loaderContainer = document.createElement('div');
    loaderContainer.style.minHeight = '100px';
    container.appendChild(loaderContainer);
    
    const loader = new SnakeLoader({
      size: options.size || 40,
      color: options.color || '#E23E3E',
      secondaryColor: options.secondaryColor || '#FF6B6B',
      ...options
    });
    loader.render(loaderContainer);
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'snake-loader-message';
    msgDiv.textContent = message;
    msgDiv.style.color = options.textColor || '#666';
    container.appendChild(msgDiv);
    
    setTimeout(() => {
      loader.hide();
      setTimeout(() => {
        if (container.parentNode) {
          container.innerHTML = '';
        }
      }, 300);
    }, duration);
    
    return { loader, messageElement: msgDiv };
  }
  
  /**
   * Affiche un overlay plein écran avec loader
   */
  function showFullscreenOverlay(options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'snake-loader-overlay';
    
    const loaderContainer = document.createElement('div');
    loaderContainer.style.minWidth = '80px';
    loaderContainer.style.minHeight = '80px';
    overlay.appendChild(loaderContainer);
    
    if (options.message) {
      const msg = document.createElement('div');
      msg.className = 'snake-loader-message';
      msg.textContent = options.message;
      msg.style.marginTop = '20px';
      msg.style.fontSize = '16px';
      msg.style.fontWeight = '500';
      overlay.appendChild(msg);
    }
    
    document.body.appendChild(overlay);
    
    const loader = new SnakeLoader({
      size: options.size || 64,
      color: options.color || '#E23E3E',
      secondaryColor: options.secondaryColor || '#FF6B6B',
      glow: options.glow !== false,
      trail: options.trail !== false,
      ...options
    });
    loader.render(loaderContainer);
    
    // Fermer au clic sur l'overlay
    if (options.closeOnClick !== false) {
      overlay.addEventListener('click', () => {
        loader.destroy();
        overlay.remove();
        if (options.onClose) options.onClose();
      });
    }
    
    // Fermeture automatique
    if (options.duration && options.duration > 0) {
      setTimeout(() => {
        if (overlay.parentNode) {
          loader.destroy();
          overlay.remove();
          if (options.onClose) options.onClose();
        }
      }, options.duration);
    }
    
    return {
      close: () => {
        loader.destroy();
        overlay.remove();
        if (options.onClose) options.onClose();
      },
      overlay,
      loader
    };
  }
  
  /**
   * Crée une interface de démonstration complète avec Bootstrap
   */
  function createDemoPage(containerId = 'app') {
    injectBootstrap();
    injectFontAwesome();
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[SnakeLoader] Élément #${containerId} non trouvé`);
      return;
    }
    
    // HTML de démonstration
    container.innerHTML = `
      <div class="container py-5">
        <div class="text-center mb-5">
          <div class="d-flex justify-content-center mb-3">
            <span class="badge bg-danger bg-gradient px-3 py-2 rounded-pill">
              <i class="fas fa-bolt me-1"></i> ULTRA PROFESSIONNEL
            </span>
          </div>
          <h1 class="display-3 fw-bold mb-3">
            <span style="background: linear-gradient(135deg, #E23E3E, #FF6B6B); -webkit-background-clip: text; background-clip: text; color: transparent;">SnakeLoader</span> Pro
          </h1>
          <p class="lead text-muted mb-4">Loader animé style serpent • Design inspiré des meilleures applications</p>
          <div class="d-flex justify-content-center gap-3 flex-wrap">
            <button class="btn btn-danger btn-lg px-4 rounded-pill" id="globalLoaderBtn">
              <i class="fas fa-play me-2"></i>Tester le loader
            </button>
            <button class="btn btn-outline-danger btn-lg px-4 rounded-pill" id="overlayBtn">
              <i class="fas fa-window-maximize me-2"></i>Overlay plein écran
            </button>
          </div>
        </div>
        
        <div class="row g-4 mb-5">
          <div class="col-md-6 col-lg-4">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body p-4 text-center">
                <h5 class="fw-bold mb-2"><i class="fas fa-fire text-danger me-2"></i>Style Signature</h5>
                <p class="small text-muted">Rouge TikTok, effet de traînée, lueur</p>
                <div id="demo1" class="bg-light rounded-4 p-4 mb-3" style="min-height: 140px;"></div>
                <button class="btn btn-sm btn-outline-danger rounded-pill restart-demo" data-demo="1">
                  <i class="fas fa-redo-alt me-1"></i>Rejouer
                </button>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body p-4 text-center">
                <h5 class="fw-bold mb-2"><i class="fas fa-snowflake text-primary me-2"></i>Glacier Blue</h5>
                <p class="small text-muted">Bleu électrique, effet néon</p>
                <div id="demo2" class="bg-light rounded-4 p-4 mb-3" style="min-height: 140px;"></div>
                <button class="btn btn-sm btn-outline-danger rounded-pill restart-demo" data-demo="2">
                  <i class="fas fa-redo-alt me-1"></i>Rejouer
                </button>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body p-4 text-center">
                <h5 class="fw-bold mb-2"><i class="fas fa-moon text-purple me-2"></i>Violet Néon</h5>
                <p class="small text-muted">Dégradé violet, pulsation intense</p>
                <div id="demo3" class="bg-light rounded-4 p-4 mb-3" style="min-height: 140px;"></div>
                <button class="btn btn-sm btn-outline-danger rounded-pill restart-demo" data-demo="3">
                  <i class="fas fa-redo-alt me-1"></i>Rejouer
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card bg-dark text-white border-0 rounded-4 mt-4">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-3"><i class="fas fa-code me-2"></i>Utilisation simple</h5>
            <pre class="bg-black text-white p-3 rounded-3" style="font-size: 0.8rem;"><code>// Créer un loader
const loader = new SnakeLoader({ size: 48, color: '#E23E3E' });
loader.render(document.getElementById('monContainer'));

// Masquer après 2 secondes
setTimeout(() => loader.hide(), 2000);</code></pre>
          </div>
        </div>
      </div>
    `;
    
    // Initialiser les démos
    const demos = [
      { id: 'demo1', color: '#E23E3E', secondary: '#FF6B6B', size: 40, glow: true, trail: true },
      { id: 'demo2', color: '#3B82F6', secondary: '#60A5FA', size: 40, glow: true, trail: true },
      { id: 'demo3', color: '#A855F7', secondary: '#C084FC', size: 40, glow: true, trail: true, pulse: true }
    ];
    
    const loaders = {};
    
    demos.forEach(demo => {
      const demoContainer = document.getElementById(demo.id);
      if (demoContainer) {
        const loader = new SnakeLoader({
          size: demo.size,
          color: demo.color,
          secondaryColor: demo.secondary,
          glow: demo.glow,
          trail: demo.trail,
          pulse: demo.pulse !== false
        });
        loader.render(demoContainer);
        loaders[demo.id] = loader;
        
        // Auto-hide après 3 secondes
        setTimeout(() => loader.hide(), 3000);
      }
    });
    
    // Boutons de redémarrage
    document.querySelectorAll('.restart-demo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const demoId = btn.getAttribute('data-demo');
        const loader = loaders[`demo${demoId}`];
        if (loader) {
          loader.show();
          setTimeout(() => loader.hide(), 3000);
        }
      });
    });
    
    // Bouton global loader
    const globalBtn = document.getElementById('globalLoaderBtn');
    if (globalBtn) {
      globalBtn.addEventListener('click', () => {
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '50%';
        tempContainer.style.left = '50%';
        tempContainer.style.transform = 'translate(-50%, -50%)';
        tempContainer.style.zIndex = '10001';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.padding = '30px';
        tempContainer.style.borderRadius = '20px';
        tempContainer.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
        document.body.appendChild(tempContainer);
        
        const loader = new SnakeLoader({ size: 50, color: '#E23E3E' });
        loader.render(tempContainer);
        
        setTimeout(() => {
          loader.hide();
          setTimeout(() => tempContainer.remove(), 300);
        }, 2500);
      });
    }
    
    // Bouton overlay
    const overlayBtn = document.getElementById('overlayBtn');
    if (overlayBtn) {
      overlayBtn.addEventListener('click', () => {
        showFullscreenOverlay({
          message: 'Chargement des données...',
          duration: 2500,
          color: '#E23E3E',
          size: 64
        });
      });
    }
  }
  
  // ==================== EXPORT ====================
  
  // Fonction simple pour créer un loader
  function createSnakeLoader(size = 40) {
    const loader = new SnakeLoader({
      size: size,
      color: '#E23E3E'
    });
    
    const container = document.createElement('div');
    loader.render(container);
    return container;
  }
  
  // Exports ES6
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSnakeLoader, SnakeLoader, createLoader, showTemporaryLoader, showFullscreenOverlay };
  }
  
  // Exports globaux (compatibilité)
  global.SnakeLoader = SnakeLoader;
  global.createLoader = createLoader;
  global.showTemporaryLoader = showTemporaryLoader;
  global.showFullscreenOverlay = showFullscreenOverlay;
  global.createDemoPage = createDemoPage;
  global.createSnakeLoader = createSnakeLoader;
  
})(window);

// ==================== AUTO-INITIALISATION ====================
// Si un élément #snake-loader-demo existe, créer la démo automatiquement
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('snake-loader-demo')) {
    window.createDemoPage('snake-loader-demo');
  }
});

// Export ES6 module — snake loader (pull-to-refresh uniquement)
export function createSnakeLoader(size = 40) {
  const loader = new window.SnakeLoader({
    size: size,
    color: '#E23E3E'
  });
  const container = document.createElement('div');
  loader.render(container);
  return container;
}

// Spinner léger pour les chargements initiaux de page
export function createPageSpinner(minHeight = '200px') {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    `display:flex;align-items:center;justify-content:center;width:100%;min-height:${minHeight};`;
  wrap.innerHTML =
    '<div style="width:32px;height:32px;border:3px solid rgba(226,62,62,0.2);' +
    'border-top-color:#E23E3E;border-radius:50%;animation:_psp .7s linear infinite;"></div>' +
    '<style>@keyframes _psp{to{transform:rotate(360deg)}}</style>';
  return wrap;
}

export default createSnakeLoader;