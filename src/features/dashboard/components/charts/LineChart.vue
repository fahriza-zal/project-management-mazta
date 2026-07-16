<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Responsive multi-series line/area chart in plain SVG.
 * Width is measured (ResizeObserver) so the chart renders at real pixel size —
 * this keeps hover math trivial: the pointer's offsetX maps straight to a data index.
 * One y-axis only (never dual-axis). A legend appears for ≥ 2 series.
 */
const props = defineProps({
  labels: { type: Array, default: () => [] }, // x-axis labels (strings)
  series: { type: Array, default: () => [] }, // [{ name, color, values: number[] }]
  height: { type: Number, default: 260 },
  area: { type: Boolean, default: false },
  yMin: { type: Number, default: null },
  yMax: { type: Number, default: null },
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
const n = computed(() => props.labels.length)
const fmt = (v) =>
  props.format ? props.format(v) : `${Math.round((Number(v) || 0) * 10) / 10}${props.unit}`

const domain = computed(() => {
  const all = props.series.flatMap((s) => s.values.map((v) => Number(v) || 0))
  let min = props.yMin ?? Math.min(0, ...(all.length ? all : [0]))
  let max = props.yMax ?? Math.max(0, ...(all.length ? all : [1]))
  if (max === min) max = min + 1
  if (props.yMax == null) max += (max - min) * 0.08 // headroom
  return { min, max }
})

const geom = computed(() => {
  const plotL = pad.l
  const plotR = width.value - pad.r
  const plotT = pad.t
  const plotB = props.height - pad.b
  return { plotL, plotR, plotT, plotB, plotW: plotR - plotL, plotH: plotB - plotT }
})

const xAt = (i) => {
  const g = geom.value
  return n.value <= 1 ? (g.plotL + g.plotR) / 2 : g.plotL + (i / (n.value - 1)) * g.plotW
}
const yAt = (v) => {
  const g = geom.value
  const { min, max } = domain.value
  return g.plotB - (((Number(v) || 0) - min) / (max - min)) * g.plotH
}

const linePath = (values) =>
  values.length ? 'M' + values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' L') : ''
const areaPathOf = (values) => {
  if (values.length < 2) return ''
  const g = geom.value
  return (
    `M${xAt(0)},${g.plotB} L` +
    values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' L') +
    ` L${xAt(values.length - 1)},${g.plotB} Z`
  )
}

// y gridlines / ticks (5 bands)
const yTicks = computed(() => {
  const { min, max } = domain.value
  return Array.from({ length: 5 }, (_, i) => {
    const v = min + ((max - min) * i) / 4
    return { v, y: yAt(v) }
  })
})

// x ticks — at most ~6, evenly spaced
const xTicks = computed(() => {
  if (!n.value) return []
  const maxTicks = 6
  const step = Math.max(1, Math.ceil(n.value / maxTicks))
  const out = []
  for (let i = 0; i < n.value; i += step) out.push({ i, x: xAt(i), label: props.labels[i] })
  if (out[out.length - 1]?.i !== n.value - 1)
    out.push({ i: n.value - 1, x: xAt(n.value - 1), label: props.labels[n.value - 1] })
  return out
})

const showDots = computed(() => n.value <= 16)
const showLegend = computed(() => props.series.length > 1)

// ── Hover ─────────────────────────────────────────────────────────────────────
const hoverIdx = ref(null)
function onMove(e) {
  const g = geom.value
  const x = e.offsetX
  if (n.value <= 1) {
    hoverIdx.value = 0
    return
  }
  const t = (x - g.plotL) / g.plotW
  hoverIdx.value = Math.max(0, Math.min(n.value - 1, Math.round(t * (n.value - 1))))
}
function onLeave() {
  hoverIdx.value = null
}
const tooltipLeft = computed(() => (hoverIdx.value == null ? 0 : xAt(hoverIdx.value)))
const tooltipRight = computed(() => tooltipLeft.value > width.value * 0.66)
</script>

<template>
  <div ref="wrap" class="relative w-full">
    <!-- Legend -->
    <div v-if="showLegend" class="mb-2 flex flex-wrap gap-x-4 gap-y-1">
      <span
        v-for="s in series"
        :key="s.name"
        class="flex items-center gap-1.5 text-xs text-slate-500"
      >
        <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: s.color }" />
        {{ s.name }}
      </span>
    </div>

    <svg :width="width" :height="height" class="block" @mousemove="onMove" @mouseleave="onLeave">
      <!-- y gridlines + labels -->
      <g>
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
      </g>

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

      <!-- areas + lines -->
      <template v-for="s in series" :key="s.name">
        <path
          v-if="area"
          :d="areaPathOf(s.values)"
          :fill="s.color"
          fill-opacity="0.08"
          stroke="none"
        />
        <path
          :d="linePath(s.values)"
          fill="none"
          :stroke="s.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <template v-if="showDots">
          <circle
            v-for="(v, i) in s.values"
            :key="s.name + i"
            :cx="xAt(i)"
            :cy="yAt(v)"
            r="2.5"
            :fill="s.color"
          />
        </template>
      </template>

      <!-- hover crosshair + markers -->
      <g v-if="hoverIdx != null">
        <line
          :x1="xAt(hoverIdx)"
          :x2="xAt(hoverIdx)"
          :y1="geom.plotT"
          :y2="geom.plotB"
          stroke="#94a3b8"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
        <circle
          v-for="s in series"
          :key="'h' + s.name"
          :cx="xAt(hoverIdx)"
          :cy="yAt(s.values[hoverIdx])"
          r="3.5"
          :fill="s.color"
          stroke="#fff"
          stroke-width="1.5"
        />
      </g>
    </svg>

    <!-- tooltip -->
    <div
      v-if="hoverIdx != null"
      class="pointer-events-none absolute top-8 z-10 min-w-[7rem] rounded-lg border border-slate-200 bg-white/95 p-2 text-xs shadow-lg backdrop-blur"
      :style="{
        left: tooltipRight ? 'auto' : tooltipLeft + 8 + 'px',
        right: tooltipRight ? width - tooltipLeft + 8 + 'px' : 'auto',
      }"
    >
      <p class="mb-1 font-semibold text-slate-700">{{ labels[hoverIdx] }}</p>
      <p v-for="s in series" :key="'t' + s.name" class="flex items-center justify-between gap-3">
        <span class="flex items-center gap-1.5 text-slate-500">
          <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: s.color }" />
          {{ s.name }}
        </span>
        <span class="font-semibold tabular-nums text-slate-800">{{ fmt(s.values[hoverIdx]) }}</span>
      </p>
    </div>
  </div>
</template>
