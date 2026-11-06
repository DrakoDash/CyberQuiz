/* ============================================================
   CyberQuiz — « Quoi de neuf ? » (whatsnew.js)
   - Affiche une fois une petite fenêtre résumant la dernière version
     (lue dans changelog.json) quand un visiteur revient après une mise à jour.
   - Ajoute un point rouge sur le lien « Versions » du menu tant que la
     dernière note n'a pas été lue.
   Jamais pendant un quiz, ni pour un tout nouveau visiteur.
   ============================================================ */
(function () {
  'use strict';
  const SEEN = 'cyberquiz_version_vue';
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage bloqué */ } }
  };
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const slug = v => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const TYPES = { nouveau: ['✨', 'Nouveau'], amelioration: ['⚡', 'Amélioration'], correction: ['🐛', 'Correction'], securite: ['🔒', 'Sécurité'] };

  // Un visiteur qui a déjà joué (score, partie commencée ou succès) n'est pas un nouveau visiteur.
  function hasHistory() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('cyberquiz_')) continue;
        if (k.startsWith('cyberquiz_session_')) {
          const s = JSON.parse(localStorage.getItem(k));
          if (s && Array.isArray(s.answers) && s.answers.some(a => a !== null)) return true;
        } else if (k === 'cyberquiz_succes') {
          const s = JSON.parse(localStorage.getItem(k));
          if (s && s.unlocked && Object.keys(s.unlocked).length) return true;
        } else if (/^cyberquiz_[a-z-]+$/.test(k) && !['cyberquiz_audio', 'cyberquiz_prefs', 'cyberquiz_last', 'cyberquiz_version_vue', 'cyberquiz_maint_last'].includes(k)) {
          const r = JSON.parse(localStorage.getItem(k));
          if (r && Number.isInteger(r.score)) return true;
        }
      }
    } catch { /* ignoré */ }
    return false;
  }

  function setDots(show) {
    document.querySelectorAll('a[href="changelog.html"]').forEach(a => {
      if (a.closest('footer')) return;
      let dot = a.querySelector('.news-dot');
      if (show && !dot) {
        dot = document.createElement('span'); dot.className = 'news-dot';
        dot.setAttribute('role', 'img'); dot.setAttribute('aria-label', 'nouveauté');
        a.classList.add('has-news'); a.append(dot);
      } else if (!show && dot) { dot.remove(); a.classList.remove('has-news'); }
    });
  }

  function injectStyles() {
    if (document.getElementById('wn-styles')) return;
    const css = document.createElement('style');
    css.id = 'wn-styles';
    css.textContent = `
      .news-dot{display:inline-block;width:8px;height:8px;margin-left:6px;border-radius:50%;background:#ff5f7e;box-shadow:0 0 0 3px rgba(255,95,126,.25);vertical-align:middle}
      .wn-backdrop{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;padding:16px;background:rgba(3,6,15,.72);backdrop-filter:blur(4px)}
      .wn-card{position:relative;width:min(480px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:26px 24px 22px;border-radius:22px;
        background:radial-gradient(circle at 100% 0%,rgba(0,191,255,.16),transparent 55%),linear-gradient(160deg,#111a33,#0a1022);
        border:1px solid rgba(0,191,255,.35);color:#e8eaf6;font-family:'Poppins',system-ui,sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
      .wn-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .wn-badge{font:600 .7rem 'Share Tech Mono',ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#001;background:#00bfff;padding:4px 10px;border-radius:99px}
      .wn-version{font:.78rem 'Share Tech Mono',ui-monospace,monospace;color:#4cc9f0}
      .wn-card h2{margin:12px 0 6px;font-size:1.35rem;line-height:1.25}
      .wn-card p{margin:0 0 14px;color:#b9c5d6;font-size:.9rem;line-height:1.6}
      .wn-list{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}
      .wn-list li{display:flex;gap:10px;font-size:.86rem;line-height:1.5;color:#dbe3ef}
      .wn-list span:first-child{flex-shrink:0}
      .wn-more{font-size:.8rem;color:#8fa0b8;margin:-8px 0 16px}
      .wn-actions{display:flex;gap:10px;flex-wrap:wrap}
      .wn-actions a,.wn-actions button{flex:1 1 auto;text-align:center;padding:11px 16px;border-radius:12px;font:600 .88rem 'Poppins',system-ui,sans-serif;cursor:pointer;text-decoration:none}
      .wn-actions a{background:#00bfff;color:#001;border:0}
      .wn-actions button{background:transparent;color:#e8eaf6;border:1px solid rgba(0,191,255,.35)}
      .wn-actions a:focus-visible,.wn-actions button:focus-visible,.wn-close:focus-visible{outline:3px solid #4cc9f0;outline-offset:2px}
      .wn-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.06);color:#c3cfe0;font-size:1.2rem;cursor:pointer}
      @media (prefers-reduced-motion:no-preference){html:not(.reduce-motion) .wn-card{animation:wn-in .4s cubic-bezier(.2,.9,.3,1.1) both}}
      @keyframes wn-in{from{opacity:0;transform:translateY(16px) scale(.97)}}
      html.theme-light .wn-card{background:#fff;color:#14213d;border-color:rgba(0,120,190,.3)}
      html.theme-light .wn-card p,html.theme-light .wn-more{color:#4a5874} html.theme-light .wn-list li{color:#1f2b45}
      html.theme-light .wn-actions button{color:#14213d} html.theme-light .wn-close{color:#4a5874;background:rgba(0,0,0,.05)}
    `;
    document.head.append(css);
  }

  function showPopup(v) {
    if (document.getElementById('mt-overlay') || document.querySelector('.wn-backdrop')) return;
    const previous = document.activeElement;
    const back = document.createElement('div');
    back.className = 'wn-backdrop';
    back.innerHTML = `
      <div class="wn-card" role="dialog" aria-modal="true" aria-labelledby="wn-title">
        <button class="wn-close" type="button" aria-label="Fermer">×</button>
        <div class="wn-top"><span class="wn-badge">✨ Quoi de neuf ?</span><span class="wn-version"></span></div>
        <h2 id="wn-title"></h2><p class="wn-sum"></p>
        <ul class="wn-list"></ul><p class="wn-more" hidden></p>
        <div class="wn-actions"><a class="wn-all" href="changelog.html">Toutes les nouveautés</a><button class="wn-ok" type="button">C’est noté !</button></div>
      </div>`;
    back.querySelector('.wn-version').textContent = v.version;
    back.querySelector('#wn-title').textContent = v.titre || 'Mise à jour';
    const sum = back.querySelector('.wn-sum');
    if (v.resume) sum.textContent = v.resume; else sum.remove();
    const changes = Array.isArray(v.changements) ? v.changements : [];
    const pick = [...changes.filter(c => c.type === 'nouveau'), ...changes.filter(c => c.type !== 'nouveau')].slice(0, 4);
    const ul = back.querySelector('.wn-list');
    pick.forEach(c => {
      const li = document.createElement('li');
      const ico = document.createElement('span'); ico.textContent = (TYPES[c.type] || TYPES.amelioration)[0]; ico.setAttribute('aria-hidden', 'true');
      const t = document.createElement('span'); t.textContent = c.texte;
      li.append(ico, t); ul.append(li);
    });
    if (changes.length > pick.length) {
      const more = back.querySelector('.wn-more');
      more.hidden = false; more.textContent = `… et ${changes.length - pick.length} autre${changes.length - pick.length > 1 ? 's' : ''} changement${changes.length - pick.length > 1 ? 's' : ''}.`;
    }
    back.querySelector('.wn-all').href = 'changelog.html#' + slug(v.version);

    const close = () => {
      store.set(SEEN, v.version); setDots(false);
      back.remove(); document.removeEventListener('keydown', onKey, true);
      if (previous && previous.focus) previous.focus();
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {   // le focus reste dans la fenêtre
        const f = [...back.querySelectorAll('button, a')];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    back.querySelector('.wn-close').onclick = close;
    back.querySelector('.wn-ok').onclick = close;
    back.querySelector('.wn-all').addEventListener('click', () => store.set(SEEN, v.version));
    back.addEventListener('click', e => { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(back);
    back.querySelector('.wn-ok').focus();
    if (window.CyberSon) CyberSon.play('achievement');
  }

  function start() {
    // Pas de fenêtre pendant un quiz, une simulation, ni sur la page des versions elle-même.
    const quizPage = document.documentElement.classList.contains('page-quiz') || document.body.dataset.quiz !== undefined;
    const allowPopup = !quizPage && !['changelog.html', 'index.html', 'offline.html', '404.html'].includes(page);
    fetch('changelog.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || !Array.isArray(data.versions) || !data.versions.length) return;
        const latest = [...data.versions].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
        injectStyles();
        let seen = store.get(SEEN);
        if (!seen && !hasHistory()) { store.set(SEEN, latest.version); return; }   // tout nouveau visiteur
        if (seen === latest.version) return;
        setDots(true);
        if (allowPopup) setTimeout(() => { if (store.get(SEEN) !== latest.version) showPopup(latest); }, 1200);
      })
      .catch(() => { /* hors-ligne : rien à afficher */ });
  }
  document.addEventListener('cyberquiz:version-vue', () => setDots(false));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
