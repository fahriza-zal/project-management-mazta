<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  danger: { type: Boolean, default: false },
})
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium"
    :class="
      danger
        ? 'text-danger hover:bg-red-50'
        : 'text-slate-700 hover:bg-slate-100'
    "
  >
    <component :is="icon" v-if="icon" class="h-4 w-4" :class="danger ? 'text-danger' : 'text-slate-400'" />
    <slot />
  </button>
</template>
