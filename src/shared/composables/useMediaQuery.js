import { ref, onMounted, onUnmounted } from 'vue'

/** Reactive media query, e.g. useMediaQuery('(min-width: 1024px)'). */
export function useMediaQuery(query) {
  const matches = ref(false)
  let mql

  const update = () => (matches.value = mql.matches)

  onMounted(() => {
    mql = window.matchMedia(query)
    update()
    mql.addEventListener('change', update)
  })
  onUnmounted(() => mql?.removeEventListener('change', update))

  return matches
}

/** Convenience: true on desktop (lg breakpoint and up). */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)')
}
