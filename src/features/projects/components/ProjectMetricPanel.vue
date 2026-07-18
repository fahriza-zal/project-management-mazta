<script setup>
import { computed, ref } from 'vue'
import { formatDate } from '@/shared/utils/format'
import {
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UsersIcon,
  FlagIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline'

/**
 * Prominent, theme-matched panel for a project's computed `metric` block
 * (the fields on `getProject.data.metric`). Read-only — just presentation.
 * Collapsible: the gradient header doubles as an accordion toggle.
 */
const props = defineProps({
  // May be null when the backend hasn't computed a metric for the project yet —
  // the panel then shows an empty state instead of vanishing.
  metric: { type: Object, default: null },
  defaultOpen: { type: Boolean, default: true },
})

const open = ref(props.defaultOpen)

const m = computed(() => props.metric ?? {})
const hasMetric = computed(() => !!props.metric && Object.keys(props.metric).length > 0)

// ── Formatting helpers ───────────────────────────────────────────────────────
const round = (v) => Math.round(Number(v) || 0)

/** Score 0–100 → semantic tone. `invert` for risk (high = bad). */
function scoreTone(value, invert = false) {
  const v = Number(value) || 0
  const good = invert ? v < 34 : v >= 67
  const bad = invert ? v >= 67 : v < 34
  if (good) return 'success'
  if (bad) return 'danger'
  return 'warning'
}

/** Tone → border/bg/text classes for a score tile. */
function scoreTint(value, invert = false) {
  return {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
  }[scoreTone(value, invert)]
}

const progress = computed(() => round(m.value.progress))

// Secondary stat tiles — kept lean: the few signals that actually drive decisions.
const tiles = computed(() => [
  {
    key: 'completed',
    label: 'Completed Tasks',
    value: `${m.value.completedTasks ?? 0} / ${m.value.totalTasks ?? 0}`,
    icon: CheckCircleIcon,
    tone: 'text-emerald-500',
  },
  {
    key: 'overdue',
    label: 'Overdue Tasks',
    value: m.value.overdueTasks ?? 0,
    icon: ExclamationTriangleIcon,
    tone: 'text-red-400',
    danger: (m.value.overdueTasks || 0) > 0,
  },
  {
    key: 'milestones',
    label: 'Milestones Done',
    value: m.value.completedMilestones ?? 0,
    icon: FlagIcon,
    tone: 'text-primary-500',
  },
  {
    key: 'members',
    label: 'Active Members',
    value: m.value.activeMembers ?? 0,
    icon: UsersIcon,
    tone: 'text-violet-500',
  },
])
</script>

<template>
  <section class="surface overflow-hidden">
    <!-- Header — brand gradient; also the accordion toggle -->
    <button
      type="button"
      class="bg-brand flex w-full items-center justify-between gap-2 px-5 py-4 text-left text-white transition hover:brightness-105"
      :aria-expanded="open"
      @click="open = !open"
    >
      <p class="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
        <ChartBarIcon class="h-5 w-5" />
        Project Metrics
      </p>
      
      <div class="flex items-center gap-3">
        <span v-if="m.calculatedAt" class="hidden text-xs font-medium text-white/80 sm:inline">
          Updated {{ formatDate(m.calculatedAt, { hour: '2-digit', minute: '2-digit' }) }}
        </span>
        <ChevronUpIcon v-if="open" class="h-5 w-5" />
        <ChevronDownIcon v-else class="h-5 w-5" />
      </div>
    </button>

    <div v-show="open" class="p-5">
      <!-- Empty state — metric not computed yet -->
      <p
        v-if="!hasMetric"
        class="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400"
      >
        Metrik untuk project ini belum tersedia.
      </p>

      <div v-else class="space-y-4">
        <!-- Hero row: Progress · Health · Risk · Completion -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Progress — big focal tile with a bar -->
          <div
            class="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-accent-50 p-4"
          >
            <p class="text-xs font-medium uppercase tracking-wide text-primary-700/70">Progress</p>
            <p class="mt-1 text-3xl font-extrabold leading-none text-primary-700">
              {{ progress }}<span class="text-lg font-bold text-primary-400">%</span>
            </p>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
              <div
                class="bg-brand h-full rounded-full transition-all"
                :style="{ width: progress + '%' }"
              />
            </div>
          </div>

          <!-- Health -->
          <div
            class="flex items-center justify-between rounded-2xl border p-4"
            :class="scoreTint(m.healthScore)"
          >
            <div>
              <p class="text-xs font-medium uppercase tracking-wide opacity-80">Health Score</p>
              <p class="mt-1 text-3xl font-extrabold leading-none">
                {{ round(m.healthScore) }}<span class="text-base font-bold opacity-60">/100</span>
              </p>
            </div>
            <ShieldCheckIcon class="h-9 w-9 opacity-40" />
          </div>

          <!-- Risk -->
          <div
            class="flex items-center justify-between rounded-2xl border p-4"
            :class="scoreTint(m.riskScore, true)"
          >
            <div>
              <p class="text-xs font-medium uppercase tracking-wide opacity-80">Risk Score</p>
              <p class="mt-1 text-3xl font-extrabold leading-none">
                {{ round(m.riskScore) }}<span class="text-base font-bold opacity-60">/100</span>
              </p>
            </div>
            <ExclamationTriangleIcon class="h-9 w-9 opacity-40" />
          </div>

          <!-- Completion rate -->
          <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
              Completion Rate
            </p>
            <p class="mt-1 text-3xl font-extrabold leading-none text-slate-800">
              {{ round(m.completionRate) }}<span class="text-lg font-bold text-slate-400">%</span>
            </p>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full rounded-full bg-emerald-500 transition-all"
                :style="{ width: round(m.completionRate) + '%' }"
              />
            </div>
          </div>
        </div>

        <!-- Secondary stat tiles -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="tile in tiles"
            :key="tile.key"
            class="rounded-xl border border-slate-100 bg-white/70 p-3"
          >
            <p class="text-caption flex items-center gap-1">
              <component :is="tile.icon" class="h-3.5 w-3.5 shrink-0" :class="tile.tone" />
              <span class="truncate">{{ tile.label }}</span>
            </p>
            <p
              class="mt-1 text-base font-bold"
              :class="tile.danger ? 'text-red-600' : 'text-slate-800'"
            >
              {{ tile.value }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
