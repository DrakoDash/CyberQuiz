/* ============================================================
   CyberQuiz — Service Worker
   ✏️  Incrémentez CACHE_VERSION à chaque déploiement majeur
        pour forcer la mise à jour du cache chez les utilisateurs.
   ============================================================ */
const CACHE_VERSION = 'v1.2';
const CACHE_STATIC  = `cyberquiz-static-${CACHE_VERSION}`;
const CACHE_PAGES   = `cyberquiz-pages-${CACHE_VERSION}`;
const CACHE_FONTS   = `cyberquiz-fonts-${CACHE_VERSION}`;

/* ── Pages et assets mis en cache immédiatement ── */
const PRECACHE_PAGES = [
  '/',
  '/index.html',
  '/accueil.html',
  '/debutant.html',
  '/pratiques.html',
  '/menaces.html',
  '/reseaux.html',
  '/quiz-final.html',
  '/changelog.html',
  '/404.html',
  '/offline.html',
  /* Pages à venir — ajoutez-les ici quand elles seront créées */
  /* '/mdp.html',            */
  /* '/avance.html',         */
  /* '/wifi.html',           */
  /* '/vie-privee.html',     */
  /* '/ingenierie-sociale.html', */
];

const PRECACHE_STATIC = [
  '/manifest.json',
  '/pwa.js',
  '/style.css',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

/* Domaines CDN mis en cache avec stratégie Stale-While-Revalidate */
const CDN_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

/* ============================================================
   INSTALL — Pré-cache des ressources essentielles
   ============================================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_PAGES).then(cache =>
        cache.addAll(PRECACHE_PAGES.map(url => new Request(url, { cache: 'reload' })))
          .catch(err => console.warn('[SW] Pré-cache pages partiel :', err))
      ),
      caches.open(CACHE_STATIC).then(cache =>
        cache.addAll(PRECACHE_STATIC)
          .catch(err => console.warn('[SW] Pré-cache static partiel :', err))
      ),
    ]).then(() => {
      console.log(`[SW] Installé — Cache ${CACHE_VERSION}`);
      /* Activation immédiate sans attendre la fermeture des onglets */
      return self.skipWaiting();
    })
  );
});

/* ============================================================
   ACTIVATE — Nettoyage des anciens caches
   ============================================================ */
self.addEventListener('activate', event => {
  const KEEP = [CACHE_STATIC, CACHE_PAGES, CACHE_FONTS];

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('cyberquiz-') && !KEEP.includes(key))
          .map(key => {
            console.log(`[SW] Suppression ancien cache : ${key}`);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log(`[SW] Activé — Cache ${CACHE_VERSION}`);
      return self.clients.claim();
    })
  );
});

/* ============================================================
   FETCH — Stratégies de cache
   ============================================================ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Ignorer les requêtes non-GET et les extensions navigateur */
  if (request.method !== 'GET') return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  /* ── 1. Polices & CDN → Stale While Revalidate ── */
  if (CDN_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(staleWhileRevalidate(request, CACHE_FONTS));
    return;
  }

  /* ── 2. Icônes & assets statiques → Cache First ── */
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/) ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  /* ── 3. CSS & JS → Stale While Revalidate ── */
  if (url.pathname.match(/\.(css|js)$/)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  /* ── 4. Pages HTML → Network First + fallback offline ── */
  if (
    request.headers.get('Accept')?.includes('text/html') ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/'
  ) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  /* ── 5. Tout le reste → Network First simple ── */
  event.respondWith(networkFirst(request, CACHE_PAGES));
});

/* ============================================================
   STRATÉGIES
   ============================================================ */

/** Cache First : retourne depuis le cache, sinon réseau + mise en cache */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Ressource non disponible hors-ligne.', { status: 503 });
  }
}

/** Network First : réseau d'abord, puis cache en fallback */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Contenu non disponible hors-ligne.', { status: 503 });
  }
}

/** Network First pour les pages HTML avec fallback vers offline.html */
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_PAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    /* Cherche la page dans le cache */
    const cached = await caches.match(request);
    if (cached) return cached;

    /* Fallback : page offline */
    const offline = await caches.match('/offline.html');
    return offline || new Response(
      '<h1>Hors-ligne</h1><p>Connectez-vous pour accéder à cette page.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/** Stale While Revalidate : retourne le cache immédiatement + met à jour en arrière-plan */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  /* Mise à jour en arrière-plan */
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || fetchPromise;
}

/* ============================================================
   MESSAGES depuis la page (ex: forcer mise à jour)
   ============================================================ */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
