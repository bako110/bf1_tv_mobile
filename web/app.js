/* ═══════════════════════════════════════════════
   BF1 TV — Main JavaScript
   Navigation, Theme, Animations, Interactions
═══════════════════════════════════════════════ */
// Dans app.js
import { loadTicker } from '../../js/ticker.js';
'use strict';

/* ── Theme Manager ── */
const Theme = {
  init() {
    const saved = localStorage.getItem('bf1-theme') || 'dark';
    this.apply(saved);
  },
  apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('bf1-theme', t);
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.innerHTML = `<i class="bi bi-${t === 'dark' ? 'sun' : 'moon-stars'}-fill"></i>`;
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.apply(current === 'dark' ? 'light' : 'dark');
  }
};

/* ── Router / Navigation ── */
const Router = {
  current: 'accueil',
  init() {
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.go(el.dataset.page);
      });
    });
    this.go('accueil');
  },
  go(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target
    const target = document.getElementById(`page-${page}`);
    if (target) {
      target.classList.add('active');
      target.querySelectorAll('.anim-up').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.05}s`;
        el.style.animationName = 'none';
        requestAnimationFrame(() => { el.style.animationName = ''; });
      });
    }
    // Update nav
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });
    this.current = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

/* ── Navbar scroll effect ── */
const Navbar = {
  init() {
    const nav = document.getElementById('mainNavbar');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }
};

/* ── Filter pills ── */
const Filters = {
  init() {
    document.querySelectorAll('.filter-pills').forEach(group => {
      group.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          group.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        });
      });
    });
    document.querySelectorAll('.filter-bar-row2').forEach(group => {
      group.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          group.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        });
      });
    });
    document.querySelectorAll('.day-selector').forEach(ds => {
      ds.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          ds.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    });
  }
};

/* ── Display grid toggle ── */
const GridToggle = {
  init() {
    document.querySelectorAll('.display-toggle').forEach(tog => {
      const grid = tog.closest('.section, .page-section')?.querySelector('.videos-grid');
      tog.querySelectorAll('.display-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          tog.querySelectorAll('.display-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const mode = btn.dataset.mode;
          if (grid) {
            grid.parentElement.classList.remove('grid-2x','grid-3x','grid-4x');
            grid.parentElement.classList.add(`grid-${mode}x`);
          }
        });
      });
    });
  }
};

/* ── Notifications panel ── */
const Notifs = {
  init() {
    const btn = document.querySelector('.notif-btn');
    const panel = document.querySelector('.notif-panel');
    const close = document.querySelector('.notif-panel-close');
    if (!btn || !panel) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
    });
    if (close) close.addEventListener('click', () => panel.classList.remove('open'));
    
    // Fermer le panneau en cliquant en dehors
    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !panel.contains(e.target)) {
        panel.classList.remove('open');
      }
    });
  }
};

/* ── Chat interactions ── */
const Chat = {
  init() {
    const form = document.querySelector('.chat-input-wrap');
    if (!form) return;
    const input = form.querySelector('.chat-input');
    const sendBtn = form.querySelector('.chat-send-btn');
    const msgs = document.querySelector('.chat-messages');
    const send = () => {
      const val = input.value.trim();
      if (!val) return;
      const msg = document.createElement('div');
      msg.className = 'chat-msg anim-up';
      msg.innerHTML = `
        <div class="chat-msg-avatar" style="background:var(--red);color:#fff">M</div>
        <div>
          <div class="chat-msg-name">Moi</div>
          <div class="chat-msg-text">${this.escape(val)}</div>
          <div class="chat-msg-time">à l'instant</div>
        </div>`;
      msgs.appendChild(msg);
      msgs.scrollTop = msgs.scrollHeight;
      input.value = '';
    };
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  },
  escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};

/* ── Like / Bookmark buttons ── */
const Interactions = {
  init() {
    document.addEventListener('click', e => {
      const likeBtn = e.target.closest('.card-action-btn[data-action="like"]');
      if (likeBtn) {
        likeBtn.classList.toggle('liked');
        likeBtn.style.color = likeBtn.classList.contains('liked') ? 'var(--red)' : '';
        const icon = likeBtn.querySelector('i');
        if (icon) icon.className = likeBtn.classList.contains('liked') ? 'bi bi-heart-fill' : 'bi bi-heart';
        this.burst(likeBtn);
      }
      const bookBtn = e.target.closest('.card-action-btn[data-action="bookmark"]');
      if (bookBtn) {
        bookBtn.classList.toggle('saved');
        const icon = bookBtn.querySelector('i');
        if (icon) icon.className = bookBtn.classList.contains('saved') ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
      }
      const playerLike = e.target.closest('.player-action-btn');
      if (playerLike) {
        playerLike.classList.toggle('liked');
      }
    });
  },
  burst(el) {
    const rect = el.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.style.cssText = `position:fixed;width:6px;height:6px;border-radius:50%;background:var(--red);
        left:${rect.left+rect.width/2}px;top:${rect.top+rect.height/2}px;
        pointer-events:none;z-index:9999;animation:particle 0.6s ease forwards;
        transform:translate(-50%,-50%) rotate(${i*60}deg);`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }
};

/* ── Ticker duplicate for seamless loop ── */
const Ticker = {
  init() {
    const track = document.querySelector('.ticker-track');
    if (!track) return;
    const clone = track.cloneNode(true);
    track.parentElement.appendChild(clone);
  }
};

/* ── Scroll reveal ── */
const ScrollReveal = {
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.anim-up, .anim-fade').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }
};

/* ── Particle style injection ── */
const injectStyles = () => {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes particle {
      0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
      100% { transform: translate(calc(-50% + ${Math.random()*40-20}px), calc(-50% - ${30+Math.random()*20}px)) scale(0); opacity: 0; }
    }
  `;
  document.head.appendChild(s);
};

/* ── Tabs (Chaînes TV/Radio) ── */
const Tabs = {
  init() {
    document.querySelectorAll('[data-tab-group]').forEach(grp => {
      const groupId = grp.dataset.tabGroup;
      grp.querySelectorAll('[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
          grp.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          document.querySelectorAll(`[data-tab-content="${groupId}"]`).forEach(c => {
            c.classList.toggle('active', c.dataset.tabId === tab.dataset.tab);
          });
        });
      });
    });
  }
};

/* ── Player simulation ── */
const Player = {
  init() {
    const wrap = document.querySelector('.player-wrap');
    if (!wrap) return;
    let progress = 0;
    const bar = wrap.querySelector('.player-progress-fill');
    // Simulate live progress
    setInterval(() => {
      if (bar) { progress = (progress + 0.1) % 100; bar.style.width = progress + '%'; }
    }, 500);
    wrap.querySelector('.player-controls')?.querySelectorAll('.player-btn').forEach(b => {
      b.addEventListener('click', () => {
        b.style.transform = 'scale(1.4)';
        setTimeout(() => { b.style.transform = ''; }, 200);
      });
    });
  }
};

/* ── Hamburger menu (CORRIGÉ) ── */
const MobileMenu = {
  init() {
    const btn = document.querySelector('.navbar-hamburger');
    const links = document.querySelector('.navbar-links');
    console.log('Bouton hamburger:', document.querySelector('.navbar-hamburger'));
console.log('Liens:', document.querySelector('.navbar-links'));
    console.log('🔍 Recherche du menu:', { btn, links });
    
    if (!btn || !links) {
      console.error('❌ Menu hamburger non trouvé!');
      return;
    }
    
    console.log('✅ Menu hamburger trouvé, attachement des événements');
    
    // Supprimer les anciens événements pour éviter les doublons
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    const newLinks = links.cloneNode(true);
    links.parentNode.replaceChild(newLinks, links);
    
    const finalBtn = document.querySelector('.navbar-hamburger');
    const finalLinks = document.querySelector('.navbar-links');
    
    // Ouvrir/fermer le menu au clic
    finalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔄 Clic sur le menu hamburger');
      finalBtn.classList.toggle('open');
      finalLinks.classList.toggle('open');
      
      // Empêcher le scroll du body
      if (finalLinks.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
    
    // Fermer le menu en cliquant sur un lien
    finalLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        finalBtn.classList.remove('open');
        finalLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
    
    // Fermer le menu en cliquant en dehors
    document.addEventListener('click', (e) => {
      if (!finalBtn.contains(e.target) && !finalLinks.contains(e.target)) {
        finalBtn.classList.remove('open');
        finalLinks.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }
};

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initialisation de l\'application');
  
  // Charger le ticker
  loadTicker();
  setInterval(() => {
    loadTicker();
  }, 300000);
  
  // Initialiser tous les modules
  Theme.init();
  Router.init();
  Navbar.init();
  MobileMenu.init();
  Filters.init();
  GridToggle.init();
  Notifs.init();
  Chat.init();
  Interactions.init();
  Ticker.init();
  Tabs.init();
  Player.init();
  injectStyles();
  
  // Small delay for scroll reveal
  setTimeout(() => ScrollReveal.init(), 100);
  
  console.log('✅ Tous les modules initialisés');
});

/* Expose theme toggle to onclick */
window.toggleTheme = () => Theme.toggle();
window.goPage = (p) => Router.go(p);