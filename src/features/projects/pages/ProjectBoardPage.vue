<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useProjectStore } from '@/features/projects/stores/project'
import { useTaskStatusStore } from '@/features/task-status/stores/taskStatus'
import { useAuthStore } from '@/features/auth/stores/auth'
import { PERM } from '@/features/projects/permissions'
import { useToast } from '@/shared/composables/useToast'
import { formatDate } from '@/shared/utils/format'
import { ArrowLeftIcon, FlagIcon, CalendarDaysIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import ProjectTaskBoard from '@/features/projects/components/ProjectTaskBoard.vue'
import KanbanTaskCreateModal from '@/features/projects/components/KanbanTaskCreateModal.vue'
import TaskComments from '@/features/projects/components/TaskComments.vue'
import AttachmentUploader from '@/features/projects/components/AttachmentUploader.vue'

const route = useRoute()
const projectStore = useProjectStore()
const taskStatusStore = useTaskStatusStore()
const auth = useAuthStore()
const { success, error: toastError } = useToast()

const project = ref(null)
const loading = ref(true)

// Board columns are scoped to the signed-in employee's companies & units
// (ids from the auth store / `pm_profile`). Empty → sent as no filter.
auth.hydrate()
const companyIds = computed(() =>
  (auth.employee?.companies ?? []).map((c) => Number(c.id)).filter(Boolean),
)
const unitIds = computed(() =>
  (auth.employee?.units ?? []).map((u) => Number(u.id)).filter(Boolean),
)

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
// `order` is required by TaskInput; give a new task the next sequential order
// across all project tasks (mirrors the create/edit project pages).
const nextTaskOrder = computed(
  () => (project.value?.milestones ?? []).reduce((n, m) => n + (m.tasks?.length ?? 0), 0) + 1,
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

// Task detail modal, opened by clicking a card (or its comment button). Shows the
// task info, description, assignees, comments & attachments.
const detailOpen = ref(false)
const detailTaskId = ref(null)
const detailTask = computed(() => tasks.value.find((t) => t.id === detailTaskId.value) ?? null)

function onOpenTask(task) {
  detailTaskId.value = task.id
  detailOpen.value = true
}

/** Refetch so any change (new comment, file, …) shows up on the card. */
async function onDetailSaved() {
  await reload()
}

const PRIORITY_COLORS = { low: 'slate', medium: 'info', high: 'warning', critical: 'danger' }
const priorityColor = (p) => PRIORITY_COLORS[String(p).toLowerCase()] ?? 'slate'

/** Task statuses are dynamic — colour them by name heuristic (mirrors detail page). */
function taskStatusColor(name) {
  const n = String(name || '').toLowerCase()
  if (/progress|doing|ongoing/.test(n)) return 'info'
  if (/done|complete|closed|finish|approv/.test(n)) return 'success'
  if (/review|hold|pending/.test(n)) return 'warning'
  if (/cancel|reject|block/.test(n)) return 'danger'
  if (/draft|todo|backlog|new|open/.test(n)) return 'slate'
  return 'primary'
}

const humanize = (v) =>
  v
    ? String(v)
        .toLowerCase()
        .split(/[_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : ''

/**
 * Move a task to another status. Optimistic: the card jumps columns immediately,
 * the mutation persists it, and we roll back if it fails.
 * `employeeId` is the signed-in employee (auth store / `pm_profile` → `employee.id`) —
 * i.e. who performed the move, not the task's assignee.
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
  const employeeId = auth.employee?.id ?? null

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
      taskStatusStore.fetchList({
        page: 1,
        pageSize: 100,
        companyIds: companyIds.value,
        unitIds: unitIds.value,
      }),
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
      :can-create="auth.can(PERM.CREATE_TASK)"
      :can-move="auth.can(PERM.UPDATE_TASK)"
      @add="onAdd"
      @status-change="onStatusChange"
      @comment="onOpenTask"
      @open="onOpenTask"
    />

    <!-- Create task -->
    <KanbanTaskCreateModal
      v-model="createOpen"
      :status-id="createStatus.id"
      :status-name="createStatus.name"
      :milestones="milestones"
      :order="nextTaskOrder"
      @created="onCreated"
    />

    <!-- Task detail: info + comments + attachments -->
    <BaseModal
      v-model="detailOpen"
      :title="detailTask ? detailTask.title : 'Task'"
      subtitle="Detail task"
      size="lg"
    >
      <template v-if="detailTask">
        <!-- Badges: status, priority, milestone -->
        <div class="flex flex-wrap items-center gap-1.5">
          <BaseBadge
            v-if="detailTask.currentStatus?.name"
            :color="taskStatusColor(detailTask.currentStatus.name)"
            size="sm"
          >
            {{ humanize(detailTask.currentStatus.name) }}
          </BaseBadge>
          <BaseBadge
            v-if="detailTask.priority"
            :color="priorityColor(detailTask.priority)"
            size="sm"
          >
            {{ humanize(detailTask.priority) }} Priority
          </BaseBadge>
          <span
            v-if="detailTask.milestone?.name"
            class="inline-flex items-center gap-1 text-xs text-slate-500"
          >
            <FlagIcon class="h-3.5 w-3.5" />
            {{ detailTask.milestone.name }}
          </span>
          <span
            v-if="detailTask.dueDate"
            class="inline-flex items-center gap-1 text-xs text-slate-500"
          >
            <CalendarDaysIcon class="h-3.5 w-3.5" />
            {{ formatDate(detailTask.dueDate) }}
          </span>
        </div>

        <!-- Description -->
        <div class="mt-4">
          <p class="text-subheading mb-1">Deskripsi</p>
          <p class="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {{ detailTask.description || 'Tidak ada deskripsi.' }}
          </p>
        </div>

        <!-- Assignees -->
        <div class="mt-4">
          <p class="text-subheading mb-2">Assigned to</p>
          <ul v-if="detailTask.assignments?.length" class="flex flex-wrap gap-2">
            <li
              v-for="a in detailTask.assignments"
              :key="a.id"
              class="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white/70 py-1 pl-1 pr-3"
            >
              <BaseAvatar
                :name="a.employee?.fullName || '?'"
                :src="a.employee?.image || ''"
                size="xs"
              />
              <span class="text-xs font-medium text-slate-700">{{
                a.employee?.fullName || '—'
              }}</span>
            </li>
          </ul>
          <p v-else class="text-sm italic text-slate-400">Unassigned</p>
        </div>

        <div class="mt-4 border-t border-slate-100 pt-4">
          <TaskComments
            :key="detailTask.id"
            :task="detailTask"
            :collapsible="false"
            @saved="onDetailSaved"
          />
        </div>

        <div class="mt-4 border-t border-slate-100 pt-4">
          <p class="text-subheading mb-2">Attachments</p>
          <AttachmentUploader
            :key="`att-${detailTask.id}`"
            :task-id="detailTask.id"
            :attachments="detailTask.attachments"
            :collapsible="false"
            @saved="onDetailSaved"
          />
        </div>
      </template>
    </BaseModal>
  </div>

  <p v-else-if="loading" class="py-16 text-center text-sm text-slate-400">Loading…</p>

  <p v-else class="py-16 text-center text-sm text-slate-400">Project not found.</p>
</template>
