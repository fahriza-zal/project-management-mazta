<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/features/projects/stores/project'
import { useToast } from '@/shared/composables/useToast'
import { formatDate } from '@/shared/utils/format'
import {
  PencilSquareIcon,
  ViewColumnsIcon,
  ClockIcon,
  FlagIcon,
  CheckCircleIcon,
  UsersIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  LockClosedIcon,
  LockOpenIcon,
  UserPlusIcon,
  DocumentIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/vue/24/outline'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import ConfirmDialog from '@/shared/components/base/ConfirmDialog.vue'
import TaskAssignModal from '@/features/projects/components/TaskAssignModal.vue'
import TaskComments from '@/features/projects/components/TaskComments.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const { success, error: toastError } = useToast()

const project = ref(null)
const loading = ref(true)
const notFound = ref(false)

// Task-assign modal
const assignOpen = ref(false)
const activeTask = ref(null)

function openAssign(task) {
  activeTask.value = task
  assignOpen.value = true
}

/** "IN_HOUSE" / "in_house" → "In House". */
function humanize(value) {
  if (!value) return '—'
  return String(value)
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Total seconds → "8h 12m" (or "0m"). */
function secondsToHm(total) {
  const s = Number(total) || 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

// ── Colour maps ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  draft: 'slate',
  active: 'info',
  'on hold': 'warning',
  completed: 'success',
  cancelled: 'danger',
}
const PRIORITY_COLORS = { low: 'slate', medium: 'info', high: 'warning', critical: 'danger' }

const statusColor = (name) => STATUS_COLORS[String(name).toLowerCase()] ?? 'slate'
const priorityColor = (name) => PRIORITY_COLORS[String(name).toLowerCase()] ?? 'slate'

/** Task statuses are dynamic (from listTaskStatus) — colour them by name heuristic. */
function taskStatusColor(name) {
  const n = String(name || '').toLowerCase()
  if (/progress|doing|ongoing/.test(n)) return 'info'
  if (/done|complete|closed|finish|approv/.test(n)) return 'success'
  if (/review|hold|pending/.test(n)) return 'warning'
  if (/cancel|reject|block/.test(n)) return 'danger'
  if (/draft|todo|backlog|new|open/.test(n)) return 'slate'
  return 'primary'
}

// ── Derived data ─────────────────────────────────────────────────────────────
const milestones = computed(() => project.value?.milestones ?? [])

const allTasks = computed(() =>
  milestones.value.flatMap((m) => (m.tasks ?? []).map((t) => ({ ...t, _milestoneName: m.name }))),
)

const isTaskDone = (t) => !!(t.isClosed || t.currentStatus?.isClosed || t.doneAt)

const taskCount = computed(() => allTasks.value.length)
const doneTaskCount = computed(() => allTasks.value.filter(isTaskDone).length)

const milestoneProgress = computed(() => {
  if (!milestones.value.length) return 0
  const sum = milestones.value.reduce((acc, m) => acc + (Number(m.progress) || 0), 0)
  return Math.round(sum / milestones.value.length)
})

const trackedSeconds = computed(() => {
  const projectSecs = (project.value?.sheets ?? []).reduce(
    (a, s) => a + (Number(s.seconds) || 0),
    0,
  )
  const taskSecs = allTasks.value.reduce(
    (a, t) => a + (t.sheets ?? []).reduce((b, s) => b + (Number(s.seconds) || 0), 0),
    0,
  )
  return projectSecs + taskSecs
})

const teamMembers = computed(() => project.value?.projectUnits?.length ?? 0)

const creatorName = computed(() => {
  const u = project.value?.createdBy
  if (!u) return '—'
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return full || u.username || '—'
})

const attachments = computed(() => {
  const list = []
  for (const a of project.value?.attachments ?? []) list.push({ ...a, _source: 'Project' })
  for (const t of allTasks.value)
    for (const a of t.attachments ?? []) list.push({ ...a, _source: t.title })
  return list
})

/** Best-effort file name from a stored path/URL. */
const fileName = (files) =>
  String(files || '')
    .split(/[/\\]/)
    .pop() || 'file'

const activities = computed(() =>
  [...(project.value?.activities ?? [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  ),
)

// ── Tabs ─────────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'team', label: 'Team' },
  { key: 'activity', label: 'Activity' },
  { key: 'files', label: 'Files' },
]
const activeTab = ref('milestones')

// Expand/collapse milestone accordions (all open by default).
const collapsed = ref({})
const toggleMilestone = (id) => (collapsed.value[id] = !collapsed.value[id])

function goToEdit() {
  router.push({ name: 'project-edit', params: { id: route.params.id } })
}
function goToBoard() {
  router.push({ name: 'project-board', params: { id: route.params.id } })
}

async function loadProject() {
  const data = await projectStore.fetchProjectDetail(route.params.id)
  if (!data) {
    notFound.value = true
    return
  }
  project.value = data
}

/** Refresh after an assignment change so the new assignees show up. */
async function onAssigned() {
  try {
    await loadProject()
  } catch (err) {
    toastError(err.message)
  }
}

// ── Lock / unlock task (with confirmation) ───────────────────────────────────
const lockState = ref({ open: false, task: null, loading: false })

const lockMessage = computed(() => {
  const t = lockState.value.task
  if (!t) return ''
  return t.isLocked
    ? `Buka kunci task “${t.title}”? Task ini akan bisa diubah lagi.`
    : `Kunci task “${t.title}”? Task yang terkunci tidak bisa diubah.`
})

function requestTaskLock(task) {
  lockState.value = { open: true, task, loading: false }
}

async function confirmTaskLock() {
  const t = lockState.value.task
  if (!t) {
    lockState.value.open = false
    return
  }
  lockState.value.loading = true
  try {
    if (t.isLocked) {
      await projectStore.unlockTask(t.id)
      success(`“${t.title}” dibuka kuncinya.`)
    } else {
      await projectStore.lockTask(t.id)
      success(`“${t.title}” dikunci.`)
    }
    await loadProject()
    lockState.value.open = false
  } catch (err) {
    toastError(err.message)
  } finally {
    lockState.value.loading = false
  }
}

onMounted(async () => {
  try {
    await loadProject()
  } catch (err) {
    toastError(err.message)
    notFound.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="surface p-12 text-center text-sm text-slate-400">Loading…</div>

    <!-- Not found -->
    <div v-else-if="notFound" class="surface p-6">
      <BaseEmpty
        title="Project not found"
        description="The project you’re looking for doesn’t exist."
      />
    </div>

    <template v-else-if="project">
      <!-- ── Breadcrumb ──────────────────────────────────────────────────── -->
      <nav class="flex items-center gap-1.5 text-xs text-slate-400">
        <router-link :to="{ name: 'dashboard' }" class="hover:text-primary-600"
          >Dashboard</router-link
        >
        <ChevronRightIcon class="h-3.5 w-3.5" />
        <router-link :to="{ name: 'projects' }" class="hover:text-primary-600"
          >Projects</router-link
        >
        <ChevronRightIcon class="h-3.5 w-3.5" />
        <span class="truncate font-medium text-slate-600">{{ project.name }}</span>
      </nav>

      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2.5">
            <h1 class="text-heading truncate">{{ project.name }}</h1>
            <span class="font-mono text-xs text-slate-400">
              {{ project.fullCode || project.prefix }}
            </span>
            <BaseBadge
              v-if="project.currentStatus?.name"
              :color="statusColor(project.currentStatus.name)"
              size="sm"
              dot
            >
              {{ humanize(project.currentStatus.name) }}
            </BaseBadge>
            <BaseBadge v-if="project.isLocked" color="warning" size="sm">
              <LockClosedIcon class="h-3.5 w-3.5" />
              Locked
            </BaseBadge>
          </div>
          <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
            <BaseBadge color="primary" size="sm">{{ humanize(project.projectCategory) }}</BaseBadge>
            <BaseBadge color="slate" size="sm">{{ humanize(project.projectMode) }}</BaseBadge>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <BaseButton variant="outline" @click="goToBoard">
            <ViewColumnsIcon class="h-4 w-4" />
            Board
          </BaseButton>
          <BaseButton variant="primary" @click="goToEdit">
            <PencilSquareIcon class="h-4 w-4" />
            Edit
          </BaseButton>
        </div>
      </div>

      <!-- ── Stat cards ──────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="surface flex items-center gap-3 p-4">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600"
          >
            <CheckCircleIcon class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="text-caption">Task Progress</p>
            <p class="text-lg font-bold text-slate-900">
              {{ doneTaskCount }}/{{ taskCount }}
              <span class="text-xs font-medium text-slate-400">Completed</span>
            </p>
          </div>
        </div>

        <div class="surface flex items-center gap-3 p-4">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
          >
            <FlagIcon class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="text-caption">Milestone Progress</p>
            <p class="text-lg font-bold text-slate-900">{{ milestoneProgress }}%</p>
          </div>
        </div>

        <div class="surface flex items-center gap-3 p-4">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"
          >
            <ClockIcon class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="text-caption">Timesheet Tracked</p>
            <p class="text-lg font-bold text-slate-900">{{ secondsToHm(trackedSeconds) }}</p>
          </div>
        </div>

        <div class="surface flex items-center gap-3 p-4">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"
          >
            <UsersIcon class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="text-caption">Team Members</p>
            <p class="text-lg font-bold text-slate-900">{{ teamMembers }}</p>
          </div>
        </div>
      </div>

      <!-- ── Main + sidebar ──────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Left · tabs -->
        <div class="space-y-6 lg:col-span-2">
          <div class="surface overflow-hidden">
            <!-- Tab bar -->
            <div class="flex gap-1 overflow-x-auto border-b border-slate-100 px-3">
              <button
                v-for="t in tabs"
                :key="t.key"
                type="button"
                class="whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition"
                :class="
                  activeTab === t.key
                    ? 'border-primary-500 text-primary-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                "
                @click="activeTab = t.key"
              >
                {{ t.label }}
              </button>
            </div>

            <div class="p-5">
              <!-- Overview -->
              <div v-if="activeTab === 'overview'" class="space-y-4">
                <div>
                  <p class="text-subheading mb-1">Description</p>
                  <p class="text-sm leading-relaxed text-slate-600">
                    {{ project.description || 'No description.' }}
                  </p>
                </div>
                <dl class="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                  <div>
                    <dt class="text-caption">Milestones</dt>
                    <dd class="text-sm font-semibold text-slate-800">{{ milestones.length }}</dd>
                  </div>
                  <div>
                    <dt class="text-caption">Tasks</dt>
                    <dd class="text-sm font-semibold text-slate-800">{{ taskCount }}</dd>
                  </div>
                  <div>
                    <dt class="text-caption">Completed</dt>
                    <dd class="text-sm font-semibold text-slate-800">{{ doneTaskCount }}</dd>
                  </div>
                  <div>
                    <dt class="text-caption">Start Date</dt>
                    <dd class="text-sm font-semibold text-slate-800">
                      {{ formatDate(project.startDate) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-caption">Expected End</dt>
                    <dd class="text-sm font-semibold text-slate-800">
                      {{ formatDate(project.expectedEndDate) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-caption">End Date</dt>
                    <dd class="text-sm font-semibold text-slate-800">
                      {{ formatDate(project.endDate) }}
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Milestones -->
              <div v-else-if="activeTab === 'milestones'">
                <div v-if="milestones.length" class="space-y-4">
                  <div
                    v-for="m in milestones"
                    :key="m.id"
                    class="rounded-2xl border border-slate-200/70 bg-white/50"
                  >
                    <!-- Milestone header -->
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 px-4 py-3 text-left"
                      @click="toggleMilestone(m.id)"
                    >
                      <FlagIcon class="h-4 w-4 shrink-0 text-primary-500" />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-semibold text-slate-800">{{ m.name }}</p>
                        <p class="text-caption">{{ m.tasks?.length || 0 }} tasks</p>
                      </div>
                      <div class="hidden w-40 items-center gap-2 sm:flex">
                        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            class="h-full rounded-full bg-primary-500"
                            :style="{ width: (Number(m.progress) || 0) + '%' }"
                          />
                        </div>
                        <span class="text-caption w-8 text-right"
                          >{{ Number(m.progress) || 0 }}%</span
                        >
                      </div>
                      <ChevronUpIcon
                        v-if="!collapsed[m.id]"
                        class="h-4 w-4 shrink-0 text-slate-400"
                      />
                      <ChevronDownIcon v-else class="h-4 w-4 shrink-0 text-slate-400" />
                    </button>

                    <!-- Tasks -->
                    <div v-if="!collapsed[m.id]" class="space-y-2.5 px-4 pb-4">
                      <p v-if="m.description" class="text-xs text-slate-500">{{ m.description }}</p>
                      <div
                        v-for="t in m.tasks"
                        :key="t.id"
                        class="rounded-xl border border-slate-100 bg-white/70 p-3"
                      >
                        <div class="flex items-start justify-between gap-2">
                          <p class="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                            <LockClosedIcon v-if="t.isLocked" class="h-3.5 w-3.5 text-amber-500" />
                            {{ t.title }}
                          </p>
                          <div class="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              class="rounded-lg p-1 transition"
                              :class="
                                t.isLocked
                                  ? 'text-amber-500 hover:bg-amber-100'
                                  : 'text-slate-400 hover:bg-slate-100 hover:text-amber-600'
                              "
                              :title="t.isLocked ? 'Buka kunci task' : 'Kunci task'"
                              @click.stop="requestTaskLock(t)"
                            >
                              <LockOpenIcon v-if="t.isLocked" class="h-4 w-4" />
                              <LockClosedIcon v-else class="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              class="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
                              title="Assign employees"
                              @click.stop="openAssign(t)"
                            >
                              <UserPlusIcon class="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <!-- badges -->
                        <div class="mt-2 flex flex-wrap items-center gap-1.5">
                          <BaseBadge v-if="t.taskType" color="primary" size="sm">
                            {{ humanize(t.taskType) }}
                          </BaseBadge>
                          <BaseBadge v-if="t.priority" :color="priorityColor(t.priority)" size="sm">
                            {{ humanize(t.priority) }} Priority
                          </BaseBadge>
                          <BaseBadge
                            v-if="t.currentStatus?.name"
                            :color="taskStatusColor(t.currentStatus.name)"
                            size="sm"
                          >
                            {{ humanize(t.currentStatus.name) }}
                          </BaseBadge>
                          <span v-if="t.estimatedSeconds" class="text-caption">
                            Est: {{ secondsToHm(t.estimatedSeconds) }}
                          </span>
                        </div>

                        <!-- footer: assignees -->
                        <div class="mt-2.5 flex items-center gap-2">
                          <span class="text-caption">Assigned to</span>
                          <div v-if="t.assignments?.length" class="flex -space-x-1.5">
                            <BaseAvatar
                              v-for="a in t.assignments"
                              :key="a.id"
                              :name="a.employee?.fullName || '?'"
                              size="xs"
                            />
                          </div>
                          <span v-else class="text-caption italic">Unassigned</span>
                        </div>

                        <!-- comments thread -->
                        <TaskComments :task="t" @saved="loadProject" />
                      </div>
                      <p v-if="!m.tasks?.length" class="text-xs text-slate-400">
                        No tasks in this milestone.
                      </p>
                    </div>
                  </div>
                </div>
                <BaseEmpty
                  v-else
                  :icon="FlagIcon"
                  title="No milestones yet"
                  description="Edit the project to add milestones and tasks."
                />
              </div>

              <!-- Tasks (flat) -->
              <div v-else-if="activeTab === 'tasks'">
                <ul v-if="allTasks.length" class="space-y-2">
                  <li
                    v-for="t in allTasks"
                    :key="t.id"
                    class="flex items-center gap-2 rounded-xl border border-slate-100 bg-white/70 px-3 py-2.5 text-sm"
                  >
                    <LockClosedIcon v-if="t.isLocked" class="h-4 w-4 shrink-0 text-amber-500" />
                    <ClipboardDocumentListIcon v-else class="h-4 w-4 shrink-0 text-slate-300" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-medium text-slate-700">{{ t.title }}</p>
                      <p class="text-caption truncate">{{ t._milestoneName }}</p>
                    </div>
                    <div v-if="t.assignments?.length" class="flex shrink-0 -space-x-1.5">
                      <BaseAvatar
                        v-for="a in t.assignments"
                        :key="a.id"
                        :name="a.employee?.fullName || '?'"
                        size="xs"
                      />
                    </div>
                    <BaseBadge
                      v-if="t.currentStatus?.name"
                      :color="taskStatusColor(t.currentStatus.name)"
                      size="sm"
                    >
                      {{ humanize(t.currentStatus.name) }}
                    </BaseBadge>
                    <BaseBadge v-if="t.priority" :color="priorityColor(t.priority)" size="sm">
                      {{ humanize(t.priority) }}
                    </BaseBadge>
                    <button
                      type="button"
                      class="shrink-0 rounded-lg p-1 transition"
                      :class="
                        t.isLocked
                          ? 'text-amber-500 hover:bg-amber-100'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-amber-600'
                      "
                      :title="t.isLocked ? 'Buka kunci task' : 'Kunci task'"
                      @click="requestTaskLock(t)"
                    >
                      <LockOpenIcon v-if="t.isLocked" class="h-4 w-4" />
                      <LockClosedIcon v-else class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
                      title="Assign employees"
                      @click="openAssign(t)"
                    >
                      <UserPlusIcon class="h-4 w-4" />
                    </button>
                  </li>
                </ul>
                <BaseEmpty
                  v-else
                  :icon="ClipboardDocumentListIcon"
                  title="No tasks yet"
                  description="Add tasks from the project editor or the board."
                />
              </div>

              <!-- Team -->
              <div v-else-if="activeTab === 'team'">
                <ul v-if="project.projectUnits?.length" class="grid gap-2 sm:grid-cols-2">
                  <li
                    v-for="pu in project.projectUnits"
                    :key="pu.id"
                    class="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/70 px-3 py-2.5"
                  >
                    <BaseAvatar :name="pu.unit?.name || '?'" size="sm" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-slate-800">
                        {{ pu.unit?.name || '—' }}
                      </p>
                      <p v-if="pu.unit?.unitType" class="text-caption truncate">
                        {{ humanize(pu.unit.unitType) }}
                      </p>
                    </div>
                    <BaseBadge v-if="pu.role?.name" color="info" size="sm">{{
                      pu.role.name
                    }}</BaseBadge>
                  </li>
                </ul>
                <BaseEmpty v-else :icon="UsersIcon" title="No units assigned" description="" />
              </div>

              <!-- Activity -->
              <div v-else-if="activeTab === 'activity'">
                <ol v-if="activities.length" class="space-y-4">
                  <li v-for="a in activities" :key="a.id" class="flex gap-3">
                    <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-400" />
                    <div class="min-w-0">
                      <p class="text-sm text-slate-700">
                        {{ a.description || humanize(a.action) || 'Activity' }}
                      </p>
                      <p class="text-caption">
                        {{ formatDate(a.createdAt, { hour: '2-digit', minute: '2-digit' }) }}
                      </p>
                    </div>
                  </li>
                </ol>
                <BaseEmpty
                  v-else
                  :icon="ClipboardDocumentListIcon"
                  title="No activity yet"
                  description=""
                />
              </div>

              <!-- Files -->
              <div v-else-if="activeTab === 'files'">
                <ul v-if="attachments.length" class="space-y-2">
                  <li
                    v-for="a in attachments"
                    :key="a.id"
                    class="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/70 px-3 py-2.5"
                  >
                    <DocumentIcon class="h-5 w-5 shrink-0 text-slate-400" />
                    <a
                      :href="a.files"
                      target="_blank"
                      rel="noopener"
                      class="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:text-primary-600"
                    >
                      {{ fileName(a.files) }}
                    </a>
                    <BaseBadge color="slate" size="sm">{{ a._source }}</BaseBadge>
                  </li>
                </ul>
                <BaseEmpty v-else :icon="DocumentIcon" title="No files" description="" />
              </div>
            </div>
          </div>
        </div>

        <!-- Right · sidebar -->
        <div class="space-y-6">
          <!-- Project Info -->
          <div class="surface p-5">
            <p class="text-subheading mb-3">Project Info</p>
            <div class="flex items-center gap-3">
              <BaseAvatar :name="creatorName" size="sm" />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-800">
                  Created By: {{ creatorName }}
                </p>
                <p class="text-caption">Joined {{ formatDate(project.createdBy?.dateJoined) }}</p>
              </div>
            </div>
            <dl class="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">Code</dt>
                <dd class="font-medium text-slate-800">{{ project.fullCode || project.prefix }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">Start Date</dt>
                <dd class="font-medium text-slate-800">{{ formatDate(project.startDate) }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">Expected End</dt>
                <dd class="font-medium text-slate-800">
                  {{ formatDate(project.expectedEndDate) }}
                </dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">End Date</dt>
                <dd class="font-medium text-slate-800">{{ formatDate(project.endDate) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Assigned Units -->
          <div class="surface p-5">
            <p class="text-subheading mb-3">
              Assigned Units ({{ project.projectUnits?.length || 0 }})
            </p>
            <ul v-if="project.projectUnits?.length" class="space-y-3">
              <li v-for="pu in project.projectUnits" :key="pu.id" class="flex items-center gap-3">
                <BaseAvatar :name="pu.unit?.name || '?'" size="sm" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-slate-800">
                    {{ pu.unit?.name || '—' }}
                  </p>
                  <p v-if="pu.role?.name" class="text-caption truncate">{{ pu.role.name }}</p>
                </div>
              </li>
            </ul>
            <p v-else class="text-sm text-slate-400">No units assigned.</p>
          </div>

          <!-- Active Timesheet -->
          <div class="surface p-5">
            <div class="flex items-center justify-between">
              <p class="text-subheading">Active Timesheet</p>
              <span class="text-sm font-bold text-primary-700">{{
                secondsToHm(trackedSeconds)
              }}</span>
            </div>
            <p class="text-caption mt-1">Total project hours · {{ secondsToHm(trackedSeconds) }}</p>
            <div
              class="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4"
            >
              <span class="text-xs text-slate-500">Currently not tracking</span>
              <BaseButton variant="outline" size="sm" @click="goToBoard">
                <ClockIcon class="h-3.5 w-3.5" />
                Track
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </template>

    <TaskAssignModal v-model="assignOpen" :task="activeTask" @saved="onAssigned" />

    <ConfirmDialog
      v-model="lockState.open"
      :title="lockState.task?.isLocked ? 'Buka kunci task?' : 'Kunci task?'"
      :message="lockMessage"
      :confirm-text="lockState.task?.isLocked ? 'Buka kunci' : 'Kunci'"
      :loading="lockState.loading"
      @confirm="confirmTaskLock"
    />
  </div>
</template>
