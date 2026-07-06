<script setup>
import { computed } from 'vue'

const props = defineProps({
  // [{ label, value }]
  data: { type: Array, default: () => [] },
})

const max = computed(() => Math.max(1, ...props.data.map((d) => d.value)))
</script>

<template>
  <!-- Pure-CSS bar chart (dummy data, no chart library). -->
  <div class="flex h-48 items-end justify-between gap-3 px-1">
    <div v-for="d in data" :key="d.label" class="flex flex-1 flex-col items-center gap-2">
      <div class="flex w-full flex-1 items-end">
        <div
          class="w-full rounded-t-lg bg-gradient-to-t from-primary-500 to-primary-400 transition-all duration-500 hover:from-primary-600 hover:to-primary-500"
          :style="{ height: `${(d.value / max) * 100}%` }"
          :title="`${d.value} tasks`"
        />
      </div>
      <span class="text-xs text-slate-400">{{ d.label }}</span>
    </div>
  </div>
</template>
