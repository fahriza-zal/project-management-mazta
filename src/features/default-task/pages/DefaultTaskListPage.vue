<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDefaultTaskStore } from '@/features/default-task/stores/defaultTask'
import { useToast } from '@/shared/composables/useToast'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseTable from '@/shared/components/base/BaseTable.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BasePagination from '@/shared/components/base/BasePagination.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import ConfirmDialog from '@/shared/components/base/ConfirmDialog.vue'
import DefaultTaskFormModal from '@/features/default-task/components/DefaultTaskFormModal.vue'

const PAGE_SIZE = 10
const DEBOUNCE_MS = 300

const store = useDefaultTaskStore()
const { items, pagination, loading } = storeToRefs(store)
const { success, error: toastError } = useToast()

const search = ref('')
const page = ref(1)
let searchTimer = null

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'units', label: 'Units' },
]

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
    success('Default task deleted')
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
        <h1 class="text-heading">Default Task</h1>
        <p class="text-body mt-1">{{ pagination.count }} default task(s)</p>
      </div>
      <BaseButton variant="primary" @click="openCreate">
        <PlusIcon class="h-4 w-4" />
        Create Default Task
      </BaseButton>
    </div>

    <!-- Toolbar -->
    <BaseCard :padded="false">
      <div class="p-4">
        <div class="w-full sm:max-w-xs">
          <BaseInput v-model="search" placeholder="Search by title…" @update:model-value="onSearch">
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
        :icon="ClipboardDocumentListIcon"
        title="No default tasks found"
        description="Create a default task and assign the units it applies to."
      >
        <template #action>
          <BaseButton variant="primary" @click="openCreate">
            <PlusIcon class="h-4 w-4" /> Create Default Task
          </BaseButton>
        </template>
      </BaseEmpty>

      <BaseTable v-else :columns="columns" :rows="items" :hoverable="false">
        <template #cell-title="{ row }">
          <span class="font-medium text-slate-800">{{ row.title }}</span>
        </template>
        <template #cell-units="{ row }">
          <div class="flex flex-wrap gap-1.5">
            <BaseBadge v-for="u in row.units" :key="u.id" color="primary" size="sm">
              {{ u.name }}
            </BaseBadge>
            <span v-if="!row.units?.length" class="text-xs text-slate-400">—</span>
          </div>
        </template>
        <template #row-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
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
    <DefaultTaskFormModal v-model="modalOpen" :task-id="editingId" @saved="onSaved" />

    <!-- Delete confirm -->
    <ConfirmDialog
      v-model="confirmOpen"
      title="Delete default task?"
      :message="`This will remove “${target?.title}”. This action cannot be undone.`"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
