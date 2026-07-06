<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: () => `inp-${Math.random().toString(36).slice(2, 8)}` },
})
defineEmits(['update:modelValue'])

const slots = useSlots()
const inputClasses = computed(() => [
  'block w-full rounded-xl border bg-white/70 backdrop-blur text-sm text-slate-800 placeholder:text-slate-400 h-10 focus-ring disabled:bg-slate-100/60 disabled:text-slate-400',
  slots.prefix ? 'pl-10' : 'pl-3',
  slots.suffix ? 'pr-10' : 'pr-3',
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
      <span v-if="$slots.prefix" class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        <slot name="prefix" />
      </span>
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="inputClasses"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <span v-if="$slots.suffix" class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
        <slot name="suffix" />
      </span>
    </div>
    <p v-if="error" class="mt-1.5 text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-slate-400">{{ hint }}</p>
  </div>
</template>
