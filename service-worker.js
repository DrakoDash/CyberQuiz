/* ============================================================
   CyberQuiz — Service Worker
   Rend le site installable et utilisable hors-ligne.

   ✏️  À chaque mise en ligne d'une nouvelle version :
       1. incrémente CACHE_VERSION ;
       2. ajoute ici toute nouvelle page dans PRECACHE.
   Les chemins sont RELATIFS : le site fonctionne aussi bien à la
   racine d'un domaine que dans un sous-dossier (GitHub Pages :
   https://drakodash.github.io/CyberQuiz/).
   ============================================================ */
const CACHE_VERSION = 'v2.0';
const CACHE_APP   = `cyberquiz-app-${CACHE_VERSION}`;   // pages + scripts + icônes
const CACHE_CDN   = `cyberquiz-cdn-${CACHE_VERSION}`;   // polices et Font Awesome

/* Dossier où vit le site (ex. https://drakodash.github.io/CyberQuiz/) */
const BASE = self.registration.scope;
const url  = path => new URL(path, BASE).href;

/* ── Tout ce qui est mis en cache dès l'installation ── */
const PRECACHE = [
  './',
  'index.html',
  'accueil.html',
  'about.html',
  'changelog.html',
  'succes.html',
  'offline.html',
  '404.html',
  /* Quiz */
  'debutant.html',
  'pratiques.html',
  'menaces.html',
  'mdp.html',
  'reseaux.html',
  'wifi.html',
  'vie-privee.html',
  'ingenierie-sociale.html',
  'avance.html',
  'reseaux-securite.html',
  'wifi-interactif.html',
  'incident-response.html',
  'simulation.html',
  'quiz-final.html',
  /* Fichiers communs */
  'manifest.json',
  'pwa.js',
  'succes.js',
  'audio.js',
  'app.js',
  'app.css',
  'style.css',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-512-maskable.png'
].map(url);

const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

/* ============================================================
   INSTALLATION — on télécharge tout le site
   Chaque fichier est ajouté séparément : un fichier manquant
   n'empêche pas les autres d'être mis en cache.
   ============================================================ */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    const results = await Promise.allSettled(
      PRECACHE.map(u => cache.add(new Request(u, { cache: 'reload' })))
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed) console.warn(`[SW] ${failed} fichier(s) non mis en cache`);
    // Pas de skipWaiting ici : la nouvelle version attend que
    // l'utilisateur clique sur « Mettre à jour » (voir pwa.js),
    // pour ne jamais recharger la page en plein quiz.
  })());
});

/* ============================================================
   ACTIVATION — suppression des anciennes versions du cache
   ============================================================ */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [CACHE_APP, CACHE_CDN];
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('cyberquiz-') && !keep.includes(k))
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ============================================================
   REQUÊTES — choix de la stratégie selon le type de fichier
   ============================================================ */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const u = new URL(request.url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return;

  // 1. Polices et icônes externes : cache d'abord, mise à jour en arrière-plan
  if (CDN_HOSTS.includes(u.hostname)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_CDN));
    return;
  }
  // Les autres sites ne sont pas gérés par CyberQuiz.
  if (!request.url.startsWith(BASE)) return;

  // 2. Pages : réseau d'abord (contenu à jour), cache si hors-ligne
  if (request.mode === 'navigate' || request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirstPage(request));
    return;
  }
  // 3. Scripts, styles, images : réponse immédiate depuis le cache + mise à jour
  event.respondWith(staleWhileRevalidate(request, CACHE_APP));
});

/* ── Stratégies ── */
async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_APP);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true }))
        || (await cache.match(url('offline.html')))
        || new Response('<h1>Hors-ligne</h1><p>Reconnecte-toi pour accéder à cette page.</p>',
             { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request).then(response => {
    if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await network) || new Response('', { status: 504 });
}

/* ============================================================
   MESSAGES — la page demande d'activer la nouvelle version
   ============================================================ */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
