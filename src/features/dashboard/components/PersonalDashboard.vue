<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useSheetDashboard } from '@/features/dashboard/composables/useDashboard'
import { useTimesheetStore } from '@/features/timesheet/stores/timesheet'
import { PERM } from '@/features/timesheet/permissions'
import { useToast } from '@/shared/composables/useToast'
import { ExclamationTriangleIcon, UsersIcon, ClockIcon } from '@heroicons/vue/24/outline'
import EmployeeMetricCard from '@/features/dashboard/components/EmployeeMetricCard.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseDatePicker from '@/shared/components/base/BaseDatePicker.vue'

const auth = useAuthStore()
auth.hydrate()

// The subscription is keyed on the signed-in employee (id from the persisted profile);
// it returns metrics for that employee plus their team (per the `tree` hierarchy).
const employeeId = computed(() => auth.employee?.id ?? null)

const { metrics, tree, loading, error } = useSheetDashboard(employeeId)

/* -------------------------------------------------------------------------- */
/* "Hitung jam kerja" — on demand, sum the signed-in employee's worked seconds  */
/* over a work-date range via listTimeSheet (paged) and show the total.         */
/* -------------------------------------------------------------------------- */
const timesheetStore = useTimesheetStore()
const { error: toastError } = useToast()

/** Today as a local `'yyyy-MM-dd'` string (matches BaseDatePicker's model type). */
function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
/** First day of the current month as `'yyyy-MM-dd'`. */
function monthStartStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}

const calcOpen = ref(false)
const calcLoading = ref(false)
const workDateGte = ref(monthStartStr())
const workDateLte = ref(todayStr())
// The employee whose hours are being totalled (self or a subordinate), set when a
// card's "Jam Kerja" button is clicked.
const calcEmployee = ref(null)
// null until a calculation runs; then { totalSeconds, count } for the chosen range.
const calcResult = ref(null)

// Gate on the same permission that backs the underlying `listTimeSheet` call.
const canCalc = computed(() => auth.can(PERM.LIST))

/** Open the calculator for a given employee ({ id, fullName }). */
function openCalc(employee) {
  calcEmployee.value = employee || null
  calcResult.value = null
  calcOpen.value = true
}

async function runCalc() {
  const id = calcEmployee.value?.id
  if (id == null) return
  calcLoading.value = true
  try {
    calcResult.value = await timesheetStore.fetchTotalSeconds({
      employeeId: Number(id),
      workDateGte: workDateGte.value || null,
      workDateLte: workDateLte.value || null,
    })
  } catch (err) {
    toastError(err.message)
  } finally {
    calcLoading.value = false
  }
}

/** Seconds → "HH:MM:SS". */
function formatDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}
/** Seconds → "X jam Y menit" (human summary). */
function humanDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h} jam ${m} menit`
}

// Project vs Common distribution of the calculated total, as rows with a percent
// of total time — mirrors the "Distribusi Waktu" split on the metric cards.
const calcSplit = computed(() => {
  const r = calcResult.value
  if (!r) return null
  const total = Number(r.totalSeconds) || 0
  const pct = (v) => (total ? Math.round(((Number(v) || 0) / total) * 100) : 0)
  return [
    {
      label: 'Project',
      seconds: r.projectSeconds,
      count: r.projectCount,
      pct: pct(r.projectSeconds),
      bar: 'bg-brand',
    },
    {
      label: 'Common',
      seconds: r.commonSeconds,
      count: r.commonCount,
      pct: pct(r.commonSeconds),
      bar: 'bg-blue-500',
    },
  ]
})

/** Depth-first list of employee ids from the `tree` hierarchy (root → leaves). */
function flattenTree(node, depth = 0, acc = []) {
  if (!node || node.id == null) return acc
  acc.push({ id: node.id, depth })
  for (const child of node.childrens || []) flattenTree(child, depth + 1, acc)
  return acc
}

// Metrics ordered by the tree (so the hierarchy reads top-down); any employee not
// present in the tree is appended so nothing is silently dropped.
const ordered = computed(() => {
  const byId = new Map((metrics.value || []).map((m) => [m.employee?.id, m]))
  const seen = new Set()
  const out = []
  for (const { id } of flattenTree(tree.value)) {
    const m = byId.get(id)
    if (m && !seen.has(id)) {
      out.push(m)
      seen.add(id)
    }
  }
  for (const m of metrics.value || []) {
    const id = m.employee?.id
    if (!seen.has(id)) {
      out.push(m)
      seen.add(id)
    }
  }
  return out
})

// The signed-in employee's own metrics (fall back to the first entry / tree root).
const selfMetric = computed(
  () => ordered.value.find((m) => m.employee?.id === employeeId.value) || ordered.value[0] || null,
)
const team = computed(() => ordered.value.filter((m) => m !== selfMetric.value))
</script>

<template>
  <div class="space-y-6">
    <!-- No employee profile -->
    <div
      v-if="employeeId == null"
      class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning"
    >
      <ExclamationTriangleIcon class="h-5 w-5 shrink-0" />
      Profil employee tidak ditemukan. Silakan login ulang.
    </div>

    <template v-else>
      <!-- Subscription error -->
      <div
        v-if="error"
        class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
      >
        <ExclamationTriangleIcon class="h-5 w-5 shrink-0" />
        Gagal memuat dashboard secara langsung. Koneksi akan dicoba ulang otomatis.
      </div>

      <!-- Loading (first payload not in yet) -->
      <div
        v-if="loading && !selfMetric"
        class="surface px-4 py-16 text-center text-sm text-slate-400"
      >
        Menyambungkan data langsung…
      </div>

      <!-- No data yet -->
      <BaseCard v-else-if="!selfMetric">
        <BaseEmpty
          :icon="ClockIcon"
          title="Belum ada aktivitas"
          description="Metrik timesheet Anda akan muncul di sini begitu ada aktivitas."
        />
      </BaseCard>

      <template v-else>
        <!-- Signed-in employee -->
        <EmployeeMetricCard :metric="selfMetric" self :show-calc="canCalc" @calculate="openCalc" />

        <!-- Team members -->
        <div v-if="team.length">
          <div class="mb-3 flex items-center gap-2">
            <UsersIcon class="h-5 w-5 text-slate-400" />
            <h2 class="text-subheading">Tim</h2>
            <span class="text-sm text-slate-400">({{ team.length }})</span>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <EmployeeMetricCard
              v-for="m in team"
              :key="m.employee?.id"
              :metric="m"
              :show-calc="canCalc"
              @calculate="openCalc"
            />
          </div>
        </div>
      </template>
    </template>

    <!-- Calculate total worked hours over a work-date range -->
    <BaseModal
      :model-value="calcOpen"
      size="sm"
      title="Hitung Jam Kerja"
      :subtitle="
        calcEmployee?.fullName
          ? `${calcEmployee.fullName} · rentang tanggal terpilih`
          : 'Total waktu kerja pada rentang tanggal terpilih'
      "
      @update:model-value="calcOpen = $event"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseDatePicker v-model="workDateGte" label="Dari tanggal" placeholder="Mulai" />
          <BaseDatePicker v-model="workDateLte" label="Sampai tanggal" placeholder="Selesai" />
        </div>

        <!-- Result -->
        <div v-if="calcResult" class="space-y-3">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p class="text-caption">Total jam kerja</p>
            <p class="mt-1 text-3xl font-bold tabular-nums text-slate-800">
              {{ formatDuration(calcResult.totalSeconds) }}
            </p>
            <p class="mt-1 text-sm text-slate-500">{{ humanDuration(calcResult.totalSeconds) }}</p>
            <p class="mt-1 text-xs text-slate-400">{{ calcResult.count }} timesheet</p>
          </div>

          <!-- Project vs Common distribution (percent of total time) -->
          <div v-if="calcResult.totalSeconds > 0" class="rounded-xl border border-slate-200 p-4">
            <p class="mb-2 text-xs font-medium text-slate-500">Distribusi Waktu</p>
            <div class="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                v-for="row in calcSplit"
                :key="row.label"
                class="h-full first:rounded-l-full last:rounded-r-full"
                :class="row.bar"
                :style="{ width: row.pct + '%' }"
              />
            </div>
            <ul class="mt-3 space-y-1.5">
              <li v-for="row in calcSplit" :key="row.label" class="flex items-center gap-2 text-xs">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="row.bar" />
                <span class="text-slate-500">{{ row.label }}</span>
                <span class="text-slate-400">({{ row.count }})</span>
                <span class="ml-auto font-semibold tabular-nums text-slate-700">
                  {{ formatDuration(row.seconds) }}
                </span>
                <span class="w-10 text-right font-semibold tabular-nums text-slate-500">
                  {{ row.pct }}%
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <BaseButton variant="outline" type="button" @click="calcOpen = false">Tutup</BaseButton>
          <BaseButton variant="primary" :loading="calcLoading" @click="runCalc">Hitung</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
