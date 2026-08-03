<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/features/projects/stores/project'
import { useAuthStore } from '@/features/auth/stores/auth'
import { PERM } from '@/features/projects/permissions'
import { useToast } from '@/shared/composables/useToast'
import { formatDate, secondsToHm, secondsToDuration } from '@/shared/utils/format'
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
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import ConfirmDialog from '@/shared/components/base/ConfirmDialog.vue'
import TaskAssignModal from '@/features/projects/components/TaskAssignModal.vue'
import TaskComments from '@/features/projects/components/TaskComments.vue'
import AttachmentUploader from '@/features/projects/components/AttachmentUploader.vue'
import ProjectMetricPanel from '@/features/projects/components/ProjectMetricPanel.vue'
import MilestoneMetricPanel from '@/features/projects/components/MilestoneMetricPanel.vue'
import ProjectStatusUpdateModal from '@/features/projects/components/ProjectStatusUpdateModal.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const auth = useAuthStore()
const { success, error: toastError } = useToast()

/** Whether the current user may toggle this task's lock (unlock vs lock op). */
function canToggleTaskLock(task) {
  return task.isLocked ? auth.can(PERM.UNLOCK_TASK) : auth.can(PERM.LOCK_TASK)
}

const project = ref(null)
const loading = ref(true)
const notFound = ref(false)

// Project status update modal
const statusModalOpen = ref(false)

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

/**
 * Milestone has no `isClosed` of its own — treat it as done when it has tasks and
 * every one is closed. (A milestone with no tasks is not "done".)
 */
const isMilestoneDone = (m) => !!(m?.tasks?.length && m.tasks.every(isTaskDone))

const taskCount = computed(() => allTasks.value.length)
const doneTaskCount = computed(() => allTasks.value.filter(isTaskDone).length)

/**
 * A milestone's completion %. The computed `metric.progress` (e.g. "1E+2" → 100)
 * is authoritative when present; fall back to the raw `progress` field ("0.0000").
 * Both can arrive as strings — `Number()` parses decimals and scientific notation.
 */
const mProgress = (m) => {
  const raw = m?.metric?.progress ?? m?.progress
  const n = Number(raw)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const milestoneProgress = computed(() => {
  if (!milestones.value.length) return 0
  const sum = milestones.value.reduce((acc, m) => acc + mProgress(m), 0)
  return Math.round(sum / milestones.value.length)
})

/**
 * Total tracked seconds, de-duplicated by sheet id. The same sheet is reported
 * both under the project and under its task (e.g. sheet 24 appears in both), so a
 * naive sum double-counts — key by id and total the distinct sheets.
 */
const trackedSeconds = computed(() => {
  const byId = new Map()
  const add = (sheets) => {
    for (const s of sheets ?? []) {
      if (s?.id == null) continue
      byId.set(s.id, Number(s.seconds) || 0)
    }
  }
  add(project.value?.sheets)
  for (const t of allTasks.value) add(t.sheets)
  return [...byId.values()].reduce((a, b) => a + b, 0)
})

/**
 * Total approved time (seconds) from the sheet activities on the project —
 * `sheets[].activities[].totalTime` (each `totalTime` is a seconds value, same
 * as in the timesheet page). Sum across every sheet's activities.
 */
const sheetTotalSeconds = computed(() => {
  let total = 0
  for (const s of project.value?.sheets ?? []) {
    for (const a of s.activities ?? []) total += Number(a?.totalTime) || 0
  }
  return total
})

const teamMembers = computed(() => project.value?.projectUnits?.length ?? 0)

const creatorName = computed(() => {
  const u = project.value?.createdBy
  if (!u) return '—'
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return full || u.username || '—'
})

// Task attachments (read-only here; uploaded from each task card). Project
// attachments are handled by the AttachmentUploader in the Files tab.
const taskAttachments = computed(() => {
  const list = []
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

// Expand/collapse milestone accordions (all closed by default).
const expandedMilestone = ref({})
const toggleMilestone = (id) => (expandedMilestone.value[id] = !expandedMilestone.value[id])
const isMilestoneOpen = (id) => !!expandedMilestone.value[id]

// Unique assignees across a milestone's tasks — surfaced in the header so you
// can tell from the outside (even while collapsed) who's already assigned.
const milestoneAssignees = (m) => {
  const seen = new Set()
  const out = []
  for (const t of m?.tasks ?? []) {
    for (const a of t?.assignments ?? []) {
      const emp = a?.employee
      const key = emp?.id ?? emp?.fullName
      if (emp && key != null && !seen.has(key)) {
        seen.add(key)
        out.push(emp)
      }
    }
  }
  return out
}

// Expand/collapse a task's activity history (collapsed by default).
const activityOpen = ref({})
const toggleActivity = (id) => (activityOpen.value[id] = !activityOpen.value[id])

/**
 * A task's activities, newest first. `updatedAt` can be null (as in the sample),
 * so fall back to id order — higher id = more recent.
 */
const taskActivities = (t) =>
  [...(t?.activities ?? [])].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return tb - ta || (Number(b.id) || 0) - (Number(a.id) || 0)
  })

/** Actor of an activity, when the backend fills `updatedBy` (else the description carries the name). */
const activityActor = (a) => a?.updatedBy?.username || a?.updatedBy?.email || ''

/** Colour an activity by its `action` (move/created/deleted/…). */
function activityActionColor(action) {
  const a = String(action || '').toLowerCase()
  if (/creat/.test(a)) return 'success'
  if (/move|status|updat|edit/.test(a)) return 'info'
  if (/delet|remov|close/.test(a)) return 'danger'
  if (/lock/.test(a)) return 'warning'
  return 'slate'
}

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

/** Refresh after a status change so the new status badge shows up. */
async function onStatusUpdated() {
  success('Status project berhasil diperbarui.')
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
        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <BaseButton class="flex-1 sm:flex-none" variant="outline" @click="goToBoard">
            <ViewColumnsIcon class="h-4 w-4" />
            Board
          </BaseButton>
          <BaseButton
            v-if="auth.can(PERM.UPDATE_STATUS)"
            class="flex-1 sm:flex-none"
            variant="outline"
            @click="statusModalOpen = true"
          >
            <ArrowsRightLeftIcon class="h-4 w-4" />
            Ubah Status
          </BaseButton>
          <BaseButton
            v-if="auth.can(PERM.EDIT)"
            class="flex-1 sm:flex-none"
            variant="primary"
            @click="goToEdit"
          >
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
            <p class="text-2xl font-bold leading-none text-slate-900 tabular-nums">
              {{ doneTaskCount }}<span class="text-slate-400">/</span>{{ taskCount }}
            </p>
            <p class="text-caption mt-1">Selesai</p>
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
            <p class="text-2xl font-bold leading-none text-slate-900 tabular-nums">
              {{ milestoneProgress }}<span class="text-base text-slate-400">%</span>
            </p>
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
            <p class="text-2xl font-bold leading-none text-slate-900 tabular-nums">
              {{ secondsToHm(trackedSeconds) }}
            </p>
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
            <p class="text-2xl font-bold leading-none text-slate-900 tabular-nums">
              {{ teamMembers }}
            </p>
          </div>
        </div>
      </div>

      <!-- ── Project metrics (headline computed metric) ──────────────────── -->
      <ProjectMetricPanel :metric="project.metric" :total-tasks="taskCount" />

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

                      <!-- Assignees preview — visible even when collapsed -->
                      <div
                        v-if="milestoneAssignees(m).length"
                        class="hidden shrink-0 items-center gap-1.5 sm:flex"
                        :title="
                          milestoneAssignees(m)
                            .map((e) => e.fullName)
                            .join(', ')
                        "
                      >
                        <div class="flex -space-x-1.5">
                          <BaseAvatar
                            v-for="e in milestoneAssignees(m).slice(0, 4)"
                            :key="e.id || e.fullName"
                            :name="e.fullName || '?'"
                            size="xs"
                          />
                        </div>
                        <span v-if="milestoneAssignees(m).length > 4" class="text-caption">
                          +{{ milestoneAssignees(m).length - 4 }}
                        </span>
                      </div>

                      <div class="hidden w-40 flex-col gap-1 sm:flex">
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              class="h-full rounded-full bg-primary-500"
                              :style="{ width: mProgress(m) + '%' }"
                            />
                          </div>
                          <span class="text-caption w-8 text-right">{{ mProgress(m) }}%</span>
                        </div>
                        <!-- Plain "Selesai" note under the progress — every task is done -->
                        <span
                          v-if="isMilestoneDone(m)"
                          class="flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600"
                        >
                          <CheckCircleIcon class="h-3.5 w-3.5" />
                          Selesai
                        </span>
                      </div>
                      <ChevronUpIcon
                        v-if="isMilestoneOpen(m.id)"
                        class="h-4 w-4 shrink-0 text-slate-400"
                      />
                      <ChevronDownIcon v-else class="h-4 w-4 shrink-0 text-slate-400" />
                    </button>

                    <!-- Tasks -->
                    <div v-if="isMilestoneOpen(m.id)" class="space-y-2.5 px-4 pb-4">
                      <p v-if="m.description" class="text-xs text-slate-500">{{ m.description }}</p>

                      <!-- Milestone metrics -->
                      <MilestoneMetricPanel v-if="m.metric" :metric="m.metric" />

                      <div
                        v-for="t in m.tasks"
                        :key="t.id"
                        class="relative overflow-hidden rounded-xl border border-slate-100 bg-white/70 p-3"
                        :class="isTaskDone(t) ? 'border-emerald-200 bg-emerald-50/60' : ''"
                      >
                        <!-- "Selesai" watermark filling the card background when done -->
                        <span
                          v-if="isTaskDone(t)"
                          class="pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center text-4xl font-black uppercase tracking-[0.35em] text-emerald-500/10 sm:text-5xl"
                        >
                          Selesai
                        </span>

                        <!-- Content sits above the watermark; the card stays fully interactive -->
                        <div class="relative z-10">
                          <div class="flex items-start justify-between gap-2">
                            <p
                              class="flex items-center gap-1.5 text-sm font-semibold text-slate-800"
                            >
                              <LockClosedIcon
                                v-if="t.isLocked"
                                class="h-3.5 w-3.5 text-amber-500"
                              />
                              {{ t.title }}
                            </p>
                            <div class="flex shrink-0 items-center gap-1">
                              <button
                                v-if="canToggleTaskLock(t)"
                                type="button"
                                class="rounded-lg p-1 transition disabled:cursor-not-allowed disabled:opacity-40"
                                :class="
                                  t.isLocked
                                    ? 'text-amber-500 hover:bg-amber-100'
                                    : 'text-slate-400 hover:bg-slate-100 hover:text-amber-600'
                                "
                                :disabled="isTaskDone(t)"
                                :title="t.isLocked ? 'Buka kunci task' : 'Kunci task'"
                                @click.stop="requestTaskLock(t)"
                              >
                                <LockOpenIcon v-if="t.isLocked" class="h-4 w-4" />
                                <LockClosedIcon v-else class="h-4 w-4" />
                              </button>
                              <button
                                v-if="auth.can(PERM.ASSIGN_TASK)"
                                type="button"
                                class="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                                :disabled="isTaskDone(t)"
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
                            <BaseBadge
                              v-if="t.priority"
                              :color="priorityColor(t.priority)"
                              size="sm"
                            >
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

                          <!-- task metrics -->
                          <div
                            v-if="t.metric"
                            class="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3"
                          >
                            <span
                              v-if="t.metric.timeSpentSeconds"
                              class="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700"
                            >
                              <ClockIcon class="h-3.5 w-3.5" />
                              <span class="font-medium">Time Spent</span>
                              <span class="font-bold">{{
                                secondsToHm(t.metric.timeSpentSeconds)
                              }}</span>
                            </span>
                            <span
                              v-if="t.metric.cycleTime"
                              class="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-700"
                            >
                              <ArrowPathIcon class="h-3.5 w-3.5" />
                              <span class="font-medium">Cycle</span>
                              <span class="font-bold">{{
                                secondsToDuration(t.metric.cycleTime)
                              }}</span>
                            </span>
                            <span
                              v-if="t.metric.leadTime"
                              class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700"
                            >
                              <ArrowTrendingUpIcon class="h-3.5 w-3.5" />
                              <span class="font-medium">Lead</span>
                              <span class="font-bold">{{
                                secondsToDuration(t.metric.leadTime)
                              }}</span>
                            </span>
                            <span
                              v-if="t.metric.statusChanges != null"
                              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                            >
                              <ArrowsRightLeftIcon class="h-3.5 w-3.5" />
                              <span class="font-medium">Moves</span>
                              <span class="font-bold">{{ t.metric.statusChanges }}</span>
                            </span>
                            <span
                              v-if="t.metric.lastStatusChangeAt"
                              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                            >
                              <CalendarDaysIcon class="h-3.5 w-3.5" />
                              <span class="font-medium">Last Update</span>
                              <span class="font-bold">{{
                                formatDate(t.metric.lastStatusChangeAt)
                              }}</span>
                            </span>
                          </div>

                          <!-- task activity history -->
                          <div
                            v-if="t.activities?.length"
                            class="mt-3 border-t border-slate-100 pt-3"
                          >
                            <button
                              type="button"
                              class="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-700"
                              @click.stop="toggleActivity(t.id)"
                            >
                              <ArrowsRightLeftIcon class="h-3.5 w-3.5" />
                              Activity History ({{ t.activities.length }})
                              <ChevronUpIcon v-if="activityOpen[t.id]" class="h-3.5 w-3.5" />
                              <ChevronDownIcon v-else class="h-3.5 w-3.5" />
                            </button>

                            <ol v-if="activityOpen[t.id]" class="mt-2.5 space-y-3">
                              <li
                                v-for="a in taskActivities(t)"
                                :key="a.id"
                                class="relative flex gap-2.5 pl-1"
                              >
                                <span
                                  class="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-400 ring-2 ring-primary-100"
                                />
                                <div class="min-w-0 flex-1">
                                  <div class="flex flex-wrap items-center gap-1.5">
                                    <BaseBadge
                                      v-if="a.action"
                                      :color="activityActionColor(a.action)"
                                      size="sm"
                                    >
                                      {{ humanize(a.action) }}
                                    </BaseBadge>
                                    <span v-if="a.updatedAt" class="text-caption">
                                      {{
                                        formatDate(a.updatedAt, {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      }}
                                    </span>
                                  </div>
                                  <p class="mt-1 text-xs leading-relaxed text-slate-600">
                                    {{ a.description || 'Task updated' }}
                                  </p>
                                  <p v-if="activityActor(a)" class="text-caption mt-0.5">
                                    by {{ activityActor(a) }}
                                  </p>
                                </div>
                              </li>
                            </ol>
                          </div>

                          <!-- comments thread -->
                          <TaskComments :task="t" @saved="loadProject" />

                          <!-- attachments -->
                          <AttachmentUploader
                            :task-id="t.id"
                            :attachments="t.attachments"
                            @saved="loadProject"
                          />
                        </div>
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
                    class="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-slate-100 bg-white/70 px-3 py-2.5 text-sm"
                  >
                    <LockClosedIcon v-if="t.isLocked" class="h-4 w-4 shrink-0 text-amber-500" />
                    <ClipboardDocumentListIcon v-else class="h-4 w-4 shrink-0 text-slate-300" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-medium text-slate-700">{{ t.title }}</p>
                      <p class="text-caption truncate">{{ t._milestoneName }}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
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
                        v-if="canToggleTaskLock(t)"
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
                        v-if="auth.can(PERM.ASSIGN_TASK)"
                        type="button"
                        class="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
                        title="Assign employees"
                        @click="openAssign(t)"
                      >
                        <UserPlusIcon class="h-4 w-4" />
                      </button>
                    </div>
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
              <div v-else-if="activeTab === 'files'" class="space-y-6">
                <!-- Project files: upload + list -->
                <section>
                  <p class="text-subheading mb-2">Project Files</p>
                  <AttachmentUploader
                    :project-id="project.id"
                    :attachments="project.attachments"
                    :collapsible="false"
                    @saved="loadProject"
                  />
                </section>

                <!-- Task files (read-only; uploaded from each task card) -->
                <section v-if="taskAttachments.length">
                  <p class="text-subheading mb-2">Task Files</p>
                  <ul class="space-y-2">
                    <li
                      v-for="a in taskAttachments"
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
                </section>
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

            <!-- Total time from approved sheet activities -->
            <div
              class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
            >
              <span class="text-caption flex items-center gap-1.5">
                <ClockIcon class="h-3.5 w-3.5 text-sky-500" />
                Total Time
              </span>
              <span class="text-sm font-bold text-slate-800 tabular-nums">
                {{ secondsToHm(sheetTotalSeconds) }}
              </span>
            </div>

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

    <ProjectStatusUpdateModal
      v-model="statusModalOpen"
      :project="project"
      @updated="onStatusUpdated"
    />

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
