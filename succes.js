/* ============================================================
   CyberQuiz — Système de succès (succes.js)
   À inclure AVANT le script du quiz :
     <script src="succes.js"></script>
   Puis, quand une partie se termine :
     CyberSucces.enregistrerPartie(quizId, score, total);

   Tout est stocké en local (localStorage), rien n'est envoyé.
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'cyberquiz_succes';
  const HISTORY_MAX = 300; // On garde les 300 dernières parties, largement assez.

  /* ── Liste des quiz (doit rester alignée avec accueil.html) ── */
  const QUIZZES = [
    { key: 'debutant',           title: 'Les Fondamentaux',           total: 20 },
    { key: 'pratiques',          title: 'Bonnes Pratiques',           total: 15 },
    { key: 'menaces',            title: 'Identifier les Menaces',     total: 20 },
    { key: 'mdp',                title: 'Mots de Passe',              total: 20 },
    { key: 'reseaux',            title: 'Réseaux Sociaux',            total: 10 },
    { key: 'wifi',               title: 'Sécurité Wi-Fi',             total: 12 },
    { key: 'vie-privee',         title: 'Vie Privée Numérique',       total: 10 },
    { key: 'ingenierie-sociale', title: 'Ingénierie Sociale',         total: 12 },
    { key: 'avance',             title: 'Quiz Avancé',                total: 15 },
    { key: 'reseaux-securite',   title: 'Sécurité des Réseaux',       total: 15 },
    { key: 'wifi-interactif',    title: 'Wi-Fi : mises en situation', total: 10 },
    { key: 'incident-response',  title: 'Réponse aux Incidents',      total: 15 },
    { key: 'simulation',         title: 'Premier jour au bureau',     total: 12 },
    { key: 'quiz-final',         title: 'Contrôle Final',             total: 10 }
  ];
  const QUIZ_KEYS = QUIZZES.map(q => q.key);

  /* ── Petites aides pour écrire les conditions ── */
  const terminés   = s => Object.keys(s.best).length;
  const parfaits   = s => Object.values(s.best).filter(p => p === 100).length;
  const auMoins    = (s, key, pct) => (s.best[key] ?? -1) >= pct;
  const compteurs  = (s, keys, pct) => keys.filter(k => auMoins(s, k, pct)).length;

  /* ============================================================
     LISTE DES SUCCÈS
     - check(stats)    : true si le succès est débloqué
     - progress(stats) : [valeur actuelle, objectif] (facultatif)
     Pour en ajouter un, il suffit d'ajouter un objet ici.
     ============================================================ */
  const ACHIEVEMENTS = [
    /* Progression */
    { id: 'premier-pas', cat: 'Progression', icon: '🚀', title: 'Premier pas',
      desc: 'Termine ton tout premier quiz.',
      check: s => terminés(s) >= 1, progress: s => [Math.min(terminés(s), 1), 1] },
    { id: 'curieux', cat: 'Progression', icon: '🔍', title: 'Esprit curieux',
      desc: 'Termine 3 quiz différents.',
      check: s => terminés(s) >= 3, progress: s => [Math.min(terminés(s), 3), 3] },
    { id: 'explorateur', cat: 'Progression', icon: '🧭', title: 'Explorateur cyber',
      desc: 'Termine 7 quiz différents.',
      check: s => terminés(s) >= 7, progress: s => [Math.min(terminés(s), 7), 7] },
    { id: 'gardien', cat: 'Progression', icon: '🛡️', title: 'Gardien du réseau',
      desc: 'Termine les ' + QUIZZES.length + ' quiz de CyberQuiz.',
      check: s => terminés(s) >= QUIZZES.length,
      progress: s => [terminés(s), QUIZZES.length] },

    /* Excellence */
    { id: 'sans-faute', cat: 'Excellence', icon: '🎯', title: 'Sans faute',
      desc: 'Obtiens 100 % à un quiz.',
      check: s => parfaits(s) >= 1, progress: s => [Math.min(parfaits(s), 1), 1] },
    { id: 'perfectionniste', cat: 'Excellence', icon: '💎', title: 'Perfectionniste',
      desc: 'Obtiens 100 % à 5 quiz différents.',
      check: s => parfaits(s) >= 5, progress: s => [Math.min(parfaits(s), 5), 5] },
    { id: 'perseverant', cat: 'Excellence', icon: '📈', title: 'Persévérant',
      desc: 'Refais un quiz et bats ton meilleur score.',
      check: s => s.improved },

    /* Régularité */
    { id: 'revision', cat: 'Régularité', icon: '📚', title: 'Révision active',
      desc: 'Termine 10 parties au total (les quiz refaits comptent).',
      check: s => s.played >= 10, progress: s => [Math.min(s.played, 10), 10] },
    { id: 'marathon', cat: 'Régularité', icon: '⚡', title: 'Marathon',
      desc: 'Termine 3 parties dans la même journée.',
      check: s => s.maxPerDay >= 3, progress: s => [Math.min(s.maxPerDay, 3), 3] },
    { id: 'assidu', cat: 'Régularité', icon: '🔥', title: 'Assidu',
      desc: 'Termine au moins un quiz 3 jours de suite.',
      check: s => s.bestStreak >= 3, progress: s => [Math.min(s.bestStreak, 3), 3] },

    /* Thématiques */
    { id: 'bases-solides', cat: 'Spécialités', icon: '🧱', title: 'Bases solides',
      desc: 'Au moins 70 % aux quiz Les Fondamentaux et Bonnes Pratiques.',
      check: s => compteurs(s, ['debutant', 'pratiques'], 70) === 2,
      progress: s => [compteurs(s, ['debutant', 'pratiques'], 70), 2] },
    { id: 'cle-maitre', cat: 'Spécialités', icon: '🔑', title: 'Maître des clés',
      desc: 'Obtiens 100 % au quiz Mots de Passe.',
      check: s => auMoins(s, 'mdp', 100) },
    { id: 'anti-arnaque', cat: 'Spécialités', icon: '🎣', title: 'Anti-arnaque',
      desc: 'Au moins 80 % aux quiz Menaces et Ingénierie Sociale.',
      check: s => compteurs(s, ['menaces', 'ingenierie-sociale'], 80) === 2,
      progress: s => [compteurs(s, ['menaces', 'ingenierie-sociale'], 80), 2] },
    { id: 'maitre-ondes', cat: 'Spécialités', icon: '📶', title: 'Maître des ondes',
      desc: 'Au moins 80 % aux deux quiz Wi-Fi.',
      check: s => compteurs(s, ['wifi', 'wifi-interactif'], 80) === 2,
      progress: s => [compteurs(s, ['wifi', 'wifi-interactif'], 80), 2] },
    { id: 'premier-intervenant', cat: 'Spécialités', icon: '🚒', title: 'Premier intervenant',
      desc: 'Au moins 80 % au quiz Réponse aux Incidents.',
      check: s => auMoins(s, 'incident-response', 80) },
    { id: 'agent-terrain', cat: 'Spécialités', icon: '🕵️', title: 'Agent de terrain',
      desc: 'Au moins 80 % au module interactif Premier jour au bureau.',
      check: s => auMoins(s, 'simulation', 80) },
    { id: 'diplome', cat: 'Spécialités', icon: '🎓', title: 'Diplômé CyberQuiz',
      desc: 'Au moins 80 % au Contrôle Final.',
      check: s => auMoins(s, 'quiz-final', 80) }
  ];

  /* ============================================================
     STOCKAGE
     data = {
       version: 1,
       unlocked: { idSuccès: "date ISO" },
       best:     { idQuiz: pourcentage },   // meilleur score par quiz
       history:  [ { q: idQuiz, p: pourcentage, d: "AAAA-MM-JJ" } ]
     }
     ============================================================ */
  function emptyData() { return { version: 1, unlocked: {}, best: {}, history: [] }; }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!d || d.version !== 1 || typeof d.unlocked !== 'object' || typeof d.best !== 'object' || !Array.isArray(d.history)) return emptyData();
      // On ignore toute valeur incohérente (stockage modifié à la main, etc.).
      const clean = emptyData();
      for (const [id, date] of Object.entries(d.unlocked)) if (ACHIEVEMENTS.some(a => a.id === id) && typeof date === 'string') clean.unlocked[id] = date;
      for (const [k, p] of Object.entries(d.best)) if (QUIZ_KEYS.includes(k) && Number.isInteger(p) && p >= 0 && p <= 100) clean.best[k] = p;
      clean.history = d.history.filter(h => h && QUIZ_KEYS.includes(h.q) && Number.isInteger(h.p) && h.p >= 0 && h.p <= 100 && /^\d{4}-\d{2}-\d{2}$/.test(h.d)).slice(-HISTORY_MAX);
      return clean;
    } catch { return emptyData(); }
  }

  function store(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  }

  /* Date locale au format AAAA-MM-JJ (pas toISOString, qui est en UTC). */
  function today(date = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  }

  /* Récupère les scores déjà enregistrés par les quiz avant l'arrivée des succès. */
  function importOldResults(data) {
    QUIZZES.forEach(q => {
      try {
        const r = JSON.parse(localStorage.getItem('cyberquiz_' + q.key));
        if (r && Number.isInteger(r.score) && r.total === q.total && r.score >= 0 && r.score <= r.total) {
          const pct = Math.round(r.score / r.total * 100);
          if ((data.best[q.key] ?? -1) < pct) data.best[q.key] = pct;
        }
      } catch { /* résultat illisible : ignoré */ }
    });
  }

  /* ── Statistiques calculées à partir des données ── */
  function computeStats(data) {
    const perDay = {};
    let improved = false;
    const bestSoFar = {};
    data.history.forEach(h => {
      perDay[h.d] = (perDay[h.d] || 0) + 1;
      if (h.q in bestSoFar && h.p > bestSoFar[h.q]) improved = true;
      bestSoFar[h.q] = Math.max(bestSoFar[h.q] ?? -1, h.p);
    });

    // Plus longue série de jours consécutifs.
    const days = Object.keys(perDay).sort();
    let bestStreak = 0, streak = 0, prev = null;
    days.forEach(d => {
      const cur = new Date(d + 'T12:00:00');
      streak = prev && Math.round((cur - prev) / 86400000) === 1 ? streak + 1 : 1;
      bestStreak = Math.max(bestStreak, streak);
      prev = cur;
    });

    return {
      best: data.best,
      played: data.history.length,
      maxPerDay: Math.max(0, ...Object.values(perDay)),
      bestStreak,
      improved
    };
  }

  /* Vérifie tous les succès et renvoie ceux qui viennent d'être débloqués. */
  function evaluate(data) {
    const stats = computeStats(data);
    const fresh = [];
    ACHIEVEMENTS.forEach(a => {
      if (!data.unlocked[a.id] && a.check(stats)) {
        data.unlocked[a.id] = new Date().toISOString();
        fresh.push(a);
      }
    });
    return fresh;
  }

  /* ============================================================
     NOTIFICATION « Succès débloqué »
     ============================================================ */
  function injectStyles() {
    if (document.getElementById('cs-styles')) return;
    const css = document.createElement('style');
    css.id = 'cs-styles';
    css.textContent = `
      .cs-toasts{position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:calc(100vw - 32px);width:340px;pointer-events:none}
      .cs-toast{pointer-events:auto;display:flex;gap:14px;align-items:center;padding:14px 16px;border-radius:14px;
        background:rgba(10,15,36,.96);border:1px solid rgba(0,191,255,.45);color:#fff;font-family:'Poppins',system-ui,sans-serif;
        box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 18px rgba(0,191,255,.25);animation:cs-in .45s cubic-bezier(.2,.9,.3,1.2) both}
      .cs-toast.cs-out{animation:cs-out .3s ease forwards}
      .cs-toast-icon{font-size:1.9rem;line-height:1;flex-shrink:0;filter:drop-shadow(0 0 8px rgba(0,191,255,.6))}
      .cs-toast-label{font-family:'Share Tech Mono',monospace;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#7efc6a}
      .cs-toast-title{font-weight:700;font-size:1rem;margin:2px 0}
      .cs-toast-desc{font-size:.8rem;color:rgba(255,255,255,.7)}
      .cs-toast a{color:#4cc9f0;font-size:.78rem;text-decoration:none}
      .cs-toast a:hover{text-decoration:underline}
      .cs-toast-close{margin-left:auto;align-self:flex-start;background:none;border:0;color:rgba(255,255,255,.5);font-size:1.1rem;cursor:pointer;padding:0 2px}
      .cs-toast-close:hover{color:#fff}
      @keyframes cs-in{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:none}}
      @keyframes cs-out{to{opacity:0;transform:translateX(30px)}}
      @media (prefers-reduced-motion:reduce){.cs-toast,.cs-toast.cs-out{animation:none}}
    `;
    document.head.append(css);
  }

  function toast(achievement) {
    injectStyles();
    let box = document.querySelector('.cs-toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'cs-toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.append(box);
    }
    const el = document.createElement('div');
    el.className = 'cs-toast';
    const icon = document.createElement('div'); icon.className = 'cs-toast-icon'; icon.textContent = achievement.icon; icon.setAttribute('aria-hidden', 'true');
    const body = document.createElement('div');
    const label = document.createElement('div'); label.className = 'cs-toast-label'; label.textContent = 'Succès débloqué';
    const title = document.createElement('div'); title.className = 'cs-toast-title'; title.textContent = achievement.title;
    const desc = document.createElement('div'); desc.className = 'cs-toast-desc'; desc.textContent = achievement.desc;
    const link = document.createElement('a'); link.href = 'succes.html'; link.textContent = 'Voir mes succès →';
    body.append(label, title, desc, link);
    const close = document.createElement('button'); close.className = 'cs-toast-close'; close.type = 'button';
    close.setAttribute('aria-label', 'Fermer'); close.textContent = '×';
    const remove = () => { el.classList.add('cs-out'); setTimeout(() => el.remove(), 300); };
    close.onclick = remove;
    el.append(icon, body, close);
    box.append(el);
    if (window.CyberSon) CyberSon.play('achievement');
    setTimeout(remove, 7000);
  }

  /* ============================================================
     API PUBLIQUE
     ============================================================ */
  const CyberSucces = {
    QUIZZES,
    ACHIEVEMENTS,

    /* À appeler quand une partie se termine. Renvoie les succès débloqués. */
    enregistrerPartie(quizId, score, total) {
      if (!QUIZ_KEYS.includes(quizId) || !Number.isInteger(score) || !Number.isInteger(total) || total <= 0) return [];
      const data = load();
      importOldResults(data);
      const pct = Math.round(score / total * 100);
      data.history.push({ q: quizId, p: pct, d: today() });
      if (data.history.length > HISTORY_MAX) data.history = data.history.slice(-HISTORY_MAX);
      if ((data.best[quizId] ?? -1) < pct) data.best[quizId] = pct;
      const fresh = evaluate(data);
      store(data);
      // Petit décalage pour que la notification arrive après l'écran de score.
      fresh.forEach((a, i) => setTimeout(() => toast(a), 600 + i * 900));
      return fresh;
    },

    /* État complet, utilisé par succes.html et accueil.html. */
    etat() {
      const data = load();
      importOldResults(data);
      evaluate(data);   // débloque ce qui est mérité grâce aux anciens scores
      store(data);
      const stats = computeStats(data);
      return {
        stats,
        total: ACHIEVEMENTS.length,
        debloques: Object.keys(data.unlocked).length,
        liste: ACHIEVEMENTS.map(a => ({
          id: a.id, cat: a.cat, icon: a.icon, title: a.title, desc: a.desc,
          date: data.unlocked[a.id] || null,
          progress: a.progress ? a.progress(stats) : null
        }))
      };
    },

    reinitialiser() {
      try { localStorage.removeItem(STORAGE_KEY); return true; } catch { return false; }
    }
  };

  window.CyberSucces = CyberSucces;
})();
