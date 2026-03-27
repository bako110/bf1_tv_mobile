/**
 * Prépare le dossier www/ en copiant mobile/ dedans
 * Utilisé avant chaque build Capacitor : npm run build
 */
const fs = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, '..', 'mobile');
const DEST = path.join(__dirname, '..', 'www');

// Dossiers/fichiers à exclure (android, scripts sont inutiles dans www/)
const EXCLUDE = ['android', 'scripts'];

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src)) {
    if (EXCLUDE.includes(entry)) continue;

    const srcPath  = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Synchronisation mobile/ → www/...');
copyDir(SRC, DEST);
console.log('✅ www/ prêt pour Capacitor');
