<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | outline | ghost | danger | success
  size: { type: String, default: 'md' }, // sm | md | lg
  type: { type: String, default: 'button' },
  block: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-xl border focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none'

const variants = {
  primary:
    'border-transparent bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow hover:from-primary-700 hover:to-accent-700',
  secondary: 'bg-white/70 border-white/60 text-primary-700 backdrop-blur hover:bg-white/90',
  outline: 'bg-white/60 border-white/70 text-slate-700 backdrop-blur hover:bg-white/90',
  ghost: 'bg-transparent border-transparent text-slate-600 hover:bg-white/60',
  danger: 'bg-danger border-danger text-white hover:bg-red-600 hover:border-red-600 shadow-soft',
  success: 'bg-success border-success text-white hover:bg-green-600 hover:border-green-600 shadow-soft',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

const classes = computed(() => [
  base,
  variants[props.variant] ?? variants.primary,
  sizes[props.size] ?? sizes.md,
  props.block ? 'w-full' : '',
])
</script>

<template>
  <button :type="type" :disabled="disabled || loading" :class="classes">
    <svg
      v-if="loading"
      class="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <slot />
  </button>
</template>
