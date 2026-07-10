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
  ChevronDownIcon,
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
import TimesheetCreateModal from '@/features/timesheet/components/TimesheetCreateModal.vue'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

const store = useTimesheetStore()
const auth = useAuthStore()
const { items, pagination, loading } = storeToRefs(store)
const { success, error: toastError } = useToast()

auth.hydrate()
const employeeName = computed(() => auth.employee?.fullName || '')

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

// Running can be held or closed; every other non-new state (hold, closed) can be
// (re)started or closed; a brand-new sheet can only be started.
const canStart = (row) => stateOf(row) !== 'running'
const canHold = (row) => stateOf(row) === 'running'
const canClose = (row) => stateOf(row) !== 'new'

/** PROJECT timesheets carry a project; COMMON (default-task) ones don't. */
function typeLabel(row) {
  return row.project ? 'Project' : 'Common'
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
function load() {
  return store
    .fetchList({
      page: page.value,
      pageSize: PAGE_SIZE,
      search: search.value.trim() || null,
      workDateGte: workDateGte.value || null,
      workDateLte: workDateLte.value || null,
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
      .fetchList({
        page: page.value,
        pageSize: PAGE_SIZE,
        search: search.value.trim() || null,
        workDateGte: workDateGte.value || null,
        workDateLte: workDateLte.value || null,
      })
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
            >Timesheet milik <strong>{{ employeeName }}</strong></span
          >
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
      title="Belum ada timesheet"
      description="Buat timesheet untuk mulai mencatat pekerjaan Anda pada sebuah task."
    >
      <template #action>
        <BaseButton variant="primary" @click="openCreate">
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
              <div class="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="dotClass(stateOf(row))" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate font-semibold text-slate-800">
                      {{ row.task?.title || 'Untitled task' }}
                    </span>
                    <BaseBadge :color="stateMeta(row).color" size="sm" dot>
                      {{ statusLabel(row) }}
                    </BaseBadge>
                  </div>
                  <p class="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                    <FolderIcon v-if="row.project" class="h-3.5 w-3.5" />
                    {{ row.project?.name || 'Common task' }}
                    <span v-if="row.startTime"> · mulai {{ formatDateTime(row.startTime) }}</span>
                  </p>
                </div>
                <!-- While running, the server duration stays 00:00:00, so show a
                     live "berjalan" clock instead of the number. -->
                <span
                  v-if="stateOf(row) === 'running'"
                  class="flex items-center gap-1.5 text-sm font-semibold text-success"
                >
                  <ClockIcon class="h-5 w-5 animate-tick" /> Berjalan…
                </span>
                <span v-else class="text-xl font-bold tabular-nums text-slate-800">
                  {{ formatDuration(row.seconds) }}
                </span>
                <div class="flex items-center gap-2">
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
                    <div class="min-w-0">
                      <span class="font-medium text-slate-600">{{ humanize(a.status) }}</span>
                      <span v-if="a.description" class="text-slate-400">
                        — {{ a.description }}</span
                      >
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
            <li v-for="row in g.rows" :key="row.id">
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="dotClass(stateOf(row))" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate font-medium text-slate-800">
                      {{ row.task?.title || 'Untitled task' }}
                    </span>
                    <BaseBadge :color="row.project ? 'primary' : 'slate'" size="sm">
                      {{ typeLabel(row) }}
                    </BaseBadge>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-slate-400">
                    <span v-if="row.project">{{ row.project.name }} · </span>
                    <span>{{ statusLabel(row) }}</span>
                    <span v-if="row.startTime">
                      · {{ formatDateTime(row.startTime) }}
                      <span v-if="row.endTime">– {{ formatDateTime(row.endTime) }}</span>
                    </span>
                  </p>
                </div>
                <span class="text-sm font-semibold tabular-nums text-slate-700">
                  {{ formatDuration(row.seconds) }}
                </span>
                <div class="flex items-center gap-1">
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
                    <div class="min-w-0">
                      <span class="font-medium text-slate-600">{{ humanize(a.status) }}</span>
                      <span v-if="a.description" class="text-slate-400">
                        — {{ a.description }}</span
                      >
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
