import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'pm_notifications'
const MAX_ITEMS = 50

/**
 * In-app notification center backing the navbar bell.
 *
 * Holds notifications received while the app is open (pushed from the FCM
 * foreground handler in AppLayout). Persisted to localStorage so the list and
 * unread badge survive a refresh. Purely client-side — there's no backend list
 * query; the bell reflects what this browser session has received.
 */
export const useNotificationStore = defineStore('notifications', () => {
  const items = ref(load())

  const unreadCount = computed(() => items.value.filter((n) => !n.read).length)

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  /**
   * Add a received notification to the top of the list (unread).
   * @param {{ title: string, body?: string, data?: object }} payload
   */
  function add({ title, body = '', data = {} }) {
    if (!title) return
    items.value.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      body,
      data,
      read: false,
      receivedAt: new Date().toISOString(),
    })
    if (items.value.length > MAX_ITEMS) items.value.length = MAX_ITEMS
    persist()
  }

  function markRead(id) {
    const n = items.value.find((x) => x.id === id)
    if (n && !n.read) {
      n.read = true
      persist()
    }
  }

  function markAllRead() {
    let changed = false
    items.value.forEach((n) => {
      if (!n.read) {
        n.read = true
        changed = true
      }
    })
    if (changed) persist()
  }

  function remove(id) {
    items.value = items.value.filter((x) => x.id !== id)
    persist()
  }

  function clear() {
    items.value = []
    persist()
  }

  return { items, unreadCount, add, markRead, markAllRead, remove, clear }
})
