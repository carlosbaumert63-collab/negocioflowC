// Service worker mínimo: solo necesario para que Chrome/Android considere
// la app "instalable" como PWA. No cachea datos dinámicos (ventas, etc.)
// para evitar mostrar información desactualizada o incorrecta del negocio.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Passthrough simple: siempre va a la red. Mantiene la app instalable sin
  // arriesgar mostrar datos viejos de ventas/gastos/stock desde caché.
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
