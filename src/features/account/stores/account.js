import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import { GET_EMPLOYEE } from '@/features/account/graphql'

/** Turn an Apollo/GraphQL error into a user-friendly message. */
function toMessage(err, fallback) {
  return err?.graphQLErrors?.[0]?.message || fallback
}

/**
 * Account store — the signed-in employee's full profile (identity, org placement,
 * assignable tasks, and direct reports) from `getEmployee`.
 */
export const useAccountStore = defineStore('account', () => {
  const employee = ref(null)
  const loading = ref(false)
  const error = ref('')

  /** Fetch the full profile for one employee id. */
  async function fetchEmployee(id) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: GET_EMPLOYEE,
        variables: { getEmployeeId: Number(id) },
        fetchPolicy: 'network-only',
      })
      employee.value = data?.getEmployee?.data ?? null
      return employee.value
    } catch (err) {
      error.value = toMessage(err, 'Gagal memuat profil.')
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  return { employee, loading, error, fetchEmployee }
})
