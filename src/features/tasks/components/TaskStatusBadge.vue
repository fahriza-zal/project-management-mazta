<script setup>
import { computed } from 'vue'
import { TASK_STATUS_META } from '@/shared/constants'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'

const props = defineProps({ status: { type: String, required: true } })
const meta = computed(() => TASK_STATUS_META[props.status] ?? { label: props.status, color: 'slate' })
</script>

<template>
  <BaseBadge :color="meta.color" dot size="sm">{{ meta.label }}</BaseBadge>
</template>
