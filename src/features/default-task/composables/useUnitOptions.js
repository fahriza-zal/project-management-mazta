import { ref } from 'vue'
import { apolloClient } from '@/shared/graphql/apolloClient'
import { LIST_UNIT } from '@/features/default-task/graphql'

/** Show 10 units by default; the search narrows the list server-side. */
const DEFAULT_PAGE_SIZE = 10
const DEBOUNCE_MS = 300

/**
 * Searchable unit picker source for the default-task create/edit forms.
 *
 * `options` always holds `{ id, name }` rows. Call `search(term)` as the user
 * types (debounced); call `load()` once to seed the first 10 on open.
 */
export function useUnitOptions() {
  const options = ref([])
  const loading = ref(false)
  const error = ref('')
  let timer = null

  async function fetchUnits(term) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: LIST_UNIT,
        variables: {
          params: { page: 1, pageSize: DEFAULT_PAGE_SIZE, search: term || null },
        },
        fetchPolicy: 'network-only',
      })
      options.value = data?.listUnit?.data?.results ?? []
    } catch (err) {
      error.value = err?.graphQLErrors?.[0]?.message || 'Gagal memuat unit.'
      options.value = []
    } finally {
      loading.value = false
    }
  }

  /** Seed the first page of units (call when the picker opens). */
  function load() {
    return fetchUnits('')
  }

  /** Debounced search — safe to call on every keystroke. */
  function search(term) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fetchUnits(term.trim()), DEBOUNCE_MS)
  }

  return { options, loading, error, load, search }
}
