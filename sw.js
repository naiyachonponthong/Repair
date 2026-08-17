/* =====================================================================
   sw.js — service worker
   หลักการ: network-first เสมอ เพื่อไม่ให้ผู้ใช้ติดโค้ดเก่าหลัง push GitHub
   cache ใช้เป็นตัวสำรองตอนเน็ตหลุดเท่านั้น และไม่แตะ API ของ GAS เลย
   ===================================================================== */
var CACHE = 'rr-shell-v1';
var SHELL = [
  './',
  './index.html',
  './assets/css/theme.css',
  './assets/img/icon-192.png',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.allSettled(SHELL.map(function (u) { return c.add(u); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // POST ไป GAS ปล่อยผ่านทั้งหมด

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // CDN / Drive / GAS ไม่ต้องยุ่ง

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
