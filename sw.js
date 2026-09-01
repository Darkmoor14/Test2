// Vila Silvia — service worker
// Handles two things: (1) making the site installable as an app, and
// (2) receiving push notifications and displaying them, even if the
// admin page isn't open at the time.

const CACHE_NAME = 'vila-silvia-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A push message arrives here — sent by the Supabase Edge Function
// (see supabase/functions/send-checkin-reminders) once a day.
self.addEventListener('push', (event) => {
  let data = { title: 'Vila Silvia', body: 'Ai o notificare nouă.' };
  try { data = event.data.json(); } catch (e) { /* fall back to default text above */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icon.svg',
      badge: 'icon.svg',
      tag: 'vila-silvia-checkin-reminder',
      data: { url: data.url || './admin.html' }
    })
  );
});

// Tapping the notification opens (or focuses) the admin page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './admin.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('admin.html') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
