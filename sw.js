/*
 * 서비스 워커.
 *
 * 하는 일은 둘이다. 안드로이드가 「앱으로 깔 수 있는 페이지」로 인정하려면
 * 이것이 등록되어 있어야 하고, 상담실 예약 알림(Push.gs)을 받아 띄우는 것도
 * 이것이다 — 앱이 닫혀 있어도 폰이 이것만 깨워서 알림을 보여 준다.
 *
 * 포털 내용은 캐시하지 않는다. 캐시하면 어제 명부를 보여주고도 최신인 척하게
 * 되고, 그건 안 보이는 것보다 나쁘다. 껍데기(아이콘·틀)만 담아 두어서 신호가
 * 약할 때도 앱이 흰 화면 대신 무언가를 띄우게 한다.
 */
const SHELL = 'homeludens-shell-v13';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192-v9.png',
  './icon-512-v9.png',
  './icon-180-v9.png',
  './icon-152-v9.png',
  './symbol-mono.png'
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

  /*
   * 먼저 새로 받아 보고, 안 되면 담아 둔 것을 준다.
   *
   * 화면을 여는 요청은 브라우저 캐시까지 건너뛰고 받는다. GitHub Pages 가
   * 「10분간 그대로 써도 된다」 고 알려주기 때문에, 그냥 두면 껍데기를 고쳐
   * 올려도 한동안 옛 화면이 나온다. 실제로 그렇게 한 번 속았다.
   */
  const fresh = e.request.mode === 'navigate' ? { cache: 'reload' } : undefined;

  e.respondWith(
    fetch(e.request, fresh)
      .then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});

/*
 * 예약 알림. 내용은 서버가 잠가 보내고 브라우저가 풀어서 준다.
 *
 * 받은 알림은 반드시 띄운다. 아이폰은 받고도 안 띄우는 앱의 알림을 몇 번 만에
 * 끊어 버린다. 그래서 내용을 못 읽어도 한 줄은 띄운다.
 */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title || '상담실 예약', {
    body: d.body || '새 예약이 잡혔습니다.',
    tag: d.tag || undefined,
    icon: './icon-192-v9.png',
    badge: './symbol-mono.png'
  }));
});

// 알림을 누르면 앱을 연다. 이미 열려 있으면 그 창을 앞으로.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./');
    })
  );
});
