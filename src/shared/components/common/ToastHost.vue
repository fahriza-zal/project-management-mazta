<script setup>
import { useToast } from '@/shared/composables/useToast'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/solid'

const { toasts, dismiss } = useToast()

const config = {
  success: { icon: CheckCircleIcon, ring: 'text-success' },
  error: { icon: XCircleIcon, ring: 'text-danger' },
  warning: { icon: ExclamationTriangleIcon, ring: 'text-warning' },
  info: { icon: InformationCircleIcon, ring: 'text-info' },
}
</script>

<template>
  <div class="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-x-4 opacity-0"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-dropdown"
      >
        <component :is="config[t.type].icon" class="mt-0.5 h-5 w-5 shrink-0" :class="config[t.type].ring" />
        <p class="flex-1 text-sm text-slate-700">{{ t.message }}</p>
        <button class="text-slate-400 hover:text-slate-600" @click="dismiss(t.id)">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
