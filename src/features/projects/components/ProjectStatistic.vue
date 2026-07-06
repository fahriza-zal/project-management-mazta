<script setup>
/** Small labelled statistic used on the project detail page. */
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: [Object, Function], default: null },
  color: { type: String, default: 'primary' }, // primary | success | warning | info | danger
})

const tones = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-green-50 text-success',
  warning: 'bg-amber-50 text-warning',
  info: 'bg-blue-50 text-info',
  danger: 'bg-red-50 text-danger',
}
</script>

<template>
  <div class="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
    <div v-if="icon" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="tones[color]">
      <component :is="icon" class="h-5 w-5" />
    </div>
    <div class="min-w-0">
      <p class="text-xl font-bold leading-tight text-slate-900">{{ value }}</p>
      <p class="truncate text-xs text-slate-500">{{ label }}</p>
    </div>
  </div>
</template>
