const CACHE_VERSION = "agym-workout-shell-v8";
// This app owns only its own scope and cache namespace.
const APP_SHELL_URL = new URL("./", self.registration.scope).toString();
const appAssetUrl = (path) => new URL(path, self.registration.scope).toString();
const CORE_ASSETS = [
  "manifest.webmanifest",
  "machine-leg-press.jpg",
  "machine-seated-leg-curl.jpg",
  "machine-abdominal-crunch-machine.jpg",
  "machine-hip-abduction-adduction.jpg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png"
].map(appAssetUrl);

async function cacheResponse(cacheKey, response) {
  if (!response.ok) return;
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(cacheKey, response.clone());
}

async function networkFirst(request, fallbackKey = request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    await cacheResponse(fallbackKey, response);
    return response;
  } catch {
    return (await (await caches.open(CACHE_VERSION)).match(fallbackKey)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await (await caches.open(CACHE_VERSION)).match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await cacheResponse(request, response);
  return response;
}

async function installAppShell() {
  const cache = await caches.open(CACHE_VERSION);
  const pageResponse = await fetch(APP_SHELL_URL, { cache: "reload" });
  if (!pageResponse.ok) throw new Error("Unable to cache the app shell.");
  await cache.put(APP_SHELL_URL, pageResponse.clone());

  const html = await pageResponse.text();
  const discoveredAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], APP_SHELL_URL))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.toString());

  await cache.addAll([...new Set([...CORE_ASSETS, ...discoveredAssets])]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(installAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("agym-workout-shell-") && key !== CACHE_VERSION,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, APP_SHELL_URL));
    return;
  }

  const canUseLongLivedCache =
    request.destination === "image" || request.destination === "font";
  event.respondWith(
    canUseLongLivedCache ? cacheFirst(request) : networkFirst(request),
  );
});
