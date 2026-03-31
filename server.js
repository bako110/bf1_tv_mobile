const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_BASE_URL = 'https://bf1.fly.dev/api/v1';
const SITE_URL = 'https://bf1-tv-mobile.onrender.com';

// Fetch JSON from an HTTPS URL
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Replace OG / Twitter Card meta tag values in an HTML string
function injectOgTags(html, { title, description, image, url }) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const t = esc(title);
  const d = esc(description);
  html = html.replace(/(<meta property="og:title"[^>]*content=")[^"]*(")/i, `$1${t}$2`);
  html = html.replace(/(<meta property="og:description"[^>]*content=")[^"]*(")/i, `$1${d}$2`);
  html = html.replace(/(<meta property="og:image"[^>]*content=")[^"]*(")/i, `$1${image}$2`);
  html = html.replace(/(<meta property="og:url"[^>]*content=")[^"]*(")/i, `$1${url}$2`);
  html = html.replace(/(<meta name="twitter:title"[^>]*content=")[^"]*(")/i, `$1${t}$2`);
  html = html.replace(/(<meta name="twitter:description"[^>]*content=")[^"]*(")/i, `$1${d}$2`);
  html = html.replace(/(<meta name="twitter:image"[^>]*content=")[^"]*(")/i, `$1${image}$2`);
  return html;
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  // Parse URL keeping query string for deeplink handling
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  const cleanUrl = reqUrl.pathname;
  let filePath;

  // ── Reel deeplink: inject OG tags specific to the reel ──────────────────
  if (cleanUrl === '/pages/reels.html' && reqUrl.searchParams.has('reel')) {
    const reelId = reqUrl.searchParams.get('reel');
    // Validate: MongoDB ObjectId is 24 hex chars — prevent SSRF
    if (/^[0-9a-fA-F]{24}$/.test(reelId)) {
      try {
        const htmlPath = path.join(__dirname, 'web', 'pages', 'reels.html');
        const [htmlRaw, reel] = await Promise.all([
          fs.promises.readFile(htmlPath, 'utf8'),
          fetchJson(`${API_BASE_URL}/reels/${encodeURIComponent(reelId)}`)
        ]);
        const title = `${reel.title} — BF1 TV`;
        const description = reel.description || 'Regardez ce reel sur BF1 TV.';
        const image = `${SITE_URL}/logo.png`;
        const url = `${SITE_URL}/pages/reels.html?reel=${reelId}`;
        const html = injectOgTags(htmlRaw, { title, description, image, url });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      } catch (_) { /* fall through to static handler */ }
    }
  }

  // ── Static file handler ─────────────────────────────────────────────────
  // Route racine -> index.html de détection
  if (cleanUrl === '/') {
    filePath = path.join(__dirname, 'index.html');
  }
  // Fichiers partagés (shared/)
  else if (cleanUrl.startsWith('/shared/')) {
    filePath = path.join(__dirname, cleanUrl);
  }
  // Fichiers mobile (mobile/)
  else if (cleanUrl.startsWith('/mobile/')) {
    filePath = path.join(__dirname, cleanUrl);
  }
  // Fichiers web (web/)
  else if (cleanUrl.startsWith('/web/')) {
    filePath = path.join(__dirname, cleanUrl);
  }
  // Tout le reste -> web/
  else {
    filePath = path.join(__dirname, 'web', cleanUrl);
  }
  
  let extname = path.extname(filePath);
  let contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`<h1>404 - Fichier non trouvé</h1><p>Chemin: ${req.url}</p>`);
      return;
    }
    const headers = { 'Content-Type': contentType };
    if (extname === '.js' || extname === '.css') {
      headers['Cache-Control'] = 'no-cache, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
  console.log('Appuyez sur Ctrl+C pour arrêter');
});
