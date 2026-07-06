import { ref } from 'vue'

/**
 * Minimal toast system shared app-wide (module-level singleton state).
 * Usage: const { success } = useToast(); success('Saved')
 */
const toasts = ref([])
let seq = 0

function push(type, message, timeout = 3000) {
  const id = ++seq
  toasts.value.push({ id, type, message })
  if (timeout) setTimeout(() => dismiss(id), timeout)
  return id
}

function dismiss(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useToast() {
  return {
    toasts,
    dismiss,
    success: (msg, t) => push('success', msg, t),
    error: (msg, t) => push('error', msg, t),
    info: (msg, t) => push('info', msg, t),
    warning: (msg, t) => push('warning', msg, t),
  }
}
