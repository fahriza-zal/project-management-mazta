<script setup>
import { watch, onUnmounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg | xl
  closeOnBackdrop: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'close'])

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKey(e) {
  if (e.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="closeOnBackdrop && close()"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-4 opacity-0 sm:scale-95"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="translate-y-4 opacity-0 sm:scale-95"
        >
          <div
            v-if="modelValue"
            class="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/60 bg-white/85 shadow-glass-lg backdrop-blur-2xl sm:rounded-3xl"
            :class="sizes[size]"
          >
            <div class="flex items-start justify-between gap-3 border-b border-white/50 px-5 py-4">
              <div>
                <h3 class="text-subheading">{{ title }}</h3>
                <p v-if="subtitle" class="text-caption mt-0.5">{{ subtitle }}</p>
              </div>
              <button
                class="-mr-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                @click="close"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4">
              <slot />
            </div>

            <div v-if="$slots.footer" class="border-t border-white/50 bg-white/40 px-5 py-3">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
