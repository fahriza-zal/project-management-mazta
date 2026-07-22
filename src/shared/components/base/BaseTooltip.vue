<script setup>
import { ref } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  position: { type: String, default: 'top' }, // top | bottom | left | right
})

// The tooltip is teleported to <body> and positioned with `fixed` coords derived
// from the trigger's bounding rect. This keeps it out of any scroll container's
// overflow box (e.g. the collapsed sidebar's <nav>), so it never adds a stray
// horizontal scrollbar the way an absolutely-positioned child would.
const trigger = ref(null)
const show = ref(false)
const style = ref({})

const GAP = 8

function updatePosition() {
  const el = trigger.value
  if (!el) return
  const r = el.getBoundingClientRect()
  let top, left, transform
  switch (props.position) {
    case 'right':
      top = r.top + r.height / 2
      left = r.right + GAP
      transform = 'translateY(-50%)'
      break
    case 'left':
      top = r.top + r.height / 2
      left = r.left - GAP
      transform = 'translate(-100%, -50%)'
      break
    case 'bottom':
      top = r.bottom + GAP
      left = r.left + r.width / 2
      transform = 'translateX(-50%)'
      break
    default: // top
      top = r.top - GAP
      left = r.left + r.width / 2
      transform = 'translate(-50%, -100%)'
  }
  style.value = { top: `${top}px`, left: `${left}px`, transform }
}

function open() {
  if (!props.text) return
  updatePosition()
  show.value = true
}
function close() {
  show.value = false
}
</script>

<template>
  <span
    ref="trigger"
    class="inline-flex"
    @mouseenter="open"
    @mouseleave="close"
    @focusin="open"
    @focusout="close"
  >
    <slot />
    <Teleport to="body">
      <span
        v-if="text && show"
        class="pointer-events-none fixed z-[60] whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
        :style="style"
      >
        {{ text }}
      </span>
    </Teleport>
  </span>
</template>
