/**
 * Snake Loader - Système de chargement animé
 * Points tourbillonnants style serpent
 */

export function createSnakeLoader(size = 30) {
  const container = document.createElement('div');
  container.className = 'snake-loader-container';
  container.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    min-height: 100px;
  `;

  const loader = document.createElement('div');
  loader.className = 'snake-loader';
  loader.style.cssText = `
    position: relative;
    width: ${size}px;
    height: ${size}px;
    animation: snakeRotate 2s linear infinite;
  `;

  // Créer 8 points rapprochés en ligne pour effet serpent
  const points = [
    { top: '5%', left: '50%' },           // Point 1 (top)
    { top: '20%', left: 'calc(50% + 18%)' }, // Point 2 (top-right)
    { top: '50%', left: '100%' },         // Point 3 (right)
    { top: 'calc(50% + 18%)', left: 'calc(50% + 18%)' }, // Point 4 (bottom-right)
    { top: '95%', left: '50%' },          // Point 5 (bottom)
    { top: 'calc(50% + 18%)', left: 'calc(50% - 18%)' }, // Point 6 (bottom-left)
    { top: '50%', left: '0%' },           // Point 7 (left)
    { top: '20%', left: 'calc(50% - 18%)' }, // Point 8 (top-left)
  ];

  points.forEach((pos, index) => {
    const dot = document.createElement('div');
    dot.className = 'snake-dot';
    // Gradient d'opacité pour créer l'effet de traînée
    const opacity = (index + 1) / points.length;
    dot.style.cssText = `
      position: absolute;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: #E23E3E;
      opacity: ${opacity};
      transform: translate(-50%, -50%);
      ${Object.entries(pos).map(([k, v]) => `${k}: ${v}`).join('; ')};
    `;
    loader.appendChild(dot);
  });

  container.appendChild(loader);

  // Ajouter les styles d'animation s'ils n'existent pas
  if (!document.querySelector('style[data-snake-loader]')) {
    const style = document.createElement('style');
    style.setAttribute('data-snake-loader', 'true');
    style.textContent = `
      @keyframes snakeRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .snake-loader {
        animation: snakeRotate 2s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }

  return container;
}

export function wrapWithSnakeLoader(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
  `;
  wrapper.appendChild(createSnakeLoader(40));
  container.innerHTML = '';
  container.appendChild(wrapper);
}
