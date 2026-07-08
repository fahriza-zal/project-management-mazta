<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTimesheetStore } from '@/features/timesheet/stores/timesheet'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useToast } from '@/shared/composables/useToast'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  FolderIcon,
} from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BasePagination from '@/shared/components/base/BasePagination.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import TimesheetCreateModal from '@/features/timesheet/components/TimesheetCreateModal.vue'

const PAGE_SIZE = 9
const DEBOUNCE_MS = 300

const store = useTimesheetStore()
const auth = useAuthStore()
const { items, pagination, loading } = storeToRefs(store)
const { success, error: toastError } = useToast()

auth.hydrate()
const employeeName = computed(() => auth.employee?.fullName || '')

const search = ref('')
const page = ref(1)
let searchTimer = null

/* -------------------------------------------------------------------------- */
/* Status helpers — the list has no top-level status, so the current state is  */
/* derived from the latest activity. Classification is heuristic (exact enum   */
/* values aren't known) but the backend remains the source of truth on action. */
/* -------------------------------------------------------------------------- */

/** "IN_HOUSE" / "in_house" → "In House". */
function humanize(name) {
  if (!name) return ''
  return String(name)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Current status: prefer the sheet's top-level status, fall back to the latest activity. */
function currentStatus(row) {
  if (row.status) return row.status
  const acts = row.activities ?? []
  return acts.length ? acts[acts.length - 1].status : null
}

/** Seconds → "HH:MM:SS". */
function formatDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** ISO datetime → compact local label (e.g. "08 Jul 14:30"). */
function formatDateTime(v) {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Bucket a raw status string into one of: new | running | hold | closed. */
function classify(status) {
  const u = String(status || '').toUpperCase()
  if (!u) return 'new'
  if (/CLOSE|DONE|COMPLETE|FINISH|SELESAI|TUTUP/.test(u)) return 'closed'
  if (/HOLD|PAUSE|TAHAN|PENDING/.test(u)) return 'hold'
  if (/START|PROGRESS|RUN|ACTIVE|ONGOING|OPEN|JALAN|MULAI/.test(u)) return 'running'
  return 'new'
}

const STATE_META = {
  new: { label: 'Not started', color: 'slate' },
  running: { label: 'Running', color: 'success' },
  hold: { label: 'On hold', color: 'warning' },
  closed: { label: 'Closed', color: 'info' },
}

// Optimistic per-row state override (id → new|running|hold|closed). Set the
// instant a lifecycle action succeeds so buttons/badges flip without waiting for
// the refetch — and independent of the status-enum heuristic. It keeps winning
// after refetch, reflecting the last action the user actually performed.
const stateOverride = ref({})

function stateOf(row) {
  return stateOverride.value[row.id] ?? classify(currentStatus(row))
}
function stateMeta(row) {
  return STATE_META[stateOf(row)] ?? STATE_META.new
}
/** Human label for the current status badge (fallback to the raw status name). */
function statusLabel(row) {
  if (stateOverride.value[row.id]) return stateMeta(row).label
  const raw = currentStatus(row)
  return raw ? humanize(raw) : STATE_META.new.label
}

// Running can be held or closed; every other non-new state (hold, closed) can be
// (re)started or closed; a brand-new sheet can only be started.
const canStart = (row) => stateOf(row) !== 'running'
const canHold = (row) => stateOf(row) === 'running'
const canClose = (row) => stateOf(row) !== 'new'

/** PROJECT timesheets carry a project; COMMON (default-task) ones don't. */
function typeLabel(row) {
  return row.project ? 'Project' : 'Common'
}

/* --- Summary tiles --- */
const summary = computed(() => {
  const acc = { total: items.value.length, running: 0, hold: 0, closed: 0 }
  for (const row of items.value) {
    const s = stateOf(row)
    if (s === 'running') acc.running += 1
    else if (s === 'hold') acc.hold += 1
    else if (s === 'closed') acc.closed += 1
  }
  return acc
})

/* --- Data loading --- */
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

/* --- Create --- */
const modalOpen = ref(false)
function openCreate() {
  modalOpen.value = true
}
function onCreated() {
  page.value = 1
  load()
}

/* --- Lifecycle action (start / hold / close) with an optional note --- */
const ACTION_META = {
  start: {
    title: 'Mulai timesheet',
    verb: 'Mulai',
    method: 'startSheet',
    done: 'Timesheet dimulai.',
    state: 'running',
  },
  hold: {
    title: 'Tahan timesheet',
    verb: 'Tahan',
    method: 'holdSheet',
    done: 'Timesheet ditahan.',
    state: 'hold',
  },
  close: {
    title: 'Tutup timesheet',
    verb: 'Tutup',
    method: 'closeSheet',
    done: 'Timesheet ditutup.',
    state: 'closed',
  },
}

const actionOpen = ref(false)
const actionSaving = ref(false)
const actionNote = ref('')
const actionType = ref('start')
const actionRow = ref(null)

const actionMeta = computed(() => ACTION_META[actionType.value])

function openAction(row, type) {
  actionRow.value = row
  actionType.value = type
  actionNote.value = ''
  actionOpen.value = true
}

async function confirmAction() {
  actionSaving.value = true
  try {
    const { method, done, state } = actionMeta.value
    const id = actionRow.value.id
    const note = actionNote.value.trim() || null
    const result = await store[method](id, note)
    // Update the card in place (no refetch): force the target state and append the
    // new activity so buttons flip and the timeline shows the entry instantly.
    // Apollo freezes query results, so replace the row with a clone instead of
    // mutating it.
    stateOverride.value = { ...stateOverride.value, [id]: state }
    const idx = items.value.findIndex((r) => r.id === id)
    if (idx !== -1) {
      const row = items.value[idx]
      const next = items.value.slice()
      next[idx] = {
        ...row,
        activities: [
          ...(row.activities ?? []),
          { id: `local-${Date.now()}`, status: result?.status ?? state, description: note },
        ],
      }
      items.value = next
    }
    success(done)
    actionOpen.value = false
    // Reconcile duration/timestamps/status from the server, silently (the action
    // already succeeded — don't surface a list-refetch error over it).
    store
      .fetchList({ page: page.value, pageSize: PAGE_SIZE, search: search.value.trim() || null })
      .catch(() => {})
  } catch (err) {
    toastError(err.message)
  } finally {
    actionSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-heading">Timesheet</h1>
        <p class="text-body mt-1">
          <span v-if="employeeName"
            >Timesheet milik <strong>{{ employeeName }}</strong> ·
          </span>
          {{ pagination.count }} entri
        </p>
      </div>
      <BaseButton variant="primary" @click="openCreate">
        <PlusIcon class="h-4 w-4" />
        Buat Timesheet
      </BaseButton>
    </div>

    <!-- Summary tiles -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <BaseCard>
        <p class="text-caption">Total (halaman)</p>
        <p class="mt-1 text-2xl font-bold text-slate-800">{{ summary.total }}</p>
      </BaseCard>
      <BaseCard>
        <p class="text-caption">Running</p>
        <p class="mt-1 text-2xl font-bold text-success">{{ summary.running }}</p>
      </BaseCard>
      <BaseCard>
        <p class="text-caption">On hold</p>
        <p class="mt-1 text-2xl font-bold text-warning">{{ summary.hold }}</p>
      </BaseCard>
      <BaseCard>
        <p class="text-caption">Closed</p>
        <p class="mt-1 text-2xl font-bold text-slate-500">{{ summary.closed }}</p>
      </BaseCard>
    </div>

    <!-- Toolbar -->
    <div class="w-full sm:max-w-xs">
      <BaseInput v-model="search" placeholder="Cari timesheet…" @update:model-value="onSearch">
        <template #prefix><MagnifyingGlassIcon class="h-4 w-4" /></template>
      </BaseInput>
    </div>

    <!-- Content -->
    <div v-if="loading" class="surface px-4 py-16 text-center text-sm text-slate-400">Loading…</div>

    <BaseEmpty
      v-else-if="!items.length"
      :icon="ClockIcon"
      title="Belum ada timesheet"
      description="Buat timesheet untuk mulai mencatat pekerjaan Anda pada sebuah task."
    >
      <template #action>
        <BaseButton variant="primary" @click="openCreate">
          <PlusIcon class="h-4 w-4" /> Buat Timesheet
        </BaseButton>
      </template>
    </BaseEmpty>

    <!-- Cards -->
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <BaseCard v-for="row in items" :key="row.id" class="flex flex-col" hoverable>
        <div class="flex h-full flex-col">
          <!-- Top: type + status -->
          <div class="flex items-center justify-between gap-2">
            <BaseBadge :color="row.project ? 'primary' : 'slate'" size="sm">
              {{ typeLabel(row) }}
            </BaseBadge>
            <BaseBadge :color="stateMeta(row).color" size="sm" dot>{{
              statusLabel(row)
            }}</BaseBadge>
          </div>

          <!-- Task title -->
          <h3 class="mt-3 text-base font-semibold text-slate-800">
            {{ row.task?.title || 'Untitled task' }}
          </h3>
          <p v-if="row.project" class="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <FolderIcon class="h-3.5 w-3.5" /> {{ row.project.name }}
          </p>

          <!-- Duration + time range -->
          <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span class="inline-flex items-center gap-1 font-semibold tabular-nums text-slate-700">
              <ClockIcon class="h-3.5 w-3.5" /> {{ formatDuration(row.seconds) }}
            </span>
            <span v-if="row.startTime">Mulai: {{ formatDateTime(row.startTime) }}</span>
            <span v-if="row.endTime">Selesai: {{ formatDateTime(row.endTime) }}</span>
          </div>

          <!-- Activity timeline -->
          <div class="mt-4 flex-1">
            <p class="text-caption mb-2">Aktivitas</p>
            <ol v-if="row.activities?.length" class="space-y-2">
              <li v-for="a in row.activities" :key="a.id" class="flex gap-2 text-xs">
                <span
                  class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  :class="{
                    'bg-success': classify(a.status) === 'running',
                    'bg-warning': classify(a.status) === 'hold',
                    'bg-slate-400': classify(a.status) === 'closed',
                    'bg-primary-400': classify(a.status) === 'new',
                  }"
                />
                <div class="min-w-0">
                  <span class="font-medium text-slate-600">{{ humanize(a.status) }}</span>
                  <span v-if="a.description" class="text-slate-400"> — {{ a.description }}</span>
                </div>
              </li>
            </ol>
            <p v-else class="text-xs text-slate-400">Belum ada aktivitas.</p>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
            <BaseButton
              v-if="canStart(row)"
              variant="primary"
              size="sm"
              @click="openAction(row, 'start')"
            >
              <PlayIcon class="h-4 w-4" /> Start
            </BaseButton>
            <BaseButton
              v-if="canHold(row)"
              variant="outline"
              size="sm"
              @click="openAction(row, 'hold')"
            >
              <PauseIcon class="h-4 w-4" /> Hold
            </BaseButton>
            <BaseButton
              v-if="canClose(row)"
              variant="outline"
              size="sm"
              @click="openAction(row, 'close')"
            >
              <StopIcon class="h-4 w-4" /> Close
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Pagination -->
    <BasePagination
      v-if="pagination.count > PAGE_SIZE"
      :model-value="page"
      :total="pagination.count"
      :page-size="PAGE_SIZE"
      @update:model-value="onPageChange"
    />

    <!-- Create -->
    <TimesheetCreateModal v-model="modalOpen" @created="onCreated" />

    <!-- Lifecycle action (start/hold/close) with optional note -->
    <BaseModal
      :model-value="actionOpen"
      size="sm"
      :title="actionMeta.title"
      :subtitle="actionRow?.task?.title"
      @update:model-value="actionOpen = $event"
    >
      <BaseTextarea
        v-model="actionNote"
        label="Catatan (opsional)"
        placeholder="Tambahkan catatan untuk aktivitas ini…"
        :rows="3"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <BaseButton variant="outline" type="button" @click="actionOpen = false">Batal</BaseButton>
          <BaseButton variant="primary" :loading="actionSaving" @click="confirmAction">
            {{ actionMeta.verb }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
