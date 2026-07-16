import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import { LOGIN, LOGOUT } from '@/features/auth/graphql'

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

  /**
   * Set of operation names the signed-in user is allowed to call, from
   * `user.userPermissions` (each entry is a GraphQL operation, e.g. `listProject`).
   * Used for O(1) lookups in `can()`.
   */
  const permissionSet = computed(() => new Set(user.value?.userPermissions || []))

  /**
   * Whether the user may perform an operation. Frontend gating is UX only —
   * the API still enforces access — so this just hides what the user can't use.
   * @param {string|string[]} perm Operation name, or a list (true if ANY match).
   */
  function can(perm) {
    if (user.value?.isSuperuser) return true
    if (Array.isArray(perm)) return perm.some((p) => permissionSet.value.has(p))
    return permissionSet.value.has(perm)
  }

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
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ user: user.value, employee: employee.value }),
    )
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

    // Only active accounts may sign in.
    if (!data.user.isActive) {
      throw new Error('Akun Anda tidak aktif. Hubungi administrator.')
    }
    // Staff may access the app; a superadmin gets in too even without a linked
    // employee record (`employee` is null for superusers).
    if (!data.user.isStaff && !data.user.isSuperuser) {
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

  /** Wipe the persisted session from storage. */
  function clearStorage() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)
  }

  /**
   * Sign out. Clears the in-memory session synchronously (so the router guard
   * sees us as signed out immediately and doesn't bounce back), then tells the
   * server to invalidate the token — carrying the token explicitly in the header
   * since `authLink` reads it from storage, which we keep until logout succeeds.
   * Persisted storage is only wiped once the server confirms the logout.
   */
  function logout() {
    const bearer = token.value
    token.value = ''
    user.value = null
    employee.value = null

    if (bearer) {
      apolloClient
        .mutate({
          mutation: LOGOUT,
          fetchPolicy: 'no-cache',
          context: { headers: { Authorization: `Bearer ${bearer}` } },
        })
        .then(() => clearStorage())
        .catch(() => {
          // Server logout failed — keep storage so the session can be retried/restored.
        })
    } else {
      clearStorage()
    }
    // Drop any cached data so it can't leak to the next account signing in.
    apolloClient.clearStore().catch(() => {})
  }

  return { token, user, employee, profile, isAuthenticated, can, login, hydrate, logout }
})
