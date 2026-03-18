import { isAuthenticated, getUser } from '../services/api.js';
import { createSnakeLoader } from '../utils/snakeLoader.js';

// ─── FAQ data ──────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Comment créer un compte ?',
    a: 'Appuyez sur "Mon Profil" puis "Créer un compte". Renseignez votre email et choisissez un mot de passe.',
  },
  {
    q: 'Comment accéder au contenu premium ?',
    a: 'Souscrivez à l\'un de nos plans (Basic, Standard ou Premium) depuis la section "Mon Abonnement" dans votre profil.',
  },
  {
    q: 'Ma vidéo ne charge pas, que faire ?',
    a: 'Vérifiez votre connexion internet. Si le problème persiste, redémarrez l\'application ou contactez-nous via le formulaire ci-dessous.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: 'Contactez notre service client via le formulaire de support ou par email à support@bf1tv.bf pour toute demande d\'annulation.',
  },
  {
    q: 'L\'application est lente, comment l\'optimiser ?',
    a: 'Fermez les autres applications en arrière-plan. Assurez-vous d\'avoir une bonne connexion Wi-Fi ou 4G. Videz le cache du navigateur si besoin.',
  },
];

// ─── render ────────────────────────────────────────────────────────────────

function renderSupport(container) {
  const user = isAuthenticated() ? getUser() : null;
  const prefill = user
    ? `value="${(user.username || '').replace(/"/g, '&quot;')}" readonly`
    : '';
  const prefillEmail = user
    ? `value="${(user.email || '').replace(/"/g, '&quot;')}" readonly`
    : '';

  const faqItems = FAQ.map(
    (item, i) => `
    <div class="rounded mb-2 overflow-hidden" style="background:#111;border:1px solid #2a2a2a;">
      <button class="w-100 d-flex align-items-center justify-content-between p-3 border-0 bg-transparent text-start"
              style="color:#fff;" onclick="_bf1FaqToggle(${i})">
        <span style="font-size:14px;font-weight:500;">${item.q}</span>
        <i id="faq-icon-${i}" class="bi bi-chevron-down" style="color:#E23E3E;font-size:13px;flex-shrink:0;margin-left:8px;"></i>
      </button>
      <div id="faq-body-${i}" style="display:none;padding:0 16px 14px;">
        <p style="color:#A0A0A0;font-size:13px;line-height:1.6;margin:0;">${item.a}</p>
      </div>
    </div>`,
  ).join('');

  container.innerHTML = `
    <!-- Header -->
    <div style="background:linear-gradient(160deg,#1a0505 0%,#111 60%);padding:32px 20px 24px;">
      <div class="d-flex flex-column align-items-center text-center">
        <div class="rounded-circle d-flex align-items-center justify-content-center mb-3"
             style="width:64px;height:64px;background:rgba(226,62,62,0.15);border:2px solid #E23E3E;">
          <i class="bi bi-headset" style="font-size:30px;color:#E23E3E;"></i>
        </div>
        <h2 class="fw-bold mb-1" style="font-size:20px;">Aide &amp; Support</h2>
        <p style="color:#A0A0A0;font-size:13px;margin:0;">Nous sommes là pour vous aider</p>
      </div>
    </div>

    <div class="px-3 pt-3">

      <!-- Contacts rapides -->
      <div class="d-flex gap-2 mb-4">
        <a href="mailto:support@bf1tv.bf"
           class="flex-fill d-flex flex-column align-items-center p-3 rounded text-decoration-none"
           style="background:#1a1a1a;border:1px solid #2a2a2a;">
          <i class="bi bi-envelope-fill mb-1" style="font-size:22px;color:#E23E3E;"></i>
          <span style="font-size:12px;color:#fff;">Email</span>
        </a>
        <a href="https://wa.me/22600000000" target="_blank" rel="noopener"
           class="flex-fill d-flex flex-column align-items-center p-3 rounded text-decoration-none"
           style="background:#1a1a1a;border:1px solid #2a2a2a;">
          <i class="bi bi-whatsapp mb-1" style="font-size:22px;color:#25D366;"></i>
          <span style="font-size:12px;color:#fff;">WhatsApp</span>
        </a>
        <a href="https://www.facebook.com/BF1TV" target="_blank" rel="noopener"
           class="flex-fill d-flex flex-column align-items-center p-3 rounded text-decoration-none"
           style="background:#1a1a1a;border:1px solid #2a2a2a;">
          <i class="bi bi-facebook mb-1" style="font-size:22px;color:#1877F2;"></i>
          <span style="font-size:12px;color:#fff;">Facebook</span>
        </a>
      </div>

      <!-- FAQ -->
      <div class="mb-4">
        <h3 class="fw-bold mb-3" style="font-size:15px;color:#E23E3E;">
          <i class="bi bi-question-circle me-2"></i>Questions fréquentes
        </h3>
        ${faqItems}
      </div>

      <!-- Formulaire contact -->
      <div class="mb-4 p-3 rounded" style="background:#1a1a1a;border:1px solid #2a2a2a;">
        <h3 class="fw-bold mb-3" style="font-size:15px;color:#E23E3E;">
          <i class="bi bi-chat-text me-2"></i>Envoyer un message
        </h3>

        <div class="mb-3">
          <label class="form-label" style="font-size:13px;color:#A0A0A0;">Nom</label>
          <input id="sup-name" type="text" class="form-control"
                 placeholder="Votre nom" ${prefill}
                 style="background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:14px;">
        </div>
        <div class="mb-3">
          <label class="form-label" style="font-size:13px;color:#A0A0A0;">Email</label>
          <input id="sup-email" type="email" class="form-control"
                 placeholder="votre@email.com" ${prefillEmail}
                 style="background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:14px;">
        </div>
        <div class="mb-3">
          <label class="form-label" style="font-size:13px;color:#A0A0A0;">Sujet</label>
          <select id="sup-subject" class="form-select"
                  style="background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:14px;">
            <option value="">Choisir un sujet...</option>
            <option>Problème technique</option>
            <option>Abonnement / Paiement</option>
            <option>Contenu indisponible</option>
            <option>Compte / Connexion</option>
            <option>Autre</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label" style="font-size:13px;color:#A0A0A0;">Message</label>
          <textarea id="sup-message" rows="4" class="form-control"
                    placeholder="Décrivez votre problème..."
                    style="background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:14px;resize:none;"></textarea>
        </div>

        <div id="sup-feedback" class="mb-2" style="display:none;font-size:13px;"></div>

        <button onclick="_bf1SupSubmit()"
                class="btn w-100 fw-bold"
                style="background:#E23E3E;color:#fff;border:none;border-radius:8px;padding:12px;">
          <i class="bi bi-send-fill me-2"></i>Envoyer
        </button>
      </div>

    </div>`;

  // ── FAQ toggle ─────────────────────────────────────────────────────────
  window._bf1FaqToggle = (i) => {
    const body = document.getElementById(`faq-body-${i}`);
    const icon = document.getElementById(`faq-icon-${i}`);
    const open = body.style.display === 'block';
    body.style.display = open ? 'none' : 'block';
    icon.className = open ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
  };

  // ── Form submit (mailto fallback) ──────────────────────────────────────
  window._bf1SupSubmit = () => {
    const name    = document.getElementById('sup-name')?.value.trim();
    const email   = document.getElementById('sup-email')?.value.trim();
    const subject = document.getElementById('sup-subject')?.value;
    const message = document.getElementById('sup-message')?.value.trim();
    const fb      = document.getElementById('sup-feedback');

    if (!name || !email || !subject || !message) {
      fb.style.display = 'block';
      fb.style.color = '#E23E3E';
      fb.textContent = 'Veuillez remplir tous les champs.';
      return;
    }

    const body = `Nom: ${name}\nEmail: ${email}\nSujet: ${subject}\n\n${message}`;
    const mailto = `mailto:support@bf1tv.bf?subject=${encodeURIComponent(`[BF1 App] ${subject}`)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');

    fb.style.display = 'block';
    fb.style.color = '#4CAF50';
    fb.textContent = 'Votre client email va s\'ouvrir. Merci de nous contacter !';
    document.getElementById('sup-message').value = '';
  };
}

// ─── entry point ──────────────────────────────────────────────────────────

export async function loadSupport() {
  const container = document.getElementById('support-container');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(createSnakeLoader(50));

  // Simulate minimal load for smooth UX
  await new Promise(r => setTimeout(r, 120));

  renderSupport(container);
}
