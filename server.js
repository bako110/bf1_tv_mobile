const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

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

const server = http.createServer((req, res) => {
  // Nettoyer l'URL en retirant les paramètres de requête
  const cleanUrl = req.url.split('?')[0];
  let filePath;
  
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
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
  console.log('Appuyez sur Ctrl+C pour arrêter');
});
