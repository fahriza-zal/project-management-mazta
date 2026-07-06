<script setup>
import { computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  modelValue: { type: Number, default: 1 }, // current page
  total: { type: Number, default: 0 }, // total items
  pageSize: { type: Number, default: 10 },
})
const emit = defineEmits(['update:modelValue'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.modelValue - 1) * props.pageSize + 1))
const rangeEnd = computed(() => Math.min(props.modelValue * props.pageSize, props.total))

// Compact page list with ellipsis.
const pages = computed(() => {
  const tp = totalPages.value
  const cur = props.modelValue
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const out = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(tp - 1, cur + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < tp - 1) out.push('…')
  out.push(tp)
  return out
})

function go(p) {
  if (p >= 1 && p <= totalPages.value && p !== props.modelValue) emit('update:modelValue', p)
}
</script>

<template>
  <div class="flex flex-col items-center justify-between gap-3 sm:flex-row">
    <p class="text-xs text-slate-500">
      Showing <span class="font-medium text-slate-700">{{ rangeStart }}–{{ rangeEnd }}</span>
      of <span class="font-medium text-slate-700">{{ total }}</span>
    </p>

    <div class="flex items-center gap-1">
      <button
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        :disabled="modelValue === 1"
        @click="go(modelValue - 1)"
      >
        <ChevronLeftIcon class="h-4 w-4" />
      </button>

      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === '…'" class="px-2 text-slate-400">…</span>
        <button
          v-else
          class="flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium"
          :class="
            p === modelValue
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          "
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>

      <button
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        :disabled="modelValue === totalPages"
        @click="go(modelValue + 1)"
      >
        <ChevronRightIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
