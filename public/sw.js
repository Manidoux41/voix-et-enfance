const publicPages = new Set(["/", "/installer", "/proposition", "/signataires", "/signer", "/mentions-legales"]);

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Never cache documents, personal data, API responses or administrator sessions.
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || event.request.mode !== "navigate"
    || url.origin !== self.location.origin || !publicPages.has(url.pathname)) return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connexion nécessaire — Voix &amp; Enfance</title><body><h1>Connexion Internet nécessaire</h1><p>Reconnectez votre appareil pour consulter les documents et poursuivre votre démarche.</p><a href="/installer">Réessayer</a></body></html>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'" } },
  )));
});
