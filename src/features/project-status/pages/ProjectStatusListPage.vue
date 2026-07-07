<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStatusStore } from '@/features/project-status/stores/projectStatus'
import { useToast } from '@/shared/composables/useToast'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  FlagIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
} from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseTable from '@/shared/components/base/BaseTable.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BasePagination from '@/shared/components/base/BasePagination.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import ConfirmDialog from '@/shared/components/base/ConfirmDialog.vue'
import ProjectStatusFormModal from '@/features/project-status/components/ProjectStatusFormModal.vue'
import ProjectStatusTransitionModal from '@/features/project-status/components/ProjectStatusTransitionModal.vue'

const PAGE_SIZE = 10
const DEBOUNCE_MS = 300

const store = useProjectStatusStore()
const { items, pagination, loading } = storeToRefs(store)
const { success, error: toastError } = useToast()

const search = ref('')
const page = ref(1)
let searchTimer = null

const columns = [
  { key: 'ordering', label: 'Order', width: '80px' },
  { key: 'name', label: 'Name' },
  { key: 'flags', label: 'Flags' },
  { key: 'transitions', label: 'Bisa pindah ke' },
  { key: 'units', label: 'Units' },
]

/** Outgoing transitions for a status row. */
function activeTransitions(row) {
  return row.transitionTo ?? []
}

function load() {
  return store
    .fetchList({ page: page.value, pageSize: PAGE_SIZE, search: search.value.trim() || null })
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

// Create / edit modal
const modalOpen = ref(false)
const editingId = ref(null)

function openCreate() {
  editingId.value = null
  modalOpen.value = true
}

function openEdit(row) {
  editingId.value = row.id
  modalOpen.value = true
}

function onSaved() {
  load()
}

// Transition manager (live-apply, per status)
const transitionOpen = ref(false)
const transitionStatus = ref(null)

function openTransitions(row) {
  transitionStatus.value = { id: row.id, name: row.name }
  transitionOpen.value = true
}

function onTransitionToggle(open) {
  transitionOpen.value = open
  if (!open) load() // refresh so the "Bisa pindah ke" badges reflect edits
}

// Delete
const confirmOpen = ref(false)
const deleting = ref(false)
const target = ref(null)

function askDelete(row) {
  target.value = row
  confirmOpen.value = true
}

async function confirmDelete() {
  deleting.value = true
  try {
    await store.remove(target.value.id)
    success('Project status deleted')
    confirmOpen.value = false
    // Step back a page if we just removed the last row on this page.
    if (items.value.length === 1 && page.value > 1) page.value -= 1
    load()
  } catch (err) {
    toastError(err.message)
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-heading">Project Status</h1>
        <p class="text-body mt-1">{{ pagination.count }} project status(es)</p>
      </div>
      <BaseButton variant="primary" @click="openCreate">
        <PlusIcon class="h-4 w-4" />
        Create Project Status
      </BaseButton>
    </div>

    <!-- Toolbar -->
    <BaseCard :padded="false">
      <div class="p-4">
        <div class="w-full sm:max-w-xs">
          <BaseInput v-model="search" placeholder="Search by name…" @update:model-value="onSearch">
            <template #prefix><MagnifyingGlassIcon class="h-4 w-4" /></template>
          </BaseInput>
        </div>
      </div>
    </BaseCard>

    <!-- Content -->
    <BaseCard :padded="false">
      <div v-if="loading" class="px-4 py-12 text-center text-sm text-slate-400">Loading…</div>

      <BaseEmpty
        v-else-if="!items.length"
        :icon="FlagIcon"
        title="No project statuses found"
        description="Create a project status to define the stages a project can move through."
      >
        <template #action>
          <BaseButton variant="primary" @click="openCreate">
            <PlusIcon class="h-4 w-4" /> Create Project Status
          </BaseButton>
        </template>
      </BaseEmpty>

      <BaseTable v-else :columns="columns" :rows="items" :hoverable="false">
        <template #cell-ordering="{ row }">
          <span class="text-slate-500">{{ row.ordering }}</span>
        </template>
        <template #cell-name="{ row }">
          <span class="font-medium text-slate-800">{{ row.name }}</span>
        </template>
        <template #cell-flags="{ row }">
          <div class="flex flex-wrap gap-1.5">
            <BaseBadge v-if="row.isDefault" color="primary" size="sm" dot>Default</BaseBadge>
            <BaseBadge v-if="row.isClosed" color="success" size="sm" dot>Closed</BaseBadge>
            <span v-if="!row.isDefault && !row.isClosed" class="text-xs text-slate-400">—</span>
          </div>
        </template>
        <template #cell-transitions="{ row }">
          <div class="flex flex-wrap gap-1.5">
            <BaseBadge
              v-for="t in activeTransitions(row)"
              :key="t.id"
              :color="t.requireApproval ? 'warning' : 'info'"
              size="sm"
              :title="t.requireApproval ? 'Butuh approval' : 'Tanpa approval'"
            >
              <LockClosedIcon v-if="t.requireApproval" class="h-3 w-3" />
              {{ t.toStatus?.name }}
            </BaseBadge>
            <span v-if="!activeTransitions(row).length" class="text-xs text-slate-400">—</span>
          </div>
        </template>
        <template #cell-units="{ row }">
          <div class="flex flex-wrap gap-1.5">
            <BaseBadge v-for="u in row.units" :key="u.id" color="info" size="sm">
              {{ u.name }}
            </BaseBadge>
            <span v-if="!row.units?.length" class="text-xs text-slate-400">—</span>
          </div>
        </template>
        <template #row-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <button
              class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
              title="Kelola transisi"
              @click="openTransitions(row)"
            >
              <ArrowsRightLeftIcon class="h-4 w-4" />
            </button>
            <button
              class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
              title="Edit"
              @click="openEdit(row)"
            >
              <PencilSquareIcon class="h-4 w-4" />
            </button>
            <button
              class="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-danger"
              title="Delete"
              @click="askDelete(row)"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </BaseTable>
    </BaseCard>

    <!-- Pagination -->
    <BasePagination
      v-if="pagination.count > PAGE_SIZE"
      :model-value="page"
      :total="pagination.count"
      :page-size="PAGE_SIZE"
      @update:model-value="onPageChange"
    />

    <!-- Create / Edit -->
    <ProjectStatusFormModal v-model="modalOpen" :status-id="editingId" @saved="onSaved" />

    <!-- Manage transitions (live). Reload on close so the list badges reflect changes. -->
    <ProjectStatusTransitionModal
      :model-value="transitionOpen"
      :status="transitionStatus"
      @update:model-value="onTransitionToggle"
    />

    <!-- Delete confirm -->
    <ConfirmDialog
      v-model="confirmOpen"
      title="Delete project status?"
      :message="`This will remove “${target?.name}”. This action cannot be undone.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
