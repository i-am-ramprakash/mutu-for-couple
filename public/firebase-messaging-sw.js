// PWA Service Worker for Background and Offline Push Notifications
importScripts('https://www.gstatic.com/firebasejs/9.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.14.0/firebase-messaging-compat.js');

// Background Push Listener
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] Background Push received:', payload);
      const { title, body, icon, tag, data } = payload.notification || payload.data || {};
      const options = {
        body: body || 'You have a new secret love signal! 🥰',
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag || 'mutu-alert',
        vibrate: [200, 100, 200],
        data: data || {}
      };
      event.waitUntil(
        self.registration.showNotification(title || 'MuTu Love Update 🌸', options)
      );
    } catch (e) {
      console.log('[firebase-messaging-sw.js] Non-JSON payload fallback:', event.data.text());
      event.waitUntil(
        self.registration.showNotification('MuTu Love Signal 🌸', {
          body: event.data.text() || 'Check your shared love nest! 💞',
          icon: '/favicon.ico'
        })
      );
    }
  }
});

// Deep Linking into Chat/Call on Notification Click (Phase 3 Integration)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const section = event.notification.data?.section || 'chat';
  const urlToOpen = new URL(`/#${section}`, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and redirect
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
