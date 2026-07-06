<script setup>
import { computed } from 'vue'
import { TASK_PRIORITY_META } from '@/shared/constants'
import { FlagIcon } from '@heroicons/vue/24/solid'

const props = defineProps({
  priority: { type: String, required: true },
  iconOnly: { type: Boolean, default: false },
})
const meta = computed(() => TASK_PRIORITY_META[props.priority] ?? { label: props.priority, color: 'slate' })

const tones = {
  slate: 'text-slate-400',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
}
</script>

<template>
  <span class="inline-flex items-center gap-1 text-xs font-medium" :class="tones[meta.color]">
    <FlagIcon class="h-3.5 w-3.5" />
    <span v-if="!iconOnly">{{ meta.label }}</span>
  </span>
</template>
