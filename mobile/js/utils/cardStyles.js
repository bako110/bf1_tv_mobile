/**
 * Utilitaire centralisé pour l'injection des styles de cartes
 * Utilise les variables CSS définies dans css/themes.css
 * Évite la duplication de code entre les pages
 */

export function injectCardStyles() {
  // Supprimer l'ancien style s'il existe
  const oldStyle = document.getElementById('bf1-card-styles');
  if (oldStyle) oldStyle.remove();
  
  const style = document.createElement('style');
  style.id = 'bf1-card-styles';
  style.textContent = `
    /* Empty State */
    .bf1-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--text-secondary);
      gap: 16px;
    }
    
    .bf1-empty-state i {
      font-size: 56px;
      opacity: 0.25;
      color: var(--text-3);
    }
    
    .bf1-empty-state p {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    /* Card Container */
    .bf1-content-card {
      flex-shrink: 0;
      text-decoration: none;
      display: block;
      cursor: pointer;
      animation: cardFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      animation-delay: calc(var(--card-index) * 0.05s);
      opacity: 0;
      width: 42vw;
      max-width: 240px;
      min-width: 160px;
    }

    .bf1-card-inner {
      position: relative;
      width: 100%;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bf1-content-card:hover .bf1-card-inner {
      transform: translateY(-4px);
    }

    .bf1-content-card:active .bf1-card-inner {
      transform: scale(0.97) translateY(-2px);
    }

    /* Card Image */
    .bf1-card-image-wrapper {
      position: relative;
      width: 100%;
      height: 320px;
      border-radius: 16px;
      overflow: hidden;
      background: var(--card-bg);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      transition: box-shadow 0.4s ease;
    }

    .bf1-content-card:hover .bf1-card-image-wrapper {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    }

    .bf1-card-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bf1-content-card:hover .bf1-card-image {
      transform: scale(1.08);
    }

    .bf1-card-image.bf1-card-locked {
      filter: brightness(0.5) saturate(0.6) blur(1px);
    }

    /* Badge "Nouveau" */
    .bf1-nouveau-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #0E7AFE 0%, #0A5FD4 100%);
      color: white;
      font-size: 10px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      z-index: 3;
      box-shadow: 0 4px 16px rgba(14, 122, 254, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      display: flex;
      align-items: center;
      gap: 5px;
      backdrop-filter: blur(8px);
    }
    
    .bf1-nouveau-badge::before {
      content: '';
      width: 5px;
      height: 5px;
      background: white;
      border-radius: 50%;
      animation: pulseDot 1.5s ease-in-out infinite;
    }
    
    @keyframes pulseDot {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1); 
        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
      }
      50% { 
        opacity: 0.6; 
        transform: scale(0.85); 
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0);
      }
    }

    /* Bouton Favoris */
    .bf1-add-button {
      position: absolute;
      bottom: 10px;
      right: 10px;
      width: 38px;
      height: 38px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(12px);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      z-index: 3;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1.5px solid rgba(255, 255, 255, 0.2);
    }

    .bf1-add-button:hover {
      background: rgba(0, 0, 0, 0.9);
      transform: scale(1.12);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    /* Badge Abonnement */
    .bf1-tier-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 800;
      color: white;
      z-index: 3;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .bf1-tier-badge i {
      font-size: 10px;
    }

    /* Lock Overlay */
    .bf1-lock-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 4;
      pointer-events: none;
      border-radius: 16px;
      background: rgba(0, 0, 0, 0.3);
    }

    .bf1-lock-icon {
      width: 48px;
      height: 48px;
      background: rgba(0, 0, 0, 0.85);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    }

    .bf1-lock-icon i {
      font-size: 20px;
      color: white;
    }

    /* Card Content */
    .bf1-card-content {
      padding: 14px 0 0;
    }

    .bf1-card-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.35;
      margin: 0;
      color: var(--text);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      letter-spacing: -0.3px;
      margin-bottom: 8px;
    }

    /* Card Metadata */
    .bf1-card-metadata {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--text-3);
      font-weight: 500;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .bf1-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .bf1-meta-item i {
      font-size: 10px;
      opacity: 0.7;
    }

    /* Card Stats (vues, likes, date) */
    .bf1-card-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
      margin-top: 8px;
    }

    .bf1-card-stats span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .bf1-card-stats i {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .bf1-card-stats .bf1-likes {
      color: #E23E3E;
    }

    .bf1-card-stats .bf1-likes i {
      color: #E23E3E;
    }

    /* List Cards */
    .bf1-list-card-link {
      display: block;
      margin-bottom: 12px;
      animation: cardFadeIn 0.5s ease-out forwards;
      animation-delay: calc(var(--card-index) * 0.05s);
      opacity: 0;
      text-decoration: none;
    }

    .bf1-list-card-link > div:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
    }

    .bf1-list-card-link > div:hover img {
      transform: scale(1.1);
    }

    .bf1-list-card-link:active > div {
      transform: scale(0.98);
    }

    /* Responsive - Petit écran */
    @media (max-width: 480px) {
      .bf1-card-image-wrapper {
        height: 280px;
      }
      
      .bf1-card-title {
        font-size: 14px;
      }
      
      .bf1-nouveau-badge {
        font-size: 9px;
        padding: 5px 10px;
      }
    }

    /* Animation */
    @keyframes cardFadeIn {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;
  
  document.head.appendChild(style);
}