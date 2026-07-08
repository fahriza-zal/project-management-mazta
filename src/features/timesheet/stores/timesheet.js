import { ref } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import {
  GET_EMPLOYEE,
  CREATE_TIMESHEET,
  LIST_TIMESHEET,
  START_SHEET,
  HOLD_SHEET,
  CLOSE_SHEET,
} from '@/features/timesheet/graphql'

/** Turn an Apollo/GraphQL error into a user-friendly message. */
function toMessage(err, fallback) {
  return err?.graphQLErrors?.[0]?.message || fallback
}

/**
 * Timesheet (Sheet) store — backed by the real GraphQL gateway.
 * Pagination state mirrors the API envelope so pages can bind to it directly.
 */
export const useTimesheetStore = defineStore('timesheet', () => {
  const items = ref([]) // current page of results
  const pagination = ref({
    count: 0,
    currentPage: 1,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  })
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  /**
   * Fetch a page of timesheets. Defensive against a not-yet-final list shape.
   * @param {{ page?: number, pageSize?: number, search?: string }} [params]
   */
  async function fetchList({ page = null, pageSize = null, search = null } = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: LIST_TIMESHEET,
        variables: { params: { page, pageSize, search } },
        fetchPolicy: 'network-only',
      })

      const result = data?.listTimeSheet?.data
      items.value = result?.results ?? []
      pagination.value = {
        count: result?.count ?? 0,
        currentPage: result?.currentPage ?? 1,
        hasNext: result?.hasNext ?? false,
        hasPrev: result?.hasPrev ?? false,
        totalPages: result?.totalPages ?? 1,
      }
      return items.value
    } catch (err) {
      error.value = toMessage(err, 'Gagal memuat data timesheet.')
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a timesheet.
   * @param {{ employeeId, sheetType, taskId, defaultTaskId, description }} input
   */
  async function create(input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_TIMESHEET,
        variables: { input },
      })
      return data?.createTimeSheet?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menyimpan timesheet.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /* --- Lifecycle transitions (each returns the new { id, status }) --- */

  /** Start (or resume) a timesheet with an optional note. */
  async function startSheet(id, description = null) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: START_SHEET,
        variables: { startSheetId: Number(id), description: description || null },
      })
      return data?.startSheet?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal memulai timesheet.'))
    }
  }

  /** Put a timesheet on hold with an optional note. */
  async function holdSheet(id, description = null) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: HOLD_SHEET,
        variables: { holdSheetId: Number(id), description: description || null },
      })
      return data?.holdSheet?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menahan timesheet.'))
    }
  }

  /** Close a timesheet with an optional note. */
  async function closeSheet(id, description = null) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CLOSE_SHEET,
        variables: { closeSheetId: Number(id), description: description || null },
      })
      return data?.closeSheet?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menutup timesheet.'))
    }
  }

  /**
   * Tasks assignable to an employee (mixed PROJECT + COMMON). Returns the raw
   * `availableTasks` array — `category` is needed to route the chosen task to
   * `taskId` vs `defaultTaskId` (and to derive `sheetType`) on create.
   */
  async function fetchEmployeeTasks(employeeId) {
    const { data } = await apolloClient.query({
      query: GET_EMPLOYEE,
      variables: { getEmployeeId: Number(employeeId) },
      fetchPolicy: 'network-only',
    })
    return data?.getEmployee?.data?.availableTasks ?? []
  }

  return {
    items,
    pagination,
    loading,
    saving,
    error,
    fetchList,
    create,
    startSheet,
    holdSheet,
    closeSheet,
    fetchEmployeeTasks,
  }
})

// Hot-reload the store cleanly in dev so edits (e.g. new actions) don't leave a
// stale instance missing the latest methods.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTimesheetStore, import.meta.hot))
}
