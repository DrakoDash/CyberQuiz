/* ============================================================
   CyberQuiz — Ambiance sonore (audio.js)
   À inclure dans chaque page :  <script src="audio.js" defer></script>

   Toute la musique et tous les sons sont SYNTHÉTISÉS en direct
   avec la Web Audio API : aucun fichier MP3, donc aucun droit
   d'auteur, rien à télécharger et tout marche hors-ligne.

   Utilisation depuis une autre page / un autre script :
     CyberSon.play('correct');   // 'hover', 'click', 'nav', 'back', 'correct', 'wrong',
                                 // 'finish-good', 'finish-bad', 'achievement',
                                 // 'toggle-on', 'toggle-off'
     CyberSon.openPanel();       // ouvre le panneau de réglages

   Les navigateurs interdisent de jouer du son avant la première
   interaction (clic, touche) sur la page : la musique démarre donc
   au premier clic, en fondu.
   ============================================================ */
(function () {
  'use strict';

  const STORE = 'cyberquiz_audio';
  const SESSION_BAR = 'cyberquiz_music_bar';   // pour enchaîner la musique d'une page à l'autre
  const appMode = () => document.documentElement.classList.contains('app-mode') ||
    matchMedia('(display-mode: standalone)').matches || navigator.standalone === true ||
    sessionStorage.getItem('cyberquiz_preview_app') === '1';

  /* ── Réglages (sauvegardés) ── */
  function loadSettings() {
    const defaults = { music: null, sfx: true, musicVol: 0.35, sfxVol: 0.6 };
    try { return Object.assign(defaults, JSON.parse(localStorage.getItem(STORE)) || {}); }
    catch { return defaults; }
  }
  const settings = loadSettings();
  // Musique : activée par défaut dans l'application installée, désactivée sur le site web.
  const musicOn = () => settings.music === null ? appMode() : settings.music;
  function saveSettings() { try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch { /* stockage bloqué */ } }

  /* ── Moteur audio (créé au premier besoin) ── */
  let ctx = null, master, musicBus, sfxBus, delay, unlocked = false;
  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);

    musicBus = ctx.createGain(); musicBus.gain.value = 0;
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx ? settings.sfxVol : 0;
    musicBus.connect(master); sfxBus.connect(master);

    // Écho léger pour l'arpège de la musique
    delay = ctx.createDelay(1); delay.delayTime.value = 0.357;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    const dlFilter = ctx.createBiquadFilter(); dlFilter.type = 'lowpass'; dlFilter.frequency.value = 2200;
    delay.connect(dlFilter).connect(fb).connect(delay);
    dlFilter.connect(wet).connect(musicBus);
    return ctx;
  }

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  /* Joue une note simple avec enveloppe ADSR */
  function tone({ freq, type = 'sine', start = 0, dur = 0.15, vol = 0.3, attack = 0.005, release = 0.08,
                  to = null, bus = sfxBus, filter = null, detune = 0 }) {
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    osc.detune.value = detune;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.setValueAtTime(vol, t0 + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    let node = osc;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; node.connect(f); node = f; }
    node.connect(g).connect(bus);
    osc.start(t0); osc.stop(t0 + dur + release + 0.05);
  }

  /* Bruit filtré (souffle, « whoosh ») */
  let noiseBuffer = null;
  function getNoise() {
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }
  function noise({ start = 0, dur = 0.25, vol = 0.15, from = 400, to = 3000, q = 0.8, bus = sfxBus, type = 'bandpass' }) {
    const t0 = ctx.currentTime + start;
    const src = ctx.createBufferSource(); src.buffer = getNoise();
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  /* ============================================================
     EFFETS SONORES
     ============================================================ */
  const SFX = {
    /* ── Sons d'interface inspirés de SteamOS : courts, ronds, feutrés ── */
    // Le focus passe sur un élément (survol souris ou touche Tab) : petit « tic » doux
    hover() {
      tone({ freq: 1760, to: 1480, type: 'sine', dur: 0.022, vol: 0.045, attack: 0.002, release: 0.025, filter: 3500 });
      tone({ freq: 880, type: 'triangle', dur: 0.018, vol: 0.02, attack: 0.002, release: 0.02 });
    },
    // Validation / clic : « bwip » arrondi en deux notes montantes
    click() {
      tone({ freq: midi(81), type: 'sine', dur: 0.04, vol: 0.13, attack: 0.004, release: 0.03, filter: 4000 });
      tone({ freq: midi(88), type: 'sine', start: 0.035, dur: 0.06, vol: 0.12, attack: 0.004, release: 0.06, filter: 4000 });
      tone({ freq: midi(76), type: 'triangle', dur: 0.05, vol: 0.04, release: 0.04 });
    },
    // Ouverture d'une page : souffle montant + petite cloche
    nav() {
      noise({ dur: 0.22, vol: 0.06, from: 350, to: 2800, q: 1.2 });
      tone({ freq: midi(76), to: midi(83), type: 'sine', dur: 0.09, vol: 0.10, attack: 0.01, filter: 3000 });
      tone({ freq: midi(88), type: 'sine', start: 0.08, dur: 0.12, vol: 0.07, release: 0.18 });
      tone({ freq: midi(95), type: 'sine', start: 0.11, dur: 0.08, vol: 0.03, release: 0.2 });
    },
    // Retour (← Accueil, Précédent) : la même chose, mais qui redescend
    back() {
      noise({ dur: 0.2, vol: 0.05, from: 2600, to: 400, q: 1.2 });
      tone({ freq: midi(86), type: 'sine', dur: 0.045, vol: 0.11, filter: 3500 });
      tone({ freq: midi(79), type: 'sine', start: 0.045, dur: 0.08, vol: 0.10, release: 0.08, filter: 3000 });
    },
    correct() {
      [72, 76, 79].forEach((n, i) => tone({ freq: midi(n), type: 'triangle', start: i * 0.07, dur: 0.12, vol: 0.22 }));
      tone({ freq: midi(84), type: 'sine', start: 0.21, dur: 0.35, vol: 0.12, release: 0.3 });
    },
    wrong() {
      tone({ freq: midi(52), type: 'square', dur: 0.14, vol: 0.08, filter: 900 });
      tone({ freq: midi(47), type: 'square', start: 0.15, dur: 0.28, vol: 0.08, filter: 700, release: 0.15 });
    },
    'finish-good'() {
      [67, 72, 76, 79, 84].forEach((n, i) => tone({ freq: midi(n), type: 'triangle', start: i * 0.09, dur: 0.16, vol: 0.2 }));
      [72, 76, 79].forEach(n => tone({ freq: midi(n), type: 'sawtooth', start: 0.48, dur: 0.6, vol: 0.05, filter: 2400, release: 0.5 }));
    },
    'finish-bad'() {
      [69, 67, 64].forEach((n, i) => tone({ freq: midi(n), type: 'triangle', start: i * 0.14, dur: 0.18, vol: 0.18 }));
      tone({ freq: midi(57), type: 'sine', start: 0.42, dur: 0.5, vol: 0.12, release: 0.4 });
    },
    achievement() {
      noise({ dur: 0.6, vol: 0.05, from: 3000, to: 9000, type: 'highpass' });
      [76, 79, 83, 88, 91].forEach((n, i) => tone({ freq: midi(n), type: 'sine', start: 0.05 + i * 0.06, dur: 0.18, vol: 0.16 }));
      [64, 71, 76].forEach(n => tone({ freq: midi(n), type: 'triangle', start: 0.35, dur: 0.7, vol: 0.07, release: 0.6 }));
    },
    'toggle-on'() { tone({ freq: midi(79), type: 'sine', dur: 0.04, vol: 0.1 }); tone({ freq: midi(86), type: 'sine', start: 0.04, dur: 0.07, vol: 0.1, release: 0.06 }); },
    'toggle-off'() { tone({ freq: midi(86), type: 'sine', dur: 0.04, vol: 0.1 }); tone({ freq: midi(79), type: 'sine', start: 0.04, dur: 0.07, vol: 0.09, release: 0.06 }); }
  };

  function play(name) {
    if (!settings.sfx || !SFX[name]) return;
    if (Array.isArray(window.__cyberSonLog)) window.__cyberSonLog.push(name);   // journal de test (facultatif)
    if (!ensureContext()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    try { SFX[name](); } catch { /* jamais bloquant */ }
  }

  /* ============================================================
     MUSIQUE D'AMBIANCE — générée en direct
     Progression Am – F – C – G (4 temps par accord), 84 BPM :
     nappes douces, basse, arpège avec écho et petits tics de charleston.
     L'arpège varie un peu à chaque mesure pour ne pas lasser.
     ============================================================ */
  const BPM = 84, BEAT = 60 / BPM, STEP = BEAT / 2;      // une croche
  const CHORDS = [
    { root: 45, notes: [57, 60, 64] },   // La mineur
    { root: 41, notes: [53, 57, 60] },   // Fa majeur
    { root: 48, notes: [55, 60, 64] },   // Do majeur
    { root: 43, notes: [55, 59, 62] }    // Sol majeur
  ];
  let musicTimer = null, nextTime = 0, step = 0, bar = 0, musicPlaying = false, padFilter = null;

  function scheduleStep(t) {
    const chord = CHORDS[bar % CHORDS.length];
    const inBar = step % 8;
    if (inBar === 0) {
      // Nappe : trois oscillateurs désaccordés, attaque lente
      chord.notes.forEach(n => [-7, 7].forEach(dt => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = dt;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.022, t + 1.2);
        g.gain.setValueAtTime(0.022, t + BEAT * 4 - 0.6);
        g.gain.linearRampToValueAtTime(0, t + BEAT * 4 + 0.4);
        o.connect(g).connect(padFilter);
        o.start(t); o.stop(t + BEAT * 4 + 0.5);
      }));
      // Basse
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = midi(chord.root);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.03, t + BEAT * 3.5); g.gain.linearRampToValueAtTime(0, t + BEAT * 4);
      o.connect(g).connect(musicBus); o.start(t); o.stop(t + BEAT * 4 + 0.05);
    }
    // Arpège (pas sur toutes les croches → respiration)
    const pattern = (bar % 2 === 0) ? [0, 1, 2, 3, 2, 1, 2, 3] : [0, 2, 1, 3, 2, 3, 1, 2];
    const skip = (bar >= 8 && Math.random() < 0.18) || (bar < 4 && inBar % 2 === 1);
    if (!skip) {
      const notes = [...chord.notes, chord.notes[0] + 12];
      const n = notes[pattern[inBar]] + 12;
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = midi(n);
      f.type = 'lowpass'; f.frequency.value = 2600;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.055, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.6);
      o.connect(f).connect(g); g.connect(musicBus); g.connect(delay);
      o.start(t); o.stop(t + STEP * 2);
    }
    // Petits tics de charleston sur les contretemps
    if (bar >= 2 && inBar % 2 === 1) {
      const src = ctx.createBufferSource();
      src.buffer = getNoise();
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(f).connect(g).connect(musicBus);
      src.start(t, Math.random() * 0.5); src.stop(t + 0.06);
    }
    step++;
    if (step % 8 === 0) {
      bar++;
      try { sessionStorage.setItem(SESSION_BAR, String(bar)); } catch { /* ignoré */ }
    }
  }

  function startMusic() {
    if (musicPlaying || !musicOn() || !ensureContext()) return;
    if (ctx.state !== 'running') return;          // attend la première interaction
    musicPlaying = true;
    // Reprend la progression là où la page précédente s'était arrêtée.
    bar = parseInt(sessionStorage.getItem(SESSION_BAR) || '0', 10) || 0;
    step = 0;
    if (!padFilter) {
      padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 900; padFilter.Q.value = 0.6;
      const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      lfo.frequency.value = 0.05; lfoGain.gain.value = 450;
      lfo.connect(lfoGain).connect(padFilter.frequency); lfo.start();
      padFilter.connect(musicBus);
    }
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(settings.musicVol, now + 2);   // fondu d'entrée
    nextTime = now + 0.1;
    musicTimer = setInterval(() => {
      while (nextTime < ctx.currentTime + 0.25) { scheduleStep(nextTime); nextTime += STEP; }
    }, 50);
  }

  function stopMusic(fade = 0.6) {
    if (!musicPlaying) return;
    musicPlaying = false;
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(0, now + fade);
    setTimeout(() => { if (!musicPlaying) clearInterval(musicTimer); }, fade * 1000 + 50);
  }

  /* ── Déblocage au premier geste (règle des navigateurs) ── */
  function unlock() {
    if (unlocked) return;
    if (!ensureContext()) return;
    ctx.resume().then(() => { unlocked = true; startMusic(); }).catch(() => {});
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { capture: true, passive: true }));
  // Certains navigateurs autorisent le son si l'utilisateur a déjà interagi avec le site : on tente.
  window.addEventListener('load', () => { if (musicOn()) { ensureContext(); if (ctx && ctx.state === 'running') { unlocked = true; startMusic(); } } });

  // Pause quand l'onglet est caché, reprise au retour.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { stopMusic(0.3); }
    else if (unlocked && musicOn()) { ctx.resume().then(startMusic).catch(() => {}); }
  });

  /* ── Sons automatiques sur les éléments interactifs ── */
  const INTERACTIVE = 'button, a[href], [role="button"], input[type="checkbox"], input[type="radio"], .quiz-card, tr.row';
  const isBack = elt => elt.matches('.nav-back, #prevBtn, #backToResultBtn') ||
    (elt.tagName === 'A' && /(^|\/)(accueil|index)\.html(#.*)?$/.test(elt.getAttribute('href') || '') && !elt.classList.contains('app-tab'));

  document.addEventListener('click', e => {
    const elt = e.target.closest('button, a, [role="button"], input[type="checkbox"], input[type="radio"]');
    if (!elt || elt.closest('[data-sound="none"]') || elt.disabled) return;
    if (isBack(elt)) play('back');
    else if (elt.tagName === 'A' && elt.href && !elt.target && new URL(elt.href, location.href).origin === location.origin &&
        !elt.getAttribute('href').startsWith('#')) play('nav');
    else play('click');
  }, true);

  // Comme sur SteamOS : un petit son à chaque fois que le focus change d'élément,
  // à la souris (survol) comme au clavier (Tab, flèches). Pas sur écran tactile.
  let lastHover = null, lastHoverAt = 0, keyboardNav = false;
  window.addEventListener('keydown', e => { if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) keyboardNav = true; }, true);
  window.addEventListener('pointerdown', () => { keyboardNav = false; }, true);
  function hoverSound(elt) {
    if (!elt || elt === lastHover || elt.disabled || elt.closest('[data-sound="none"]')) return;
    lastHover = elt;
    const now = performance.now();
    if (now - lastHoverAt < 45) return;    // évite la « mitraillette » en passant vite sur une liste
    lastHoverAt = now;
    if (unlocked) play('hover');
  }
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const elt = e.target.closest(INTERACTIVE);
    if (!elt) { lastHover = null; return; }
    hoverSound(elt);
  }, true);
  document.addEventListener('focusin', e => {
    if (!keyboardNav) return;
    hoverSound(e.target.closest(INTERACTIVE));
  }, true);

  /* ============================================================
     PANNEAU DE RÉGLAGES DU SON
     ============================================================ */
  function injectStyles() {
    if (document.getElementById('cs-audio-styles')) return;
    const css = document.createElement('style');
    css.id = 'cs-audio-styles';
    css.textContent = `
      .snd-fab { position:fixed; left:16px; bottom:calc(16px + env(safe-area-inset-bottom)); z-index:9000; width:44px; height:44px; border-radius:50%;
        display:grid; place-items:center; font-size:1.15rem; cursor:pointer; color:#e8eaf6;
        background:rgba(13,20,48,.92); border:1px solid rgba(0,191,255,.35); box-shadow:0 6px 20px rgba(0,0,0,.45); backdrop-filter:blur(6px); }
      .snd-fab:hover { border-color:#00bfff; box-shadow:0 0 16px rgba(0,191,255,.3); }
      html.app-mode .snd-fab { display:none; }
      .snd-panel { position:fixed; left:16px; bottom:calc(70px + env(safe-area-inset-bottom)); z-index:9001; width:min(300px, calc(100vw - 32px)); padding:16px 18px;
        border-radius:16px; background:#0d1430f2; border:1px solid rgba(0,191,255,.3); color:#e8eaf6;
        font:.85rem 'Poppins',system-ui,sans-serif; box-shadow:0 18px 50px rgba(0,0,0,.55); backdrop-filter:blur(10px); }
      html.app-mode .snd-panel { left:50%; transform:translateX(-50%); bottom:calc(84px + env(safe-area-inset-bottom)); }
      .snd-panel h2 { margin:0 0 12px; font-size:.95rem; display:flex; justify-content:space-between; align-items:center; }
      .snd-panel h2 button { background:none; border:0; color:#9fb0c7; font-size:1.2rem; cursor:pointer; }
      .snd-row { display:grid; grid-template-columns:1fr auto; align-items:center; gap:6px 12px; padding:10px 0; border-top:1px solid rgba(255,255,255,.07); }
      .snd-row label { font-weight:600; }
      .snd-row small { grid-column:1/-1; color:#8fa0b8; font-size:.72rem; }
      .snd-row input[type=range] { grid-column:1/-1; width:100%; accent-color:#00bfff; }
      .snd-switch { position:relative; width:44px; height:24px; border-radius:99px; border:0; background:#2a3352; cursor:pointer; transition:background .2s; }
      .snd-switch::after { content:''; position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; transition:transform .2s; }
      .snd-switch[aria-checked="true"] { background:#00bfff; }
      .snd-switch[aria-checked="true"]::after { transform:translateX(20px); }
      @media (prefers-reduced-motion:no-preference) { .snd-panel { animation:snd-in .22s ease both; } }
      @keyframes snd-in { from { opacity:0; translate:0 10px; } }
    `;
    document.head.append(css);
  }

  function fabIcon() { return (musicOn() || settings.sfx) ? '🔊' : '🔇'; }
  function updateFab() { const f = document.getElementById('snd-fab'); if (f) { f.textContent = fabIcon(); f.setAttribute('aria-label', 'Réglages du son (' + (settings.sfx || musicOn() ? 'activé' : 'coupé') + ')'); } }

  function openPanel() {
    injectStyles();
    const old = document.getElementById('snd-panel');
    if (old) { old.remove(); return; }
    unlock();
    const panel = document.createElement('div');
    panel.id = 'snd-panel'; panel.className = 'snd-panel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Réglages du son');
    const h = document.createElement('h2'); h.textContent = '🎧 Son';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Fermer');
    close.dataset.sound = 'none';
    close.onclick = () => panel.remove();
    h.append(close); panel.append(h);

    const row = (label, help, isOn, onToggle, vol, onVol) => {
      const r = document.createElement('div'); r.className = 'snd-row';
      const id = 'snd-' + label.replace(/\W/g, '');
      const l = document.createElement('label'); l.textContent = label; l.htmlFor = id;
      const sw = document.createElement('button'); sw.type = 'button'; sw.className = 'snd-switch'; sw.id = id;
      sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(isOn())); sw.dataset.sound = 'none';
      sw.onclick = () => { onToggle(!isOn()); sw.setAttribute('aria-checked', String(isOn())); range.disabled = !isOn(); updateFab(); };
      const range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = 100; range.value = Math.round(vol() * 100);
      range.setAttribute('aria-label', 'Volume ' + label.toLowerCase()); range.disabled = !isOn();
      range.oninput = () => onVol(range.value / 100);
      const s = document.createElement('small'); s.textContent = help;
      r.append(l, sw, s, range);
      return r;
    };
    panel.append(
      row('Musique d’ambiance', 'Une boucle électro calme, générée en direct.', musicOn,
        on => { settings.music = on; saveSettings(); if (on) { unlock(); startMusic(); } else stopMusic(); },
        () => settings.musicVol,
        v => { settings.musicVol = v; saveSettings(); if (musicPlaying && ctx) musicBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }),
      row('Effets sonores', 'Clics, bonnes et mauvaises réponses, succès…', () => settings.sfx,
        on => { settings.sfx = on; saveSettings(); if (ensureContext()) sfxBus.gain.setTargetAtTime(on ? settings.sfxVol : 0, ctx.currentTime, 0.02); if (on) play('toggle-on'); },
        () => settings.sfxVol,
        v => { settings.sfxVol = v; saveSettings(); if (ensureContext()) { sfxBus.gain.setTargetAtTime(v, ctx.currentTime, 0.02); } play('click'); })
    );
    document.body.append(panel);
    const onKey = e => { if (e.key === 'Escape') { panel.remove(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    setTimeout(() => {
      const outside = e => { if (!panel.contains(e.target) && !e.target.closest('#snd-fab, [data-open-sound]')) { panel.remove(); document.removeEventListener('pointerdown', outside); } };
      document.addEventListener('pointerdown', outside);
    });
    panel.querySelector('.snd-switch').focus();
  }

  function addFab() {
    if (document.getElementById('snd-fab') || document.body.dataset.noAudioButton !== undefined) return;
    injectStyles();
    const b = document.createElement('button');
    b.id = 'snd-fab'; b.className = 'snd-fab'; b.type = 'button'; b.dataset.sound = 'none';
    b.onclick = openPanel;
    document.body.append(b);
    updateFab();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFab); else addFab();

  window.CyberSon = { play, openPanel, startMusic, stopMusic, get settings() { return { ...settings, music: musicOn() }; } };
})();
