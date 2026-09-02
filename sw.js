/*
 * 서비스 워커.
 *
 * 하는 일이 거의 없다. 안드로이드가 「앱으로 깔 수 있는 페이지」로 인정하려면
 * 이것이 등록되어 있어야 해서 둔다.
 *
 * 포털 내용은 캐시하지 않는다. 캐시하면 어제 명부를 보여주고도 최신인 척하게
 * 되고, 그건 안 보이는 것보다 나쁘다. 껍데기(아이콘·틀)만 담아 두어서 신호가
 * 약할 때도 앱이 흰 화면 대신 무언가를 띄우게 한다.
 */
const SHELL = 'homeludens-shell-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // 우리 껍데기 파일만 본다. 포털(script.google.com)은 손대지 않는다.
  if (new URL(e.request.url).origin !== self.location.origin) return;

  // 먼저 새로 받아 보고, 안 되면 담아 둔 것을 준다.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
