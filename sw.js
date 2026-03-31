const CACHE_NAME = 'boxetoboxe-v1';

const PRE_CACHE_URLS = [
  '/',
  '/tickets.html',
  '/live.html',
  '/talent.html',
  '/sponsors.html',
  '/media.html',
  '/about.html',
  '/contact.html'
];

// Install: pre-cache main pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for HTML
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Determine if this is a static asset
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf)$/i.test(url.pathname);

  if (isStaticAsset) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request));
  } else {
    // Network-first for HTML pages and other requests
    event.respondWith(networkFirst(request));
  }
});

// Cache-first strategy: serve from cache, fall back to network and cache the response
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return offlineFallback();
  }
}

// Network-first strategy: try network, fall back to cache, then offline fallback
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    return offlineFallback();
  }
}

// Offline fallback page
function offlineFallback() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Boxe To Boxe</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1A1A1A;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    .offline-container h1 {
      font-size: 2rem;
      color: #D4A843;
      margin-bottom: 1rem;
    }
    .offline-container p {
      font-size: 1.1rem;
      color: #ccc;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .retry-btn {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: #C41E2A;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      text-decoration: none;
    }
    .retry-btn:hover { background: #a01822; }
    .gloves { font-size: 3rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="gloves">&#129354;</div>
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection.<br>Check your connection and try again.</p>
    <button class="retry-btn" onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
