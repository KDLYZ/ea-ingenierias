const CACHE_NAME = 'ea-ingenieria-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.7.0/dist/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// Instalación: cachear recursos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Si algún recurso externo falla, igual continuar
        return cache.add('./index.html');
      });
    })
  );
  self.skipWaiting();
});

// Activación: limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: servir desde caché si está disponible, si no desde red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Guardar en caché recursos locales
        if(event.request.url.startsWith(self.location.origin)){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin internet y sin caché: devolver página principal
        if(event.request.destination === 'document'){
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Notificaciones push recibidas
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Tienes una alerta en EA Ingenierías',
    icon: data.icon || './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'ea-notif',
    requireInteraction: data.requireInteraction || false,
    actions: [
      { action: 'open', title: 'Ver app' },
      { action: 'close', title: 'Cerrar' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'EA Ingenierías', options)
  );
});

// Click en notificación: abrir la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if(event.action === 'close') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if(clientList.length > 0){
        return clientList[0].focus();
      }
      return clients.openWindow('./index.html');
    })
  );
});

// Sincronización en segundo plano (revisar alertas)
self.addEventListener('periodicsync', event => {
  if(event.tag === 'check-alerts'){
    event.waitUntil(checkAlertsBackground());
  }
});

async function checkAlertsBackground(){
  const today = new Date();
  const venc12 = new Date(today.getFullYear(), today.getMonth()+1, 12);
  const dLeft = Math.ceil((venc12 - today) / 864e5);
  if([7, 3, 1].includes(dLeft)){
    await self.registration.showNotification('⚡ EA Ingenierías', {
      body: `Faltan ${dLeft} día${dLeft>1?'s':''} para pagar el IVA al SII (día 12).`,
      icon: './icon-192.png',
      tag: 'iva-bg-alert'
    });
  }
}
