<script setup>
import { computed } from 'vue'
import { formatDate } from '@/shared/utils/format'
import {
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FlagIcon,
} from '@heroicons/vue/24/outline'

/**
 * Compact, read-only panel for a milestone's computed `metric` block
 * (fields on `milestones[].metric`). Health/Risk hero + a few completion and
 * schedule signals; lives inside an expanded milestone accordion.
 */
const props = defineProps({
  metric: { type: Object, default: null },
})

const m = computed(() => props.metric ?? {})

const round = (v) => Math.round(Number(v) || 0)

function scoreTone(value, invert = false) {
  const v = Number(value) || 0
  const good = invert ? v < 34 : v >= 67
  const bad = invert ? v >= 67 : v < 34
  if (good) return 'success'
  if (bad) return 'danger'
  return 'warning'
}

function scoreTint(value, invert = false) {
  return {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
  }[scoreTone(value, invert)]
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center justify-between gap-2">
      <p class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
        <ChartBarIcon class="h-4 w-4 text-primary-500" />
        Milestone Metrics
      </p>
      <span v-if="m.calculatedAt" class="text-caption">
        Updated {{ formatDate(m.calculatedAt) }}
      </span>
    </div>

    <!-- Hero: Health & Risk -->
    <div class="grid grid-cols-2 gap-3">
      <div
        class="flex items-center justify-between rounded-xl border p-3"
        :class="scoreTint(m.healthScore)"
      >
        <div>
          <p class="text-xs font-medium opacity-80">Health Score</p>
          <p class="text-2xl font-bold leading-tight">
            {{ round(m.healthScore) }}<span class="text-sm font-medium opacity-60">/100</span>
          </p>
        </div>
        <ShieldCheckIcon class="h-8 w-8 opacity-40" />
      </div>
      <div
        class="flex items-center justify-between rounded-xl border p-3"
        :class="scoreTint(m.riskScore, true)"
      >
        <div>
          <p class="text-xs font-medium opacity-80">Risk Score</p>
          <p class="text-2xl font-bold leading-tight">
            {{ round(m.riskScore) }}<span class="text-sm font-medium opacity-60">/100</span>
          </p>
        </div>
        <ExclamationTriangleIcon class="h-8 w-8 opacity-40" />
      </div>
    </div>

    <!-- Stat tiles — kept lean: completion & schedule signals only -->
    <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <p class="text-caption flex items-center gap-1">
          <CheckCircleIcon class="h-3.5 w-3.5 text-emerald-500" />
          Completed
        </p>
        <p class="mt-0.5 text-lg font-bold text-slate-800">
          {{ m.completedTasks ?? 0 }}
          <span class="text-sm font-medium text-slate-400">/ {{ m.totalTasks ?? 0 }}</span>
        </p>
      </div>
      <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <p class="text-caption flex items-center gap-1">
          <ExclamationTriangleIcon class="h-3.5 w-3.5 text-red-400" />
          Overdue
        </p>
        <p
          class="mt-0.5 text-lg font-bold"
          :class="(m.overdueTasks || 0) > 0 ? 'text-red-600' : 'text-slate-800'"
        >
          {{ m.overdueTasks ?? 0 }}
        </p>
      </div>
      <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <p class="text-caption flex items-center gap-1">
          <FlagIcon class="h-3.5 w-3.5 text-slate-400" />
          On Time / Late
        </p>
        <p class="mt-0.5 text-lg font-bold">
          <span class="text-emerald-600">{{ m.completedOnTime ?? 0 }}</span>
          <span class="text-sm font-medium text-slate-300"> / </span>
          <span class="text-amber-600">{{ m.completedLate ?? 0 }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
