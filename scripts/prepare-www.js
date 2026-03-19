/**
 * prepare-www.js
 * Copie les fichiers web dans le dossier www/ pour Capacitor
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW  = path.join(ROOT, 'www');

// Dossiers/fichiers à copier
const COPY_LIST = [
  { src: 'index.html', dest: 'index.html' },
  { src: 'js',         dest: 'js'         },
  { src: 'pages',      dest: 'pages'      },
  { src: 'assets',     dest: 'assets'     },
];

// ─── Utilitaires ────────────────────────────────────────────────────────────

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyItem(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyItem(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// ─── Build ──────────────────────────────────────────────────────────────────

console.log('🔨 Préparation du dossier www/ ...\n');

// Nettoyer puis recréer www/
rmDir(WWW);
fs.mkdirSync(WWW);

// Copier chaque entrée
let ok = 0;
for (const { src, dest } of COPY_LIST) {
  const srcPath  = path.join(ROOT, src);
  const destPath = path.join(WWW, dest);

  if (!fs.existsSync(srcPath)) {
    console.warn(`  ⚠️  Ignoré (introuvable) : ${src}`);
    continue;
  }

  copyItem(srcPath, destPath);
  console.log(`  ✅  ${src}  →  www/${dest}`);
  ok++;
}

console.log(`\n✨ ${ok} élément(s) copié(s) dans www/  — prêt pour cap sync\n`);
