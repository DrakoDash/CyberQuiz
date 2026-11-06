/* ============================================================
   CyberQuiz — Page Paramètres (parametres.js)
   ============================================================ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const msg = (text, ok = true) => { const m = $('progMsg'); m.textContent = text; m.className = 'set-msg ' + (ok ? 'ok' : 'ko'); };

  /* ── Affichage (thème, texte, animations) ── */
  function refreshPrefs() {
    const p = window.CyberApp ? CyberApp.readPrefs() : { theme: 'sombre', texte: 100, animations: 'normales' };
    document.querySelectorAll('.seg[data-pref]').forEach(group => {
      group.querySelectorAll('button').forEach(b => {
        const on = String(p[group.dataset.pref]) === b.dataset.value;
        b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
      });
    });
  }
  document.querySelectorAll('.seg[data-pref]').forEach(group => {
    const choose = b => {
      const key = group.dataset.pref;
      const value = key === 'texte' ? Number(b.dataset.value) : b.dataset.value;
      if (window.CyberApp) CyberApp.savePrefs({ [key]: value });
      refreshPrefs();
    };
    group.addEventListener('click', e => { const b = e.target.closest('button'); if (b) choose(b); });
    group.addEventListener('keydown', e => {   // flèches : comme des boutons radio
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const btns = [...group.querySelectorAll('button')];
      const i = btns.indexOf(document.activeElement);
      const next = btns[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + btns.length) % btns.length];
      next.focus(); choose(next);
    });
  });
  refreshPrefs();

  /* ── Son ── */
  function refreshSound() {
    const s = window.CyberSon ? CyberSon.settings : null;
    const sw = (el, on, disabled) => { el.setAttribute('aria-checked', String(!!on)); el.disabled = !!disabled; };
    sw($('swMusic'), s && s.music, !s); sw($('swSfx'), s && s.sfx, !s);
    $('volMusic').value = Math.round((s ? s.musicVol : .35) * 100); $('volMusic').disabled = !s || !s.music;
    $('volSfx').value = Math.round((s ? s.sfxVol : .6) * 100); $('volSfx').disabled = !s || !s.sfx;
  }
  const son = fn => () => { if (window.CyberSon) { fn(); refreshSound(); } };
  $('swMusic').addEventListener('click', son(() => CyberSon.configure({ music: !CyberSon.settings.music })));
  $('swSfx').addEventListener('click', son(() => { CyberSon.configure({ sfx: !CyberSon.settings.sfx }); CyberSon.play('toggle-on'); }));
  $('volMusic').addEventListener('input', son(() => CyberSon.configure({ musicVol: $('volMusic').value / 100 })));
  $('volSfx').addEventListener('input', son(() => CyberSon.configure({ sfxVol: $('volSfx').value / 100 })));
  $('volSfx').addEventListener('change', () => window.CyberSon && CyberSon.play('click'));
  $('testSound').addEventListener('click', () => {
    if (!window.CyberSon) return;
    ['click', 'nav', 'correct'].forEach((n, i) => setTimeout(() => CyberSon.play(n), 150 + i * 500));
  });
  // audio.js est chargé après ce script (defer) : on rafraîchit une fois prêt.
  addEventListener('load', refreshSound);
  refreshSound();

  /* ── Ma progression ── */
  function refreshSummary() {
    if (!window.CyberProgression) return;
    const s = CyberProgression.summary(CyberProgression.collect());
    $('progSummary').textContent = s.scores || s.succes || s.sessions
      ? `Sur cet appareil : ${s.scores} module${s.scores > 1 ? 's' : ''} terminé${s.scores > 1 ? 's' : ''}, ${s.succes} succès débloqué${s.succes > 1 ? 's' : ''}, ${s.sessions} partie${s.sessions > 1 ? 's' : ''} en cours.`
      : 'Aucune progression enregistrée sur cet appareil pour l’instant.';
  }
  refreshSummary();

  $('exportBtn').addEventListener('click', () => {
    try { CyberProgression.exportFile(); msg('✅ Sauvegarde téléchargée. Ouvre-la dans les Paramètres de l’autre appareil.'); }
    catch { msg('Le téléchargement a échoué.', false); }
  });

  // Import : on montre ce qui va être importé et on demande confirmation.
  let pending = null;
  function askImport(data, source) {
    pending = data;
    const s = CyberProgression.summary(data);
    $('importText').textContent = `${source} contient ${s.scores} module${s.scores > 1 ? 's' : ''} terminé${s.scores > 1 ? 's' : ''} et ${s.succes} succès`
      + (s.sessions ? `, ${s.sessions} partie${s.sessions > 1 ? 's' : ''} en cours` : '')
      + '. ⚠️ La progression actuelle de cet appareil sera remplacée.';
    $('importBox').hidden = false;
    $('importBox').scrollIntoView({ block: 'center' });
    $('importConfirm').focus();
  }
  $('importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    try { askImport(await CyberProgression.readFile(file), 'Ce fichier'); }
    catch (err) { msg('Import impossible : ' + err.message, false); }
  });
  $('importConfirm').addEventListener('click', () => {
    if (!pending) return;
    try {
      CyberProgression.apply(pending, { replace: true });
      pending = null; $('importBox').hidden = true;
      history.replaceState(null, '', location.pathname);
      msg('✅ Progression importée ! Retourne à l’accueil pour la voir.');
      refreshSummary(); refreshPrefs(); if (window.CyberApp) CyberApp.applyPrefs();
      if (window.CyberSon) CyberSon.play('finish-good');
    } catch { msg('L’import a échoué (stockage du navigateur indisponible).', false); }
  });
  $('importCancel').addEventListener('click', () => {
    pending = null; $('importBox').hidden = true; history.replaceState(null, '', location.pathname);
  });

  // Lien venant d'un QR code : parametres.html#import=…
  if (location.hash.startsWith('#import=')) {
    CyberProgression.decodeToken(location.hash.slice(8))
      .then(data => askImport(data, 'Le QR code'))
      .catch(err => msg('Ce QR code n’a pas pu être lu : ' + err.message, false));
  }

  /* ── QR code ── */
  let qrLink = '';
  $('qrBtn').addEventListener('click', async () => {
    const box = $('qrBox');
    if (!box.hidden) { box.hidden = true; $('qrBtn').lastChild.textContent = ' Afficher le QR code'; return; }
    try {
      const base = location.href.split('#')[0].split('?')[0];
      qrLink = await CyberProgression.encodeLink(base);
      if (typeof qrcode !== 'function') throw new Error('générateur indisponible');
      const qr = qrcode(0, 'L');            // taille automatique, correction d'erreur basse = QR plus lisible
      qr.addData(qrLink, 'Byte'); qr.make();
      const n = qr.getModuleCount();
      const cell = Math.max(2, Math.floor(260 / (n + 8)));
      $('qrImg').innerHTML = qr.createSvgTag({ cellSize: cell, margin: cell * 4, scalable: true });
      box.hidden = false; $('qrBtn').lastChild.textContent = ' Masquer le QR code';
    } catch (err) {
      msg('Le QR code n’a pas pu être créé (progression trop importante ?). Utilise plutôt le fichier.', false);
      console.error(err);
    }
  });
  $('qrCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(qrLink); msg('📋 Lien copié. Ouvre-le sur l’autre appareil.'); }
    catch { msg('Copie impossible dans ce navigateur.', false); }
  });

  /* ── Réinitialisations ── */
  $('resetProgress').addEventListener('click', () => {
    if (!confirm('Effacer définitivement les scores, les succès et les parties en cours de cet appareil ?')) return;
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cyberquiz_') && !['cyberquiz_prefs', 'cyberquiz_audio', 'cyberquiz_version_vue', 'cyberquiz_maint_last'].includes(k)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      refreshSummary(); msg('🧹 Progression effacée.');
    } catch { msg('Le navigateur ne permet pas de modifier le stockage local.', false); }
  });
  $('resetPrefs').addEventListener('click', () => {
    try { localStorage.removeItem('cyberquiz_prefs'); localStorage.removeItem('cyberquiz_audio'); } catch { /* ignoré */ }
    if (window.CyberApp) CyberApp.applyPrefs();
    refreshPrefs();
    msg('Réglages par défaut rétablis. Le son sera mis à jour au prochain chargement de page.');
  });
})();
