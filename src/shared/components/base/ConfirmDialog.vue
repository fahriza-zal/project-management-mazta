<script setup>
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, default: 'This action cannot be undone.' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  variant: { type: String, default: 'danger' }, // danger | primary
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

function cancel() {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="sm"
    :title="title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex gap-4">
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        :class="variant === 'danger' ? 'bg-red-50 text-danger' : 'bg-primary-50 text-primary-600'"
      >
        <ExclamationTriangleIcon class="h-6 w-6" />
      </div>
      <p class="text-body pt-1">{{ message }}</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" @click="cancel">{{ cancelText }}</BaseButton>
        <BaseButton :variant="variant" :loading="loading" @click="emit('confirm')">
          {{ confirmText }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
