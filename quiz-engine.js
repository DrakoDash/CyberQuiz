/* ============================================================
   CyberQuiz — Moteur commun des quiz (quiz-engine.js)

   Chaque page de quiz est une coquille vide : <body data-quiz="mdp">.
   Ce script charge questions/mdp.json, remplit la page et fait
   tourner le quiz.

   ➜ Pour AJOUTER UN QUIZ : voir le mode d'emploi dans questions/LISEZMOI.md
     (copier questions/_modele.json et _modele-page.html).

   Format d'une question dans le JSON :
     { "q": "Question ?", "a": ["Réponse A", "Réponse B", "Réponse C"],
       "c": 1, "e": "Explication affichée dans la correction",
       "scenario": "Mise en contexte (facultatif)" }
     c = numéro de la bonne réponse, en commençant à 0 (0 = A, 1 = B…).

   "mode": "entrainement" → on répond à tout, correction à la fin.
   "mode": "validation"   → on valide chaque question et on voit l'explication
                            tout de suite (ordre des questions mélangé).
   ============================================================ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const quizId = document.body.dataset.quiz;
  const card = document.querySelector('.quiz-card');

  /* ── Décor : particules qui montent (aucune incidence sur le score) ── */
  function startDecor() {
    const canvas = $('ambient-particles');
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => preference.matches || document.documentElement.classList.contains('reduce-motion');
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--theme-rgb').trim();
    let width = 0, height = 0, dots = [], frame = null, last = 0;
    function size() {
      width = innerWidth; height = innerHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = width * ratio; canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      dots = Array.from({ length: Math.min(55, Math.max(18, Math.floor(width * height / 25000))) },
        () => ({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.2 + .4, speed: Math.random() * 5 + 3 }));
    }
    function draw(dt) {
      ctx.clearRect(0, 0, width, height);
      for (const p of dots) {
        p.y -= p.speed * dt; if (p.y < -5) p.y = height + 5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},.45)`; ctx.fill();
      }
    }
    function tick(time) { draw(last ? Math.min((time - last) / 1000, .05) : 0); last = time; frame = requestAnimationFrame(tick); }
    function sync() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; last = 0; draw(0);
      if (!reduced() && !document.hidden) frame = requestAnimationFrame(tick);
    }
    size(); sync();
    addEventListener('resize', () => { size(); sync(); });
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener?.('change', sync);
    document.addEventListener('cyberquiz:settings', sync);
  }

  /* ── Erreur lisible si le fichier JSON est absent ou mal écrit ── */
  function showError(message) {
    card.classList.remove('is-loading');
    const box = document.createElement('div');
    box.className = 'engine-error';
    box.setAttribute('role', 'alert');
    box.innerHTML = '<strong>Ce quiz n’a pas pu être chargé.</strong><br>';
    box.append(message);
    card.replaceChildren(box);
    console.error('[CyberQuiz]', message);
  }

  /* ── Vérifie le fichier de questions (aide à repérer les erreurs de saisie) ── */
  function validate(data) {
    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) throw new Error('la liste "questions" est vide ou absente.');
    data.questions.forEach((q, i) => {
      const n = `question ${i + 1}`;
      if (typeof q.q !== 'string' || !q.q.trim()) throw new Error(`${n} : le texte "q" est vide.`);
      if (!Array.isArray(q.a) || q.a.length < 2) throw new Error(`${n} : il faut au moins 2 réponses dans "a".`);
      if (!Number.isInteger(q.c) || q.c < 0 || q.c >= q.a.length) throw new Error(`${n} : "c" doit être un nombre entre 0 et ${q.a.length - 1} (0 = première réponse).`);
      if (typeof q.e !== 'string') throw new Error(`${n} : l'explication "e" est absente.`);
    });
  }

  /* ── Remplit l'en-tête de la page avec les infos du quiz ── */
  function fillPage(d) {
    const root = document.documentElement;
    if (d.couleur) root.style.setProperty('--theme-rgb', d.couleur);
    if (d.couleur2) root.style.setProperty('--accent2', d.couleur2);
    if (d.titre_onglet) document.title = d.titre_onglet;
    const set = (sel, text) => { const el = document.querySelector(sel); if (el && text != null) el.textContent = text; };
    set('.lesson-trail span', d.parcours);
    set('.lesson-trail strong', 'Parcours / ' + d.module);
    set('.hero-label', `${d.niveau} · MODULE ${d.module}`);
    set('.hero-text h1', d.titre);
    set('.hero-text p', d.description);
    set('.play-hint', d.consigne || `${d.questions.length} questions`);
    set('.lesson-footer span', d.pied_de_page || 'CyberQuiz · Apprendre, comprendre, progresser.');
    const tags = document.querySelector('.topic-tags');
    if (tags) tags.replaceChildren(...(d.themes || []).map(t => { const s = document.createElement('span'); s.textContent = t; return s; }));
    // L'illustration vient de NOS fichiers JSON (pas d'une saisie de visiteur) : on peut l'insérer en SVG.
    const art = document.querySelector('.art-symbol');
    if (art && d.illustration) art.innerHTML = d.illustration;
    const back = document.querySelector('.nav-back');
    if (back) {
      const sit = d.categorie === 'situations';
      back.href = sit ? 'situations.html' : 'quiz.html';
      back.textContent = sit ? '← Mises en situation' : '← Quiz';
    }
    $('progressBar').setAttribute('aria-valuemax', d.questions.length);
    if (d.mode === 'validation') $('progressBar').setAttribute('aria-label', 'Questions validées');
  }

  /* ============================================================
     LE QUIZ (même logique et même sauvegarde qu'avant le moteur commun :
     une partie en cours n'est pas perdue)
     ============================================================ */
  function run(d) {
    const questions = d.questions;
    const isFinal = d.mode === 'validation';
    // Une clé pour la partie, une autre pour le résultat lu par l'accueil.
    const sessionKey = 'cyberquiz_session_' + quizId;
    const resultKey = 'cyberquiz_' + quizId;
    // Si les questions changent, l'ancienne partie en cours est abandonnée proprement.
    const signature = JSON.stringify(questions);

    function freshState() {
      const order = questions.map((_, i) => i);
      // Fisher-Yates : chaque question apparaît une seule fois.
      if (isFinal) for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      return { version: 1, signature, order, cur: 0,
        answers: questions.map(() => null), locked: questions.map(() => false), finished: false };
    }
    function storageError() {
      $('storageNote').hidden = false;
      $('storageNote').textContent = 'La sauvegarde locale est indisponible. Tu peux continuer, mais cette partie ne sera pas conservée après fermeture.';
    }
    function readState() {
      try {
        const s = JSON.parse(localStorage.getItem(sessionKey));
        const n = questions.length;
        if (!s || s.version !== 1 || s.signature !== signature ||
            !Array.isArray(s.order) || s.order.length !== n || new Set(s.order).size !== n ||
            !s.order.every(i => Number.isInteger(i) && i >= 0 && i < n) ||
            !Number.isInteger(s.cur) || s.cur < 0 || s.cur >= n ||
            !Array.isArray(s.answers) || s.answers.length !== n ||
            !s.answers.every((a, i) => a === null || (Number.isInteger(a) && a >= 0 && a < questions[s.order[i]].a.length)) ||
            !Array.isArray(s.locked) || s.locked.length !== n || !s.locked.every(v => typeof v === 'boolean') ||
            s.locked.some((v, i) => v && s.answers[i] === null) || typeof s.finished !== 'boolean' ||
            (s.finished && (s.answers.includes(null) || (isFinal && s.locked.includes(false))))) return freshState();
        return s;
      } catch { /* Une sauvegarde corrompue ne bloque jamais le quiz. */ return freshState(); }
    }
    let state = readState();
    function save() {
      try { localStorage.setItem(sessionKey, JSON.stringify(state)); }
      catch { storageError(); }
    }
    function score() {
      // Recalculer à partir des réponses évite les points ajoutés deux fois.
      return state.answers.reduce((sum, a, i) => sum + (a === questions[state.order[i]].c ? 1 : 0), 0);
    }
    function progress() {
      const done = isFinal ? state.locked.filter(Boolean).length : state.answers.filter(a => a !== null).length;
      $('progressFill').style.width = (done / questions.length * 100) + '%';
      $('progressLabel').textContent = done + ' / ' + questions.length;
      $('progressBar').setAttribute('aria-valuenow', done);
    }
    const focusTitle = id => $(id).focus();
    function showScreen(id) {
      ['quizStep', 'resultStep', 'corrStep'].forEach(x => { $(x).hidden = x !== id; });
      $(id).style.display = 'block';
    }
    function renderQuestion(moveFocus = false) {
      showScreen('quizStep');
      const q = questions[state.order[state.cur]];
      $('qNumber').textContent = `Question ${state.cur + 1} / ${questions.length}`;
      $('qText').textContent = q.q;
      $('scenario').hidden = !q.scenario;
      $('scenario').textContent = q.scenario ? 'Situation : ' + q.scenario : '';
      $('ansBox').replaceChildren();
      const locked = isFinal && state.locked[state.cur];
      q.a.forEach((answer, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'answer-btn' + (state.answers[state.cur] === i ? ' selected' : '');
        button.setAttribute('aria-pressed', state.answers[state.cur] === i ? 'true' : 'false');
        if (locked) {
          button.disabled = true;
          if (i === q.c) button.classList.add('correct');
          else if (state.answers[state.cur] === i) button.classList.add('wrong');
        }
        const badge = document.createElement('span'); badge.className = 'answer-badge';
        badge.textContent = String.fromCharCode(65 + i); badge.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span'); text.textContent = answer;
        button.append(badge, text);
        button.onclick = () => {
          if (state.finished || (isFinal && state.locked[state.cur])) return;
          state.answers[state.cur] = i; save();
          renderQuestion(); $('ansBox').children[i].focus();
        };
        $('ansBox').append(button);
      });
      $('prevBtn').disabled = state.cur === 0;
      $('nextBtn').hidden = isFinal && !locked;
      $('nextBtn').disabled = state.answers[state.cur] === null || (isFinal && !locked);
      $('nextBtn').textContent = state.cur === questions.length - 1 ? 'Terminer' : 'Suivant';
      $('validateBtn').hidden = !isFinal || locked;
      $('validateBtn').disabled = state.answers[state.cur] === null;
      $('feedback').hidden = !locked;
      if (locked) {
        const correct = state.answers[state.cur] === q.c;
        $('feedback').textContent = (correct ? 'Bonne réponse ! ' : 'Réponse incorrecte. Bonne réponse : ' + q.a[q.c] + '. ') + q.e;
      }
      progress();
      if (moveFocus) focusTitle('qText');
    }
    $('validateBtn').onclick = () => {
      if (!isFinal || state.finished || state.answers[state.cur] === null || state.locked[state.cur]) return;
      state.locked[state.cur] = true; save(); renderQuestion(); focusTitle('feedback');
      if (window.CyberSon) CyberSon.play(state.answers[state.cur] === questions[state.order[state.cur]].c ? 'correct' : 'wrong');
    };
    $('nextBtn').onclick = () => {
      if (state.finished || state.answers[state.cur] === null || (isFinal && !state.locked[state.cur])) return;
      if (state.cur < questions.length - 1) { state.cur++; save(); renderQuestion(true); }
      else {
        if (state.answers.includes(null) || (isFinal && state.locked.includes(false))) return;
        state.finished = true; save(); showResults(true);
        // Succès : la partie vient d'être terminée (pas un simple rechargement de page).
        if (window.CyberSucces) CyberSucces.enregistrerPartie(quizId, score(), questions.length);
        if (window.CyberSon) CyberSon.play(score() / questions.length >= 0.7 ? 'finish-good' : 'finish-bad');
      }
    };
    $('prevBtn').onclick = () => {
      if (!state.finished && state.cur > 0) { state.cur--; save(); renderQuestion(true); }
    };
    function showResults(moveFocus = false) {
      if (!state.finished) return;
      showScreen('resultStep'); progress();
      const value = score(), total = questions.length, pct = Math.round(value / total * 100);
      $('scoreNum').textContent = value;
      $('scoreTotal').textContent = '/ ' + total;
      const circumference = 2 * Math.PI * 55;
      $('ringFill').style.strokeDasharray = circumference;
      $('ringFill').style.strokeDashoffset = circumference * (1 - value / total);
      $('scoreMsg').textContent = pct >= 90 ? 'Excellent !' : pct >= 70 ? 'Bien joué !' : 'Continue à t’entraîner !';
      $('scoreSub').textContent = `${pct} % de bonnes réponses. Consulte la correction pour revoir chaque notion.`;
      try { localStorage.setItem(resultKey, JSON.stringify({ score: value, total, percent: pct })); }
      catch { storageError(); }
      if (moveFocus) focusTitle('scoreMsg');
    }
    $('showCorrBtn').onclick = () => {
      if (!state.finished) return;
      showScreen('corrStep'); $('corrList').replaceChildren();
      state.order.forEach((index, i) => {
        const q = questions[index], ok = state.answers[i] === q.c;
        const item = document.createElement('article'); item.className = 'corr-item ' + (ok ? 'ok' : 'ko');
        const title = document.createElement('h3'); title.className = 'corr-q'; title.textContent = `${i + 1}. ${q.q}`;
        const status = document.createElement('p'); status.className = 'corr-status ' + (ok ? 'ok' : 'ko'); status.textContent = ok ? '✓ Correct' : '✗ Incorrect';
        const answer = document.createElement('p'); answer.className = 'corr-answers';
        answer.textContent = 'Ta réponse : ' + (q.a[state.answers[i]] ?? 'Aucune réponse') + '. Bonne réponse : ' + q.a[q.c];
        const explanation = document.createElement('p'); explanation.className = 'corr-expl'; explanation.textContent = q.e;
        item.append(title, status, answer, explanation); $('corrList').append(item);
      });
      focusTitle('correctionTitle');
    };
    $('backToResultBtn').onclick = () => showResults(true);
    $('restartBtn').onclick = () => {
      // Le précédent score reste visible sur l'accueil jusqu'à la prochaine fin de partie.
      state = freshState(); save(); renderQuestion(true);
    };

    save();
    card.classList.remove('is-loading');
    if (state.finished) showResults(); else renderQuestion();
  }

  /* ── Démarrage ── */
  if (!quizId || !card) { console.error('[CyberQuiz] attribut data-quiz manquant sur <body>'); return; }
  fetch(`questions/${encodeURIComponent(quizId)}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`le fichier questions/${quizId}.json est introuvable (erreur ${res.status}).`);
      return res.text();
    })
    .then(text => {
      let data;
      try { data = JSON.parse(text); }
      catch (err) { throw new Error(`le fichier questions/${quizId}.json contient une erreur d’écriture (${err.message}). Vérifie les virgules et les guillemets.`); }
      validate(data);
      fillPage(data);
      startDecor();
      run(data);
      window.CyberQuizData = data;
    })
    .catch(err => {
      const msg = err instanceof TypeError
        ? 'Impossible de lire le fichier de questions. Si tu as ouvert la page directement depuis ton ordinateur (file://), utilise plutôt le site en ligne ou un petit serveur local.'
        : 'Raison : ' + err.message;
      showError(msg);
    });
})();
