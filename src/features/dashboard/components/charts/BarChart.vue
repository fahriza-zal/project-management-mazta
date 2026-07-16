<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Responsive single-series bar chart in plain SVG. Bars anchor to the zero
 * baseline; with `diverging`, positive and negative bars take different colors
 * (polarity around zero). Rounded top ends, a 2px gap between bars, hover tooltip.
 */
const props = defineProps({
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] }, // number[]
  height: { type: Number, default: 220 },
  color: { type: String, default: '#3b82f6' },
  diverging: { type: Boolean, default: false },
  posColor: { type: String, default: '#10b981' },
  negColor: { type: String, default: '#f43f5e' },
  unit: { type: String, default: '' },
  format: { type: Function, default: null },
})

const wrap = ref(null)
const width = ref(600)
let ro = null
onMounted(() => {
  if (!wrap.value) return
  const measure = () => (width.value = Math.max(220, wrap.value.clientWidth))
  measure()
  ro = new ResizeObserver(measure)
  ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())

const pad = { l: 44, r: 14, t: 10, b: 26 }
const n = computed(() => props.values.length)
const fmt = (v) =>
  props.format ? props.format(v) : `${Math.round((Number(v) || 0) * 10) / 10}${props.unit}`

const domain = computed(() => {
  const vals = props.values.map((v) => Number(v) || 0)
  let min = Math.min(0, ...(vals.length ? vals : [0]))
  let max = Math.max(0, ...(vals.length ? vals : [1]))
  if (max === min) max = min + 1
  max += (max - min) * 0.08
  return { min, max }
})

const geom = computed(() => {
  const plotL = pad.l
  const plotR = width.value - pad.r
  const plotT = pad.t
  const plotB = props.height - pad.b
  return { plotL, plotR, plotT, plotB, plotW: plotR - plotL, plotH: plotB - plotT }
})

const yAt = (v) => {
  const g = geom.value
  const { min, max } = domain.value
  return g.plotB - (((Number(v) || 0) - min) / (max - min)) * g.plotH
}
const yZero = computed(() => yAt(0))

const bandW = computed(() => (n.value ? geom.value.plotW / n.value : geom.value.plotW))
const barW = computed(() => Math.max(2, Math.min(38, bandW.value - 8)))
const xCenter = (i) => geom.value.plotL + bandW.value * (i + 0.5)

const bars = computed(() =>
  props.values.map((raw, i) => {
    const v = Number(raw) || 0
    const yv = yAt(v)
    const top = Math.min(yv, yZero.value)
    const h = Math.abs(yv - yZero.value)
    const color = props.diverging ? (v >= 0 ? props.posColor : props.negColor) : props.color
    return { i, v, x: xCenter(i) - barW.value / 2, y: top, h: Math.max(0, h), color }
  }),
)

const yTicks = computed(() => {
  const { min, max } = domain.value
  return Array.from({ length: 5 }, (_, i) => {
    const v = min + ((max - min) * i) / 4
    return { v, y: yAt(v) }
  })
})
const xTicks = computed(() => {
  if (!n.value) return []
  const step = Math.max(1, Math.ceil(n.value / 6))
  const out = []
  for (let i = 0; i < n.value; i += step) out.push({ i, x: xCenter(i), label: props.labels[i] })
  return out
})

const hoverIdx = ref(null)
</script>

<template>
  <div ref="wrap" class="relative w-full">
    <svg :width="width" :height="height" class="block">
      <!-- y gridlines + labels -->
      <line
        v-for="t in yTicks"
        :key="'g' + t.v"
        :x1="geom.plotL"
        :x2="geom.plotR"
        :y1="t.y"
        :y2="t.y"
        stroke="#e2e8f0"
        stroke-width="1"
      />
      <text
        v-for="t in yTicks"
        :key="'yl' + t.v"
        :x="geom.plotL - 8"
        :y="t.y + 3"
        text-anchor="end"
        class="fill-slate-400 text-[10px]"
      >
        {{ fmt(t.v) }}
      </text>

      <!-- zero baseline -->
      <line
        :x1="geom.plotL"
        :x2="geom.plotR"
        :y1="yZero"
        :y2="yZero"
        stroke="#cbd5e1"
        stroke-width="1"
      />

      <!-- bars -->
      <rect
        v-for="b in bars"
        :key="b.i"
        :x="b.x"
        :y="b.y"
        :width="barW"
        :height="b.h"
        rx="3"
        :fill="b.color"
        :fill-opacity="hoverIdx == null || hoverIdx === b.i ? 1 : 0.5"
        @mouseenter="hoverIdx = b.i"
        @mouseleave="hoverIdx = null"
      />

      <!-- x labels -->
      <text
        v-for="t in xTicks"
        :key="'xl' + t.i"
        :x="t.x"
        :y="height - 8"
        text-anchor="middle"
        class="fill-slate-400 text-[10px]"
      >
        {{ t.label }}
      </text>
    </svg>

    <div
      v-if="hoverIdx != null"
      class="pointer-events-none absolute top-2 z-10 rounded-lg border border-slate-200 bg-white/95 p-2 text-xs shadow-lg"
      :style="{
        left: bars[hoverIdx].x > width * 0.66 ? 'auto' : bars[hoverIdx].x + 'px',
        right: bars[hoverIdx].x > width * 0.66 ? width - bars[hoverIdx].x - barW + 'px' : 'auto',
      }"
    >
      <p class="font-semibold text-slate-700">{{ labels[hoverIdx] }}</p>
      <p class="font-semibold tabular-nums text-slate-800">{{ fmt(bars[hoverIdx].v) }}</p>
    </div>
  </div>
</template>
