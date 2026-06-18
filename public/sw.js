// Service Worker for MuTu Couple App - Enables Native Android and iOS PWA push panels
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle background notification clicks to bring users back in-app (Phase 3 Deep-linking)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const section = event.notification.data?.section || 'chat';
  const targetHash = `#${section}`;
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = new URL(`/${targetHash}`, self.location.origin).href;
      
      // Look for any existing matching tab
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle standard push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'MuTu update', body: 'New update from your love! 🌸' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'MuTu update', body: event.data.text() };
    }
  }
  
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'mutu-notification',
    vibrate: [100, 50, 100],
    data: data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
