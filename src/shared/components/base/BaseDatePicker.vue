<script setup>
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'

/**
 * App-styled date picker (wraps @vuepic/vue-datepicker).
 * Drop-in replacement for the old `<BaseInput type="date">`: v-model stays a
 * `'yyyy-MM-dd'` string (or '' when cleared), matching the form + GraphQL contract.
 * The calendar is teleported to <body> so it isn't clipped inside modals.
 */
const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Pilih tanggal' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const value = computed({
  get: () => props.modelValue || null,
  set: (v) => emit('update:modelValue', v || ''),
})
</script>

<template>
  <div class="pm-datepicker" :class="{ 'pm-datepicker--error': error }">
    <label v-if="label" class="mb-1.5 block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <VueDatePicker
      v-model="value"
      model-type="yyyy-MM-dd"
      format="dd MMM yyyy"
      :enable-time-picker="false"
      :clearable="true"
      auto-apply
      teleport
      :disabled="disabled"
      :placeholder="placeholder"
    />
    <p v-if="error" class="mt-1.5 text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-slate-400">{{ hint }}</p>
  </div>
</template>

<!-- Global (unscoped): theme every datepicker consistently. The calendar menu is
     teleported to <body>, so variables must live on :root to reach it. -->
<style>
:root {
  --dp-primary-color: #0d9488;
  --dp-border-radius: 0.875rem;
  --dp-font-size: 0.875rem;
  --dp-font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
.pm-datepicker .dp__input {
  height: 2.5rem;
  background-color: rgb(255 255 255 / 0.7);
  border-color: rgb(226 232 240);
  color: rgb(30 41 59);
}
.pm-datepicker .dp__input::placeholder {
  color: rgb(148 163 184);
}
.pm-datepicker .dp__input:hover {
  border-color: rgb(203 213 225);
}
.pm-datepicker--error .dp__input {
  border-color: #ef4444;
}
</style>
