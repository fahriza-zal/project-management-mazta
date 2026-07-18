import { computed, ref, unref } from 'vue'
import { useSubscription } from '@vue/apollo-composable'
import { apolloClient } from '@/shared/graphql/apolloClient'
import {
  GENERAL_DASHBOARD_SUBSCRIPTION,
  HISTORY_DASHBOARD_SUBSCRIPTION,
  SHEET_DASHBOARD_SUBSCRIPTION,
  GET_RANGE_PROJECT,
} from '@/features/dashboard/graphql'

/**
 * Live org-wide dashboard metrics over WebSocket.
 * Subscribe/unsubscribe follows the calling component's lifecycle automatically.
 * The token is carried on the socket connection (see `apolloClient`), not here.
 *
 * @returns {{ general: import('vue').ComputedRef, loading, error, onError }}
 */
export function useGeneralDashboard() {
  const { result, loading, error, onError } = useSubscription(GENERAL_DASHBOARD_SUBSCRIPTION)
  const general = computed(() => result.value?.generalDashboard ?? null)
  return { general, loading, error, onError }
}

/**
 * Live time-series history of dashboard metrics over WebSocket.
 *
 * @returns {{ histories: import('vue').ComputedRef<Array>, loading, error, onError }}
 */
export function useHistoryDashboard() {
  const { result, loading, error, onError } = useSubscription(HISTORY_DASHBOARD_SUBSCRIPTION)
  const histories = computed(() => result.value?.historyDashboard?.histories ?? [])
  return { histories, loading, error, onError }
}

/**
 * Live personal (per-employee) timesheet dashboard over WebSocket.
 * Returns the queried employee's metrics plus their team, and the employee `tree`.
 *
 * @param {number|import('vue').Ref<number>} employeeId Target employee id.
 * @returns {{ metrics, tree, loading, error, onError }}
 */
export function useSheetDashboard(employeeId) {
  const { result, loading, error, onError } = useSubscription(
    SHEET_DASHBOARD_SUBSCRIPTION,
    () => ({ employeeId: Number(unref(employeeId)) }),
    // Only subscribe once we actually have an employee id.
    () => ({ enabled: unref(employeeId) != null }),
  )

  const metrics = computed(() => result.value?.sheetDashboard?.metrics ?? [])
  const tree = computed(() => result.value?.sheetDashboard?.tree ?? null)

  return { metrics, tree, loading, error, onError }
}

/**
 * One-off query of project date ranges for the Gantt timeline, scoped to the
 * given unit ids. Not a subscription — call `reload()` (or let the caller invoke
 * it on mount / when units change). Returns the raw range rows.
 *
 * @param {number[]|import('vue').Ref<number[]>} unitIds Units of the signed-in user.
 * @returns {{ ranges, loading, error, reload }}
 */
export function useRangeProjects(unitIds) {
  const ranges = ref([])
  const loading = ref(false)
  const error = ref('')

  async function reload() {
    loading.value = true
    error.value = ''
    try {
      const ids = (unref(unitIds) ?? []).map(Number).filter(Boolean)
      const { data } = await apolloClient.query({
        query: GET_RANGE_PROJECT,
        // `search`/paging kept null: the timeline shows every project in scope.
        variables: { params: { page: 1, pageSize: 100, search: null, unitIds: ids.length ? ids : null } },
        fetchPolicy: 'network-only',
      })
      // `getRangeProject` returns the array directly (no `.data` envelope).
      ranges.value = data?.getRangeProject ?? []
    } catch (err) {
      error.value = err?.graphQLErrors?.[0]?.message || 'Gagal memuat timeline project.'
    } finally {
      loading.value = false
    }
  }

  return { ranges, loading, error, reload }
}
