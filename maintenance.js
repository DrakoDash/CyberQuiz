/* ============================================================
   CyberQuiz — Mode maintenance (maintenance.js)
   À inclure EN PREMIER dans le <head> de chaque page :
     <script src="maintenance.js"></script>

   Tout se pilote depuis le fichier maintenance.json :
     "mode": "off"          → site normal
     "mode": "annonce"      → bandeau d'information, le site reste utilisable
     "mode": "maintenance"  → écran de maintenance, le site est bloqué
     "titre", "message"     → textes affichés
     "debut"                → (annonce) date prévue, ex. "2026-10-20T18:00:00+02:00"
     "fin"                  → (maintenance) retour prévu, même format
     "cle_dev_sha256"       → empreinte SHA-256 de la clé d'accès développeur

   Accès développeur pendant une maintenance :
     ouvrir n'importe quelle page avec ?dev=LA_CLÉ  (ex. accueil.html?dev=ma-cle)
     → accès valable jusqu'à la fermeture de l'onglet ; ?dev=off pour quitter.
   Pour changer de clé : ouvrir la console du navigateur (F12) sur le site et taper
     CyberMaintenance.hash('nouvelle-clé')
   puis coller le résultat dans "cle_dev_sha256".

   ⚠ Le blocage se fait dans le navigateur : il informe les visiteurs mais
   ce n'est pas une protection de sécurité (quelqu'un qui désactive
   JavaScript peut le contourner). Rien de secret ne doit dépendre de lui.
   ============================================================ */
(function () {
  'use strict';

  const FILE = 'maintenance.json';
  const LAST = 'cyberquiz_maint_last';          // dernier mode connu (localStorage)
  const DEV = 'cyberquiz_dev';                  // accès développeur (sessionStorage)
  const CLOSED = 'cyberquiz_annonce_fermee';    // bandeau d'annonce fermé (sessionStorage)
  const MODES = ['off', 'annonce', 'maintenance'];
  const root = document.documentElement;

  const store = area => ({
    get: k => { try { return window[area].getItem(k); } catch { return null; } },
    set: (k, v) => { try { window[area].setItem(k, v); } catch { /* bloqué */ } },
    del: k => { try { window[area].removeItem(k); } catch { /* bloqué */ } }
  });
  const local = store('localStorage'), session = store('sessionStorage');

  /* ── Paramètre ?dev= dans l'adresse ── */
  const params = new URLSearchParams(location.search);
  const devParam = params.get('dev');
  if (devParam === 'off') session.del(DEV);
  const isDev = () => session.get(DEV) === '1';

  /* ── Si la dernière fois le site était en maintenance, on masque la page
        le temps de vérifier (évite d'apercevoir le site une fraction de seconde). ── */
  const early = document.createElement('style');
  early.textContent = 'html.mt-pending body{visibility:hidden!important}';
  document.head.append(early);
  if (local.get(LAST) === 'maintenance' && !isDev() && !devParam) {
    root.classList.add('mt-pending');
    setTimeout(() => root.classList.remove('mt-pending'), 3000);   // jamais bloqué si le réseau traîne
  }

  /* ── Outils ── */
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const parseDate = s => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };
  function formatDate(d) {
    const now = new Date();
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');
    if (d.toDateString() === now.toDateString()) return `aujourd’hui à ${time}`;
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return `demain à ${time}`;
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ` à ${time}`;
  }
  function remaining(d) {
    const ms = d - Date.now();
    if (ms <= 0) return 'd’une minute à l’autre…';
    const min = Math.ceil(ms / 60000);
    if (min < 60) return `dans ${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return `dans ${h} h ${String(m).padStart(2, '0')}`;
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const whenBody = fn => document.body ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true });

  /* ── Lecture de maintenance.json (toujours sur le réseau, jamais en cache) ── */
  async function fetchConfig() {
    const res = await fetch(FILE + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const cfg = await res.json();
    if (!MODES.includes(cfg.mode)) {
      console.warn('[Maintenance] mode inconnu dans maintenance.json :', cfg.mode, '→ "off" utilisé');
      cfg.mode = 'off';
    }
    return cfg;
  }

  let current = null, overlayShown = false, timer = null, devChecked = false;

  async function check() {
    let cfg;
    try { cfg = await fetchConfig(); }
    catch (err) {
      // Hors-ligne ou fichier illisible : on laisse le site fonctionner normalement.
      if (!(err instanceof TypeError)) console.warn('[Maintenance] maintenance.json illisible :', err.message);
      root.classList.remove('mt-pending');
      schedule();
      return;
    }
    if (devParam && devParam !== 'off' && !devChecked) {
      devChecked = true;
      try {
        if (cfg.cle_dev_sha256 && await sha256(devParam) === String(cfg.cle_dev_sha256).toLowerCase()) session.set(DEV, '1');
        else console.warn('[Maintenance] clé développeur incorrecte');
      } catch { console.warn('[Maintenance] vérification de la clé impossible (le site doit être en https)'); }
      // On retire la clé de la barre d'adresse (elle ne doit pas rester visible ni être partagée par erreur).
      params.delete('dev');
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
    }
    local.set(LAST, cfg.mode);
    current = cfg;
    whenBody(() => { apply(cfg); root.classList.remove('mt-pending'); });
    schedule();
  }

  /* On revérifie régulièrement : toutes les 30 s pendant une maintenance
     (pour rouvrir le site dès qu'elle est finie), toutes les 2 min sinon. */
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (!document.hidden) check(); else schedule(); }, overlayShown ? 30000 : 120000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && current) check(); });

  function apply(cfg) {
    injectStyles();
    const blocked = cfg.mode === 'maintenance' && !isDev();
    if (blocked) showOverlay(cfg); else if (overlayShown) siteIsBack();
    toggleBanner(cfg.mode === 'annonce' ? cfg : null);
    toggleDevBadge(cfg.mode === 'maintenance' && isDev());
  }

  /* ============================================================
     ÉCRAN DE MAINTENANCE
     ============================================================ */
  let countdownTimer = null;
  function showOverlay(cfg) {
    let ov = document.getElementById('mt-overlay');
    if (!ov) {
      ov = el('div', 'mt-overlay');
      ov.id = 'mt-overlay';
      ov.setAttribute('role', 'alertdialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-labelledby', 'mt-title');
      ov.setAttribute('aria-describedby', 'mt-msg');
      ov.innerHTML = `
        <div class="mt-card">
          <div class="mt-icon" aria-hidden="true">
            <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle class="mt-ring" cx="60" cy="60" r="54" stroke-dasharray="6 10"/>
              <path d="M60 22 32 33v22c0 20 28 36 28 36s28-16 28-36V33Z"/>
              <path class="mt-gear" d="M60 49v-5m0 26v5m11-13h5m-32 0h5m18-8 4-4m-22 22 4-4m0-14-4-4m22 22-4-4"/>
              <circle cx="60" cy="57" r="6"/>
            </svg>
          </div>
          <p class="mt-label">Maintenance en cours</p>
          <h1 class="mt-title" id="mt-title"></h1>
          <p class="mt-msg" id="mt-msg"></p>
          <div class="mt-bar" aria-hidden="true"><i></i></div>
          <p class="mt-eta" id="mt-eta" aria-live="polite"></p>
          <button class="mt-retry" id="mt-retry" type="button">↻ Vérifier maintenant</button>
          <p class="mt-foot" id="mt-foot">Ta progression et tes succès sont conservés sur cet appareil.</p>
        </div>`;
      document.body.append(ov);
      ov.querySelector('#mt-retry').addEventListener('click', () => {
        ov.querySelector('#mt-foot').textContent = 'Vérification…';
        check();
      });
      // Tout le reste de la page devient inaccessible (souris, clavier, lecteurs d'écran),
      // y compris ce qui serait ajouté plus tard (barre d'onglets, notifications…).
      const lock = c => { if (c !== ov && c.nodeType === 1) c.inert = true; };
      [...document.body.children].forEach(lock);
      new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(lock))).observe(document.body, { childList: true });
      // Le focus clavier reste sur l'écran de maintenance.
      ov.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); ov.querySelector('#mt-retry').focus(); } });
      root.classList.add('mt-locked');
      if (window.CyberSon) CyberSon.stopMusic();
      overlayShown = true;
      ov.querySelector('#mt-retry').focus();
    }
    ov.querySelector('#mt-title').textContent = cfg.titre || 'CyberQuiz est en maintenance';
    ov.querySelector('#mt-msg').textContent = cfg.message || 'Une mise à jour est en cours. Reviens dans quelques minutes !';
    ov.querySelector('#mt-foot').textContent = 'Vérification automatique toutes les 30 secondes · dernière : ' +
      new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const end = parseDate(cfg.fin);
    const eta = ov.querySelector('#mt-eta');
    clearInterval(countdownTimer);
    if (end) {
      const tick = () => { eta.textContent = `Retour prévu ${formatDate(end)} — ${remaining(end)}`; };
      tick(); countdownTimer = setInterval(tick, 15000);
    } else eta.textContent = 'Retour prévu dans quelques instants.';
  }

  function siteIsBack() {
    const ov = document.getElementById('mt-overlay');
    if (!ov) return;
    clearInterval(countdownTimer);
    ov.classList.add('mt-back');
    ov.querySelector('.mt-label').textContent = 'Maintenance terminée';
    ov.querySelector('#mt-title').textContent = '✅ CyberQuiz est de retour !';
    ov.querySelector('#mt-msg').textContent = 'Chargement de la nouvelle version…';
    ov.querySelector('#mt-eta').textContent = '';
    ov.querySelector('#mt-retry').hidden = true;
    if (window.CyberSon) CyberSon.play('finish-good');
    // On recharge pour récupérer les fichiers mis à jour.
    setTimeout(() => location.reload(), 1600);
  }

  /* ============================================================
     BANDEAU D'ANNONCE (mode "annonce")
     ============================================================ */
  function toggleBanner(cfg) {
    const old = document.getElementById('mt-banner');
    const key = cfg ? [cfg.titre, cfg.message, cfg.debut].join('|') : null;
    if (!cfg || session.get(CLOSED) === key) { old?.remove(); return; }
    const start = parseDate(cfg.debut);
    const text = (start ? `Maintenance prévue ${formatDate(start)}. ` : '') + (cfg.message || '');
    if (old && old.dataset.key === key) return;
    old?.remove();
    const bar = el('div', 'mt-banner');
    bar.id = 'mt-banner'; bar.dataset.key = key;
    bar.setAttribute('role', 'status');
    const ico = el('span', 'mt-banner-ico', '🛠️'); ico.setAttribute('aria-hidden', 'true');
    const body = el('div', 'mt-banner-body');
    body.append(el('strong', null, cfg.titre || 'Information'), el('span', null, text));
    const close = el('button', 'mt-banner-close', '×');
    close.type = 'button'; close.setAttribute('aria-label', 'Fermer l’annonce');
    close.addEventListener('click', () => { session.set(CLOSED, key); bar.remove(); });
    bar.append(ico, body, close);
    document.body.append(bar);
  }

  /* ── Badge « mode développeur » ── */
  function toggleDevBadge(show) {
    const old = document.getElementById('mt-dev');
    if (!show) { old?.remove(); return; }
    if (old) return;
    const b = el('div', 'mt-dev');
    b.id = 'mt-dev';
    b.append(el('span', null, '🛠 Mode développeur — les visiteurs voient l’écran de maintenance'));
    const quit = el('a', null, 'Quitter');
    quit.href = location.pathname + '?dev=off';
    b.append(quit);
    document.body.append(b);
  }

  /* ============================================================
     STYLES
     ============================================================ */
  function injectStyles() {
    if (document.getElementById('mt-styles')) return;
    const css = el('style');
    css.id = 'mt-styles';
    css.textContent = `
      html.mt-locked, html.mt-locked body { overflow:hidden !important; }
      .mt-overlay { position:fixed; inset:0; z-index:2147483000; display:grid; place-items:center; padding:24px 16px;
        background:radial-gradient(ellipse at 50% 30%, rgba(0,191,255,.13), transparent 60%), #070b17;
        color:#e8eaf6; font-family:'Poppins',system-ui,sans-serif; overflow:auto; }
      .mt-overlay::before { content:''; position:fixed; inset:0; pointer-events:none;
        background-image:linear-gradient(rgba(0,191,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,191,255,.04) 1px,transparent 1px);
        background-size:48px 48px; mask-image:radial-gradient(ellipse at center, black 30%, transparent 75%); }
      .mt-card { position:relative; width:min(520px,100%); text-align:center; padding:34px 28px 26px; border-radius:24px;
        background:linear-gradient(160deg,#10182b,#0b1222); border:1px solid rgba(0,191,255,.22);
        box-shadow:0 30px 90px rgba(0,0,0,.55), 0 0 60px rgba(0,191,255,.06); }
      .mt-icon { width:112px; height:112px; margin:0 auto 14px; color:#00bfff; filter:drop-shadow(0 0 14px rgba(0,191,255,.35)); }
      .mt-icon svg { width:100%; height:100%; }
      .mt-ring { opacity:.45; transform-origin:60px 60px; }
      .mt-gear { transform-origin:60px 57px; }
      .mt-label { margin:0 0 8px; font:600 .7rem/1.4 'Share Tech Mono',ui-monospace,monospace; letter-spacing:.2em; text-transform:uppercase; color:#f7c26b; }
      .mt-title { margin:0 0 10px; font-size:clamp(1.35rem,4.5vw,1.8rem); line-height:1.2; }
      .mt-msg { margin:0 auto 20px; max-width:420px; color:#b5c2d5; font-size:.92rem; line-height:1.65; }
      .mt-bar { height:5px; border-radius:99px; background:rgba(255,255,255,.07); overflow:hidden; margin:0 0 14px; }
      .mt-bar i { display:block; height:100%; width:35%; border-radius:99px; background:linear-gradient(90deg,transparent,#00bfff,#4cc9f0,transparent); }
      .mt-eta { min-height:1.4em; margin:0 0 18px; color:#4cc9f0; font-size:.88rem; font-weight:600; }
      .mt-retry { padding:10px 18px; border-radius:10px; border:1px solid rgba(0,191,255,.4); background:rgba(0,191,255,.08);
        color:#e8eaf6; font:600 .85rem 'Poppins',system-ui,sans-serif; cursor:pointer; }
      .mt-retry:hover { background:rgba(0,191,255,.16); }
      .mt-retry:focus-visible { outline:3px solid #4cc9f0; outline-offset:3px; }
      .mt-foot { margin:16px 0 0; color:#8090a8; font-size:.74rem; }
      .mt-back .mt-label { color:#4dff91; }
      .mt-back .mt-icon { color:#4dff91; filter:drop-shadow(0 0 14px rgba(77,255,145,.4)); }
      .mt-back .mt-bar i { width:100%; background:#4dff91; animation:none; }

      .mt-banner { position:fixed; left:50%; top:calc(78px + env(safe-area-inset-top)); transform:translateX(-50%); z-index:9800;
        width:min(620px, calc(100vw - 24px)); display:flex; align-items:flex-start; gap:12px; padding:12px 14px;
        border-radius:14px; background:rgba(36,23,10,.96); border:1px solid rgba(247,168,27,.5); color:#fde7c2;
        font:.84rem/1.5 'Poppins',system-ui,sans-serif; box-shadow:0 12px 34px rgba(0,0,0,.45); backdrop-filter:blur(8px); }
      .mt-banner-ico { font-size:1.2rem; line-height:1.3; }
      .mt-banner-body { flex:1; display:grid; gap:2px; }
      .mt-banner-body strong { color:#f7c26b; }
      .mt-banner-close { background:none; border:0; color:#f7c26b; font-size:1.3rem; line-height:1; cursor:pointer; padding:0 4px; }

      .mt-dev { position:fixed; left:50%; top:calc(8px + env(safe-area-inset-top)); transform:translateX(-50%); z-index:9900;
        display:flex; gap:12px; align-items:center; padding:7px 8px 7px 14px; border-radius:99px; max-width:calc(100vw - 16px);
        background:#3a1d00; border:1px solid #f7a81b; color:#ffd89a; font:600 .74rem 'Poppins',system-ui,sans-serif; box-shadow:0 6px 20px rgba(0,0,0,.4); }
      .mt-dev a { color:#1a0d00; background:#f7a81b; border-radius:99px; padding:4px 10px; text-decoration:none; white-space:nowrap; }

      @media (prefers-reduced-motion:no-preference) {
        .mt-ring { animation:mt-spin 14s linear infinite; }
        .mt-gear { animation:mt-spin 6s linear infinite; }
        .mt-bar i { animation:mt-slide 1.6s ease-in-out infinite; }
        .mt-card { animation:mt-in .5s cubic-bezier(.2,.9,.3,1.1) both; }
        .mt-banner { animation:mt-drop .35s ease both; }
      }
      @keyframes mt-spin { to { transform:rotate(360deg); } }
      @keyframes mt-slide { from { transform:translateX(-110%); } to { transform:translateX(310%); } }
      @keyframes mt-in { from { opacity:0; transform:translateY(16px) scale(.97); } }
      @keyframes mt-drop { from { opacity:0; transform:translate(-50%,-10px); } }
      @media (max-width:480px) { .mt-dev span { font-size:.68rem; } .mt-card { padding:28px 20px 22px; } }
    `;
    document.head.append(css);
  }

  /* ── Lancement ── */
  check();

  window.CyberMaintenance = {
    /* Calcule l'empreinte d'une nouvelle clé développeur (à coller dans maintenance.json). */
    async hash(cle) { const h = await sha256(cle); console.log('Empreinte à copier dans "cle_dev_sha256" :', h); return h; },
    check,
    get config() { return current; }
  };
})();
