import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apolloClient } from '@/shared/graphql/apolloClient'
import { projects as mockProjects } from '@/features/projects/services/mockProjects'
import {
  CREATE_PROJECT,
  EDIT_PROJECT,
  DELETE_PROJECT,
  GET_PROJECT,
  GET_PROJECT_DETAIL,
  GET_PROJECT_BOARD,
  LIST_PROJECT,
  LIST_PROJECTS,
  ENUM_VALUES,
  CREATE_MILESTONE,
  EDIT_MILESTONE,
  DELETE_MILESTONE,
  CREATE_TASK,
  EDIT_TASK,
  DELETE_TASK,
  LIST_UNIT,
  LIST_PROJECT_ROLE,
  LIST_EMPLOYEE,
  CREATE_TASK_ASSIGNMENT,
  DELETE_TASK_ASSIGNMENT,
} from '@/features/projects/graphql'

/** The parent-project picker shows 10 rows; the search narrows it server-side. */
const PICKER_PAGE_SIZE = 10

/** Turn an Apollo/GraphQL error into a user-friendly message. */
function toMessage(err, fallback) {
  return err?.graphQLErrors?.[0]?.message || fallback
}

/**
 * Project store.
 *
 * List/detail still read mock data (`projects`); create is wired to the real
 * GraphQL gateway. The remaining reads migrate to `listProject`/`getProject`
 * the same way.
 */
export const useProjectStore = defineStore('project', () => {
  const projects = ref([...mockProjects])
  const items = ref([]) // current page of the real list
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

  function getById(id) {
    return projects.value.find((p) => p.id === id) ?? null
  }

  /**
   * Fetch a page of projects (detailed shape for the table + kanban).
   * @param {{ page?: number, pageSize?: number, search?: string }} [params]
   */
  async function fetchProjects({ page = null, pageSize = null, search = null } = {}) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query: LIST_PROJECTS,
        variables: { params: { page, pageSize, search } },
        fetchPolicy: 'network-only',
      })
      const result = data?.listProject?.data
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
      error.value = toMessage(err, 'Gagal memuat data project.')
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a project.
   * @param {{ name, prefix, description, startDate, expectedEndDate, parentId,
   *   projectCategory, projectMode, units, attachments }} input
   *   `units` is [{ unitId, roleId }]; `attachments` is [{ files, projectId, taskId }].
   * @returns created `{ id, name, prefix }`
   */
  async function createProject(input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_PROJECT,
        variables: { input },
      })
      return data?.createProject?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menyimpan project.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /** Soft-delete a project by id (hard is always false). */
  async function deleteProject(id) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_PROJECT,
        variables: { deleteProjectId: Number(id), hard: false },
      })
      return data?.deleteProject?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal menghapus project.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /** Fetch a single project by id via a given query (default: the full GET_PROJECT). */
  async function fetchProjectWith(query, id) {
    error.value = ''
    try {
      const { data } = await apolloClient.query({
        query,
        variables: { getProjectId: Number(id) },
        fetchPolicy: 'network-only',
      })
      return data?.getProject?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memuat detail project.')
      throw new Error(error.value)
    }
  }

  /** Full project (all milestone/task fields) — used by the Edit form and post-create fill. */
  const fetchProject = (id) => fetchProjectWith(GET_PROJECT, id)

  /** Light project for the Detail page (minimal task fields). */
  const fetchProjectDetail = (id) => fetchProjectWith(GET_PROJECT_DETAIL, id)

  /** Board project for the Kanban (tasks with their currentStatus). */
  const fetchProjectBoard = (id) => fetchProjectWith(GET_PROJECT_BOARD, id)

  /**
   * Update a project. Same input shape as `createProject`, plus the target id.
   * @param {number|string} id
   * @param {object} input
   * @returns updated `{ id, name, prefix }`
   */
  async function updateProject(id, input) {
    saving.value = true
    error.value = ''
    try {
      const { data } = await apolloClient.mutate({
        mutation: EDIT_PROJECT,
        variables: { editProjectId: Number(id), input },
      })
      return data?.editProject?.data ?? null
    } catch (err) {
      error.value = toMessage(err, 'Gagal memperbarui project.')
      throw new Error(error.value)
    } finally {
      saving.value = false
    }
  }

  /**
   * Create a milestone under a project.
   * @param {{ projectId, name, description, expectedStartDate, expectedEndDate,
   *   isCounted, order }} input
   * @returns created `{ id, name }`
   */
  async function createMilestone(input) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_MILESTONE,
        variables: { input },
      })
      return data?.createProjectMilestone?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menyimpan milestone.'))
    }
  }

  /**
   * Update an existing milestone. Same input shape as `createMilestone`, plus id.
   * @returns updated `{ id, name }`
   */
  async function updateMilestone(id, input) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: EDIT_MILESTONE,
        variables: { editProjectMilestoneId: Number(id), input },
      })
      return data?.editProjectMilestone?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal memperbarui milestone.'))
    }
  }

  /** Soft-delete a milestone by id (hard is always false). */
  async function deleteMilestone(id) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_MILESTONE,
        variables: { deleteProjectMilestoneId: Number(id), hard: false },
      })
      return data?.deleteProjectMilestone?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menghapus milestone.'))
    }
  }

  /**
   * Create a task (associated via its milestone/parent — TaskInput has no projectId).
   * @param {{ title, description, priority, dueDate, milestoneId, parentId,
   *   taskType, order }} input
   * @returns created `{ id, title }`
   */
  async function createTask(input) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_TASK,
        variables: { input },
      })
      return data?.createTask?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menyimpan task.'))
    }
  }

  /**
   * Update an existing task. Same input shape as `createTask`, plus id.
   * @returns updated `{ id, title }`
   */
  async function updateTask(id, input) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: EDIT_TASK,
        variables: { editTaskId: Number(id), input },
      })
      return data?.editTask?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal memperbarui task.'))
    }
  }

  /** Soft-delete a task by id (hard is always false). */
  async function deleteTask(id) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_TASK,
        variables: { deleteTaskId: Number(id), hard: false },
      })
      return data?.deleteTask?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menghapus task.'))
    }
  }

  /** Searchable parent-project options for the picker. Returns [{ id, name }]. */
  async function fetchParentOptions(search) {
    const { data } = await apolloClient.query({
      query: LIST_PROJECT,
      variables: { params: { page: 1, pageSize: PICKER_PAGE_SIZE, search: search || null } },
      fetchPolicy: 'network-only',
    })
    return data?.listProject?.data?.results ?? []
  }

  /** Searchable unit options for the `units[].unitId` picker. Returns [{ id, name }]. */
  async function fetchUnitOptions(search) {
    const { data } = await apolloClient.query({
      query: LIST_UNIT,
      variables: { params: { page: 1, pageSize: PICKER_PAGE_SIZE, search: search || null } },
      fetchPolicy: 'network-only',
    })
    return data?.listUnit?.data?.results ?? []
  }

  /** Searchable project-role options for the `units[].roleId` picker. Returns [{ id, name }]. */
  async function fetchRoleOptions(search) {
    const { data } = await apolloClient.query({
      query: LIST_PROJECT_ROLE,
      variables: { params: { page: 1, pageSize: PICKER_PAGE_SIZE, search: search || null } },
      fetchPolicy: 'network-only',
    })
    return data?.listProjectRole?.data?.results ?? []
  }

  /**
   * Searchable employee options for the task-assignee picker. The picker expects
   * `{ id, name }`, so `fullName` is mapped to `name`. Returns [{ id, name }].
   */
  async function fetchEmployeeOptions(search) {
    const { data } = await apolloClient.query({
      query: LIST_EMPLOYEE,
      variables: { params: { page: 1, pageSize: PICKER_PAGE_SIZE, search: search || null } },
      fetchPolicy: 'network-only',
    })
    return (data?.listEmployee?.data?.results ?? []).map((e) => ({ id: e.id, name: e.fullName }))
  }

  /**
   * Assign one employee to a task.
   * @param {{ employeeId: number|string, taskId: number|string }} input
   * @returns created assignment `{ id, employee, task }`
   */
  async function createTaskAssignment({ employeeId, taskId }) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_TASK_ASSIGNMENT,
        variables: { input: { employeeId: Number(employeeId), taskId: Number(taskId) } },
      })
      return data?.createTaskAssignment?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal menugaskan employee.'))
    }
  }

  /** Remove a task assignment by its id (unassign; hard is always false). */
  async function deleteTaskAssignment(id) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_TASK_ASSIGNMENT,
        variables: { deleteTaskAssignmentId: Number(id), hard: false },
      })
      return data?.deleteTaskAssignment?.data ?? null
    } catch (err) {
      throw new Error(toMessage(err, 'Gagal melepas penugasan.'))
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

  return {
    projects,
    items,
    pagination,
    loading,
    saving,
    error,
    getById,
    fetchProjects,
    fetchProject,
    fetchProjectDetail,
    fetchProjectBoard,
    createProject,
    updateProject,
    deleteProject,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    createTask,
    updateTask,
    deleteTask,
    fetchParentOptions,
    fetchUnitOptions,
    fetchRoleOptions,
    fetchEmployeeOptions,
    createTaskAssignment,
    deleteTaskAssignment,
    fetchEnumValues,
  }
})
