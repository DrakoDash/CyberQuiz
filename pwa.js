/* ============================================================
   CyberQuiz — Web app (pwa.js)
   À inclure dans le <head> de chaque page :
     <script src="pwa.js" defer></script>

   Ce script :
   1. enregistre le service worker (mode hors-ligne) ;
   2. affiche un bouton « Installer l'app » dans la barre de navigation
      (Windows, Android, ChromeOS, macOS via Chrome/Edge) ;
   3. sur iPhone / iPad, explique comment ajouter l'app à l'écran d'accueil ;
   4. propose la mise à jour quand une nouvelle version est en ligne ;
   5. signale quand l'appareil est hors-ligne.
   ============================================================ */
(function () {
  'use strict';

  const isStandalone = () =>
    matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let deferredPrompt = null;
  let registration = null;

  /* ── 1. Service worker ── */
  if ('serviceWorker' in navigator) {
    // Chemin relatif : fonctionne dans le sous-dossier GitHub Pages.
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => {
        registration = reg;
        // Une nouvelle version attend déjà (onglet resté ouvert pendant une mise à jour).
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner();
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
          });
        });
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch(err => console.warn('[PWA] Service worker non enregistré :', err));

    // Rechargement uniquement après un clic sur « Mettre à jour ».
    let userAskedUpdate = false;
    window.addEventListener('pwa-apply-update', () => { userAskedUpdate = true; });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (userAskedUpdate) location.reload();
    });
  }

  /* ── 2. Installation (Chrome, Edge, Android) ── */
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();            // on affiche notre propre bouton
    deferredPrompt = e;
    showInstallButton();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    removeInstallButton();
    toast('✅ CyberQuiz est installé ! Retrouve-le dans ton menu Démarrer ou sur ton écran d’accueil.');
  });

  /* ── 3. iPhone / iPad : pas de bouton système, on explique la marche à suivre ── */
  document.addEventListener('DOMContentLoaded', () => {
    if (isIOS && !isStandalone()) showInstallButton();
  });

  /* ── 5. Hors-ligne ── */
  window.addEventListener('online', () => document.getElementById('pwa-offline')?.remove());
  window.addEventListener('offline', showOfflineBadge);
  document.addEventListener('DOMContentLoaded', () => { if (!navigator.onLine) showOfflineBadge(); });

  /* ==========================================================
     INTERFACE
     ========================================================== */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function showInstallButton() {
    if (isStandalone() || document.getElementById('pwa-install-btn')) return;
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    injectStyles();
    const btn = el('button', 'pwa-install-btn');
    btn.id = 'pwa-install-btn';
    btn.type = 'button';
    btn.title = 'Installer CyberQuiz sur cet appareil';
    btn.append(el('span', 'pwa-ico', '⬇'), el('span', 'pwa-label', 'Installer l’app'));
    btn.addEventListener('click', install);

    const toggle = navbar.querySelector('.nav-toggle');
    const badge = navbar.querySelector('.nav-badge');
    if (toggle) navbar.insertBefore(btn, toggle);
    else if (badge) {
      // Pages de quiz : on regroupe le bouton et le badge pour garder le logo centré.
      const group = el('div', 'pwa-nav-group');
      badge.replaceWith(group);
      group.append(btn, badge);
    } else navbar.append(btn);
  }

  function removeInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (!btn) return;
    const group = btn.closest('.pwa-nav-group');
    btn.remove();
    if (group) group.replaceWith(...group.childNodes);
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') removeInstallButton();
      return;
    }
    if (isIOS) {
      showDialog('Installer CyberQuiz sur iPhone / iPad', [
        'Ouvre ce site dans Safari.',
        'Touche le bouton Partager (le carré avec une flèche vers le haut).',
        'Choisis « Sur l’écran d’accueil », puis « Ajouter ».'
      ]);
      return;
    }
    showDialog('Installer CyberQuiz', [
      'Ouvre le site dans Microsoft Edge ou Google Chrome.',
      'Clique sur l’icône d’installation à droite de la barre d’adresse (un écran avec une flèche).',
      'Ou ouvre le menu ⋯ puis « Applications » → « Installer CyberQuiz ».'
    ]);
  }

  function showDialog(title, steps) {
    injectStyles();
    document.getElementById('pwa-dialog')?.remove();
    const overlay = el('div', 'pwa-overlay');
    overlay.id = 'pwa-dialog';
    const box = el('div', 'pwa-dialog');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'pwa-dialog-title');
    const h = el('h2', null, title); h.id = 'pwa-dialog-title';
    const ol = el('ol');
    steps.forEach(s => ol.append(el('li', null, s)));
    const close = el('button', 'pwa-btn', 'Compris');
    close.type = 'button';
    const done = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') done(); };
    close.addEventListener('click', done);
    overlay.addEventListener('click', e => { if (e.target === overlay) done(); });
    document.addEventListener('keydown', onKey);
    box.append(h, ol, close);
    overlay.append(box);
    document.body.append(overlay);
    close.focus();
  }

  function showUpdateBanner() {
    if (document.getElementById('pwa-update')) return;
    const show = () => {
      injectStyles();
      const bar = el('div', 'pwa-update');
      bar.id = 'pwa-update';
      bar.setAttribute('role', 'status');
      const go = el('button', 'pwa-btn', 'Mettre à jour');
      go.type = 'button';
      go.addEventListener('click', () => {
        window.dispatchEvent(new Event('pwa-apply-update'));
        if (registration?.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        else location.reload();
        bar.remove();
      });
      const later = el('button', 'pwa-close', '×');
      later.type = 'button';
      later.setAttribute('aria-label', 'Plus tard');
      later.addEventListener('click', () => bar.remove());
      bar.append(el('span', null, '🔄 Une nouvelle version de CyberQuiz est disponible.'), go, later);
      document.body.append(bar);
    };
    document.body ? show() : document.addEventListener('DOMContentLoaded', show);
  }

  function showOfflineBadge() {
    if (document.getElementById('pwa-offline')) return;
    injectStyles();
    const badge = el('div', 'pwa-offline', '📴 Hors-ligne — les quiz restent disponibles');
    badge.id = 'pwa-offline';
    badge.setAttribute('role', 'status');
    document.body.append(badge);
  }

  function toast(text) {
    injectStyles();
    const t = el('div', 'pwa-update', text);
    t.setAttribute('role', 'status');
    document.body.append(t);
    setTimeout(() => t.remove(), 6000);
  }

  /* ==========================================================
     STYLES (injectés une seule fois)
     ========================================================== */
  function injectStyles() {
    if (document.getElementById('pwa-styles')) return;
    const css = el('style');
    css.id = 'pwa-styles';
    css.textContent = `
      .pwa-nav-group { display:flex; align-items:center; gap:10px; }
      .pwa-install-btn { display:inline-flex; align-items:center; gap:7px; padding:7px 13px; border-radius:8px;
        background:rgba(0,191,255,.08); border:1px solid rgba(0,191,255,.45); color:#4cc9f0; cursor:pointer;
        font:600 .8rem 'Poppins',system-ui,sans-serif; white-space:nowrap; transition:background .2s, box-shadow .2s; }
      .pwa-install-btn:hover { background:rgba(0,191,255,.16); box-shadow:0 0 14px rgba(0,191,255,.25); }
      .pwa-ico { font-size:.9rem; line-height:1; }
      @media (max-width:520px) { .pwa-label { display:none; } .pwa-install-btn { padding:7px 10px; } .pwa-nav-group .nav-badge { display:none; } }

      .pwa-update { position:fixed; left:50%; bottom:18px; transform:translateX(-50%); z-index:10000;
        display:flex; align-items:center; gap:12px; max-width:calc(100vw - 32px); padding:11px 14px 11px 18px;
        background:#0d1430; border:1px solid rgba(76,201,240,.45); border-radius:12px; color:#e8eaf6;
        font:.85rem 'Poppins',system-ui,sans-serif; box-shadow:0 10px 30px rgba(0,0,0,.5); }
      .pwa-btn { padding:7px 15px; border:0; border-radius:8px; background:#00bfff; color:#001a2e;
        font:700 .8rem 'Poppins',system-ui,sans-serif; cursor:pointer; white-space:nowrap; }
      .pwa-btn:hover { background:#4cc9f0; }
      .pwa-close { background:none; border:0; color:rgba(255,255,255,.55); font-size:1.2rem; cursor:pointer; padding:0 4px; }
      .pwa-close:hover { color:#fff; }

      .pwa-offline { position:fixed; left:16px; bottom:16px; z-index:9999; padding:8px 13px; border-radius:99px;
        background:#24170a; border:1px solid rgba(247,168,27,.45); color:#f7c26b; font:.78rem 'Poppins',system-ui,sans-serif; }

      .pwa-overlay { position:fixed; inset:0; z-index:10001; display:grid; place-items:center; padding:16px;
        background:rgba(3,6,15,.7); backdrop-filter:blur(3px); }
      .pwa-dialog { width:min(420px,100%); padding:22px 24px; border-radius:16px; background:#0d1430;
        border:1px solid rgba(0,191,255,.3); color:#e8eaf6; font-family:'Poppins',system-ui,sans-serif; box-shadow:0 20px 60px rgba(0,0,0,.6); }
      .pwa-dialog h2 { margin:0 0 12px; font-size:1.1rem; }
      .pwa-dialog ol { margin:0 0 18px; padding-left:20px; line-height:1.7; font-size:.88rem; color:#c9d3e3; }
      @media (prefers-reduced-motion:no-preference) { .pwa-update, .pwa-dialog { animation:pwa-in .3s ease both; } }
      @keyframes pwa-in { from { opacity:0; transform:translate(-50%,12px); } }
      .pwa-dialog { animation-name:pwa-in-dialog !important; }
      @keyframes pwa-in-dialog { from { opacity:0; transform:scale(.96); } }
    `;
    document.head.append(css);
  }
})();
