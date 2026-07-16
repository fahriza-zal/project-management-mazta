import { computed } from 'vue'
import { useSubscription } from '@vue/apollo-composable'
import {
  GENERAL_DASHBOARD_SUBSCRIPTION,
  HISTORY_DASHBOARD_SUBSCRIPTION,
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
