<script setup>
import { computed } from 'vue'
import { getUserById } from '@/shared/services/mockUsers'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'

const props = defineProps({
  userId: { type: String, default: '' },
  showName: { type: Boolean, default: false },
  size: { type: String, default: 'xs' },
})
const user = computed(() => getUserById(props.userId))
</script>

<template>
  <div v-if="user" class="inline-flex items-center gap-2">
    <BaseAvatar :name="user.name" :size="size" />
    <span v-if="showName" class="text-sm text-slate-700">{{ user.name }}</span>
  </div>
  <span v-else class="text-xs text-slate-400">Unassigned</span>
</template>
