<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useGeneralDashboard } from '@/features/dashboard/composables/useDashboard'
import {
  FolderIcon,
  BoltIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldExclamationIcon,
  PauseCircleIcon,
} from '@heroicons/vue/24/outline'
import GaugeChart from '@/features/dashboard/components/charts/GaugeChart.vue'
import DonutChart from '@/features/dashboard/components/charts/DonutChart.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'

// Live org-wide metrics over the WebSocket subscription.
const { general, loading, error } = useGeneralDashboard()

/* The API sends several numbers as strings, incl. scientific notation like
   "0E-20" (== 0) and long decimals like "9.8765…". Coerce defensively. */
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round = (v) => Math.round(num(v))
const clampPct = (v) => Math.max(0, Math.min(100, num(v)))

// ── KPI tiles (compact) ───────────────────────────────────────────────────────
const stats = computed(() => [
  {
    label: 'Total Projects',
    value: round(general.value?.totalProjects),
    icon: FolderIcon,
    tone: 'bg-primary-50 text-primary-600',
  },
  {
    label: 'Active',
    value: round(general.value?.activeProjects),
    icon: BoltIcon,
    tone: 'bg-blue-50 text-info',
  },
  {
    label: 'Completed Tasks',
    value: round(general.value?.completedTasks),
    icon: CheckBadgeIcon,
    tone: 'bg-green-50 text-success',
  },
  {
    label: 'Total Tasks',
    value: round(general.value?.totalTasks),
    icon: ClipboardDocumentListIcon,
    tone: 'bg-amber-50 text-warning',
  },
])

// ── Score gauges. Health = higher-is-better, Risk = higher-is-worse. ──────────
const gauges = computed(() => [
  { label: 'Progress', value: clampPct(general.value?.progressProject), polarity: 'neutral' },
  { label: 'Completion', value: clampPct(general.value?.completionRate), polarity: 'neutral' },
  { label: 'Health', value: clampPct(general.value?.healthScoreProject), polarity: 'good' },
  { label: 'Risk', value: clampPct(general.value?.riskScoreProject), polarity: 'bad' },
])

const listLen = (l) => (Array.isArray(l) ? l.length : 0)

// ── Lifecycle project (donut): Active vs Closed → jumlahnya = totalProjects ────
const projectSegments = computed(() => {
  const g = general.value ?? {}
  return [
    { label: 'Active', value: round(g.activeProjects), color: '#3b82f6' },
    { label: 'Closed', value: round(g.closedProjects), color: '#10b981' },
  ]
})

// ── Project perlu perhatian — subset dari project aktif (bukan lifecycle) ──────
const attention = computed(() => {
  const g = general.value ?? {}
  return [
    { label: 'On Time', value: round(g.onTimeProjects), tone: 'text-success' },
    { label: 'Overdue', value: round(g.projectOverdue), tone: 'text-danger' },
    { label: 'Near Deadline', value: listLen(g.nearDeadlineProjectList), tone: 'text-warning' },
    { label: 'High Risk', value: round(g.highRiskProjects), tone: 'text-danger' },
    { label: 'Idle', value: listLen(g.idleProjectList), tone: 'text-slate-500' },
  ]
})

// ── Task composition (donut) — segmen langsung dari field subscription ────────
const taskSegments = computed(() => {
  const g = general.value ?? {}
  return [
    { label: 'Completed', value: round(g.completedTasks), color: '#10b981' },
    { label: 'Overdue', value: round(g.overdueTasks), color: '#f43f5e' },
  ]
})

// ── Project lists (each may be null) ──────────────────────────────────────────
const projectGroups = computed(() =>
  [
    { title: 'Active', items: general.value?.activeProjectList, icon: BoltIcon, color: 'info' },
    {
      title: 'Overdue',
      items: general.value?.overdueProjectList,
      icon: ExclamationTriangleIcon,
      color: 'danger',
    },
    {
      title: 'Near Deadline',
      items: general.value?.nearDeadlineProjectList,
      icon: ClockIcon,
      color: 'warning',
    },
    {
      title: 'High Risk',
      items: general.value?.highRiskProjectList,
      icon: ShieldExclamationIcon,
      color: 'danger',
    },
    {
      title: 'Idle',
      items: general.value?.idleProjectList,
      icon: PauseCircleIcon,
      color: 'slate',
    },
    {
      title: 'Closed',
      items: general.value?.closedProjectList,
      icon: CheckBadgeIcon,
      color: 'success',
    },
  ].map((g) => ({ ...g, items: g.items ?? [] })),
)

const visibleGroups = computed(() => projectGroups.value.filter((g) => g.items.length))
</script>

<template>
  <div class="space-y-4">
    <!-- Subscription error -->
    <div
      v-if="error"
      class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger"
    >
      <ExclamationTriangleIcon class="h-4 w-4 shrink-0" />
      Gagal memuat data dashboard. Koneksi akan dicoba ulang otomatis.
    </div>

    <!-- Loading (first payload not in yet) -->
    <div v-if="loading && !general" class="surface px-4 py-12 text-center text-sm text-slate-400">
      Menyambungkan data langsung…
    </div>

    <template v-else>
      <!-- KPI tiles (compact) -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="s in stats" :key="s.label" class="surface flex items-center gap-3 px-3 py-2.5">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            :class="s.tone"
          >
            <component :is="s.icon" class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none tabular-nums text-slate-900">{{ s.value }}</p>
            <p class="mt-0.5 truncate text-xs text-slate-400">{{ s.label }}</p>
          </div>
        </div>
      </div>

      <!-- Metrics + status + tasks — one dense row -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <!-- Score gauges -->
        <BaseCard class="lg:col-span-5" title="Project Metrics">
          <div class="mt-1 grid grid-cols-4 gap-1">
            <GaugeChart
              v-for="m in gauges"
              :key="m.label"
              :value="m.value"
              :label="m.label"
              :polarity="m.polarity"
              :size="80"
            />
          </div>
        </BaseCard>

        <!-- Lifecycle project + perlu perhatian -->
        <BaseCard class="lg:col-span-4" title="Status Project">
          <div class="mt-1">
            <DonutChart
              :segments="projectSegments"
              :size="116"
              :thickness="16"
              center-label="Projects"
            />
            <dl
              class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs"
            >
              <div v-for="a in attention" :key="a.label" class="flex items-center justify-between">
                <dt class="text-slate-500">{{ a.label }}</dt>
                <dd class="font-semibold tabular-nums" :class="a.tone">{{ a.value }}</dd>
              </div>
            </dl>
          </div>
        </BaseCard>

        <!-- Task composition -->
        <BaseCard class="lg:col-span-3" title="Tasks">
          <div class="mt-1">
            <DonutChart
              :segments="taskSegments"
              :size="116"
              :thickness="16"
              center-label="Done+Over"
            />
            <dl class="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
              <div class="flex items-center justify-between">
                <dt class="text-slate-500">Total Tasks</dt>
                <dd class="font-semibold tabular-nums text-slate-900">
                  {{ round(general?.totalTasks) }}
                </dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="flex items-center gap-1.5 text-slate-500">
                  <ClockIcon class="h-3.5 w-3.5 text-warning" /> Completed Late
                </dt>
                <dd class="font-semibold tabular-nums text-slate-900">
                  {{ round(general?.completedLate) }}
                </dd>
              </div>
            </dl>
          </div>
        </BaseCard>
      </div>

      <!-- Project lists (compact, internal scroll so the page never grows) -->
      <div>
        <h2 class="text-subheading mb-2">Projects</h2>

        <div
          v-if="visibleGroups.length"
          class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <BaseCard v-for="g in visibleGroups" :key="g.title" :padded="false">
            <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <div class="flex items-center gap-1.5">
                <component :is="g.icon" class="h-3.5 w-3.5 text-slate-400" />
                <h3 class="text-xs font-semibold text-slate-700">{{ g.title }}</h3>
              </div>
              <BaseBadge :color="g.color" size="sm">{{ g.items.length }}</BaseBadge>
            </div>
            <ul class="max-h-36 divide-y divide-slate-100 overflow-y-auto">
              <li v-for="p in g.items" :key="p.id">
                <RouterLink
                  :to="{ name: 'project-detail', params: { id: p.id } }"
                  class="block truncate px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-primary-700"
                  :title="p.name"
                >
                  {{ p.name }}
                </RouterLink>
              </li>
            </ul>
          </BaseCard>
        </div>

        <BaseCard v-else>
          <BaseEmpty
            :icon="FolderIcon"
            title="Belum ada project untuk ditampilkan"
            description="Daftar project aktif, overdue, dan berisiko akan muncul di sini."
          />
        </BaseCard>
      </div>
    </template>
  </div>
</template>
