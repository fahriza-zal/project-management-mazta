/* global importScripts, firebase */
/**
 * Firebase Cloud Messaging background service worker.
 *
 * Handles push messages that arrive while the app tab is closed or in the
 * background. Foreground messages are handled in-app (see
 * `src/shared/firebase/messaging.js`).
 *
 * The (public) Firebase config is passed via this worker's registration URL —
 * see `swRegistration()` in messaging.js — so `.env` stays the single source of
 * truth. Uses the compat SDK from gstatic (pinned to the installed version);
 * a service worker can only `importScripts`, not ES modules.
 */
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js')

const params = new URL(self.location).searchParams
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  if (!title) return
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    data: payload.data || {},
  })
})

// Focus (or open) the app when the user clicks a notification.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c)
      if (existing) return existing.focus()
      if (self.clients.openWindow) return self.clients.openWindow('/')
    }),
  )
})
