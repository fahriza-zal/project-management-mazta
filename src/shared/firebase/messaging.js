/**
 * Firebase Cloud Messaging (FCM) — web push helper.
 *
 * Push is strictly optional: every entry point here degrades to a no-op (returns
 * null / an empty unsubscribe) when the browser doesn't support FCM, the Firebase
 * config is missing, or the user declines notification permission. Callers should
 * treat a null token as "no push for this device" and carry on.
 *
 * Config comes from `VITE_FIREBASE_*` env vars (see `.env`). These values are not
 * secret — Firebase web config is public — so they're safe to ship to the client.
 */
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

/** Reuse the Firebase app across calls; null when config is absent. */
function firebaseApp() {
  if (!firebaseConfig.apiKey) return null
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

// `undefined` = not resolved yet, `null` = resolved-but-unavailable.
let _messaging
async function messaging() {
  if (_messaging !== undefined) return _messaging
  const app = firebaseApp()
  _messaging = app && (await isSupported().catch(() => false)) ? getMessaging(app) : null
  return _messaging
}

/**
 * The background service worker needs the Firebase config too, but as a static
 * file in `public/` it can't read `import.meta.env`. So we pass the (public)
 * config through the registration URL and the worker reads it from its own
 * `location.search` — keeping `.env` the single source of truth.
 */
function swRegistration() {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || '',
    authDomain: firebaseConfig.authDomain || '',
    projectId: firebaseConfig.projectId || '',
    storageBucket: firebaseConfig.storageBucket || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '',
  })
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`)
}

/**
 * Request notification permission and fetch the FCM registration token.
 * @returns {Promise<string|null>} the token, or null if unsupported, the user
 *   declined permission, or token retrieval failed.
 */
export async function getFcmToken() {
  const m = await messaging()
  if (!m || !('Notification' in window)) return null

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission().catch(() => 'denied')
  }
  if (permission !== 'granted') return null

  try {
    const registration = await swRegistration()
    const token = await getToken(m, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    return token || null
  } catch {
    return null
  }
}

/**
 * Subscribe to messages received while the tab is in the foreground (these don't
 * trigger the service worker, so the app shows them itself).
 * @param {(payload: object) => void} handler
 * @returns {Promise<() => void>} an unsubscribe function (no-op when unavailable).
 */
export async function onForegroundMessage(handler) {
  const m = await messaging()
  if (!m) return () => {}
  return onMessage(m, handler)
}
