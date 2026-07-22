<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/features/projects/stores/project'
import { useAuthStore } from '@/features/auth/stores/auth'
import { PERM } from '@/features/projects/permissions'
import { useToast } from '@/shared/composables/useToast'
import { formatDate } from '@/shared/utils/format'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TableCellsIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  PencilSquareIcon,
  TrashIcon,
  FolderPlusIcon,
  LockClosedIcon,
  LockOpenIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseTable from '@/shared/components/base/BaseTable.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import BasePagination from '@/shared/components/base/BasePagination.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import ConfirmDialog from '@/shared/components/base/ConfirmDialog.vue'

const PAGE_SIZE = 12
const DEBOUNCE_MS = 300

const router = useRouter()
const store = useProjectStore()
const auth = useAuthStore()
const { items, pagination, loading } = storeToRefs(store)
const { success, error: toastError } = useToast()

/** Unit ids of the signed-in employee (from `pm_profile` → employee.units). */
const myUnitIds = computed(() =>
  (auth.employee?.units ?? []).map((u) => Number(u.id)).filter(Boolean),
)

const search = ref('')
// Default ke card di layar mobile (< breakpoint `sm` Tailwind = 640px), table di desktop.
const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
const view = ref(isMobile ? 'card' : 'table') // table | card
const page = ref(1)
let searchTimer = null

const categoryOptions = ref([])
const modeOptions = ref([])

/** "IN_HOUSE" → "In House" for readable enum labels. */
function humanize(name) {
  return name
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** value → label lookup for a set of enum options (case-insensitive; API sends lowercase). */
function labelFor(options, value) {
  if (!value) return '—'
  const v = String(value).toLowerCase()
  return options.find((o) => String(o.value).toLowerCase() === v)?.label ?? humanize(value)
}

/** Badge color per project status (from the latest activity). */
const STATUS_COLORS = {
  DRAFT: 'slate',
  ACTIVE: 'info',
  IN_PROGRESS: 'info',
  ON_HOLD: 'warning',
  PENDING: 'warning',
  COMPLETED: 'success',
  DONE: 'success',
  CLOSED: 'success',
  CANCELLED: 'danger',
  REJECTED: 'danger',
}

/** Current project status = the status of its most recent activity. */
function projectStatus(project) {
  const activities = project.activities ?? []
  return activities.length ? activities[activities.length - 1].status : null
}

function statusColor(status) {
  return STATUS_COLORS[String(status).toUpperCase()] ?? 'slate'
}

const columns = [
  { key: 'name', label: 'Project' },
  { key: 'category', label: 'Category', width: '116px' },
  { key: 'mode', label: 'Mode', width: '104px' },
  { key: 'progress', label: 'Progress', width: '150px' },
  { key: 'health', label: 'Health', width: '72px' },
  { key: 'units', label: 'Units', width: '184px' },
  { key: 'expectedEndDate', label: 'Expected End', width: '116px' },
]

function unitNames(project) {
  return (project.projectUnits ?? []).map((pu) => pu.unit?.name).filter(Boolean)
}

// ── Metric helpers (from the project's computed `metric` block) ───────────────
const round = (v) => Math.round(Number(v) || 0)
const progressOf = (project) => round(project.metric?.progress)
const healthOf = (project) => round(project.metric?.healthScore)
const overdueOf = (project) => Number(project.metric?.overdueTasks) || 0

/** Score 0–100 → BaseBadge color (`invert` for risk, where high is bad). */
function scoreColor(value, invert = false) {
  const v = Number(value) || 0
  if (invert ? v < 34 : v >= 67) return 'success'
  if (invert ? v >= 67 : v < 34) return 'danger'
  return 'warning'
}

function load() {
  return store
    .fetchProjects({
      page: page.value,
      pageSize: PAGE_SIZE,
      search: search.value.trim() || null,
      unitIds: myUnitIds.value,
    })
    .catch((err) => toastError(err.message))
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, DEBOUNCE_MS)
}

function onPageChange(p) {
  page.value = p
  load()
}

function openDetail(id) {
  router.push({ name: 'project-detail', params: { id } })
}

// ── Delete project ───────────────────────────────────────────────────────────
const deleteState = ref({ open: false, project: null, loading: false })

const deleteMessage = computed(() =>
  deleteState.value.project
    ? `“${deleteState.value.project.name}” and all its milestones and tasks will be permanently deleted. This action cannot be undone.`
    : '',
)

function requestDelete(project) {
  deleteState.value = { open: true, project, loading: false }
}

// ── Lock / unlock project (with confirmation) ────────────────────────────────
// Locking a project cascades to its tasks on the backend, so reload afterwards.
const lockState = ref({ open: false, project: null, loading: false })

const lockMessage = computed(() => {
  const p = lockState.value.project
  if (!p) return ''
  return p.isLocked
    ? `Membuka kunci “${p.name}” juga akan membuka kunci semua task di dalamnya.`
    : `Mengunci “${p.name}” juga akan mengunci semua task di dalamnya.`
})

function requestLock(project) {
  lockState.value = { open: true, project, loading: false }
}

/** Whether the current user may toggle this project's lock (unlock vs lock op). */
function canToggleLock(project) {
  return project.isLocked ? auth.can(PERM.UNLOCK) : auth.can(PERM.LOCK)
}

async function confirmLock() {
  const p = lockState.value.project
  if (!p) {
    lockState.value.open = false
    return
  }
  lockState.value.loading = true
  try {
    if (p.isLocked) {
      await store.unlockProject(p.id)
      success(`“${p.name}” dibuka kuncinya.`)
    } else {
      await store.lockProject(p.id)
      success(`“${p.name}” dikunci — semua task-nya ikut terkunci.`)
    }
    await load()
    lockState.value.open = false
  } catch (err) {
    toastError(err.message)
  } finally {
    lockState.value.loading = false
  }
}

async function confirmDelete() {
  const project = deleteState.value.project
  if (!project) {
    deleteState.value.open = false
    return
  }
  deleteState.value.loading = true
  try {
    await store.deleteProject(project.id)
    // Step back a page if the last row on this page was removed.
    if (items.value.length === 1 && page.value > 1) page.value -= 1
    await load()
    success('Project deleted.')
    deleteState.value.open = false
  } catch (err) {
    toastError(err.message)
  } finally {
    deleteState.value.loading = false
  }
}

async function loadEnum(typeName, target) {
  try {
    const names = await store.fetchEnumValues(typeName)
    target.value = names.map((name) => ({ value: name, label: humanize(name) }))
  } catch {
    target.value = []
  }
}

onMounted(() => {
  auth.hydrate() // ensure employee.units is available for the unit filter
  load()
  loadEnum('ProjectCategoryChoices', categoryOptions)
  loadEnum('ProjectModeChoices', modeOptions)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-heading">Projects</h1>
        <p class="text-body mt-1">{{ pagination.count }} project(s) found</p>
      </div>
      <RouterLink v-if="auth.can(PERM.CREATE)" :to="{ name: 'project-create' }">
        <BaseButton variant="primary">
          <PlusIcon class="h-4 w-4" />
          Create Project
        </BaseButton>
      </RouterLink>
    </div>

    <!-- Toolbar -->
    <BaseCard :padded="false">
      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div class="w-full sm:max-w-xs">
          <BaseInput v-model="search" placeholder="Search projects…" @update:model-value="onSearch">
            <template #prefix><MagnifyingGlassIcon class="h-4 w-4" /></template>
          </BaseInput>
        </div>

        <div class="flex items-center gap-1 rounded-xl border border-slate-200 p-1 sm:ml-auto">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg"
            :class="
              view === 'table'
                ? 'bg-primary-50 text-primary-600'
                : 'text-slate-400 hover:bg-slate-100'
            "
            title="Table view"
            @click="view = 'table'"
          >
            <TableCellsIcon class="h-5 w-5" />
          </button>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg"
            :class="
              view === 'card'
                ? 'bg-primary-50 text-primary-600'
                : 'text-slate-400 hover:bg-slate-100'
            "
            title="Card view"
            @click="view = 'card'"
          >
            <Squares2X2Icon class="h-5 w-5" />
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Loading -->
    <BaseCard v-if="loading">
      <p class="py-12 text-center text-sm text-slate-400">Loading…</p>
    </BaseCard>

    <!-- Empty -->
    <BaseCard v-else-if="!items.length">
      <BaseEmpty
        :icon="FolderPlusIcon"
        title="No projects found"
        description="Try adjusting your search, or create a new project to get started."
      >
        <template #action>
          <RouterLink v-if="auth.can(PERM.CREATE)" :to="{ name: 'project-create' }">
            <BaseButton variant="primary"><PlusIcon class="h-4 w-4" /> Create Project</BaseButton>
          </RouterLink>
        </template>
      </BaseEmpty>
    </BaseCard>

    <!-- Table view -->
    <BaseCard v-else-if="view === 'table'" :padded="false">
      <BaseTable
        :columns="columns"
        :rows="items"
        fixed
        mobile-min-width="1080px"
        actions-width="124px"
        @row-click="openDetail($event.id)"
      >
        <template #cell-name="{ row }">
          <span class="font-mono text-[11px] text-slate-400">{{ row.fullCode || row.prefix }}</span>
          <div class="flex items-start gap-1.5">
            <LockClosedIcon
              v-if="row.isLocked"
              class="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
              title="Terkunci"
            />
            <p class="font-medium text-slate-800">{{ row.name }}</p>
          </div>
          <p v-if="row.description" class="line-clamp-1 text-xs text-slate-400">
            {{ row.description }}
          </p>
        </template>
        <template #cell-category="{ row }">
          <span class="block truncate">{{ labelFor(categoryOptions, row.projectCategory) }}</span>
        </template>
        <template #cell-mode="{ row }">
          <span class="block truncate">{{ labelFor(modeOptions, row.projectMode) }}</span>
        </template>
        <template #cell-progress="{ row }">
          <div v-if="row.metric" class="w-full">
            <div class="flex items-center gap-2">
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  class="bg-brand h-full rounded-full transition-all"
                  :style="{ width: progressOf(row) + '%' }"
                />
              </div>
              <span class="w-9 text-right text-xs font-semibold text-slate-600">
                {{ progressOf(row) }}%
              </span>
            </div>
            <p
              v-if="overdueOf(row) > 0"
              class="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger"
            >
              <ExclamationTriangleIcon class="h-3 w-3 shrink-0" />
              {{ overdueOf(row) }} overdue
            </p>
          </div>
          <span v-else class="text-xs text-slate-400">—</span>
        </template>
        <template #cell-health="{ row }">
          <BaseBadge v-if="row.metric" :color="scoreColor(healthOf(row))" size="sm">
            {{ healthOf(row) }}
          </BaseBadge>
          <span v-else class="text-xs text-slate-400">—</span>
        </template>
        <template #cell-units="{ row }">
          <div class="flex flex-wrap gap-1">
            <span
              v-for="name in unitNames(row)"
              :key="name"
              class="rounded-sm bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium leading-tight text-blue-600"
            >
              {{ name }}
            </span>
            <span v-if="!unitNames(row).length" class="text-xs text-slate-400">—</span>
          </div>
        </template>
        <template #cell-expectedEndDate="{ row }">{{ formatDate(row.expectedEndDate) }}</template>
        <template #row-actions="{ row }">
          <div class="flex justify-end">
            <BaseButton
              v-if="canToggleLock(row)"
              variant="ghost"
              size="sm"
              :title="row.isLocked ? 'Buka kunci project' : 'Kunci project'"
              @click="requestLock(row)"
            >
              <LockOpenIcon v-if="row.isLocked" class="h-4 w-4 text-amber-500" />
              <LockClosedIcon v-else class="h-4 w-4" />
            </BaseButton>
            <RouterLink
              v-if="auth.can(PERM.EDIT)"
              :to="{ name: 'project-edit', params: { id: row.id } }"
              title="Edit project"
            >
              <BaseButton variant="ghost" size="sm">
                <PencilSquareIcon class="h-4 w-4" />
              </BaseButton>
            </RouterLink>
            <BaseButton
              v-if="auth.can(PERM.DELETE)"
              variant="ghost"
              size="sm"
              title="Delete project"
              @click="requestDelete(row)"
            >
              <TrashIcon class="h-4 w-4 text-danger" />
            </BaseButton>
          </div>
        </template>
      </BaseTable>
    </BaseCard>

    <!-- Card view -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="project in items"
        :key="project.id"
        role="button"
        tabindex="0"
        class="surface group flex cursor-pointer flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        @click="openDetail(project.id)"
        @keydown.enter="openDetail(project.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-mono text-xs text-slate-500">{{ project.fullCode || project.prefix }}</p>
            <h3
              class="flex items-center gap-1.5 truncate text-base font-semibold text-slate-900 group-hover:text-primary-700"
            >
              <LockClosedIcon
                v-if="project.isLocked"
                class="h-4 w-4 shrink-0 text-amber-500"
                title="Terkunci"
              />
              {{ project.name }}
            </h3>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button
              v-if="canToggleLock(project)"
              type="button"
              :title="project.isLocked ? 'Buka kunci project' : 'Kunci project'"
              class="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100"
              :class="
                project.isLocked
                  ? 'text-amber-500'
                  : 'text-slate-400 opacity-0 hover:text-amber-600 group-hover:opacity-100'
              "
              @click.prevent.stop="requestLock(project)"
            >
              <LockOpenIcon v-if="project.isLocked" class="h-4 w-4" />
              <LockClosedIcon v-else class="h-4 w-4" />
            </button>
            <button
              v-if="auth.can(PERM.EDIT)"
              type="button"
              title="Edit project"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-primary-600 group-hover:opacity-100"
              @click.prevent.stop="
                router.push({ name: 'project-edit', params: { id: project.id } })
              "
            >
              <PencilSquareIcon class="h-4 w-4" />
            </button>
            <button
              v-if="auth.can(PERM.DELETE)"
              type="button"
              title="Delete project"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-danger group-hover:opacity-100"
              @click.prevent.stop="requestDelete(project)"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Status · Category · Mode -->
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          <BaseBadge
            v-if="projectStatus(project)"
            :color="statusColor(projectStatus(project))"
            size="sm"
            dot
          >
            {{ humanize(projectStatus(project)) }}
          </BaseBadge>
          <BaseBadge color="primary" size="sm">
            {{ labelFor(categoryOptions, project.projectCategory) }}
          </BaseBadge>
          <BaseBadge color="slate" size="sm">
            {{ labelFor(modeOptions, project.projectMode) }}
          </BaseBadge>
        </div>

        <p class="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
          {{ project.description || 'No description.' }}
        </p>

        <!-- Metric summary -->
        <div v-if="project.metric" class="mt-3">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-slate-500">Progress</span>
            <span class="font-semibold text-slate-700">{{ progressOf(project) }}%</span>
          </div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              class="bg-brand h-full rounded-full"
              :style="{ width: progressOf(project) + '%' }"
            />
          </div>
          <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
            <BaseBadge :color="scoreColor(healthOf(project))" size="sm">
              Health {{ healthOf(project) }}
            </BaseBadge>
            <BaseBadge v-if="overdueOf(project) > 0" color="danger" size="sm">
              {{ overdueOf(project) }} overdue
            </BaseBadge>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <!-- Units involved — initials in circles -->
          <div v-if="unitNames(project).length" class="flex -space-x-2">
            <BaseAvatar
              v-for="name in unitNames(project).slice(0, 4)"
              :key="name"
              :name="name"
              size="sm"
            />
            <span
              v-if="unitNames(project).length > 4"
              class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-2 ring-white"
            >
              +{{ unitNames(project).length - 4 }}
            </span>
          </div>
          <span v-else class="text-xs text-slate-400">No units</span>

          <div class="flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarDaysIcon class="h-4 w-4" />
            <span>{{ formatDate(project.expectedEndDate) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <BasePagination
      v-if="pagination.count > PAGE_SIZE"
      :model-value="page"
      :total="pagination.count"
      :page-size="PAGE_SIZE"
      @update:model-value="onPageChange"
    />

    <ConfirmDialog
      v-model="deleteState.open"
      title="Delete project?"
      :message="deleteMessage"
      confirm-text="Delete"
      :loading="deleteState.loading"
      @confirm="confirmDelete"
    />

    <ConfirmDialog
      v-model="lockState.open"
      :title="lockState.project?.isLocked ? 'Buka kunci project?' : 'Kunci project?'"
      :message="lockMessage"
      :confirm-text="lockState.project?.isLocked ? 'Buka kunci' : 'Kunci'"
      :loading="lockState.loading"
      @confirm="confirmLock"
    />
  </div>
</template>
