# 🎨 Système de Thèmes BF1 TV - Explication Complète

## 📋 Vue d'ensemble

Le système de thèmes de BF1 TV permet de basculer entre **mode sombre** et **mode clair** de manière fluide et persistante.

---

## 🔄 Flux complet : Du clic au changement visuel

### 1️⃣ **L'utilisateur clique sur un thème**

**Où ?** Dans la page **Profil** (`profile.js`)

```html
<div onclick="window._setTheme('light')">
  <div>Clair</div>
  <div>Thème clair</div>
</div>
```

Quand vous cliquez sur "Clair", "Sombre" ou "Automatique", cela appelle la fonction `window._setTheme('light')`.

---

### 2️⃣ **La fonction `_setTheme()` est exécutée**

**Fichier :** `mobile/js/pages/profile.js` (ligne 220)

```javascript
window._setTheme = (themeName) => {
  themeManager.setTheme(themeName, true);
  // Rafraîchir le profil pour mettre à jour l'affichage
  setTimeout(() => {
    renderProfile(container, user);
  }, 100);
};
```

Cette fonction fait 2 choses :
1. Appelle `themeManager.setTheme()` pour changer le thème
2. Rafraîchit la page profil pour afficher la sélection active

---

### 3️⃣ **Le ThemeManager applique le thème**

**Fichier :** `mobile/js/utils/themeManager.js` (ligne 64)

```javascript
setTheme(themeName, triggerEvent = true) {
  // Validation du thème
  if (!THEME_CONFIG[themeName]) {
    console.warn(`Thème invalide: ${themeName}`);
    return;
  }

  // Mémoriser le thème actuel
  this.currentTheme = themeName;

  // ✅ ÉTAPE CLÉS : Appliquer data-theme sur <html>
  document.documentElement.setAttribute('data-theme', themeName);

  // Sauvegarder dans localStorage pour la prochaine visite
  localStorage.setItem('bf1_theme_preference', themeName);

  // Déclencher un événement pour notifier les autres composants
  if (triggerEvent) {
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }));
  }
}
```

**Ce qui se passe :**
- Le thème est appliqué sur l'élément `<html>` via l'attribut `data-theme`
- Exemple : `<html data-theme="light">` ou `<html data-theme="dark">`
- Le choix est sauvegardé dans `localStorage` pour persister entre les sessions

---

### 4️⃣ **Les variables CSS s'appliquent automatiquement**

**Fichier :** `mobile/css/themes.css`

Le CSS utilise des **sélecteurs d'attribut** pour appliquer les bonnes variables :

```css
/* Mode sombre (par défaut) */
:root {
  --bg: #070707;
  --text: #FFFFFF;
  --card-bg: #1a1a1a;
  --border: #2a2a2a;
  /* ... */
}

/* Mode clair (quand data-theme="light") */
[data-theme="light"] {
  --bg: #F2F2F2;
  --text: #111111;
  --card-bg: #EEEEEE;
  --border: #DDDDDD;
  /* ... */
}
```

**Comment ça marche ?**
- Quand `<html data-theme="light">` est appliqué, le CSS `[data-theme="light"]` devient actif
- Toutes les variables CSS (`--bg`, `--text`, etc.) changent instantanément
- Tous les éléments qui utilisent `background: var(--bg)` se mettent à jour automatiquement

---

### 5️⃣ **L'interface se met à jour visuellement**

Tous les éléments qui utilisent les variables CSS changent de couleur :

```css
.app-header {
  background: var(--header-bg);  /* Devient #FFFFFF en mode clair */
  color: var(--header-text);      /* Devient #1a1a1a en mode clair */
}

.bf1-card-title {
  color: var(--text);             /* Devient #111111 en mode clair */
}

body {
  background: var(--bg);          /* Devient #F2F2F2 en mode clair */
}
```

**Résultat :** L'application passe instantanément du mode sombre au mode clair ! 🎉

---

## 🔑 Points clés du système

### ✅ Avantages

1. **Centralisé** : Toutes les couleurs sont dans `themes.css`
2. **Automatique** : Pas besoin de recharger la page
3. **Persistant** : Le choix est sauvegardé dans `localStorage`
4. **Performant** : Utilise les variables CSS natives du navigateur
5. **Maintenable** : Un seul endroit pour modifier les couleurs

### 🔄 Cycle de vie complet

```
1. Démarrage de l'app
   ↓
2. Script inline dans index.html lit localStorage
   ↓
3. Applique data-theme="dark" ou "light" sur <html>
   ↓
4. Variables CSS de themes.css s'appliquent
   ↓
5. Interface s'affiche avec le bon thème
   ↓
6. Utilisateur clique pour changer
   ↓
7. themeManager.setTheme() est appelé
   ↓
8. data-theme est mis à jour sur <html>
   ↓
9. Variables CSS changent automatiquement
   ↓
10. Interface se met à jour visuellement
```

---

## 📂 Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `mobile/index.html` | Script inline qui applique le thème au démarrage |
| `mobile/css/themes.css` | Définit toutes les variables CSS pour dark/light |
| `mobile/js/utils/themeManager.js` | Gère la logique de changement de thème |
| `mobile/js/pages/profile.js` | Interface utilisateur pour choisir le thème |
| `mobile/js/pages/settings.js` | Alternative pour changer le thème via settings |
| `mobile/js/app.js` | Initialise le themeManager au démarrage |

---

## 🎯 Exemple pratique

### Scénario : Passer du mode sombre au mode clair

1. **État initial** : `<html data-theme="dark">`
   - `--bg` = `#070707` (noir)
   - `--text` = `#FFFFFF` (blanc)

2. **Utilisateur clique sur "Clair"**
   - `window._setTheme('light')` est appelé

3. **ThemeManager applique le changement**
   - `document.documentElement.setAttribute('data-theme', 'light')`
   - `localStorage.setItem('bf1_theme_preference', 'light')`

4. **CSS s'adapte automatiquement**
   - `[data-theme="light"]` devient actif
   - `--bg` = `#F2F2F2` (gris clair)
   - `--text` = `#111111` (noir)

5. **Interface se met à jour**
   - Tous les `background: var(--bg)` passent au gris clair
   - Tous les `color: var(--text)` passent au noir
   - **Résultat visuel instantané !**

---

## 🛠️ API du ThemeManager

```javascript
import { themeManager } from './utils/themeManager.js';

// Changer le thème
themeManager.setTheme('light');  // Mode clair
themeManager.setTheme('dark');   // Mode sombre
themeManager.setTheme('auto');   // Automatique (suit le système)

// Basculer entre clair/sombre
themeManager.toggle();

// Obtenir le thème actuel
const current = themeManager.getCurrent(); // 'dark' ou 'light'

// Obtenir la préférence système
const systemPref = themeManager.getSystemPreference(); // 'dark' ou 'light'
```

---

## 🎨 Variables CSS disponibles

### Couleurs principales
- `--primary` : Couleur principale (#E23E3E)
- `--primary-hover` : Hover de la couleur principale
- `--primary-light` : Version transparente

### Backgrounds
- `--bg` : Background principal
- `--surface` : Surface des cartes
- `--card-bg` : Background des cartes
- `--hover-bg` : Background au survol

### Textes
- `--text` : Texte principal
- `--text-secondary` : Texte secondaire
- `--heading-color` : Titres
- `--body-color` : Corps de texte

### Bordures
- `--border` : Bordures principales
- `--divider` : Séparateurs

### Header
- `--header-bg` : Background du header
- `--header-text` : Texte du header
- `--header-border` : Bordure du header

---

## 💡 Bonnes pratiques

### ✅ À FAIRE
```css
/* Utiliser les variables CSS */
.my-element {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}
```

### ❌ À ÉVITER
```css
/* Ne PAS hardcoder les couleurs */
.my-element {
  background: #070707;  /* ❌ Mauvais */
  color: #FFFFFF;       /* ❌ Mauvais */
}
```

---

## 🔍 Débogage

Pour vérifier quel thème est actif :

```javascript
// Dans la console du navigateur
console.log(document.documentElement.getAttribute('data-theme'));
// Affiche : "dark" ou "light"

console.log(localStorage.getItem('bf1_theme_preference'));
// Affiche le thème sauvegardé

console.log(themeManager.getCurrent());
// Affiche le thème actuel du manager
```

---

## 🎉 Résumé

Le système de thèmes BF1 TV est **simple, efficace et professionnel** :

1. **Un clic** → `window._setTheme('light')`
2. **ThemeManager** → `document.documentElement.setAttribute('data-theme', 'light')`
3. **CSS** → `[data-theme="light"]` s'active
4. **Variables** → `--bg`, `--text`, etc. changent
5. **Interface** → Se met à jour automatiquement ! ✨

**Aucun rechargement de page nécessaire, tout est fluide et instantané !**
