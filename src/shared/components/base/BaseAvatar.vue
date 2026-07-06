<script setup>
import { computed } from 'vue'
import { initials as toInitials } from '@/shared/utils/format'

const props = defineProps({
  name: { type: String, default: '' },
  src: { type: String, default: '' },
  size: { type: String, default: 'md' }, // xs | sm | md | lg
})

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

const sizeClass = computed(() => sizes[props.size] ?? sizes.md)

// Deterministic background color from the name.
const palette = [
  'bg-primary-100 text-primary-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
]
const colorClass = computed(() => {
  const sum = [...(props.name || '?')].reduce((a, c) => a + c.charCodeAt(0), 0)
  return palette[sum % palette.length]
})
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-white"
    :class="[sizeClass, src ? '' : colorClass]"
    :title="name"
  >
    <img v-if="src" :src="src" :alt="name" class="h-full w-full object-cover" />
    <span v-else>{{ toInitials(name) }}</span>
  </span>
</template>
