import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import {
  LIST_DEFAULT_TASK,
  GET_DEFAULT_TASK,
  CREATE_DEFAULT_TASK,
  EDIT_DEFAULT_TASK,
  DELETE_DEFAULT_TASK,
} from '@/features/default-task/graphql'

/** Turn an Apollo/GraphQL error into a user-friendly message. */
function toMessage(err, fallback) {
  return err?.graphQLErrors?.[0]?.message || fallback
}

/**
 * Default Task (master data) store — backed by the real GraphQL gateway.
 * Pagination state mirrors the API envelope so pages can bind to it directly.
 */
export const useDefaultTaskStore = defineStore('defaultTask', () => {
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
   * Fetch a page of default tasks.
   * @param {{ page?: number, pageSize?: number, search?: string }} [params]
   */
  async function fetchList({ page = null, pageSize = null, search = null } = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: LIST_DEFAULT_TASK,
        variables: { params: { page, pageSize, search } },
        fetchPolicy: 'network-only',
      })
      
      const result = data?.listDefaultTask?.data
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
      error.value = toMessage(err, 'Gagal memuat data default task.')
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  /** Fetch a single default task (with its units) by id. */
  async function fetchById(id) {
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: GET_DEFAULT_TASK,
        variables: { getDefaultTaskId: Number(id) },
        fetchPolicy: 'network-only',
      })
      return data?.getDefaultTask?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memuat detail default task.')
      throw new Error(error.value)
    }
  }

  /**
   * Create a default task.
   * @param {{ title: string, unitIds: number[] }} input
   */
  async function create(input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_DEFAULT_TASK,
        variables: { input },
      })
      return data?.createDefaultTask?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menyimpan default task.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /**
   * Update a default task.
   * @param {number} id
   * @param {{ title: string, unitIds: number[] }} input
   */
  async function update(id, input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: EDIT_DEFAULT_TASK,
        variables: { editDefaultTaskId: Number(id), input },
      })
      return data?.editDefaultTask?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memperbarui default task.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /** Soft-delete a default task (hard is always false). */
  async function remove(id) {
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_DEFAULT_TASK,
        variables: { deleteDefaultTaskId: Number(id), hard: false },
      })
      return data?.deleteDefaultTask?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menghapus default task.')
      throw new Error(error.value)
    }
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
  }
})
