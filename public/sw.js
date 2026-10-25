// Melt Aways dashboard service worker.
// Only handles push alerts (new website bookings and enquiries). It deliberately caches nothing,
// so the app always loads its latest version.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// The booking function sends JSON: { title, body, url, tag }
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'Melt Aways';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,                 // a repeat for the same booking replaces the old alert
    data: { url: data.url || '/' },
  }));
});

// Tapping the alert opens (or focuses) the app on the right screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if (new URL(c.url).origin !== self.location.origin) continue;
      await c.focus();
      if ('navigate' in c) return c.navigate(url).catch(() => {});
      return;
    }
    return self.clients.openWindow(url);
  })());
});
