/* Teller Service Worker
   Strategie: bei Verbindung immer die neuesten Dateien laden und im Cache
   auffrischen; ohne Verbindung aus dem Cache liefern. Nach einem Deployment
   zeigt die App beim naechsten Oeffnen automatisch den aktuellen Stand.

   Die App steckt komplett in der index.html, daher muss nur diese eine Datei
   sicher im Cache liegen. Icon und Manifest werden nur bestmoeglich ergaenzt. */

const CACHE = "teller-v2";
const CORE = ["./", "./index.html"];
const OPTIONAL = ["./icon.png", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // Optionales einzeln nachladen, Fehler ignorieren (falls Datei fehlt).
    await Promise.all(OPTIONAL.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Nur eigene Dateien behandeln. CDN, Schriftarten und die Anthropic API
  // laufen unveraendert ueber das normale Netzwerk.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || (await cache.match("./index.html"));
    }
  })());
});
