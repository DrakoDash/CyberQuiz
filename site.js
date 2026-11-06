/* ============================================================
   CyberQuiz — Script commun des pages Accueil, Quiz et Mises en situation (site.js)
   Chaque partie vérifie que ses éléments existent : le même fichier
   sert aux trois pages.
   ============================================================ */
'use strict';
const $id = id => document.getElementById(id);

/* ── Canvas particules (décor) ── */
(() => {
  const canvas = $id('particles');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;
  let parts = [], frame = null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  function size() { canvas.width = innerWidth; canvas.height = innerHeight; }
  class Particle {
    constructor() { this.reset(); this.size = Math.random() * 2 + 0.4; this.color = `rgba(0,191,255,${Math.random() * 0.35 + 0.08})`; }
    reset() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.vx = (Math.random() - 0.5) * 0.45; this.vy = (Math.random() - 0.5) * 0.45; }
    update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset(); }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
  }
  function draw(move) { ctx.clearRect(0, 0, canvas.width, canvas.height); parts.forEach(p => { if (move) p.update(); p.draw(); }); }
  function loop() { draw(true); frame = requestAnimationFrame(loop); }
  function sync() {
    cancelAnimationFrame(frame); frame = null; draw(false);
    if (!reduce.matches && !document.documentElement.classList.contains('reduce-motion') && !document.hidden) frame = requestAnimationFrame(loop);
  }
  size(); for (let i = 0; i < 40; i++) parts.push(new Particle());
  addEventListener('resize', () => { size(); draw(false); });
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener?.('change', sync);
  document.addEventListener('cyberquiz:settings', sync);
  sync();
})();

/* ── Menu mobile ── */
function toggleMenu() { $id('navLinks')?.classList.toggle('open'); }

/* ── Effet machine à écrire (accueil) ── */
(() => {
  const tw = $id('typewriter');
  if (!tw) return;
  const phrases = ['vos connaissances en sécurité.', 'à détecter le phishing.', 'à créer des mots de passe forts.', 'à naviguer sans risque.'];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion')) { tw.textContent = phrases[0]; return; }
  let pi = 0, ci = 0, deleting = false;
  (function typeLoop() {
    const phrase = phrases[pi];
    if (!deleting) {
      tw.textContent = phrase.slice(0, ++ci);
      if (ci === phrase.length) { deleting = true; setTimeout(typeLoop, 2000); return; }
      setTimeout(typeLoop, 50);
    } else {
      tw.textContent = phrase.slice(0, --ci);
      if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(typeLoop, 400); return; }
      setTimeout(typeLoop, 28);
    }
  })();
})();

/* ── Compteurs animés ── */
function animateCounter(el, target, duration = 1200) {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor((1 - Math.pow(1 - progress, 3)) * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}
document.querySelectorAll('[data-target]').forEach(el => animateCounter(el, parseInt(el.dataset.target, 10)));

/* ============================================================
   LISTE DES MODULES
   category : 'quiz' (page quiz.html) ou 'situations' (page situations.html)
   Pour ajouter un module : l'ajouter ici, sur sa page (carte) et dans succes.js.
   ============================================================ */
const ALL_QUIZZES = [
  { key: 'debutant',           title: 'Les Fondamentaux',           url: 'debutant.html',           total: 20, category: 'quiz' },
  { key: 'pratiques',          title: 'Bonnes Pratiques',           url: 'pratiques.html',          total: 15, category: 'quiz' },
  { key: 'menaces',            title: 'Identifier les Menaces',     url: 'menaces.html',            total: 20, category: 'quiz' },
  { key: 'mdp',                title: 'Mots de Passe',              url: 'mdp.html',                total: 20, category: 'quiz' },
  { key: 'reseaux',            title: 'Réseaux Sociaux',            url: 'reseaux.html',            total: 10, category: 'quiz' },
  { key: 'wifi',               title: 'Sécurité Wi-Fi',             url: 'wifi.html',               total: 12, category: 'quiz' },
  { key: 'vie-privee',         title: 'Vie Privée Numérique',       url: 'vie-privee.html',         total: 10, category: 'quiz' },
  { key: 'ingenierie-sociale', title: 'Ingénierie Sociale',         url: 'ingenierie-sociale.html', total: 12, category: 'quiz' },
  { key: 'reseaux-securite',   title: 'Sécurité des Réseaux',       url: 'reseaux-securite.html',   total: 15, category: 'quiz' },
  { key: 'avance',             title: 'Quiz Avancé',                url: 'avance.html',             total: 15, category: 'quiz' },
  { key: 'simulation',         title: 'Premier jour au bureau',     url: 'simulation.html',         total: 12, category: 'situations' },
  { key: 'wifi-interactif',    title: 'Wi-Fi : mises en situation', url: 'wifi-interactif.html',    total: 10, category: 'situations' },
  { key: 'incident-response',  title: 'Réponse aux Incidents',      url: 'incident-response.html',  total: 15, category: 'situations' },
  { key: 'quiz-final',         title: 'Contrôle Final',             url: 'quiz-final.html',         total: 10, category: 'quiz' }
];

function readResult(q) {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(`cyberquiz_${q.key}`)); } catch { /* stockage indisponible ou corrompu */ }
  const valid = data && !Array.isArray(data) && Number.isInteger(data.score) && data.total === q.total && data.score >= 0 && data.score <= data.total;
  return valid ? data : null;
}

/* ── Progression, grade, statuts des cartes ── */
function loadProgress() {
  let done = 0, nextQuiz = null;
  const perCat = { quiz: [0, 0], situations: [0, 0] };
  ALL_QUIZZES.forEach(q => {
    const data = readResult(q);
    perCat[q.category][1]++;
    if (data) { done++; perCat[q.category][0]++; } else if (!nextQuiz) nextQuiz = q;
    const status = $id(`status-${q.key}`);
    if (status) {
      status.className = 'card-status ' + (data ? 'status-done' : 'status-new');
      status.textContent = data ? `${data.score}/${data.total}` : 'Nouveau';
    }
  });

  // Accueil : bloc « Ma progression »
  animateCounter($id('doneCount'), done);
  const pct = Math.round(done / ALL_QUIZZES.length * 100);
  if ($id('progressPct')) $id('progressPct').textContent = pct + '%';
  if ($id('progressRing')) $id('progressRing').setAttribute('aria-label', `${pct} % du parcours terminé`);
  if ($id('ringFill')) requestAnimationFrame(() => { $id('ringFill').style.strokeDashoffset = 326.7 * (1 - pct / 100); });
  const box = $id('recommendedBox');
  if (box) {
    if (nextQuiz) { const link = $id('nextQuizLink'); link.href = nextQuiz.url; link.textContent = nextQuiz.title; }
    else { box.classList.add('all-done'); box.textContent = '🛡️ Tous les modules sont terminés ! Recommence-les pour réviser.'; }
  }
  if ($id('userRank')) $id('userRank').textContent = done === ALL_QUIZZES.length ? 'Parcours terminé 🛡️' : done >= 5 ? 'Explorateur cyber 🔍' : done >= 1 ? 'Apprenti veilleur 💻' : 'Initié(e)';
  updateMainCta(done, nextQuiz);

  // Portails de l'accueil
  [['Quiz', 'quiz'], ['Sit', 'situations']].forEach(([id, cat]) => {
    const [d, t] = perCat[cat];
    if ($id(`portal${id}Done`)) $id(`portal${id}Done`).textContent = d;
    if ($id(`portal${id}Total`)) $id(`portal${id}Total`).textContent = t;
    if ($id(`portal${id}Bar`)) requestAnimationFrame(() => { $id(`portal${id}Bar`).style.width = (t ? d / t * 100 : 0) + '%'; });
  });

  // Pages catalogue
  const section = document.querySelector('[data-category]');
  if (section && $id('catDone')) $id('catDone').textContent = perCat[section.dataset.category][0];
}

/* ── Bouton principal de l'accueil : « Continuer » si une partie est en cours ── */
function findResume() {
  let last = null;
  try { last = localStorage.getItem('cyberquiz_last'); } catch { /* stockage indisponible */ }
  const inProgress = [];
  ALL_QUIZZES.forEach(q => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(`cyberquiz_session_${q.key}`)); } catch { /* ignoré */ }
    if (!s || s.finished || !Array.isArray(s.answers) || !Number.isInteger(s.cur)) return;
    if (!s.answers.some(a => a !== null)) return;               // page ouverte mais aucune réponse
    inProgress.push({ q, cur: Math.min(s.cur, s.answers.length - 1), total: s.answers.length });
  });
  return inProgress.find(r => r.q.key === last) || inProgress[0] || null;
}
function updateMainCta(done, nextQuiz) {
  const cta = $id('mainCta');
  if (!cta) return;
  const set = (href, label, sub) => { cta.href = href; $id('mainCtaLabel').textContent = label; $id('mainCtaSub').textContent = sub; };
  const resume = findResume();
  if (resume) {
    const unit = resume.q.category === 'situations' && resume.q.key === 'simulation' ? 'Étape' : 'Question';
    set(resume.q.url, 'Continuer', `${resume.q.title} · ${unit} ${resume.cur + 1}/${resume.total}`);
    cta.classList.add('is-resume');
  } else if (done === 0) set('debutant.html', 'Commencer', 'Les Fondamentaux');
  else if (nextQuiz) set(nextQuiz.url, 'Continuer le parcours', nextQuiz.title);
  else set('quiz.html', 'Réviser', 'Tous les modules sont terminés');
}
loadProgress();

/* ── Succès : résumé sur l'accueil ── */
function loadAchievements() {
  const strip = $id('achvStrip');
  if (!strip) return;
  if (!window.CyberSucces) { strip.style.display = 'none'; return; }
  const etat = CyberSucces.etat();
  $id('achvCount').textContent = etat.debloques;
  $id('achvTotal').textContent = etat.total;
  const icons = $id('achvIcons');
  icons.replaceChildren();
  etat.liste.forEach(a => {
    const span = document.createElement('span');
    span.textContent = a.icon;
    span.title = a.title + (a.date ? '' : ' (à débloquer)');
    if (!a.date) span.className = 'locked';
    icons.append(span);
  });
}
loadAchievements();

function resetProgress() {
  if (!confirm('Effacer les scores, les succès et toutes les parties en cours ?')) return;
  try {
    ALL_QUIZZES.forEach(q => {
      localStorage.removeItem(`cyberquiz_${q.key}`);
      localStorage.removeItem(`cyberquiz_session_${q.key}`);
    });
    if (window.CyberSucces) CyberSucces.reinitialiser();
    location.reload();
  } catch { alert('Le navigateur ne permet pas de modifier le stockage local. Vérifie ses paramètres.'); }
}

/* ── Filtres (niveau + recherche) de la page Quiz ── */
let currentFilter = 'all';
function filterQuiz(diff, btn) {
  currentFilter = diff;
  document.querySelectorAll('.filter-btn').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
  applyFilters();
}
function searchQuizzes() { applyFilters(); }
function applyFilters() {
  const input = $id('searchInput');
  const searchTerm = input ? input.value.toLowerCase().trim() : '';
  document.querySelectorAll('.quiz-card').forEach(card => {
    const title = card.querySelector('.card-title').textContent.toLowerCase();
    const desc = card.querySelector('.card-desc').textContent.toLowerCase();
    const ok = (currentFilter === 'all' || card.dataset.diff === currentFilter) && (title.includes(searchTerm) || desc.includes(searchTerm));
    card.classList.toggle('hidden-card', !ok);
  });
  // Masque les titres de section devenus vides.
  document.querySelectorAll('.quiz-grid').forEach(grid => {
    const empty = !grid.querySelector('.quiz-card:not(.hidden-card)');
    grid.hidden = empty;
    const label = grid.previousElementSibling;
    if (label && label.classList.contains('section-label')) label.hidden = empty;
  });
}

function closeBanner() {
  $id('alertBanner')?.classList.add('hidden');
  document.body.classList.remove('has-alert');
}

/* ── Année du pied de page (toujours à jour) ── */
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
