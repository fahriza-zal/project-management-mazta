<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/features/projects/stores/project'
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
const { items, pagination, loading } = storeToRefs(store)
const { success, error: toastError } = useToast()

const search = ref('')
const view = ref('table') // table | card
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
  { key: 'fullCode', label: 'Code', width: '130px' },
  { key: 'name', label: 'Project' },
  { key: 'category', label: 'Category' },
  { key: 'mode', label: 'Mode' },
  { key: 'units', label: 'Units' },
  { key: 'expectedEndDate', label: 'Expected End' },
]

function unitNames(project) {
  return (project.projectUnits ?? []).map((pu) => pu.unit?.name).filter(Boolean)
}

function load() {
  return store
    .fetchProjects({ page: page.value, pageSize: PAGE_SIZE, search: search.value.trim() || null })
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
      <RouterLink :to="{ name: 'project-create' }">
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
          <RouterLink :to="{ name: 'project-create' }">
            <BaseButton variant="primary"><PlusIcon class="h-4 w-4" /> Create Project</BaseButton>
          </RouterLink>
        </template>
      </BaseEmpty>
    </BaseCard>

    <!-- Table view -->
    <BaseCard v-else-if="view === 'table'" :padded="false">
      <BaseTable :columns="columns" :rows="items" @row-click="openDetail($event.id)">
        <template #cell-fullCode="{ row }">
          <span class="font-mono text-xs text-slate-500">{{ row.fullCode || row.prefix }}</span>
        </template>
        <template #cell-name="{ row }">
          <div class="flex items-center gap-1.5">
            <LockClosedIcon
              v-if="row.isLocked"
              class="h-3.5 w-3.5 shrink-0 text-amber-500"
              title="Terkunci"
            />
            <p class="font-medium text-slate-800">{{ row.name }}</p>
          </div>
          <p v-if="row.description" class="line-clamp-1 text-xs text-slate-400">
            {{ row.description }}
          </p>
        </template>
        <template #cell-category="{ row }">
          {{ labelFor(categoryOptions, row.projectCategory) }}
        </template>
        <template #cell-mode="{ row }">
          {{ labelFor(modeOptions, row.projectMode) }}
        </template>
        <template #cell-units="{ row }">
          <div class="flex flex-wrap gap-1">
            <BaseBadge v-for="name in unitNames(row)" :key="name" color="info" size="sm">
              {{ name }}
            </BaseBadge>
            <span v-if="!unitNames(row).length" class="text-xs text-slate-400">—</span>
          </div>
        </template>
        <template #cell-expectedEndDate="{ row }">{{ formatDate(row.expectedEndDate) }}</template>
        <template #row-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <BaseButton
              variant="ghost"
              size="sm"
              :title="row.isLocked ? 'Buka kunci project' : 'Kunci project'"
              @click="requestLock(row)"
            >
              <LockOpenIcon v-if="row.isLocked" class="h-4 w-4 text-amber-500" />
              <LockClosedIcon v-else class="h-4 w-4" />
            </BaseButton>
            <RouterLink :to="{ name: 'project-edit', params: { id: row.id } }" title="Edit project">
              <BaseButton variant="ghost" size="sm">
                <PencilSquareIcon class="h-4 w-4" />
              </BaseButton>
            </RouterLink>
            <BaseButton
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
