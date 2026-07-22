<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTimesheetStore } from '@/features/timesheet/stores/timesheet'
import { useAuthStore } from '@/features/auth/stores/auth'
import { PERM } from '@/features/timesheet/permissions'
import { useToast } from '@/shared/composables/useToast'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  FolderIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseDatePicker from '@/shared/components/base/BaseDatePicker.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BasePagination from '@/shared/components/base/BasePagination.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import ConfirmDialog from '@/shared/components/base/ConfirmDialog.vue'
import TimesheetCreateModal from '@/features/timesheet/components/TimesheetCreateModal.vue'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

const store = useTimesheetStore()
const auth = useAuthStore()
const { items, pagination, loading } = storeToRefs(store)
const { success, error: toastError } = useToast()

auth.hydrate()
const employeeName = computed(() => auth.employee?.fullName || '')
// The list is scoped to the signed-in employee (id from the auth store / `pm_profile`).
const employeeId = computed(() => (auth.employee?.id != null ? Number(auth.employee.id) : null))

// Subordinates (from `employee.childrens`) — their ids drive the Approval tab's
// `employeeIds` filter. A user with no childrens isn't an approver (tab hidden).
const childrenIds = computed(() =>
  (auth.employee?.childrens ?? [])
    .map((c) => (c?.id != null ? Number(c.id) : null))
    .filter((id) => id != null),
)
const hasApproval = computed(() => childrenIds.value.length > 0)

// Active tab: 'own' (my timesheet) | 'approval' (subordinates' timesheets).
const tab = ref('own')
const isOwnTab = computed(() => tab.value === 'own')

/** Today as a local `'yyyy-MM-dd'` string (matches BaseDatePicker's model type). */
function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const search = ref('')
// Default the range filter to today → today.
const workDateGte = ref(todayStr())
const workDateLte = ref(todayStr())
const page = ref(1)
let searchTimer = null

const hasDateFilter = computed(() => !!(workDateGte.value || workDateLte.value))

/* -------------------------------------------------------------------------- */
/* Status helpers — status comes from the sheet's top-level `status`, falling   */
/* back to the latest activity. Classification is heuristic (exact enum values  */
/* aren't known) but the backend remains the source of truth on action.         */
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

// Optimistic per-row state override (id → state). Set the instant a lifecycle
// action succeeds so buttons/badges flip without waiting for the refetch.
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
/** Timeline/status dot colour class for a given state. */
function dotClass(state) {
  return (
    { running: 'bg-success', hold: 'bg-warning', closed: 'bg-slate-400', new: 'bg-primary-400' }[
      state
    ] ?? 'bg-slate-300'
  )
}

// Lifecycle actions apply to the user's own timesheets only (the Approval tab is
// read-only). Running can be held or closed; other non-new states (hold, closed)
// can be (re)started or closed; a brand-new sheet can only be started.
// A done (closed) timesheet is final: no more lifecycle actions on it.
const isClosed = (row) => stateOf(row) === 'closed'
const canStart = (row) =>
  isOwnTab.value && !isClosed(row) && stateOf(row) !== 'running' && auth.can(PERM.START)
const canHold = (row) => isOwnTab.value && stateOf(row) === 'running' && auth.can(PERM.HOLD)
const canClose = (row) =>
  isOwnTab.value && !isClosed(row) && stateOf(row) !== 'new' && auth.can(PERM.CLOSE)

/** PROJECT timesheets carry a project; COMMON (default-task) ones don't. */
function typeLabel(row) {
  return row.project ? 'Project' : 'Common'
}

/* -------------------------------------------------------------------------- */
/* Approval — only the approver (Approval tab), gated by permission, may approve */
/* a subordinate's timesheet. Approved rows are tracked optimistically so the    */
/* button flips to an "Approved" badge without waiting for the refetch.          */
/* -------------------------------------------------------------------------- */

// Optimistic per-row approved flag (id → true), set the instant approve succeeds.
const approvedOverride = ref({})

/** Whether a row is already approved (optimistic flag or a server `approvedAt`). */
function isApproved(row) {
  if (approvedOverride.value[row.id]) return true
  return !!row.approvedAt
}
/** Who approved the row — approver email from the server (null while optimistic). */
function approverLabel(row) {
  return row.approvedBy?.email || null
}
/**
 * Show the approve button only in the Approval tab, if permitted and not yet
 * approved. A still-running timesheet can't be approved (nothing to sign off yet).
 */
function canApprove(row) {
  return !isOwnTab.value && auth.can(PERM.APPROVE) && stateOf(row) !== 'running' && !isApproved(row)
}

/* -------------------------------------------------------------------------- */
/* Grouping — active (running/hold) float to the top; the rest are grouped by   */
/* day (from endTime/startTime), with not-yet-started ones in their own bucket. */
/* -------------------------------------------------------------------------- */

const activeItems = computed(() =>
  items.value.filter((r) => ['running', 'hold'].includes(stateOf(r))),
)

function refTime(row) {
  return row.endTime || row.startTime || null
}
function localKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
function dayKey(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : localKey(d)
}
function keyToTime(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}
function dayLabel(key) {
  if (!key) return 'Belum dimulai'
  const now = new Date()
  if (key === localKey(now)) return 'Hari ini'
  if (key === localKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)))
    return 'Kemarin'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const restGroups = computed(() => {
  const rest = items.value.filter((r) => !['running', 'hold'].includes(stateOf(r)))
  const map = new Map()
  for (const row of rest) {
    const key = dayKey(refTime(row))
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
  }
  const entries = [...map.entries()].sort((a, b) => {
    if (a[0] === null) return -1 // "Belum dimulai" first
    if (b[0] === null) return 1
    return keyToTime(b[0]) - keyToTime(a[0]) // newest day first
  })
  return entries.map(([key, rows]) => ({
    key: key ?? 'none',
    label: dayLabel(key),
    rows,
    seconds: rows.reduce((s, r) => s + (Number(r.seconds) || 0), 0),
  }))
})

const totalSeconds = computed(() => items.value.reduce((s, r) => s + (Number(r.seconds) || 0), 0))
const summary = computed(() => {
  const acc = { running: 0, hold: 0, closed: 0 }
  for (const row of items.value) {
    const s = stateOf(row)
    if (s === 'running') acc.running += 1
    else if (s === 'hold') acc.hold += 1
    else if (s === 'closed') acc.closed += 1
  }
  return acc
})

/* --- Expand activity timeline per row --- */
const expanded = ref({})
function toggleExpand(id) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}

/* --- Data loading --- */
/**
 * List params for the active tab: own timesheet scopes by `employeeId`; the
 * Approval tab scopes by `employeeIds` (the signed-in user's subordinates).
 */
function listParams() {
  const approval = tab.value === 'approval'
  return {
    employeeId: approval ? null : employeeId.value,
    employeeIds: approval ? childrenIds.value : null,
    page: page.value,
    pageSize: PAGE_SIZE,
    search: search.value.trim() || null,
    workDateGte: workDateGte.value || null,
    workDateLte: workDateLte.value || null,
  }
}

function load() {
  return store.fetchList(listParams()).catch((err) => toastError(err.message))
}

/** Switch tabs, reset to the first page, and reload. */
function switchTab(key) {
  if (tab.value === key) return
  tab.value = key
  page.value = 1
  load()
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, DEBOUNCE_MS)
}

/** Reload from page 1 whenever the date range changes. */
function onDateFilter() {
  page.value = 1
  load()
}

/** Clear both date bounds and reload. */
function clearDateFilter() {
  if (!hasDateFilter.value) return
  workDateGte.value = ''
  workDateLte.value = ''
  onDateFilter()
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
    // Update the card in place (no blocking refetch): force the target state and
    // append the new activity so buttons flip and the timeline shows the entry
    // instantly. Apollo freezes results, so replace the row with a clone.
    const nextOverride = { ...stateOverride.value, [id]: state }
    // Only one timesheet may run at a time, so starting one demotes any other
    // running sheet to hold (mirrors the backend, which keeps a single runner).
    if (state === 'running') {
      for (const r of items.value) {
        if (r.id !== id && stateOf(r) === 'running') nextOverride[r.id] = 'hold'
      }
    }
    stateOverride.value = nextOverride
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
    // already succeeded — don't surface a list-refetch error over it). Once fresh
    // data arrives, drop the optimistic overrides so server status is authoritative.
    store
      .fetchList(listParams())
      .then(() => {
        stateOverride.value = {}
      })
      .catch(() => {})
  } catch (err) {
    toastError(err.message)
  } finally {
    actionSaving.value = false
  }
}

/* --- Approve (Approval tab) --- */
const approveOpen = ref(false)
const approveSaving = ref(false)
const approveRow = ref(null)

function openApprove(row) {
  approveRow.value = row
  approveOpen.value = true
}

async function confirmApprove() {
  approveSaving.value = true
  try {
    const id = approveRow.value.id
    await store.approveSheet(id)
    approvedOverride.value = { ...approvedOverride.value, [id]: true }
    success('Timesheet disetujui.')
    approveOpen.value = false
    // Reconcile status from the server silently — the approval already succeeded.
    store
      .fetchList(listParams())
      .then(() => {
        approvedOverride.value = {}
      })
      .catch(() => {})
  } catch (err) {
    toastError(err.message)
  } finally {
    approveSaving.value = false
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
          <span v-if="isOwnTab && employeeName"
            >Timesheet milik <strong>{{ employeeName }}</strong></span
          >
          <span v-else-if="!isOwnTab">Timesheet tim yang Anda bawahi untuk ditinjau.</span>
        </p>
      </div>
      <BaseButton v-if="isOwnTab && auth.can(PERM.CREATE)" variant="primary" @click="openCreate">
        <PlusIcon class="h-4 w-4" />
        Buat Timesheet
      </BaseButton>
    </div>

    <!-- Tabs: my timesheet vs approval (subordinates) -->
    <div v-if="hasApproval" class="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
        :class="
          isOwnTab
            ? 'bg-brand text-white shadow-glow'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        "
        @click="switchTab('own')"
      >
        <ClockIcon class="h-4 w-4" />
        Timesheet Saya
      </button>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
        :class="
          !isOwnTab
            ? 'bg-brand text-white shadow-glow'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        "
        @click="switchTab('approval')"
      >
        <CheckCircleIcon class="h-4 w-4" />
        Approval Team
      </button>
    </div>

    <!-- Summary tiles -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <BaseCard>
        <p class="text-caption">Total waktu</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-slate-800">
          {{ formatDuration(totalSeconds) }}
        </p>
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
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div class="w-full sm:max-w-xs">
        <BaseInput v-model="search" placeholder="Cari timesheet…" @update:model-value="onSearch">
          <template #prefix><MagnifyingGlassIcon class="h-4 w-4" /></template>
        </BaseInput>
      </div>
      <!-- Work-date range filter (workDateGte / workDateLte) -->
      <div class="w-full sm:w-40">
        <BaseDatePicker
          v-model="workDateGte"
          label="Dari tanggal"
          placeholder="Mulai"
          @update:model-value="onDateFilter"
        />
      </div>
      <div class="w-full sm:w-40">
        <BaseDatePicker
          v-model="workDateLte"
          label="Sampai tanggal"
          placeholder="Selesai"
          @update:model-value="onDateFilter"
        />
      </div>
      <BaseButton
        v-if="hasDateFilter"
        variant="outline"
        size="sm"
        type="button"
        @click="clearDateFilter"
      >
        Reset tanggal
      </BaseButton>
    </div>

    <!-- Content -->
    <div v-if="loading" class="surface px-4 py-16 text-center text-sm text-slate-400">Loading…</div>

    <BaseEmpty
      v-else-if="!items.length"
      :icon="ClockIcon"
      :title="isOwnTab ? 'Belum ada timesheet' : 'Belum ada timesheet tim'"
      :description="
        isOwnTab
          ? 'Buat timesheet untuk mulai mencatat pekerjaan Anda pada sebuah task.'
          : 'Timesheet dari anggota tim yang Anda bawahi akan muncul di sini.'
      "
    >
      <template v-if="isOwnTab" #action>
        <BaseButton v-if="auth.can(PERM.CREATE)" variant="primary" @click="openCreate">
          <PlusIcon class="h-4 w-4" /> Buat Timesheet
        </BaseButton>
      </template>
    </BaseEmpty>

    <template v-else>
      <!-- Active (running / on hold) -->
      <section v-if="activeItems.length" class="space-y-2">
        <p class="text-caption px-1">Sedang berjalan</p>
        <div class="overflow-hidden rounded-2xl border border-primary-200/70 bg-primary-50/40">
          <ul class="divide-y divide-primary-100/70">
            <li v-for="row in activeItems" :key="row.id">
              <div
                class="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4"
              >
                <div class="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
                  <span
                    class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0"
                    :class="dotClass(stateOf(row))"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex min-w-0 flex-wrap items-center gap-2">
                      <span class="max-w-full truncate font-semibold text-slate-800">
                        {{ row.task?.title || 'Untitled task' }}
                      </span>
                      <BaseBadge :color="stateMeta(row).color" size="sm" dot>
                        {{ statusLabel(row) }}
                      </BaseBadge>
                      <BaseBadge v-if="!isOwnTab && row.employee" color="primary" size="sm">
                        <UserIcon class="h-3 w-3" />
                        {{ row.employee.fullName }}
                      </BaseBadge>
                    </div>
                    <p class="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                      <FolderIcon v-if="row.project" class="h-3.5 w-3.5" />
                      {{ row.project?.name || 'Common task' }}
                      <span v-if="row.startTime && stateOf(row) !== 'running'">
                        · mulai {{ formatDateTime(row.startTime) }}</span
                      >
                    </p>
                  </div>
                </div>
                <!-- Duration + lifecycle actions: full-width row on mobile, inline on desktop. -->
                <div
                  class="flex flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-3"
                >
                  <!-- While running, the server duration stays 00:00:00, so show a
                       live "berjalan" clock plus the start time instead of the number. -->
                  <span
                    v-if="stateOf(row) === 'running'"
                    class="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-success"
                  >
                    <ClockIcon class="h-5 w-5 shrink-0 animate-tick" />
                    <span v-if="row.startTime" class="truncate"
                      >Berjalan sejak {{ formatDateTime(row.startTime) }}</span
                    >
                    <span v-else>Berjalan…</span>
                  </span>
                  <span v-else class="text-xl font-bold tabular-nums text-slate-800">
                    {{ formatDuration(row.seconds) }}
                  </span>
                  <div class="flex flex-wrap items-center gap-2">
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
                    <BaseButton
                      v-if="canApprove(row)"
                      variant="primary"
                      size="sm"
                      @click="openApprove(row)"
                    >
                      <CheckCircleIcon class="h-4 w-4" /> Approve
                    </BaseButton>
                    <BaseBadge
                      v-else-if="!isOwnTab && isApproved(row)"
                      color="success"
                      size="sm"
                      dot
                      :title="
                        approverLabel(row) ? `Disetujui oleh ${approverLabel(row)}` : undefined
                      "
                    >
                      Disetujui<span v-if="approverLabel(row)"> · {{ approverLabel(row) }}</span>
                    </BaseBadge>
                    <button
                      class="rounded-lg p-2 text-slate-400 hover:bg-white/70 hover:text-slate-600"
                      :title="expanded[row.id] ? 'Sembunyikan aktivitas' : 'Lihat aktivitas'"
                      @click="toggleExpand(row.id)"
                    >
                      <ChevronDownIcon
                        class="h-4 w-4 transition-transform"
                        :class="expanded[row.id] ? 'rotate-180' : ''"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Activity timeline -->
              <div
                v-if="expanded[row.id]"
                class="border-t border-primary-100/70 bg-white/50 px-4 py-3"
              >
                <ol v-if="row.activities?.length" class="space-y-2">
                  <li v-for="a in row.activities" :key="a.id" class="flex gap-2 text-xs">
                    <span
                      class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      :class="dotClass(classify(a.status))"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span class="font-medium text-slate-600">{{ humanize(a.status) }}</span>
                        <span v-if="a.description" class="text-slate-400">
                          — {{ a.description }}</span
                        >
                      </div>
                      <div
                        class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400"
                      >
                        <span v-if="a.totalTime != null" class="tabular-nums">
                          <ClockIcon class="mr-0.5 inline h-3 w-3 align-text-bottom" />{{
                            formatDuration(a.totalTime)
                          }}
                        </span>
                        <span v-if="a.updatedAt">{{ formatDateTime(a.updatedAt) }}</span>
                      </div>
                    </div>
                  </li>
                </ol>
                <p v-else class="text-xs text-slate-400">Belum ada aktivitas.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- Grouped by day -->
      <section v-for="g in restGroups" :key="g.key" class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <p class="text-caption">{{ g.label }}</p>
          <p class="text-caption tabular-nums">{{ formatDuration(g.seconds) }}</p>
        </div>
        <BaseCard :padded="false">
          <ul class="divide-y divide-slate-100">
            <li
              v-for="row in g.rows"
              :key="row.id"
              :class="isClosed(row) ? 'border-l-2 border-emerald-400 bg-emerald-50/40' : ''"
            >
              <div
                class="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
              >
                <div class="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
                  <CheckCircleIcon
                    v-if="isClosed(row)"
                    class="mt-0.5 h-5 w-5 shrink-0 text-emerald-500 sm:mt-0"
                  />
                  <span
                    v-else
                    class="mt-1.5 h-2 w-2 shrink-0 rounded-full sm:mt-0"
                    :class="dotClass(stateOf(row))"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex min-w-0 flex-wrap items-center gap-2">
                      <span
                        class="max-w-full truncate font-medium"
                        :class="isClosed(row) ? 'text-slate-500' : 'text-slate-800'"
                      >
                        {{ row.task?.title || 'Untitled task' }}
                      </span>
                      <BaseBadge :color="row.project ? 'primary' : 'slate'" size="sm">
                        {{ typeLabel(row) }}
                      </BaseBadge>
                      <BaseBadge v-if="isClosed(row)" color="success" size="sm" dot
                        >Selesai</BaseBadge
                      >
                      <BaseBadge v-if="!isOwnTab && row.employee" color="info" size="sm">
                        <UserIcon class="h-3 w-3" />
                        {{ row.employee.fullName }}
                      </BaseBadge>
                    </div>
                    <p class="mt-0.5 truncate text-xs text-slate-400">
                      <span v-if="row.project">{{ row.project.name }} · </span>
                      <span v-if="!isClosed(row)">{{ statusLabel(row) }}</span>
                      <span v-if="row.startTime">
                        <span v-if="!isClosed(row)">· </span>{{ formatDateTime(row.startTime) }}
                        <span v-if="row.endTime">– {{ formatDateTime(row.endTime) }}</span>
                      </span>
                    </p>
                  </div>
                </div>
                <!-- Duration + lifecycle actions: full-width row on mobile, inline on desktop. -->
                <div
                  class="flex flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-3"
                >
                  <span
                    class="text-sm font-semibold tabular-nums"
                    :class="isClosed(row) ? 'text-emerald-600' : 'text-slate-700'"
                  >
                    {{ formatDuration(row.seconds) }}
                  </span>
                  <div class="flex flex-wrap items-center gap-1">
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
                    <BaseButton
                      v-if="canApprove(row)"
                      variant="primary"
                      size="sm"
                      @click="openApprove(row)"
                    >
                      <CheckCircleIcon class="h-4 w-4" /> Approve
                    </BaseButton>
                    <BaseBadge
                      v-else-if="!isOwnTab && isApproved(row)"
                      color="success"
                      size="sm"
                      dot
                      :title="
                        approverLabel(row) ? `Disetujui oleh ${approverLabel(row)}` : undefined
                      "
                    >
                      Disetujui<span v-if="approverLabel(row)"> · {{ approverLabel(row) }}</span>
                    </BaseBadge>
                    <button
                      class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      :title="expanded[row.id] ? 'Sembunyikan aktivitas' : 'Lihat aktivitas'"
                      @click="toggleExpand(row.id)"
                    >
                      <ChevronDownIcon
                        class="h-4 w-4 transition-transform"
                        :class="expanded[row.id] ? 'rotate-180' : ''"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Activity timeline -->
              <div
                v-if="expanded[row.id]"
                class="border-t border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <ol v-if="row.activities?.length" class="space-y-2">
                  <li v-for="a in row.activities" :key="a.id" class="flex gap-2 text-xs">
                    <span
                      class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      :class="dotClass(classify(a.status))"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span class="font-medium text-slate-600">{{ humanize(a.status) }}</span>
                        <span v-if="a.description" class="text-slate-400">
                          — {{ a.description }}</span
                        >
                      </div>
                      <div
                        class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400"
                      >
                        <span v-if="a.totalTime != null" class="tabular-nums">
                          <ClockIcon class="mr-0.5 inline h-3 w-3 align-text-bottom" />{{
                            formatDuration(a.totalTime)
                          }}
                        </span>
                        <span v-if="a.updatedAt">{{ formatDateTime(a.updatedAt) }}</span>
                      </div>
                    </div>
                  </li>
                </ol>
                <p v-else class="text-xs text-slate-400">Belum ada aktivitas.</p>
              </div>
            </li>
          </ul>
        </BaseCard>
      </section>
    </template>

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

    <!-- Approve subordinate's timesheet -->
    <ConfirmDialog
      :model-value="approveOpen"
      variant="primary"
      title="Setujui timesheet"
      :message="`Setujui timesheet ${
        approveRow?.employee?.fullName ? `milik ${approveRow.employee.fullName} ` : ''
      }untuk task '${approveRow?.task?.title || 'Untitled task'}'?`"
      confirm-text="Setujui"
      cancel-text="Batal"
      :loading="approveSaving"
      @update:model-value="approveOpen = $event"
      @confirm="confirmApprove"
    />
  </div>
</template>

<style scoped>
/* Slow, continuous spin on the running-timer clock to signal it's live. */
@keyframes tick-spin {
  to {
    transform: rotate(360deg);
  }
}
.animate-tick {
  animation: tick-spin 3s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-tick {
    animation: none;
  }
}
</style>
