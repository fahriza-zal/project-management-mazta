<script setup>
import { computed } from 'vue'
import { PROJECT_STATUS_META } from '@/shared/constants'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'

const props = defineProps({
  status: { type: String, required: true },
})
const meta = computed(() => PROJECT_STATUS_META[props.status] ?? { label: props.status, color: 'slate' })
</script>

<template>
  <BaseBadge :color="meta.color" dot>{{ meta.label }}</BaseBadge>
</template>
