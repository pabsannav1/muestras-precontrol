// Service worker mínimo: hace la app instalable y cachea estáticos.
// El modo sin cobertura (guardar en el móvil y sincronizar) es la fase 6.
const CACHE = "tm-static-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Solo estáticos versionados de Next e iconos: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(e.request).then(
        (r) =>
          r ||
          fetch(e.request).then((res) => {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copia));
            return res;
          }),
      ),
    );
  }
});
