// オフラインでも開けるように、アプリのファイルと部品（PDF・Excel用）を端末に保存しておく
const CACHE = 'kirimaru-5012d779de';
const LIBS = 'kirimaru-libs';  // 部品は版が固定なので、アプリを更新しても消さない
const FILES = ['./', './index.html', './licenses.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const LIB_FILES = [
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs',
  'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];
const LIB_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    await (await caches.open(CACHE)).addAll(FILES);
    // 部品は取れなくても先へ進む（使ったときに保存される）
    const lc = await caches.open(LIBS);
    await Promise.all(LIB_FILES.map(u => lc.match(u).then(r => r || lc.add(u)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kirimaru-') && k !== CACHE && k !== LIBS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 部品（CDN）は保存済みを優先し、なければ取ってきて保存する。AI採点(api.anthropic.com)などは関与しない
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(LIBS).then(c => c.match(req).then(r => r || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  // ページ本体はネット優先（つながらなければ3秒で保存済みのものを表示）
  if (req.mode === 'navigate') {
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match('./index.html').then(r => { if (!done && r) { done = true; resolve(r); } });
      const timer = setTimeout(fallback, 3000);
      fetch(req).then(r => {
        clearTimeout(timer);
        if (r.ok && (url.pathname.endsWith('/') || url.pathname.endsWith('index.html'))) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        if (!done) { done = true; resolve(r); }
      }).catch(() => { clearTimeout(timer); fallback(); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
