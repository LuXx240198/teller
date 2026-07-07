/* Teller Service Worker
   Strategie: bei Verbindung immer die neuesten Dateien laden und im Cache
   auffrischen; ohne Verbindung aus dem Cache liefern. Dadurch zeigt die App
   nach einem Deployment beim nächsten Öffnen automatisch den aktuellen Stand.

   Die Zahl in CACHE darfst du bei Bedarf erhöhen, um den Offlinecache hart zu
   leeren. Nötig ist das für Updates aber nicht. */

const CACHE = "teller-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./icon.png",
  "./manifest.webmanifest",
  "./styles/app.css",
  "./data/gourmet.js",
  "./data/juit.js",
  "./data/foods.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
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
  // laufen unverändert über das normale Netzwerk.
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
