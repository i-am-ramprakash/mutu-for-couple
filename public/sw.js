// Service Worker for MuTu Couple App - Enables Native Android and iOS PWA push panels
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle background notification clicks to bring users back in-app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        // If a window is already active/focused, use that one
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      return self.clients.openWindow('/');
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
