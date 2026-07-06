<script setup>
/** Dashboard statistic card with icon, value, and optional trend. */
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: [Object, Function], default: null },
  color: { type: String, default: 'primary' }, // primary | success | warning | info
  trend: { type: String, default: '' }, // e.g. "+12%"
  trendUp: { type: Boolean, default: true },
})

const tones = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-green-50 text-success',
  warning: 'bg-amber-50 text-warning',
  info: 'bg-blue-50 text-info',
}
</script>

<template>
  <div class="surface p-5 transition hover:shadow-card-hover">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500">{{ label }}</p>
        <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900">{{ value }}</p>
      </div>
      <div v-if="icon" class="flex h-11 w-11 items-center justify-center rounded-xl" :class="tones[color]">
        <component :is="icon" class="h-6 w-6" />
      </div>
    </div>
    <p v-if="trend" class="mt-3 text-xs">
      <span :class="trendUp ? 'text-success' : 'text-danger'" class="font-semibold">{{ trend }}</span>
      <span class="text-slate-400"> vs last month</span>
    </p>
  </div>
</template>
