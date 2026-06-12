/* ============================================================
   CyberQuiz — PWA Manager (pwa.js)
   Inclure ce script dans toutes les pages HTML :
   <script src="pwa.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  /* ── Enregistrement du Service Worker ── */
  if (!('serviceWorker' in navigator)) return;

  let swRegistration = null;
  let deferredInstallPrompt = null;

  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => {
      swRegistration = reg;
      console.log('[PWA] Service Worker enregistré :', reg.scope);

      /* ── Détection de mise à jour disponible ── */
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });

      /* Vérification périodique des mises à jour (toutes les 60 min) */
      setInterval(() => reg.update(), 60 * 60 * 1000);
    })
    .catch(err => console.warn('[PWA] Échec d\'enregistrement :', err));

  /* ── Rechargement automatique après mise à jour SW ── */
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  /* ── Prompt d'installation ── */
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallButton();
  });

  /* Masquer le bouton si déjà installé */
  window.addEventListener('appinstalled', () => {
    hideInstallButton();
    deferredInstallPrompt = null;
    console.log('[PWA] Application installée');
  });

  /* ── Détection réseau ── */
  window.addEventListener('online',  () => hideOfflineBanner());
  window.addEventListener('offline', () => showOfflineBanner());
  if (!navigator.onLine) showOfflineBanner();

  /* ==========================================================
     INTERFACE — Bouton d'installation
     ========================================================== */
  function showInstallButton() {
    if (document.getElementById('pwa-install-btn')) return;

    /* Cherche la navbar pour y insérer le bouton */
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const btn = document.createElement('button');
    btn.id        = 'pwa-install-btn';
    btn.className = 'pwa-install-btn';
    btn.innerHTML = '<i class="fa-solid fa-download"></i><span>Installer</span>';
    btn.title     = 'Installer CyberQuiz sur cet appareil';
    btn.onclick   = triggerInstall;

    /* Insérer avant le bouton menu mobile (s'il existe) */
    const toggle = navbar.querySelector('.nav-toggle');
    if (toggle) {
      navbar.insertBefore(btn, toggle);
    } else {
      navbar.appendChild(btn);
    }
  }

  function hideInstallButton() {
    document.getElementById('pwa-install-btn')?.remove();
  }

  async function triggerInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Choix installation :', outcome);
    deferredInstallPrompt = null;
    hideInstallButton();
  }

  /* ==========================================================
     INTERFACE — Bannière de mise à jour
     ========================================================== */
  function showUpdateBanner() {
    if (document.getElementById('pwa-update-banner')) return;

    const banner = document.createElement('div');
    banner.id        = 'pwa-update-banner';
    banner.className = 'pwa-update-banner';
    banner.innerHTML = `
      <i class="fa-solid fa-rotate"></i>
      <span>Une mise à jour de CyberQuiz est disponible !</span>
      <button onclick="window._pwaApplyUpdate()" class="pwa-update-btn">
        Mettre à jour
      </button>
      <button onclick="this.closest('#pwa-update-banner').remove()" class="pwa-dismiss-btn" aria-label="Fermer">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    document.body.prepend(banner);
  }

  window._pwaApplyUpdate = function () {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    document.getElementById('pwa-update-banner')?.remove();
  };

  /* ==========================================================
     INTERFACE — Bannière hors-ligne
     ========================================================== */
  function showOfflineBanner() {
    if (document.getElementById('pwa-offline-banner')) return;

    const banner = document.createElement('div');
    banner.id        = 'pwa-offline-banner';
    banner.className = 'pwa-offline-banner';
    banner.innerHTML = `
      <i class="fa-solid fa-wifi" style="text-decoration:line-through"></i>
      <span>Vous êtes hors-ligne — contenu mis en cache disponible.</span>
    `;
    document.body.prepend(banner);
  }

  function hideOfflineBanner() {
    document.getElementById('pwa-offline-banner')?.remove();
  }

  /* ==========================================================
     STYLES injectés dynamiquement
     ========================================================== */
  const style = document.createElement('style');
  style.textContent = `
    /* ── Bouton d'installation ── */
    .pwa-install-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: transparent;
      border: 1px solid rgba(0,191,255,0.4);
      border-radius: 8px;
      color: #00bfff;
      font-family: 'Poppins', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s;
      margin-right: 8px;
      white-space: nowrap;
      animation: pwa-pulse-in 0.4s ease both;
    }
    .pwa-install-btn:hover {
      background: rgba(0,191,255,0.12);
      border-color: #00bfff;
      box-shadow: 0 0 12px rgba(0,191,255,0.2);
    }
    .pwa-install-btn span { display: inline; }
    @media (max-width: 480px) {
      .pwa-install-btn span { display: none; }
      .pwa-install-btn { padding: 6px 10px; }
    }

    @keyframes pwa-pulse-in {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }

    /* ── Bannière de mise à jour ── */
    .pwa-update-banner {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: linear-gradient(135deg, #111833, #0d1228);
      border: 1px solid rgba(76,201,240,0.35);
      border-radius: 12px;
      padding: 12px 16px 12px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,191,255,0.1);
      color: rgba(255,255,255,0.9);
      font-family: 'Poppins', sans-serif;
      font-size: 0.85rem;
      max-width: calc(100vw - 40px);
      animation: pwa-slide-up 0.4s cubic-bezier(.34,1.56,.64,1) both;
    }
    .pwa-update-banner i { color: #4cc9f0; flex-shrink: 0; }
    .pwa-update-banner span { flex: 1; min-width: 0; }

    .pwa-update-btn {
      padding: 6px 16px;
      background: #00bfff;
      color: #001a2e;
      border: none;
      border-radius: 7px;
      font-family: 'Poppins', sans-serif;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: 0.2s;
    }
    .pwa-update-btn:hover { background: #4cc9f0; }

    .pwa-dismiss-btn {
      background: none;
      border: none;
      color: rgba(255,255,255,0.4);
      cursor: pointer;
      font-size: 0.9rem;
      padding: 2px 4px;
      flex-shrink: 0;
      transition: 0.2s;
    }
    .pwa-dismiss-btn:hover { color: rgba(255,255,255,0.8); }

    /* ── Bannière hors-ligne ── */
    .pwa-offline-banner {
      position: fixed;
      top: 62px;
      left: 0; right: 0;
      z-index: 990;
      background: linear-gradient(90deg, #1a0f08, #281808, #1a0f08);
      border-bottom: 1px solid rgba(247,168,27,0.3);
      padding: 8px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: 'Poppins', sans-serif;
      font-size: 0.8rem;
      color: rgba(247,168,27,0.9);
      animation: pwa-slide-down 0.3s ease both;
    }

    @keyframes pwa-slide-up {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes pwa-slide-down {
      from { opacity: 0; transform: translateY(-100%); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

})();
