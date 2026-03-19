/**
 * prepare-www.js
 * Copie les fichiers web dans www/, synchronise avec Android, et build l'APK release.
 * Usage :
 *   node scripts/prepare-www.js          → copie www/ seulement
 *   node scripts/prepare-www.js --apk    → copie + cap sync + assembleRelease
 */

const fs    = require('fs');
const path  = require('path');
const { execSync } = require('child_process');

const BUILD_APK = process.argv.includes('--apk');

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

console.log(`\n✨ ${ok} élément(s) copié(s) dans www/\n`);

if (!BUILD_APK) {
  console.log('💡 Lancez  node scripts/prepare-www.js --apk  pour builder l\'APK release.\n');
  process.exit(0);
}

// ─── Cap sync ────────────────────────────────────────────────────────────────
function run(cmd, label) {
  console.log(`\n⏳ ${label}…`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    console.log(`✅ ${label} terminé\n`);
  } catch (e) {
    console.error(`❌ Échec : ${label}`);
    process.exit(1);
  }
}

run('npx cap sync android', 'cap sync android');

// ─── Gradle assembleRelease ───────────────────────────────────────────────────
const gradlew = path.join(ROOT, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run(`"${gradlew}" assembleRelease`, 'Gradle assembleRelease');

// ─── Résultat ─────────────────────────────────────────────────────────────────
const APK = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (fs.existsSync(APK)) {
  const size = (fs.statSync(APK).size / 1024 / 1024).toFixed(1);
  console.log(`🎉 APK release prêt : ${APK}  (${size} MB)\n`);
} else {
  console.warn('⚠️  APK introuvable à l\'emplacement attendu.\n');
}
