<script setup>
import { computed } from 'vue'

/**
 * Compact radial gauge for a single 0–100 score, drawn in plain SVG (no deps).
 * A 270° track with a colored value arc and the value + label stacked in the
 * center. Color can be fixed (`color`) or derived from thresholds (`polarity`):
 * `good` = higher is better (green→amber→red as it drops), `bad` = higher is
 * worse (used for Risk). Matches the palette of the sibling BarChart/LineChart.
 */
const props = defineProps({
  value: { type: [Number, String], default: 0 }, // 0–100
  label: { type: String, default: '' },
  size: { type: Number, default: 132 },
  color: { type: String, default: '' }, // fixed hue; overrides polarity
  polarity: { type: String, default: 'good' }, // 'good' | 'bad' | 'neutral'
})

const pct = computed(() => {
  const n = Number(props.value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10))
})

// Threshold color when no fixed `color` is given.
const hue = computed(() => {
  if (props.color) return props.color
  const v = pct.value
  if (props.polarity === 'neutral') return '#3b82f6'
  const good = props.polarity !== 'bad'
  const score = good ? v : 100 - v // normalize so higher = healthier
  if (score >= 70) return '#10b981' // green
  if (score >= 40) return '#f59e0b' // amber
  return '#f43f5e' // red
})

// Geometry: 270° arc, gap centered at the bottom.
const START = 135 // deg
const SWEEP = 270 // deg
const stroke = 10
const r = computed(() => (props.size - stroke) / 2 - 2)
const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
const circ = computed(() => (2 * Math.PI * r.value * SWEEP) / 360)

const polar = (deg) => {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx.value + r.value * Math.cos(rad), y: cy.value + r.value * Math.sin(rad) }
}
const arcPath = computed(() => {
  const a = polar(START)
  const b = polar(START + SWEEP)
  const large = SWEEP > 180 ? 1 : 0
  return `M${a.x} ${a.y} A${r.value} ${r.value} 0 ${large} 1 ${b.x} ${b.y}`
})
const dashOffset = computed(() => circ.value * (1 - pct.value / 100))
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="relative" :style="{ width: size + 'px', height: size + 'px' }">
      <svg :width="size" :height="size" class="block -rotate-0">
        <!-- track -->
        <path
          :d="arcPath"
          fill="none"
          stroke="#e2e8f0"
          :stroke-width="stroke"
          stroke-linecap="round"
        />
        <!-- value arc -->
        <path
          :d="arcPath"
          fill="none"
          :stroke="hue"
          :stroke-width="stroke"
          stroke-linecap="round"
          :stroke-dasharray="circ"
          :stroke-dashoffset="dashOffset"
          class="transition-all duration-500"
        />
      </svg>
      <div class="absolute inset-0 flex items-center justify-center">
        <span
          class="font-bold tabular-nums text-slate-900"
          :style="{ fontSize: Math.round(size * 0.22) + 'px' }"
          >{{ pct }}</span
        >
        <span class="ml-0.5 text-[10px] font-medium text-slate-400">%</span>
      </div>
    </div>
    <p class="mt-0.5 text-center text-xs font-medium text-slate-600">{{ label }}</p>
  </div>
</template>
