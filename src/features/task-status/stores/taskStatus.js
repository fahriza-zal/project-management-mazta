import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import {
  LIST_TASK_STATUS,
  LIST_TASK_STATUS_OPTIONS,
  GET_TASK_STATUS,
  CREATE_TASK_STATUS,
  EDIT_TASK_STATUS,
  DELETE_TASK_STATUS,
  CREATE_TASK_STATUS_TRANSITION,
  EDIT_TASK_STATUS_TRANSITION,
  DELETE_TASK_STATUS_TRANSITION,
  RESTORE_TASK_STATUS_TRANSITION,
  ENUM_VALUES,
  LIST_UNIT,
  LIST_COMPANY,
} from '@/features/task-status/graphql'

/** Options picker fetches show 10 rows; the search narrows the list server-side. */
const PICKER_PAGE_SIZE = 10

/** Turn an Apollo/GraphQL error into a user-friendly message. */
function toMessage(err, fallback) {
  return err?.graphQLErrors?.[0]?.message || fallback
}

/**
 * Task Status Definition (master data) store — backed by the real GraphQL gateway.
 * Pagination state mirrors the API envelope so pages can bind to it directly.
 */
export const useTaskStatusStore = defineStore('taskStatus', () => {
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
   * Fetch a page of task status definitions.
   * @param {{ page?: number, pageSize?: number, search?: string }} [params]
   */
  async function fetchList({ page = null, pageSize = null, search = null } = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: LIST_TASK_STATUS,
        variables: { params: { page, pageSize, search } },
        fetchPolicy: 'network-only',
      })

      const result = data?.listTaskStatusDefinition?.data
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
      error.value = toMessage(err, 'Gagal memuat data task status.')
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  /** Fetch a single task status definition (with its units) by id. */
  async function fetchById(id) {
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: GET_TASK_STATUS,
        variables: { getTaskStatusDefinitionId: Number(id) },
        fetchPolicy: 'network-only',
      })
      return data?.getTaskStatusDefinition?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memuat detail task status.')
      throw new Error(error.value)
    }
  }

  /**
   * Create a task status definition.
   * @param {{ name, ordering, isClosed, isDefault, relatedUnitIds, relatedCompanyIds }} input
   */
  async function create(input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_TASK_STATUS,
        variables: { input },
      })
      return data?.createTaskStatusDefinition?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menyimpan task status.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /**
   * Update a task status definition.
   * @param {number} id
   * @param {{ name, ordering, isClosed, isDefault, relatedUnitIds, relatedCompanyIds }} input
   */
  async function update(id, input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: EDIT_TASK_STATUS,
        variables: { editTaskStatusDefinitionId: Number(id), input },
      })
      return data?.editTaskStatusDefinition?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memperbarui task status.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /** Soft-delete a task status definition (hard is always false). */
  async function remove(id) {
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_TASK_STATUS,
        variables: { deleteTaskStatusDefinitionId: Number(id), hard: false },
      })
      return data?.deleteTaskStatusDefinition?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menghapus task status.')
      throw new Error(error.value)
    }
  }

  /* --- Task Status Transitions (managed live in the transition modal) --- */

  /** All task statuses (id + name) as candidate "move to" targets. */
  async function fetchStatusOptions() {
    const { data } = await apolloClient.query({
      query: LIST_TASK_STATUS_OPTIONS,
      variables: { params: { page: 1, pageSize: 100, search: null } },
      fetchPolicy: 'network-only',
    })
    return data?.listTaskStatusDefinition?.data?.results ?? []
  }

  /**
   * Create a transition.
   * @param {{ fromStatusId, toStatusId, requireApproval, approvalType }} input
   */
  async function createTransition(input) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_TASK_STATUS_TRANSITION,
        variables: { input },
      })
      return data?.createTaskStatusTransition?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menambah transisi.'))
    }
  }

  /** Update a transition. Input matches createTransition. */
  async function editTransition(id, input) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: EDIT_TASK_STATUS_TRANSITION,
        variables: { editTaskStatusTransitionId: Number(id), input },
      })
      return data?.editTaskStatusTransition?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal memperbarui transisi.'))
    }
  }

  /** Soft-delete a transition (hard is always false). */
  async function deleteTransition(id) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_TASK_STATUS_TRANSITION,
        variables: { deleteTaskStatusTransitionId: Number(id), hard: false },
      })
      return data?.deleteTaskStatusTransition?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menghapus transisi.'))
    }
  }

  /** Restore a soft-deleted transition. */
  async function restoreTransition(id) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: RESTORE_TASK_STATUS_TRANSITION,
        variables: { restoreTaskStatusTransitionId: Number(id) },
      })
      return data?.restoreTaskStatusTransition?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal memulihkan transisi.'))
    }
  }

  /** Fetch the values of a GraphQL enum by type name. Returns string[] (raw names). */
  async function fetchEnumValues(name) {
    const { data } = await apolloClient.query({
      query: ENUM_VALUES,
      variables: { name },
      fetchPolicy: 'cache-first',
    })
    return (data?.__type?.enumValues ?? []).map((e) => e.name)
  }

  /** Searchable unit options for the picker. Returns [{ id, name }]. */
  async function fetchUnitOptions(search) {
    const { data } = await apolloClient.query({
      query: LIST_UNIT,
      variables: { params: { page: 1, pageSize: PICKER_PAGE_SIZE, search: search || null } },
      fetchPolicy: 'network-only',
    })
    return data?.listUnit?.data?.results ?? []
  }

  /** Searchable company options for the picker. Returns [{ id, name }]. */
  async function fetchCompanyOptions(search) {
    const { data } = await apolloClient.query({
      query: LIST_COMPANY,
      variables: { params: { page: 1, pageSize: PICKER_PAGE_SIZE, search: search || null } },
      fetchPolicy: 'network-only',
    })
    return data?.listCompany?.data?.results ?? []
  }

  return {
    items,
    pagination,
    loading,
    saving,
    error,
    fetchList,
    fetchById,
    create,
    update,
    remove,
    fetchStatusOptions,
    createTransition,
    editTransition,
    deleteTransition,
    restoreTransition,
    fetchEnumValues,
    fetchUnitOptions,
    fetchCompanyOptions,
  }
})
