/* Web app cache only. Never stores API requests, answers, API keys, or release control. */
const CACHE = 'kirimaru-web-20261111-audit-legacy-18';
const SHELL = ['./', './index.html', './web-release.js', './compatibility.js', './legacy-notice.js', './ai-layout.js', './web-tools.js?v=multi-page-1', './tutorial.js', './return-pdf.js', './security.js?v=task-guide-1', './web-tools.css', './privacy.html', './support.html', './licenses.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './vendor/xlsx-export.js?v=task-guide-1', './vendor/jspdf@4.2.1/dist/jspdf.umd.min.js', './vendor/pdfjs-dist@6.3.289/legacy/build/pdf.min.mjs', './vendor/pdfjs-dist@6.3.289/legacy/build/pdf.worker.min.mjs'];
self.addEventListener('install', e => e.waitUntil((async () => { await (await caches.open(CACHE)).addAll(SHELL); await self.skipWaiting(); })()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('kirimaru-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // Always go to the network for stop settings. Offline AI sends must fail closed.
  if (url.pathname.endsWith('/release-control.json')) { e.respondWith(fetch(req, { cache: 'no-store' })); return; }
  if (req.mode === 'navigate') {
    // Stop a real 404 from being replaced by the app; only offline app navigation may fall back.
    e.respondWith((async () => { try { const r = await fetch(req); if (r.ok && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'))) await (await caches.open(CACHE)).put(new URL('./index.html', self.registration.scope), r.clone()); return r; } catch {
      if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) { const r = await caches.match(new URL('./index.html', self.registration.scope)); if (r) return r; }
      return new Response('オフラインです。接続後に再度開いてください。', {status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
    } })()); return;
  }
  // App code is unversioned: revalidate online instead of pinning a stale deploy forever.
  if ((!url.pathname.includes('/vendor/')||url.pathname.endsWith('/vendor/xlsx-export.js')) && SHELL.some(p=>new URL(p,self.registration.scope).pathname===url.pathname)) {
    e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(req,{cache:'no-cache'});if(r.ok)await c.put(req,r.clone());return r;}catch{const hit=await c.match(req);if(hit)return hit;return new Response('Offline',{status:503});}})());return;
  }
  // Cache only versioned public assets, never arbitrary same-origin data or error responses.
  if (url.pathname.includes('/vendor/') || SHELL.some(p => new URL(p, self.registration.scope).href === url.href)) {
    e.respondWith((async () => { const c = await caches.open(CACHE), hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok) await c.put(req, r.clone()); return r; })());
  }
});
