import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const SIDEBAR_KEY = 'pm_sidebar_collapsed'

/** Initial collapse state — persisted per browser; defaults to collapsed (wider
 * page) on first visit. */
function initialCollapsed() {
  try {
    const v = localStorage.getItem(SIDEBAR_KEY)
    return v == null ? true : v === '1'
  } catch {
    return true
  }
}

/** UI store: layout chrome state (sidebar collapse, mobile drawer). */
export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(initialCollapsed())
  const mobileSidebarOpen = ref(false)

  // Remember the collapse preference across reloads.
  watch(sidebarCollapsed, (v) => {
    try {
      localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0')
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  })

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function openMobileSidebar() {
    mobileSidebarOpen.value = true
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
  }

  return {
    sidebarCollapsed,
    mobileSidebarOpen,
    toggleSidebar,
    openMobileSidebar,
    closeMobileSidebar,
  }
})
