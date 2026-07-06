import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import {
  LIST_PROJECT_STATUS,
  GET_PROJECT_STATUS,
  CREATE_PROJECT_STATUS,
  EDIT_PROJECT_STATUS,
  DELETE_PROJECT_STATUS,
  LIST_UNIT,
  LIST_COMPANY,
} from '@/features/project-status/graphql'

/** Options picker fetches show 10 rows; the search narrows the list server-side. */
const PICKER_PAGE_SIZE = 10

/** Turn an Apollo/GraphQL error into a user-friendly message. */
function toMessage(err, fallback) {
  return err?.graphQLErrors?.[0]?.message || fallback
}

/**
 * Project Status Definition (master data) store — backed by the real GraphQL gateway.
 * Pagination state mirrors the API envelope so pages can bind to it directly.
 */
export const useProjectStatusStore = defineStore('projectStatus', () => {
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
   * Fetch a page of project status definitions.
   * @param {{ page?: number, pageSize?: number, search?: string }} [params]
   */
  async function fetchList({ page = null, pageSize = null, search = null } = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: LIST_PROJECT_STATUS,
        variables: { params: { page, pageSize, search } },
        fetchPolicy: 'network-only',
      })

      const result = data?.listProjectStatusDefinition?.data
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
      error.value = toMessage(err, 'Gagal memuat data project status.')
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  /** Fetch a single project status definition (with its units) by id. */
  async function fetchById(id) {
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: GET_PROJECT_STATUS,
        variables: { getProjectStatusDefinitionId: Number(id) },
        fetchPolicy: 'network-only',
      })
      return data?.getProjectStatusDefinition?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memuat detail project status.')
      throw new Error(error.value)
    }
  }

  /**
   * Create a project status definition.
   * @param {{ name, ordering, isClosed, isDefault, relatedUnitIds, relatedCompanyIds }} input
   */
  async function create(input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_PROJECT_STATUS,
        variables: { input },
      })
      return data?.createProjectStatusDefinition?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menyimpan project status.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /**
   * Update a project status definition.
   * @param {number} id
   * @param {{ name, ordering, isClosed, isDefault, relatedUnitIds, relatedCompanyIds }} input
   */
  async function update(id, input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: EDIT_PROJECT_STATUS,
        variables: { editProjectStatusDefinitionId: Number(id), input },
      })
      return data?.editProjectStatusDefinition?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memperbarui project status.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /** Soft-delete a project status definition (hard is always false). */
  async function remove(id) {
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_PROJECT_STATUS,
        variables: { deleteProjectStatusDefinitionId: Number(id), hard: false },
      })
      return data?.deleteProjectStatusDefinition?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menghapus project status.')
      throw new Error(error.value)
    }
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
    fetchUnitOptions,
    fetchCompanyOptions,
  }
})
