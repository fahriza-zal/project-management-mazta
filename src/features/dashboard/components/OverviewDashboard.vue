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
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'
import StatCard from '@/features/dashboard/components/StatCard.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'

// Live org-wide metrics over the WebSocket subscription.
const { general, loading, error } = useGeneralDashboard()

/* The API sends several numbers as strings, incl. scientific notation like
   "0E-20" (== 0) and long decimals like "54.4444…". Coerce defensively. */
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round = (v) => Math.round(num(v))
const clampPct = (v) => Math.max(0, Math.min(100, num(v)))

// ── KPI tiles ────────────────────────────────────────────────────────────────
const stats = computed(() => [
  {
    label: 'Total Projects',
    value: round(general.value?.totalProjects),
    icon: FolderIcon,
    color: 'primary',
  },
  {
    label: 'Active Projects',
    value: round(general.value?.activeProjects),
    icon: BoltIcon,
    color: 'info',
  },
  {
    label: 'Completed Tasks',
    value: round(general.value?.completedTasks),
    icon: CheckBadgeIcon,
    color: 'success',
  },
  {
    label: 'Total Tasks',
    value: round(general.value?.totalTasks),
    icon: ClipboardDocumentListIcon,
    color: 'warning',
  },
])

// ── Score meters (0–100 magnitude, one hue each) ──────────────────────────────
const meters = computed(() => [
  { label: 'Progress', value: clampPct(general.value?.progressProject), bar: 'bg-brand' },
  { label: 'Completion Rate', value: clampPct(general.value?.completionRate), bar: 'bg-blue-500' },
  {
    label: 'Health Score',
    value: clampPct(general.value?.healthScoreProject),
    bar: 'bg-green-500',
  },
  { label: 'Risk Score', value: clampPct(general.value?.riskScoreProject), bar: 'bg-amber-500' },
])

// Task completion (completed / total) as a headline ratio.
const taskCompletion = computed(() => {
  const total = num(general.value?.totalTasks)
  return total ? Math.round((num(general.value?.completedTasks) / total) * 100) : 0
})

// ── Status counters — reserved status colors, always shown with an icon+label ──
const breakdown = computed(() => [
  {
    label: 'On Time',
    value: round(general.value?.onTimeProjects),
    icon: CheckCircleIcon,
    color: 'success',
  },
  {
    label: 'Overdue Projects',
    value: round(general.value?.projectOverdue),
    icon: ExclamationTriangleIcon,
    color: 'danger',
  },
  {
    label: 'Completed Late',
    value: round(general.value?.completedLate),
    icon: ClockIcon,
    color: 'warning',
  },
  {
    label: 'High Risk',
    value: round(general.value?.highRiskProjects),
    icon: ShieldExclamationIcon,
    color: 'danger',
  },
  {
    label: 'Overdue Tasks',
    value: round(general.value?.overdueTasks),
    icon: ExclamationTriangleIcon,
    color: 'danger',
  },
])

// ── Project lists (each may be null) ──────────────────────────────────────────
const projectGroups = computed(() =>
  [
    {
      title: 'Active Projects',
      items: general.value?.activeProjectList,
      icon: BoltIcon,
      color: 'info',
    },
    {
      title: 'Overdue Projects',
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
      title: 'Idle Projects',
      items: general.value?.idleProjectList,
      icon: PauseCircleIcon,
      color: 'slate',
    },
    {
      title: 'Closed Projects',
      items: general.value?.closedProjectList,
      icon: CheckBadgeIcon,
      color: 'success',
    },
  ].map((g) => ({ ...g, items: g.items ?? [] })),
)

const visibleGroups = computed(() => projectGroups.value.filter((g) => g.items.length))

// Tinted icon chip tones for the status counters.
const chipTone = {
  success: 'bg-green-50 text-success',
  warning: 'bg-amber-50 text-warning',
  danger: 'bg-red-50 text-danger',
  info: 'bg-blue-50 text-info',
  slate: 'bg-slate-100 text-slate-500',
}
</script>

<template>
  <div class="space-y-6">
    <!-- Subscription error -->
    <div
      v-if="error"
      class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
    >
      <ExclamationTriangleIcon class="h-5 w-5 shrink-0" />
      Gagal memuat data dashboard secara langsung. Koneksi akan dicoba ulang otomatis.
    </div>

    <!-- Loading (first payload not in yet) -->
    <div v-if="loading && !general" class="surface px-4 py-16 text-center text-sm text-slate-400">
      Menyambungkan data langsung…
    </div>

    <template v-else>
      <!-- KPI tiles -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard v-for="s in stats" :key="s.label" v-bind="s" />
      </div>

      <!-- Metrics + task overview -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Score meters -->
        <BaseCard
          class="lg:col-span-2"
          title="Project Metrics"
          subtitle="Skor agregat seluruh project"
        >
          <div class="mt-2 space-y-4">
            <div v-for="m in meters" :key="m.label">
              <div class="mb-1.5 flex items-center justify-between text-sm">
                <span class="font-medium text-slate-600">{{ m.label }}</span>
                <span class="font-semibold tabular-nums text-slate-900">{{ m.value }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full rounded-full transition-all"
                  :class="m.bar"
                  :style="{ width: m.value + '%' }"
                />
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Task overview -->
        <BaseCard title="Tasks" subtitle="Penyelesaian task">
          <div class="flex items-end justify-between">
            <p class="text-3xl font-bold tracking-tight text-slate-900">
              {{ round(general?.completedTasks) }}
              <span class="text-base font-medium text-slate-400"
                >/ {{ round(general?.totalTasks) }}</span
              >
            </p>
            <span class="text-sm font-semibold text-slate-500">{{ taskCompletion }}%</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              class="bg-brand h-full rounded-full transition-all"
              :style="{ width: taskCompletion + '%' }"
            />
          </div>
          <dl class="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div class="flex items-center justify-between">
              <dt class="flex items-center gap-1.5 text-slate-500">
                <ExclamationTriangleIcon class="h-4 w-4 text-danger" /> Overdue Tasks
              </dt>
              <dd class="font-semibold tabular-nums text-slate-900">
                {{ round(general?.overdueTasks) }}
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="flex items-center gap-1.5 text-slate-500">
                <ClockIcon class="h-4 w-4 text-warning" /> Completed Late
              </dt>
              <dd class="font-semibold tabular-nums text-slate-900">
                {{ round(general?.completedLate) }}
              </dd>
            </div>
          </dl>
        </BaseCard>
      </div>

      <!-- Project status counters -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <div v-for="b in breakdown" :key="b.label" class="surface flex items-center gap-3 p-4">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            :class="chipTone[b.color]"
          >
            <component :is="b.icon" class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none tabular-nums text-slate-900">{{ b.value }}</p>
            <p class="mt-1 truncate text-xs text-slate-400">{{ b.label }}</p>
          </div>
        </div>
      </div>

      <!-- Project lists -->
      <div>
        <h2 class="text-subheading mb-3">Projects</h2>

        <div
          v-if="visibleGroups.length"
          class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <BaseCard v-for="g in visibleGroups" :key="g.title" :padded="false">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div class="flex items-center gap-2">
                <component :is="g.icon" class="h-4 w-4 text-slate-400" />
                <h3 class="text-sm font-semibold text-slate-700">{{ g.title }}</h3>
              </div>
              <BaseBadge :color="g.color" size="sm">{{ g.items.length }}</BaseBadge>
            </div>
            <ul class="divide-y divide-slate-100">
              <li v-for="p in g.items" :key="p.id">
                <RouterLink
                  :to="{ name: 'project-detail', params: { id: p.id } }"
                  class="group flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition hover:bg-slate-50"
                >
                  <span class="truncate font-medium text-slate-700 group-hover:text-primary-700">
                    {{ p.name }}
                  </span>
                  <ArrowRightIcon
                    class="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-primary-500"
                  />
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
