<script setup>
import { computed, ref } from 'vue'

/**
 * Segmented donut chart in plain SVG (no deps). Shows the composition of a whole
 * across a few categories, with a big total in the center and a legend beside it.
 * `segments`: [{ label, value, color }]. Hovering a segment (or legend row)
 * highlights it and shows its share.
 */
const props = defineProps({
  segments: { type: Array, default: () => [] }, // [{ label, value, color }]
  size: { type: Number, default: 176 },
  thickness: { type: Number, default: 22 },
  centerLabel: { type: String, default: 'Total' },
  format: { type: Function, default: null },
})

const fmt = (v) => (props.format ? props.format(v) : Math.round(Number(v) || 0))

const data = computed(() =>
  props.segments.map((s) => ({ ...s, value: Math.max(0, Number(s.value) || 0) })),
)
const total = computed(() => data.value.reduce((a, s) => a + s.value, 0))

const r = computed(() => (props.size - props.thickness) / 2)
const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
const circ = computed(() => 2 * Math.PI * r.value)

// Precompute each arc's dash length + rotation offset around the ring.
const arcs = computed(() => {
  const t = total.value || 1
  let acc = 0
  return data.value.map((s, i) => {
    const frac = s.value / t
    const dash = frac * circ.value
    const rotation = (acc / t) * 360 - 90 // start at 12 o'clock
    acc += s.value
    return { ...s, i, frac, dash, gap: circ.value - dash, rotation }
  })
})

const hoverIdx = ref(null)
const active = computed(() => (hoverIdx.value != null ? arcs.value[hoverIdx.value] : null))
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <div class="relative shrink-0" :style="{ width: size + 'px', height: size + 'px' }">
      <svg :width="size" :height="size" class="block">
        <g :transform="`translate(${cx} ${cy})`">
          <!-- track -->
          <circle cx="0" cy="0" :r="r" fill="none" stroke="#f1f5f9" :stroke-width="thickness" />
          <!-- segments -->
          <circle
            v-for="a in arcs"
            :key="a.i"
            cx="0"
            cy="0"
            :r="r"
            fill="none"
            :stroke="a.color"
            :stroke-width="thickness"
            :stroke-dasharray="`${a.dash} ${a.gap}`"
            :stroke-dashoffset="0"
            :transform="`rotate(${a.rotation})`"
            :opacity="hoverIdx == null || hoverIdx === a.i ? 1 : 0.35"
            stroke-linecap="butt"
            class="cursor-pointer transition-opacity"
            @mouseenter="hoverIdx = a.i"
            @mouseleave="hoverIdx = null"
          />
        </g>
      </svg>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold tabular-nums text-slate-900">
          {{ active ? fmt(active.value) : fmt(total) }}
        </span>
        <span class="max-w-[6rem] truncate text-[11px] font-medium text-slate-400">
          {{ active ? active.label : centerLabel }}
        </span>
      </div>
    </div>

    <!-- legend -->
    <ul class="w-full space-y-1.5">
      <li
        v-for="a in arcs"
        :key="'l' + a.i"
        class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1 text-sm transition"
        :class="hoverIdx === a.i ? 'bg-slate-50' : ''"
        @mouseenter="hoverIdx = a.i"
        @mouseleave="hoverIdx = null"
      >
        <span class="flex min-w-0 items-center gap-2 text-slate-600">
          <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: a.color }" />
          <span class="truncate">{{ a.label }}</span>
        </span>
        <span class="shrink-0 font-semibold tabular-nums text-slate-800">
          {{ fmt(a.value) }}
          <span class="ml-1 text-xs font-normal text-slate-400"
            >{{ Math.round(a.frac * 100) }}%</span
          >
        </span>
      </li>
    </ul>
  </div>
</template>
