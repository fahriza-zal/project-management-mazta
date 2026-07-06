<script setup>
defineProps({
  // Tailwind utility string controlling the shape, e.g. 'h-4 w-32'
  shape: { type: String, default: 'h-4 w-full' },
  rounded: { type: String, default: 'rounded-lg' },
})
</script>

<template>
  <div class="animate-pulse bg-slate-200" :class="[shape, rounded]" />
</template>
