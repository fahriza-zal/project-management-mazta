<script setup>
defineProps({
  text: { type: String, default: '' },
  position: { type: String, default: 'top' }, // top | bottom | left | right
})

const pos = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}
</script>

<template>
  <span class="group relative inline-flex">
    <slot />
    <span
      v-if="text"
      class="pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100"
      :class="pos[position]"
    >
      {{ text }}
    </span>
  </span>
</template>
