import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import {
  LIST_PROJECT_ROLE,
  GET_PROJECT_ROLE,
  CREATE_PROJECT_ROLE,
  EDIT_PROJECT_ROLE,
  DELETE_PROJECT_ROLE,
} from '@/features/project-role/graphql'

/** Turn an Apollo/GraphQL error into a user-friendly message. */
function toMessage(err, fallback) {
  return err?.graphQLErrors?.[0]?.message || fallback
}

/**
 * Project Role (master data) store — backed by the real GraphQL gateway.
 * Pagination state mirrors the API envelope so pages can bind to it directly.
 */
export const useProjectRoleStore = defineStore('projectRole', () => {
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
   * Fetch a page of project roles.
   * @param {{ page?: number, pageSize?: number, search?: string }} [params]
   */
  async function fetchList({ page = null, pageSize = null, search = null } = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: LIST_PROJECT_ROLE,
        variables: { params: { page, pageSize, search } },
        fetchPolicy: 'network-only',
      })

      const result = data?.listProjectRole?.data
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
      error.value = toMessage(err, 'Gagal memuat data project role.')
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  /** Fetch a single project role by id. */
  async function fetchById(id) {
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: GET_PROJECT_ROLE,
        variables: { getProjectRoleId: Number(id) },
        fetchPolicy: 'network-only',
      })
      return data?.getProjectRole?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memuat detail project role.')
      throw new Error(error.value)
    }
  }

  /**
   * Create a project role.
   * @param {{ name: string, isWatcher: boolean }} input
   */
  async function create(input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_PROJECT_ROLE,
        variables: { input },
      })
      return data?.createProjectRole?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menyimpan project role.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /**
   * Update a project role.
   * @param {number} id
   * @param {{ name: string, isWatcher: boolean }} input
   */
  async function update(id, input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: EDIT_PROJECT_ROLE,
        variables: { editProjectRoleId: Number(id), input },
      })
      return data?.editProjectRole?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memperbarui project role.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /** Soft-delete a project role (hard is always false). */
  async function remove(id) {
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_PROJECT_ROLE,
        variables: { deleteProjectRoleId: Number(id), hard: false },
      })
      return data?.deleteProjectRole?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menghapus project role.')
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
