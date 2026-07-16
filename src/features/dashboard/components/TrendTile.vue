<script setup>
import { computed } from 'vue'
import { ArrowUpRightIcon, ArrowDownRightIcon, MinusSmallIcon } from '@heroicons/vue/20/solid'
import Sparkline from '@/features/dashboard/components/charts/Sparkline.vue'

/**
 * Hero metric tile: current value + change vs the previous point + a sparkline.
 * `invert` flips the good/bad coloring for metrics where lower is better (e.g. risk).
 */
const props = defineProps({
  label: { type: String, required: true },
  points: { type: Array, default: () => [] }, // number[] over time
  color: { type: String, default: '#3b82f6' },
  unit: { type: String, default: '' },
  invert: { type: Boolean, default: false },
  format: { type: Function, default: null },
})

const nums = computed(() => props.points.map((v) => Number(v) || 0))
const current = computed(() => (nums.value.length ? nums.value[nums.value.length - 1] : 0))
const previous = computed(() => (nums.value.length > 1 ? nums.value[nums.value.length - 2] : null))
const delta = computed(() => (previous.value == null ? null : current.value - previous.value))

const fmt = (v) => (props.format ? props.format(v) : `${Math.round((Number(v) || 0) * 10) / 10}`)

const direction = computed(() => {
  if (delta.value == null || Math.abs(delta.value) < 1e-9) return 'flat'
  return delta.value > 0 ? 'up' : 'down'
})
// Good vs bad: up is good unless inverted (then down is good).
const tone = computed(() => {
  if (direction.value === 'flat') return 'text-slate-400'
  const good = props.invert ? direction.value === 'down' : direction.value === 'up'
  return good ? 'text-success' : 'text-danger'
})
const arrow = computed(() =>
  direction.value === 'up'
    ? ArrowUpRightIcon
    : direction.value === 'down'
      ? ArrowDownRightIcon
      : MinusSmallIcon,
)
</script>

<template>
  <div class="surface flex flex-col p-4">
    <p class="truncate text-xs font-medium text-slate-500">{{ label }}</p>
    <div class="mt-1 flex items-baseline gap-2">
      <p class="text-2xl font-bold tracking-tight text-slate-900">{{ fmt(current) }}{{ unit }}</p>
      <span
        v-if="delta != null"
        class="flex items-center gap-0.5 text-xs font-semibold"
        :class="tone"
      >
        <component :is="arrow" class="h-3.5 w-3.5" />
        {{ fmt(Math.abs(delta)) }}{{ unit }}
      </span>
    </div>
    <div class="mt-3">
      <Sparkline :points="points" :color="color" :height="34" />
    </div>
  </div>
</template>
