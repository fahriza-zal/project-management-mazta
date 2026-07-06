import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { tasks as mockTasks } from '@/features/tasks/services/mockTasks'

/**
 * Task store (scaffold backed by mock data).
 * The board reads tasks from here; moving a card updates `status` locally
 * for now and should later call a GraphQL `updateTaskStatus` mutation.
 */
export const useTaskStore = defineStore('task', () => {
  const tasks = ref([...mockTasks])

  const byProject = computed(() => (projectId) =>
    tasks.value.filter((t) => t.projectId === projectId),
  )

  function getById(id) {
    return tasks.value.find((t) => t.id === id) ?? null
  }

  function updateStatus(taskId, status) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (task) task.status = status
    // TODO: mutation `updateTaskStatus`
  }

  return { tasks, byProject, getById, updateStatus }
})
