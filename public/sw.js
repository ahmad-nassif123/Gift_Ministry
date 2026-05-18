// v2 — لا تخزين مسبق؛ يُحدَّث مع كل نشر (انظر DeploymentReload).
// Minimal service worker to satisfy installability (no heavy precache).

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch (no caching). This is enough for install prompt criteria in many browsers.
self.addEventListener("fetch", () => {});

