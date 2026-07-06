<script setup>
import { computed } from 'vue'
import { clampPercent } from '@/shared/utils/format'

const props = defineProps({
  value: { type: Number, default: 0 },
  showLabel: { type: Boolean, default: true },
  size: { type: String, default: 'md' }, // sm | md
})

const pct = computed(() => clampPercent(props.value))
const barColor = computed(() => {
  if (pct.value >= 100) return 'bg-success'
  if (pct.value >= 50) return 'bg-primary-600'
  if (pct.value > 0) return 'bg-info'
  return 'bg-slate-300'
})
const height = computed(() => (props.size === 'sm' ? 'h-1.5' : 'h-2'))
</script>

<template>
  <div>
    <div v-if="showLabel" class="mb-1 flex items-center justify-between text-xs">
      <span class="text-slate-500">Progress</span>
      <span class="font-semibold text-slate-700">{{ pct }}%</span>
    </div>
    <div class="w-full overflow-hidden rounded-full bg-slate-100" :class="height">
      <div class="h-full rounded-full transition-all duration-500" :class="barColor" :style="{ width: `${pct}%` }" />
    </div>
  </div>
</template>
