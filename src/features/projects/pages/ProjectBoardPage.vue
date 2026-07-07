<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useProjectStore } from '@/features/projects/stores/project'
import { useTaskStatusStore } from '@/features/task-status/stores/taskStatus'
import { useToast } from '@/shared/composables/useToast'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import ProjectTaskBoard from '@/features/projects/components/ProjectTaskBoard.vue'

const route = useRoute()
const projectStore = useProjectStore()
const taskStatusStore = useTaskStatusStore()
const { success, error: toastError } = useToast()

const project = ref(null)
const loading = ref(true)
const creatingStatusId = ref(null)

// Columns come from the task-status definitions (`listTaskStatus`), ordered by
// `ordering`; a small palette cycles the accent colors.
const ACCENTS = ['slate', 'info', 'warning', 'success', 'danger']
const columns = ref([])

// Tasks are the project's tasks (milestones → tasks), each carrying `currentStatus`.
// Only assigned tasks (at least one employee assignment) appear on the board.
const tasks = computed(() =>
  (project.value?.milestones ?? [])
    .flatMap((m) => m.tasks ?? [])
    .filter((t) => t.assignments?.length),
)
const milestones = computed(() =>
  (project.value?.milestones ?? []).map((m) => ({ id: m.id, name: m.name })),
)

// Apollo freezes query results (read-only). We keep a mutable deep copy so the
// optimistic drag & drop can reassign a task's `currentStatus` in place.
const clone = (v) => (v ? structuredClone(v) : v)

async function reload() {
  project.value = clone(await projectStore.fetchProjectBoard(route.params.id))
}

/** Create a task directly in a column (its status). */
async function onCreate({ statusId, milestoneId, title }) {
  creatingStatusId.value = statusId
  try {
    await projectStore.createTask({
      title,
      milestoneId: milestoneId ? Number(milestoneId) : null,
      currentStatusId: Number(statusId),
    })
    await reload()
    success('Task created.')
  } catch (err) {
    toastError(err.message)
  } finally {
    creatingStatusId.value = null
  }
}

/**
 * Move a task to another status. Optimistic: the card jumps columns immediately,
 * the mutation persists it, and we roll back if it fails.
 * `employeeId` is the employee assigned to the task (the board only shows assigned tasks).
 */
async function onStatusChange(taskId, statusId) {
  let task = null
  for (const m of project.value?.milestones ?? []) {
    task = (m.tasks ?? []).find((x) => x.id === taskId)
    if (task) break
  }
  if (!task) return

  const col = columns.value.find((c) => c.id === statusId)
  const prevStatus = task.currentStatus ? { ...task.currentStatus } : null
  const oldStatusId = prevStatus?.id ?? null
  const employeeId = task.assignments?.[0]?.employee?.id ?? null

  // Optimistic move.
  task.currentStatus = { id: statusId, name: col?.name ?? '' }
  
  try {
    await projectStore.updateTaskStatus({ taskId, newStatusId: statusId, oldStatusId, employeeId })
  } catch (err) {
    task.currentStatus = prevStatus // roll back on failure
    toastError(err.message)
  }
}

onMounted(async () => {
  try {
    const [proj, statuses] = await Promise.all([
      projectStore.fetchProjectBoard(route.params.id),
      taskStatusStore.fetchList({ page: 1, pageSize: 100 }),
    ])
    project.value = clone(proj)
    columns.value = [...(statuses ?? [])]
      .sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0))
      .map((s, i) => ({ id: s.id, name: s.name, accent: ACCENTS[i % ACCENTS.length] }))
  } catch (err) {
    toastError(err.message)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="project" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <RouterLink :to="{ name: 'project-detail', params: { id: project.id } }">
        <BaseButton variant="ghost" size="sm"><ArrowLeftIcon class="h-4 w-4" /></BaseButton>
      </RouterLink>
      <div>
        <p class="text-caption font-medium">{{ project.fullCode || project.prefix }} · Board</p>
        <h1 class="text-xl font-bold tracking-tight text-slate-900">{{ project.name }}</h1>
      </div>
    </div>

    <!-- Board -->
    <ProjectTaskBoard
      :columns="columns"
      :tasks="tasks"
      :milestones="milestones"
      :creating-status-id="creatingStatusId"
      @create="onCreate"
      @status-change="onStatusChange"
    />
  </div>

  <p v-else-if="loading" class="py-16 text-center text-sm text-slate-400">Loading…</p>

  <p v-else class="py-16 text-center text-sm text-slate-400">Project not found.</p>
</template>
