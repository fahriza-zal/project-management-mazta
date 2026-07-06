import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import { LOGIN } from '@/features/auth/graphql'

const TOKEN_KEY = 'pm_token'
const PROFILE_KEY = 'pm_profile'

/**
 * Auth store — backed by the real GraphQL gateway (API_GATEWAY).
 * Only active staff employees are allowed to sign in.
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(null) // raw `user` from the API
  const employee = ref(null) // raw `employee` from the API

  const isAuthenticated = computed(() => !!token.value)

  /** Normalized view of the signed-in account for the UI. */
  const profile = computed(() => {
    if (!user.value) return null
    return {
      id: user.value.id,
      username: user.value.username,
      name: employee.value?.fullName || user.value.username,
      role:
        employee.value?.level?.name ||
        (user.value.isSuperuser ? 'Super Admin' : user.value.isStaff ? 'Staff' : 'Member'),
      units: employee.value?.units || [],
      isSuperuser: user.value.isSuperuser,
    }
  })

  function persist() {
    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ user: user.value, employee: employee.value }))
  }

  /**
   * Sign in with username/password.
   * @throws Error with a user-friendly message on failure.
   */
  async function login(payload) {
    let result
    try {
      result = await apolloClient.mutate({
        mutation: LOGIN,
        variables: payload,
        fetchPolicy: 'no-cache',
      })
    } catch (err) {
      const gqlMessage = err?.graphQLErrors?.[0]?.message
      throw new Error(gqlMessage || 'Tidak dapat terhubung ke server. Coba lagi.')
    }

    const data = result?.data?.login?.data
    if (!data?.token || !data?.user) {
      throw new Error('Username atau password salah.')
    }

    // Only active staff may access the application.
    if (!data.user.isActive) {
      throw new Error('Akun Anda tidak aktif. Hubungi administrator.')
    }
    if (!data.user.isStaff) {
      throw new Error('Anda tidak memiliki akses ke aplikasi ini.')
    }

    token.value = data.token
    user.value = data.user
    employee.value = data.employee
    persist()
    return profile.value
  }

  /** Restore session from localStorage (called by the router guard). */
  function hydrate() {
    if (!token.value || user.value) return
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
      if (saved) {
        user.value = saved.user
        employee.value = saved.employee
      }
    } catch {
      // Corrupted storage — force a fresh login.
      logout()
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    employee.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)
  }

  return { token, user, employee, profile, isAuthenticated, login, hydrate, logout }
})
