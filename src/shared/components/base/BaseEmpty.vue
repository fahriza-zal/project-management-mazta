<script setup>
import { InboxIcon } from '@heroicons/vue/24/outline'

defineProps({
  icon: { type: [Object, Function], default: InboxIcon },
  title: { type: String, default: 'Nothing here yet' },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
      <component :is="icon" class="h-7 w-7 text-slate-400" />
    </div>
    <h3 class="text-subheading">{{ title }}</h3>
    <p v-if="description" class="text-body mt-1 max-w-sm">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>
