<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  align: { type: String, default: 'right' }, // left | right
  width: { type: String, default: 'w-48' },
})

const open = ref(false)
const root = ref(null)

function toggle() {
  open.value = !open.value
}
function close() {
  open.value = false
}
function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) close()
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative inline-block text-left">
    <div @click="toggle">
      <slot name="trigger" :open="open" />
    </div>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute z-40 mt-2 origin-top rounded-2xl border border-white/60 bg-white/80 p-1.5 shadow-dropdown backdrop-blur-xl"
        :class="[width, align === 'right' ? 'right-0' : 'left-0']"
        @click="close"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
