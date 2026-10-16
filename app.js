/* ============================================================
   CyberQuiz — Mode application (app.js)
   À inclure dans chaque page :  <script src="app.js" defer></script>
   (avec <link rel="stylesheet" href="app.css"> dans le <head>)

   Quand CyberQuiz est ouvert comme application installée :
   - ajoute la classe « app-mode » sur <html> (voir app.css) ;
   - affiche une barre d'onglets en bas (Accueil, Quiz, Simulation, Succès, Son) ;
   - anime le passage d'une page à l'autre.

   Aperçu sans installer : ouvre n'importe quelle page avec ?mode=app
   (par ex. accueil.html?mode=app). ?mode=web revient au site normal.
   ============================================================ */
(function () {
  'use strict';
  const PREVIEW = 'cyberquiz_preview_app';
  const root = document.documentElement;

  /* ── 1. Détection du mode application ── */
  try {
    const mode = new URLSearchParams(location.search).get('mode');
    if (mode === 'app') sessionStorage.setItem(PREVIEW, '1');
    if (mode === 'web') sessionStorage.removeItem(PREVIEW);
  } catch { /* stockage bloqué */ }
  const standalone = matchMedia('(display-mode: standalone)');
  const isApp = () => standalone.matches || navigator.standalone === true ||
    (() => { try { return sessionStorage.getItem(PREVIEW) === '1'; } catch { return false; } })();
  const apply = () => root.classList.toggle('app-mode', isApp());
  apply();
  standalone.addEventListener?.('change', apply);

  /* ── 2. Barre d'onglets ── */
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const QUIZ_PAGES = ['debutant', 'pratiques', 'menaces', 'mdp', 'reseaux', 'wifi', 'vie-privee', 'ingenierie-sociale',
    'avance', 'reseaux-securite', 'wifi-interactif', 'incident-response', 'quiz-final'].map(p => p + '.html');
  // Pages de quiz (et simulation) : plein écran, sans barre d'onglets (voir app.css).
  const isQuizPage = QUIZ_PAGES.includes(page) || page === 'simulation.html';
  root.classList.toggle('page-quiz', isQuizPage);
  const TABS = [
    { id: 'home',  ico: '🏠', label: 'Accueil',    href: 'accueil.html',          match: p => p === 'accueil.html' || p === 'index.html' },
    { id: 'quiz',  ico: '📚', label: 'Quiz',       href: 'accueil.html#quizzes',  match: p => QUIZ_PAGES.includes(p) },
    { id: 'sim',   ico: '🖱️', label: 'Simulation', href: 'simulation.html',       match: p => p === 'simulation.html' },
    { id: 'achv',  ico: '🏆', label: 'Succès',     href: 'succes.html',           match: p => p === 'succes.html' },
    { id: 'sound', ico: '🎧', label: 'Son' }
  ];

  function buildTabbar() {
    if (document.querySelector('.app-tabbar') || page === 'index.html' || page === 'offline.html') return;
    const bar = document.createElement('nav');
    bar.className = 'app-tabbar';
    bar.setAttribute('aria-label', 'Navigation de l’application');
    TABS.forEach(t => {
      const el = document.createElement(t.href ? 'a' : 'button');
      el.className = 'app-tab';
      if (t.href) {
        el.href = t.href;
        if (t.match(page)) el.setAttribute('aria-current', 'page');
      } else {
        el.type = 'button';
        el.setAttribute('data-open-sound', '');
        el.dataset.sound = 'none';
        el.addEventListener('click', () => window.CyberSon ? CyberSon.openPanel() : null);
      }
      const ico = document.createElement('span'); ico.className = 'app-tab-ico'; ico.textContent = t.ico; ico.setAttribute('aria-hidden', 'true');
      const lbl = document.createElement('span'); lbl.textContent = t.label;
      el.append(ico, lbl);
      bar.append(el);
    });
    document.body.append(bar);
  }

  /* ── 3. Transition douce entre les pages ── */
  document.addEventListener('click', e => {
    if (!root.classList.contains('app-mode') || e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    // Lien vers un ancre de la même page : on laisse le navigateur faire.
    if (url.pathname === location.pathname && url.hash) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    root.classList.add('app-leaving');
    setTimeout(() => { location.href = url.href; }, 170);
  });
  // Retour arrière (cache du navigateur) : on réaffiche la page.
  window.addEventListener('pageshow', () => root.classList.remove('app-leaving'));

  /* ── 4. Quiz : animation des propositions quand la question change ── */
  function watchQuestions() {
    const q = document.getElementById('qText'), box = document.getElementById('ansBox');
    if (!q || !box) return;
    let last = null;
    const animate = () => {
      const text = q.textContent;
      if (text === last) return;          // même question (clic sur une réponse) : pas d'animation
      last = text;
      box.classList.remove('q-enter');
      void box.offsetWidth;                // relance l'animation
      box.classList.add('q-enter');
      clearTimeout(animate.t);
      animate.t = setTimeout(() => box.classList.remove('q-enter'), 900);
    };
    new MutationObserver(animate).observe(q, { childList: true, characterData: true, subtree: true });
    animate();
  }

  function ready() { buildTabbar(); watchQuestions(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();

  window.CyberApp = { isApp };
})();
