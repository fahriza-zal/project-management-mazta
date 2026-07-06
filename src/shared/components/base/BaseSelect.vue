<script setup>
import { computed } from 'vue'
import { ChevronUpDownIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  label: { type: String, default: '' },
  // options: array of { value, label } or plain strings
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select…' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: () => `sel-${Math.random().toString(36).slice(2, 8)}` },
})
defineEmits(['update:modelValue'])

const normalized = computed(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o })),
)
const classes = computed(() => [
  'block w-full appearance-none rounded-xl border bg-white/70 backdrop-blur pl-3 pr-9 h-10 text-sm text-slate-800 focus-ring disabled:bg-slate-100/60',
  props.error ? 'border-danger focus:ring-danger/30 focus:border-danger' : 'border-white/70',
])
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="mb-1.5 block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :disabled="disabled"
        :class="classes"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option value="" disabled :selected="modelValue == null || modelValue === ''">
          {{ placeholder }}
        </option>
        <option
          v-for="opt in normalized"
          :key="opt.value"
          :value="opt.value"
          :selected="String(opt.value) === String(modelValue)"
        >
          {{ opt.label }}
        </option>
      </select>
      <ChevronUpDownIcon
        class="pointer-events-none absolute inset-y-0 right-3 my-auto h-5 w-5 text-slate-400"
      />
    </div>
    <p v-if="error" class="mt-1.5 text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-slate-400">{{ hint }}</p>
  </div>
</template>
