<script setup>
import { computed } from 'vue'

/**
 * Minimal responsive sparkline (no axes). Scales to its container width via a
 * `preserveAspectRatio="none"` viewBox; the stroke stays crisp through
 * `vector-effect="non-scaling-stroke"`, so horizontal stretching never fattens it.
 */
const props = defineProps({
  points: { type: Array, default: () => [] }, // number[]
  color: { type: String, default: '#3b82f6' },
  height: { type: Number, default: 36 },
  area: { type: Boolean, default: true },
})

const H = computed(() => props.height)
const W = 100 // viewBox width; actual width comes from CSS (100%)

// Map values into the viewBox with a small vertical inset so peaks aren't clipped.
const coords = computed(() => {
  const vals = props.points.map((v) => Number(v) || 0)
  if (!vals.length) return []
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const pad = 3
  const n = vals.length
  return vals.map((v, i) => {
    const x = n === 1 ? W / 2 : (i / (n - 1)) * W
    const y = H.value - pad - ((v - min) / span) * (H.value - pad * 2)
    return [x, y]
  })
})

const linePath = computed(() =>
  coords.value.length ? 'M' + coords.value.map(([x, y]) => `${x},${y}`).join(' L') : '',
)
const areaPath = computed(() => {
  if (coords.value.length < 2) return ''
  const first = coords.value[0]
  const last = coords.value[coords.value.length - 1]
  return (
    `M${first[0]},${H.value} L` +
    coords.value.map(([x, y]) => `${x},${y}`).join(' L') +
    ` L${last[0]},${H.value} Z`
  )
})
const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    :height="H"
    width="100%"
    preserveAspectRatio="none"
    class="block overflow-visible"
  >
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.22" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path v-if="area && areaPath" :d="areaPath" :fill="`url(#${gradId})`" stroke="none" />
    <path
      v-if="linePath"
      :d="linePath"
      fill="none"
      :stroke="color"
      stroke-width="1.75"
      stroke-linejoin="round"
      stroke-linecap="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
