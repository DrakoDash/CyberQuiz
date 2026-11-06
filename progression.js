/* ============================================================
   CyberQuiz — Sauvegarde et transfert de la progression (progression.js)
   Tout se passe dans le navigateur : rien n'est envoyé sur un serveur.

   - Fichier : export complet (scores, succès, parties en cours, réglages)
     dans un fichier .json, à réimporter sur un autre appareil.
   - QR code : version compacte (scores + succès) placée dans un lien
     parametres.html#import=… ; la partie après « # » ne quitte jamais
     le téléphone (elle n'est pas envoyée au serveur de GitHub).
   ============================================================ */
(function () {
  'use strict';
  const PREFIX = 'cyberquiz_';
  // Clés techniques qu'on ne transfère pas.
  const SKIP = new Set(['cyberquiz_maint_last', 'cyberquiz_preview_app']);
  const MAX_FILE = 2 * 1024 * 1024;   // 2 Mo, largement assez

  function collect({ compact = false } = {}) {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(PREFIX) || SKIP.has(k)) continue;
        if (compact && (k.startsWith('cyberquiz_session_') || ['cyberquiz_last', 'cyberquiz_version_vue', 'cyberquiz_audio', 'cyberquiz_prefs'].includes(k))) continue;
        data[k] = localStorage.getItem(k);
      }
    } catch { /* stockage bloqué */ }
    if (compact && data.cyberquiz_succes) {
      // Le QR code a une taille limitée : on garde les 40 dernières parties de l'historique.
      try {
        const s = JSON.parse(data.cyberquiz_succes);
        if (Array.isArray(s.history)) s.history = s.history.slice(-40);
        data.cyberquiz_succes = JSON.stringify(s);
      } catch { /* laissé tel quel */ }
    }
    return data;
  }

  function summary(data) {
    let scores = 0, sessions = 0, succes = 0;
    Object.entries(data).forEach(([k, v]) => {
      if (k === 'cyberquiz_succes') { try { succes = Object.keys(JSON.parse(v).unlocked || {}).length; } catch { /* ignoré */ } }
      else if (k.startsWith('cyberquiz_session_')) sessions++;
      else if (/^cyberquiz_[a-z-]+$/.test(k)) { try { const r = JSON.parse(v); if (r && Number.isInteger(r.score)) scores++; } catch { /* ignoré */ } }
    });
    return { scores, sessions, succes };
  }

  function validate(obj) {
    if (!obj || obj.app !== 'CyberQuiz' || typeof obj.data !== 'object' || Array.isArray(obj.data)) throw new Error('ce fichier n’est pas une sauvegarde CyberQuiz.');
    const clean = {};
    Object.entries(obj.data).forEach(([k, v]) => {
      // Seules les données de CyberQuiz sont acceptées, et uniquement du texte.
      if (typeof k === 'string' && k.startsWith(PREFIX) && !SKIP.has(k) && typeof v === 'string' && v.length < 500000 && /^cyberquiz_[a-z0-9_-]+$/.test(k)) clean[k] = v;
    });
    if (!Object.keys(clean).length) throw new Error('la sauvegarde est vide.');
    return clean;
  }

  function apply(data, { replace = true } = {}) {
    if (replace) {
      const old = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX) && !SKIP.has(k)) old.push(k); }
      old.forEach(k => localStorage.removeItem(k));
    }
    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
  }

  /* ── Fichier ── */
  function exportFile() {
    const payload = { app: 'CyberQuiz', format: 1, date: new Date().toISOString(), data: collect() };
    const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.download = `cyberquiz-progression-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
    a.href = URL.createObjectURL(blob);
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return summary(payload.data);
  }
  async function readFile(file) {
    if (!file) throw new Error('aucun fichier choisi.');
    if (file.size > MAX_FILE) throw new Error('fichier trop volumineux.');
    let obj;
    try { obj = JSON.parse(await file.text()); } catch { throw new Error('ce fichier est illisible (ce n’est pas un fichier .json de CyberQuiz).'); }
    return validate(obj);
  }

  /* ── QR code : compression + base64url ── */
  const b64url = bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64url = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
  async function pipe(bytes, Stream, mode) {
    const stream = new Blob([bytes]).stream().pipeThrough(new Stream(mode));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function encodeLink(baseUrl) {
    const json = new TextEncoder().encode(JSON.stringify({ app: 'CyberQuiz', format: 1, data: collect({ compact: true }) }));
    let token;
    if ('CompressionStream' in window) token = 'z' + b64url(await pipe(json, CompressionStream, 'deflate-raw'));
    else token = 'j' + b64url(json);
    return baseUrl + '#import=' + token;
  }
  async function decodeToken(token) {
    if (!token || token.length < 4) throw new Error('lien incomplet.');
    let bytes = unb64url(token.slice(1));
    if (token[0] === 'z') {
      if (!('DecompressionStream' in window)) throw new Error('ce navigateur est trop ancien pour lire ce QR code : utilise plutôt le fichier.');
      bytes = await pipe(bytes, DecompressionStream, 'deflate-raw');
    } else if (token[0] !== 'j') throw new Error('lien non reconnu.');
    let obj;
    try { obj = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('lien abîmé ou incomplet.'); }
    return validate(obj);
  }

  window.CyberProgression = { collect, summary, exportFile, readFile, encodeLink, decodeToken, apply };
})();
