<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useProjectStore } from '@/features/projects/stores/project'
import { useTaskStatusStore } from '@/features/task-status/stores/taskStatus'
import { useToast } from '@/shared/composables/useToast'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import ProjectTaskBoard from '@/features/projects/components/ProjectTaskBoard.vue'
import KanbanTaskCreateModal from '@/features/projects/components/KanbanTaskCreateModal.vue'
import TaskComments from '@/features/projects/components/TaskComments.vue'

const route = useRoute()
const projectStore = useProjectStore()
const taskStatusStore = useTaskStatusStore()
const { success, error: toastError } = useToast()

const project = ref(null)
const loading = ref(true)

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

// Create task modal, opened from a column's add button (its status is preset).
const createOpen = ref(false)
const createStatus = ref({ id: null, name: '' })

function onAdd(statusId) {
  const col = columns.value.find((c) => c.id === statusId)
  createStatus.value = { id: statusId, name: col?.name ?? '' }
  createOpen.value = true
}

async function onCreated() {
  await reload()
}

// Comments modal, opened from a card's comment button.
const commentOpen = ref(false)
const commentTaskId = ref(null)
const commentTask = computed(() => tasks.value.find((t) => t.id === commentTaskId.value) ?? null)

function onComment(task) {
  commentTaskId.value = task.id
  commentOpen.value = true
}

/** Refetch so the new comment (and its count on the card) shows up. */
async function onCommentSaved() {
  await reload()
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
    success(`“${task.title}” dipindah ke ${col?.name ?? 'status baru'}.`)
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
      @add="onAdd"
      @status-change="onStatusChange"
      @comment="onComment"
    />

    <!-- Create task -->
    <KanbanTaskCreateModal
      v-model="createOpen"
      :status-id="createStatus.id"
      :status-name="createStatus.name"
      :milestones="milestones"
      @created="onCreated"
    />

    <!-- Task comments -->
    <BaseModal
      v-model="commentOpen"
      :title="commentTask ? commentTask.title : 'Comments'"
      subtitle="Comments"
      size="lg"
    >
      <TaskComments
        v-if="commentTask"
        :key="commentTask.id"
        :task="commentTask"
        :collapsible="false"
        @saved="onCommentSaved"
      />
    </BaseModal>
  </div>

  <p v-else-if="loading" class="py-16 text-center text-sm text-slate-400">Loading…</p>

  <p v-else class="py-16 text-center text-sm text-slate-400">Project not found.</p>
</template>
