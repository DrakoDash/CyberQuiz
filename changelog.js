/* ============================================================
   CyberQuiz — Page « Notes de version » (changelog.js)
   Tout le contenu vient de changelog.json : rien à modifier ici
   pour ajouter une note de version.
   ============================================================ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const PER_PAGE = 5;
  const SEEN = 'cyberquiz_version_vue';
  const TYPES = {
    nouveau:      { label: 'Nouveau',      plural: 'Nouveautés',    icon: '✨' },
    amelioration: { label: 'Amélioration', plural: 'Améliorations', icon: '⚡' },
    correction:   { label: 'Correction',   plural: 'Corrections',   icon: '🐛' },
    securite:     { label: 'Sécurité',     plural: 'Sécurité',      icon: '🔒' }
  };
  const STATUTS = {
    'en-cours': { label: 'En cours', cls: 'st-doing' },
    prevu:      { label: 'Prévu',    cls: 'st-planned' },
    idee:       { label: 'Idée',     cls: 'st-idea' }
  };
  let data = null, filter = 'all', query = '', shown = PER_PAGE;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const slug = v => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const parseDate = s => { const d = new Date(s + 'T12:00:00'); return isNaN(d) ? null : d; };
  const fmtDate = s => { const d = parseDate(s); return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : s; };
  const monthKey = s => { const d = parseDate(s); return d ? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Date inconnue'; };
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* Un lien interne seulement (pas de javascript:, pas d'autre site) */
  const safeLink = href => typeof href === 'string' && /^[\w./#?=&-]+$/.test(href) && !/^(javascript|data):/i.test(href) ? href : null;

  function tagChip(type) {
    const t = TYPES[type] || TYPES.amelioration;
    const c = el('span', 'cl-tag cl-' + (TYPES[type] ? type : 'amelioration'));
    c.append(el('span', null, t.icon), ' ' + t.label);
    return c;
  }

  /* ── Carte « Quoi de neuf » : la version la plus récente ── */
  function renderLatest(v) {
    const box = $('clLatest');
    box.replaceChildren();
    const text = el('div', 'cl-latest-text');
    const top = el('div', 'cl-latest-top');
    top.append(el('span', 'cl-latest-badge', '✨ Quoi de neuf'), el('span', 'cl-version-tag', v.version), el('span', 'cl-date', fmtDate(v.date)));
    text.append(top, el('h2', 'cl-latest-title', v.titre));
    if (v.resume) text.append(el('p', 'cl-latest-sum', v.resume));
    const counts = {};
    (v.changements || []).forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
    const stats = el('div', 'cl-latest-stats');
    Object.keys(TYPES).forEach(k => { if (counts[k]) { const s = tagChip(k); s.append(` × ${counts[k]}`); stats.append(s); } });
    text.append(stats);
    const actions = el('div', 'cl-latest-actions');
    const link = v.essayer && safeLink(v.essayer.lien);
    if (link) { const a = el('a', 'cl-btn-primary', (v.essayer.texte || 'Essayer') + ' →'); a.href = link; actions.append(a); }
    const details = el('a', 'cl-btn-ghost', 'Voir le détail');
    details.href = '#' + slug(v.version);
    actions.append(details);
    text.append(actions);
    box.append(text);
    if (v.image && safeLink(v.image)) {
      const fig = el('div', 'cl-latest-img');
      const img = el('img'); img.src = v.image; img.alt = 'Aperçu de la version ' + v.version; img.loading = 'lazy';
      img.onerror = () => fig.remove();
      fig.append(img); box.append(fig);
    }
  }

  /* ── Filtres ── */
  function renderFilters() {
    const all = data.versions.flatMap(v => v.changements || []);
    const box = $('clFilters');
    box.replaceChildren();
    const make = (key, label, count) => {
      const b = el('button', 'cl-filter' + (filter === key ? ' active' : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', String(filter === key));
      b.append(label, el('span', 'cl-count', String(count)));
      b.onclick = () => { filter = key; shown = PER_PAGE; renderFilters(); renderTimeline(); };
      return b;
    };
    box.append(make('all', 'Tout', all.length));
    Object.entries(TYPES).forEach(([k, t]) => {
      const n = all.filter(c => c.type === k).length;
      if (n) box.append(make(k, `${t.icon} ${t.plural}`, n));
    });
  }

  /* ── Frise chronologique ── */
  function renderTimeline() {
    const q = norm(query.trim());
    const matches = data.versions.map(v => {
      const head = norm([v.version, v.titre, v.resume || ''].join(' '));
      const items = (v.changements || []).filter(c =>
        (filter === 'all' || c.type === filter) && (!q || head.includes(q) || norm(c.texte).includes(q)));
      return { v, items };
    }).filter(m => m.items.length);

    const list = $('clTimeline');
    list.replaceChildren();
    $('clEmpty').hidden = matches.length > 0;
    let month = null;
    matches.slice(0, shown).forEach(({ v, items }, i) => {
      const m = monthKey(v.date);
      if (m !== month) { month = m; list.append(el('h3', 'cl-month', m)); }
      const art = el('article', 'cl-version' + (i === 0 && !q && filter === 'all' ? ' is-latest' : ''));
      art.id = slug(v.version);
      const head = el('header', 'cl-version-head');
      head.append(el('span', 'cl-version-tag', v.version), el('h4', 'cl-version-title', v.titre), el('time', 'cl-date', fmtDate(v.date)));
      head.querySelector('time').setAttribute('datetime', v.date);
      art.append(head);
      if (v.resume) art.append(el('p', 'cl-version-sum', v.resume));
      const ul = el('ul', 'cl-changes');
      items.forEach(c => { const li = el('li'); li.append(tagChip(c.type), el('span', 'cl-change-text', c.texte)); ul.append(li); });
      art.append(ul);
      const link = v.essayer && safeLink(v.essayer.lien);
      if (link) { const a = el('a', 'cl-try', (v.essayer.texte || 'Essayer') + ' →'); a.href = link; art.append(a); }
      list.append(art);
    });
    const more = $('clMore');
    more.hidden = matches.length <= shown;
    more.textContent = `Charger plus (${matches.length - shown} version${matches.length - shown > 1 ? 's' : ''})`;
    $('clResultCount').textContent = q || filter !== 'all'
      ? `${matches.length} version${matches.length > 1 ? 's' : ''} correspondante${matches.length > 1 ? 's' : ''}` : '';
  }

  /* ── Onglet « À venir » ── */
  function renderRoadmap() {
    const box = $('clRoadmap');
    box.replaceChildren();
    const items = Array.isArray(data.a_venir) ? data.a_venir : [];
    if (!items.length) { box.append(el('p', 'cl-empty', 'Rien d’annoncé pour l’instant.')); return; }
    ['en-cours', 'prevu', 'idee'].forEach(st => {
      const group = items.filter(i => (STATUTS[i.statut] ? i.statut : 'idee') === st);
      if (!group.length) return;
      const col = el('section', 'cl-road-col');
      const h = el('h3', 'cl-road-head'); h.append(el('span', 'cl-status ' + STATUTS[st].cls, STATUTS[st].label), ` ${group.length}`);
      col.append(h);
      group.forEach(i => {
        const card = el('article', 'cl-road-card');
        card.append(el('span', 'cl-road-ico', i.icone || '🛠️'));
        const t = el('div'); t.append(el('h4', null, i.titre), el('p', null, i.description || ''));
        card.append(t); col.append(card);
      });
      box.append(col);
    });
  }

  /* ── Onglets ── */
  function selectTab(name, focus) {
    document.querySelectorAll('.cl-tab').forEach(t => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    $('panelHistory').hidden = name !== 'history';
    $('panelRoadmap').hidden = name !== 'roadmap';
  }
  document.querySelectorAll('.cl-tab').forEach(t => {
    t.addEventListener('click', () => selectTab(t.dataset.tab));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') selectTab(t.dataset.tab === 'history' ? 'roadmap' : 'history', true);
    });
  });

  $('clSearch').addEventListener('input', e => { query = e.target.value; shown = PER_PAGE; renderTimeline(); });
  $('clMore').addEventListener('click', () => { shown += PER_PAGE; renderTimeline(); });

  /* Lien direct : #a-venir ou #beta-28-0 (on affiche la version même si elle est loin dans la liste) */
  function openHash() {
    if (!data || !location.hash) return;
    if (location.hash === '#a-venir') { selectTab('roadmap'); return; }
    const idx = data.versions.findIndex(v => '#' + slug(v.version) === location.hash);
    if (idx < 0) return;
    selectTab('history');
    if (filter !== 'all' || query) { filter = 'all'; query = ''; $('clSearch').value = ''; renderFilters(); }
    if (idx >= shown) shown = idx + 1;
    renderTimeline();
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }

  /* ── Chargement ── */
  fetch('changelog.json')
    .then(r => { if (!r.ok) throw new Error('changelog.json introuvable (' + r.status + ')'); return r.text(); })
    .then(t => {
      try { data = JSON.parse(t); } catch (err) { throw new Error('changelog.json contient une erreur d’écriture : ' + err.message); }
      if (!Array.isArray(data.versions) || !data.versions.length) throw new Error('la liste « versions » est vide.');
      // Toujours de la plus récente à la plus ancienne, même si l'ordre du fichier est différent.
      data.versions.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      $('clTotal').textContent = data.versions.length;
      $('clLastDate').textContent = fmtDate(data.versions[0].date);
      $('clRoadCount').textContent = (data.a_venir || []).length;
      renderLatest(data.versions[0]);
      renderFilters(); renderTimeline(); renderRoadmap();
      openHash();
      addEventListener('hashchange', openHash);
      // La page a été vue : plus de point « nouveau » ni de fenêtre « Quoi de neuf ».
      try { localStorage.setItem(SEEN, data.versions[0].version); } catch { /* ignoré */ }
      document.dispatchEvent(new CustomEvent('cyberquiz:version-vue'));
    })
    .catch(err => {
      const box = $('clLatest');
      box.replaceChildren(el('p', 'cl-error', 'Les notes de version n’ont pas pu être chargées : ' + err.message));
      console.error('[CyberQuiz]', err);
    });
})();
