// Service Worker optimisé pour SecureChat PWA
const CACHE_VERSION = 'v2';
const CACHE_NAME = `securechat-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Ressources essentielles à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

// Stratégies de cache par type de ressource
const CACHE_STRATEGIES = {
  // Images: Cache First avec expiration
  images: {
    cacheName: IMAGE_CACHE,
    maxEntries: 60,
    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
  },
  // Fichiers statiques: Cache First
  static: {
    cacheName: CACHE_NAME,
    maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
  },
  // API: Network First avec fallback
  api: {
    cacheName: RUNTIME_CACHE,
    networkTimeoutSeconds: 5,
    maxEntries: 50,
    maxAgeSeconds: 5 * 60, // 5 minutes
  }
};

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Mise en cache des ressources essentielles');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('securechat-') && 
                   cacheName !== CACHE_NAME &&
                   cacheName !== RUNTIME_CACHE &&
                   cacheName !== IMAGE_CACHE;
          })
          .map(cacheName => {
            console.log('Suppression du cache obsolète:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fonction pour nettoyer les vieux caches
async function cleanupOldCaches(cacheName, maxEntries, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const now = Date.now();

  if (requests.length > maxEntries) {
    // Supprimer les entrées les plus anciennes
    const entriesToDelete = requests.slice(0, requests.length - maxEntries);
    await Promise.all(entriesToDelete.map(request => cache.delete(request)));
  }

  // Supprimer les entrées expirées
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        const date = new Date(dateHeader).getTime();
        if (now - date > maxAgeSeconds * 1000) {
          await cache.delete(request);
        }
      }
    }
  }
}

// Stratégie Cache First
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

// Stratégie Network First
async function networkFirst(request, cacheName, timeout = 5000) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeout)
    );
    
    const response = await Promise.race([networkPromise, timeoutPromise]);
    
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Interception des requêtes
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP(S)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Stratégie pour les images
  if (request.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    // Nettoyer le cache des images périodiquement
    event.waitUntil(
      cleanupOldCaches(IMAGE_CACHE, CACHE_STRATEGIES.images.maxEntries, CACHE_STRATEGIES.images.maxAgeSeconds)
    );
    return;
  }

  // Stratégie pour les API
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, CACHE_STRATEGIES.api.networkTimeoutSeconds * 1000));
    return;
  }

  // Stratégie pour les fichiers statiques (JS, CSS)
  if (request.destination === 'script' || 
      request.destination === 'style' ||
      /\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Stratégie par défaut : Network First
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// Gestion des notifications push avec lazy loading
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.message,
      icon: '/favicon.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      renotify: true,
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/'
      },
      actions: [
        {
          action: 'open',
          title: 'Ouvrir',
        },
        {
          action: 'close',
          title: 'Ignorer',
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'SecureChat', options)
    );
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Chercher si une fenêtre est déjà ouverte
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});

// Synchronisation en arrière-plan optimisée
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    // Récupérer les messages en attente du cache
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    const pendingMessages = requests.filter(req => req.url.includes('/pending-messages'));
    
    // Envoyer les messages en attente
    for (const request of pendingMessages) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        const data = await cachedResponse.json();
        // Envoyer au serveur
        await fetch(request, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' }
        });
        // Supprimer du cache après envoi réussi
        await cache.delete(request);
      }
    }
    
    console.log('Messages synchronisés avec succès');
  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error);
  }
} 