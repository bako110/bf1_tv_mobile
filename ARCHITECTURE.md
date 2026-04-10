# 🏗️ Architecture BF1 TV - Système de Thèmes et Styles

## 📁 Structure des fichiers

```
mobile/
├── css/
│   └── themes.css          # ✅ NOUVEAU - Variables CSS centralisées
├── js/
│   ├── utils/
│   │   ├── themeManager.js # ✅ SIMPLIFIÉ - Gestion des thèmes
│   │   └── cardStyles.js   # ✅ NOUVEAU - Styles de cartes réutilisables
│   └── pages/
│       ├── home.js         # ✅ REFACTORISÉ
│       ├── sports.js       # ✅ REFACTORISÉ
│       ├── jtandmag.js     # ✅ REFACTORISÉ
│       ├── reportages.js   # ✅ REFACTORISÉ
│       ├── divertissement.js # ✅ REFACTORISÉ
│       ├── tele-realite.js # ✅ REFACTORISÉ
│       └── archive.js      # ✅ REFACTORISÉ
├── style.css               # ✅ NETTOYÉ - Styles spécifiques uniquement
└── index.html              # ✅ MIS À JOUR - Import de themes.css
```

## 🎨 Système de Thèmes

### 1. **css/themes.css** - Variables CSS Centralisées

**Responsabilité :** Définir TOUTES les variables CSS pour les modes clair et sombre

**Variables disponibles :**
```css
/* Couleurs principales */
--primary, --primary-hover, --primary-light

/* Backgrounds */
--bg, --bg-1, --bg-2, --bg-3, --surface, --card-bg, --hover-bg

/* Textes */
--text, --text-1, --text-2, --text-3, --text-4, --text-secondary
--heading-color, --subheading-color, --body-color, --body-muted

/* Bordures et séparateurs */
--border, --divider

/* Icônes */
--icon-color

/* Header */
--header-bg, --header-border, --header-text, --header-back-btn

/* Badges et tags */
--badge-bg, --badge-text

/* Boutons */
--btn-secondary-bg, --btn-secondary-text, --btn-secondary-border

/* Overlays */
--hero-overlay, --card-overlay

/* Skeleton loader */
--skeleton-bg, --skeleton-shimmer
```

**Utilisation :**
```css
.mon-element {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}
```

### 2. **js/utils/themeManager.js** - Gestion des Thèmes

**Responsabilité :** Appliquer l'attribut `data-theme` sur `<html>`

**Avant (❌ Duplication) :**
```javascript
// 150+ lignes de variables CSS dupliquées
const THEME_CONFIG = {
  dark: { vars: { '--primary': '#E23E3E', ... } },
  light: { vars: { '--primary': '#E23E3E', ... } }
};
```

**Après (✅ Simplifié) :**
```javascript
// Seulement 13 lignes !
const THEME_CONFIG = {
  dark: { name: 'dark', label: '🌑 Sombre' },
  light: { name: 'light', label: '☀️ Clair' }
};
```

**API :**
```javascript
import { themeManager } from './utils/themeManager.js';

themeManager.setTheme('light');  // Changer le thème
themeManager.toggle();           // Basculer entre clair/sombre
themeManager.getCurrent();       // Obtenir le thème actuel
```

### 3. **js/utils/cardStyles.js** - Styles de Cartes Réutilisables

**Responsabilité :** Fournir une fonction unique pour injecter les styles de cartes

**Avant (❌ Duplication) :**
- Fonction `injectCardStyles()` dupliquée dans 7 fichiers
- ~200 lignes de CSS par fichier
- Total : ~1400 lignes de code dupliqué

**Après (✅ Centralisé) :**
- 1 seule fonction dans `cardStyles.js`
- ~200 lignes de CSS au total
- Importée partout où nécessaire

**Utilisation :**
```javascript
import { injectCardStyles } from '../utils/cardStyles.js';

export async function loadPage() {
  injectCardStyles(); // Injecter les styles une seule fois
  // ... reste du code
}
```

## 📊 Métriques d'Amélioration

### Avant la refactorisation :
- **Variables CSS :** Dupliquées dans 3 fichiers (style.css, themeManager.js, :root)
- **Styles de cartes :** Dupliqués dans 7 fichiers
- **Total lignes dupliquées :** ~2000 lignes
- **Maintenabilité :** ❌ Difficile (modifier 10+ endroits pour un changement)

### Après la refactorisation :
- **Variables CSS :** 1 seul fichier (themes.css)
- **Styles de cartes :** 1 seul fichier (cardStyles.js)
- **Total lignes économisées :** ~1800 lignes
- **Maintenabilité :** ✅ Facile (modifier 1 seul endroit)

## 🔄 Flux de Chargement

```
1. index.html charge themes.css
   ↓
2. Script inline applique data-theme="dark" ou "light"
   ↓
3. Les variables CSS sont automatiquement appliquées
   ↓
4. Page JS charge et appelle injectCardStyles()
   ↓
5. Les styles de cartes sont injectés dynamiquement
   ↓
6. Le contenu s'affiche avec le bon thème
```

## 🎯 Bonnes Pratiques

### ✅ À FAIRE :
1. **Utiliser les variables CSS** au lieu de couleurs hardcodées
   ```css
   /* ✅ BON */
   color: var(--text);
   
   /* ❌ MAUVAIS */
   color: #FFFFFF;
   ```

2. **Importer cardStyles.js** dans chaque page qui affiche des cartes
   ```javascript
   import { injectCardStyles } from '../utils/cardStyles.js';
   ```

3. **Appeler injectCardStyles()** une seule fois au début du chargement
   ```javascript
   export async function loadPage() {
     injectCardStyles(); // ✅ Une seule fois
     // ...
   }
   ```

### ❌ À ÉVITER :
1. **Ne PAS dupliquer** les variables CSS
2. **Ne PAS créer** de nouvelles fonctions `injectCardStyles()`
3. **Ne PAS hardcoder** les couleurs dans le code

## 🚀 Ajouter un Nouveau Thème

Pour ajouter un thème (ex: "auto") :

1. **Ajouter dans themes.css :**
   ```css
   [data-theme="auto"] {
     /* Variables CSS */
   }
   ```

2. **Ajouter dans themeManager.js :**
   ```javascript
   const THEME_CONFIG = {
     dark: { name: 'dark', label: '🌑 Sombre' },
     light: { name: 'light', label: '☀️ Clair' },
     auto: { name: 'auto', label: '🌓 Auto' } // ✅ NOUVEAU
   };
   ```

C'est tout ! Aucune autre modification nécessaire.

## 📝 Résumé

**Principe DRY (Don't Repeat Yourself) appliqué avec succès :**
- ✅ Variables CSS centralisées
- ✅ Styles de cartes réutilisables
- ✅ Code maintenable et professionnel
- ✅ Performance optimisée
- ✅ Zéro duplication

**Résultat :** Code propre, maintenable et évolutif ! 🎉
