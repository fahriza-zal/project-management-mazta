<script setup>
import { computed } from 'vue'
import { BADGE_COLOR_CLASSES } from '@/shared/constants'

const props = defineProps({
  color: { type: String, default: 'slate' },
  size: { type: String, default: 'md' }, // sm | md
  dot: { type: Boolean, default: false },
})

const colorClass = computed(() => BADGE_COLOR_CLASSES[props.color] ?? BADGE_COLOR_CLASSES.slate)
const sizeClass = computed(() => (props.size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'))
const dotColor = computed(
  () =>
    ({
      slate: 'bg-slate-400',
      primary: 'bg-primary-500',
      info: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-amber-500',
      danger: 'bg-red-500',
    })[props.color] ?? 'bg-slate-400',
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset"
    :class="[colorClass, sizeClass]"
  >
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full" :class="dotColor" />
    <slot />
  </span>
</template>
