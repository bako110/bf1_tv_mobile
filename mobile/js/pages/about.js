import { createSnakeLoader } from '../utils/snakeLoader.js';

// ─── render ────────────────────────────────────────────────────────────────

function renderAbout(container) {
  container.innerHTML = `
    <!-- Header -->
    <div style="background:linear-gradient(160deg,#1a0505 0%,#111 60%);padding:40px 20px 28px;">
      <div class="d-flex flex-column align-items-center text-center">
        <img src="./assets/images/logo.png" alt="BF1 TV"
             style="width:100px;height:100px;object-fit:contain;
                    filter:drop-shadow(0 0 16px rgba(226,62,62,0.45));margin-bottom:16px;">
        <h2 class="fw-bold mb-1" style="font-size:22px;">BF1 TV</h2>
        <p style="color:#A0A0A0;font-size:13px;font-style:italic;margin:0;">
          La chaîne au cœur de nos défis
        </p>
        <span class="badge mt-3" style="background:rgba(226,62,62,0.15);color:#E23E3E;border:1px solid #E23E3E44;font-size:12px;letter-spacing:.5px;">
          Version 1.0.0
        </span>
      </div>
    </div>

    <div class="px-3 pt-3">

      <!-- Mission -->
      <div class="mb-4 p-3 rounded" style="background:#1a1a1a;border:1px solid #2a2a2a;">
        <div class="d-flex align-items-center gap-2 mb-2">
          <i class="bi bi-broadcast-pin" style="color:#E23E3E;font-size:18px;"></i>
          <span class="fw-bold" style="font-size:15px;">Notre Mission</span>
        </div>
        <p style="color:#C0C0C0;font-size:13px;line-height:1.7;margin:0;">
          BF1 est la première chaîne de télévision privée du Burkina Faso. Fondée pour informer,
          divertir et éduquer les Burkinabè, BF1 offre une programmation variée : journaux télévisés,
          émissions culturelles, sportives et un accompagnement de l'actualité nationale et internationale.
        </p>
      </div>

      <!-- Ce que propose l'application -->
      <div class="mb-4">
        <h3 class="fw-bold mb-3" style="font-size:15px;color:#E23E3E;">
          <i class="bi bi-phone me-2"></i>L'Application BF1
        </h3>
        <div class="d-flex flex-column gap-2">
          ${feature('bi-play-circle-fill', 'VOD & Replay', 'Regardez vos émissions en différé à tout moment')}
          ${feature('bi-wifi', 'Live Stream', 'Suivez BF1 en direct où que vous soyez')}
          ${feature('bi-newspaper', 'Actualités', 'Restez informé des dernières nouvelles du Burkina et du monde')}
          ${feature('bi-trophy-fill', 'Sport', 'Retrouvez toutes les actualités sportives')}
          ${feature('bi-star-fill', 'Premium', 'Accédez à du contenu exclusif en qualité HD')}
        </div>
      </div>

      <!-- Réseaux sociaux -->
      <div class="mb-4 p-3 rounded" style="background:#1a1a1a;border:1px solid #2a2a2a;">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-share-fill" style="color:#E23E3E;font-size:18px;"></i>
          <span class="fw-bold" style="font-size:15px;">Suivez-nous</span>
        </div>
        <div class="d-flex flex-column gap-2">
          ${socialLink('bi-facebook', '#1877F2', 'Facebook', 'BF1 TV', 'https://www.facebook.com/BF1TV')}
          ${socialLink('bi-youtube', '#FF0000', 'YouTube', '@BF1TV', 'https://www.youtube.com/@BF1TV')}
          ${socialLink('bi-twitter-x', '#fff', 'Twitter / X', '@BF1TV', 'https://twitter.com/BF1TV')}
          ${socialLink('bi-instagram', '#E1306C', 'Instagram', '@bf1tv_officiel', 'https://www.instagram.com/bf1tv_officiel')}
        </div>
      </div>

      <!-- Contact -->
      <div class="mb-4 p-3 rounded" style="background:#1a1a1a;border:1px solid #2a2a2a;">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-geo-alt-fill" style="color:#E23E3E;font-size:18px;"></i>
          <span class="fw-bold" style="font-size:15px;">Nous contacter</span>
        </div>
        ${infoRow('bi-envelope', 'Email', 'contact@bf1tv.bf')}
        ${infoRow('bi-telephone', 'Téléphone', '+226 25 36 00 00')}
        ${infoRow('bi-pin-map', 'Adresse', 'Ouagadougou, Burkina Faso')}
      </div>

      <!-- Légal -->
      <div class="mb-2 p-3 rounded" style="background:#111;border:1px solid #222;">
        <div class="d-flex justify-content-between align-items-center py-1">
          <span style="font-size:13px;color:#A0A0A0;">Mentions légales</span>
          <i class="bi bi-chevron-right" style="color:#444;font-size:13px;"></i>
        </div>
        <div class="d-flex justify-content-between align-items-center py-1" style="border-top:1px solid #222;">
          <span style="font-size:13px;color:#A0A0A0;">Politique de confidentialité</span>
          <i class="bi bi-chevron-right" style="color:#444;font-size:13px;"></i>
        </div>
        <div class="d-flex justify-content-between align-items-center py-1" style="border-top:1px solid #222;">
          <span style="font-size:13px;color:#A0A0A0;">Conditions d'utilisation</span>
          <i class="bi bi-chevron-right" style="color:#444;font-size:13px;"></i>
        </div>
      </div>

      <p class="text-center mt-3 mb-2" style="color:#444;font-size:11px;">
        BF1 TV &copy; 2026 &nbsp;·&nbsp; Tous droits réservés
      </p>

    </div>`;
}

function feature(icon, title, desc) {
  return `
    <div class="d-flex align-items-center gap-3 p-3 rounded"
         style="background:#111;border:1px solid #2a2a2a;">
      <div class="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
           style="width:40px;height:40px;background:rgba(226,62,62,0.12);">
        <i class="bi ${icon}" style="color:#E23E3E;font-size:18px;"></i>
      </div>
      <div>
        <div style="font-size:14px;font-weight:600;">${title}</div>
        <div style="font-size:12px;color:#A0A0A0;">${desc}</div>
      </div>
    </div>`;
}

function socialLink(icon, color, platform, handle, url) {
  return `
    <a href="${url}" target="_blank" rel="noopener"
       class="d-flex align-items-center gap-3 p-2 rounded text-decoration-none"
       style="color:#fff;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background=''">
      <i class="bi ${icon}" style="font-size:22px;color:${color};width:28px;text-align:center;"></i>
      <div>
        <div style="font-size:13px;font-weight:500;">${platform}</div>
        <div style="font-size:12px;color:#A0A0A0;">${handle}</div>
      </div>
      <i class="bi bi-arrow-up-right ms-auto" style="color:#444;font-size:13px;"></i>
    </a>`;
}

function infoRow(icon, label, value) {
  return `
    <div class="d-flex align-items-start gap-3 py-2" style="border-bottom:1px solid #2a2a2a;">
      <i class="bi ${icon}" style="color:#E23E3E;font-size:16px;margin-top:2px;"></i>
      <div>
        <div style="font-size:12px;color:#A0A0A0;">${label}</div>
        <div style="font-size:13px;">${value}</div>
      </div>
    </div>`;
}

// ─── entry point ──────────────────────────────────────────────────────────

export async function loadAbout() {
  const container = document.getElementById('about-container');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(createSnakeLoader(50));

  await new Promise(r => setTimeout(r, 120));

  renderAbout(container);
}
