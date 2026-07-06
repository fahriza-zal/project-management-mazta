<script setup>
import { getUserById } from '@/shared/services/mockUsers'
import { formatDate } from '@/shared/utils/format'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'

defineProps({
  // [{ id, userId, action, target, time }]
  activities: { type: Array, default: () => [] },
})
</script>

<template>
  <ul class="space-y-1">
    <li
      v-for="a in activities"
      :key="a.id"
      class="flex items-start gap-3 rounded-lg -mx-2 px-2 py-2 hover:bg-slate-50"
    >
      <BaseAvatar :name="getUserById(a.userId)?.name || '?'" size="sm" />
      <div class="min-w-0 flex-1">
        <p class="text-sm text-slate-700">
          <span class="font-semibold text-slate-900">{{ getUserById(a.userId)?.name }}</span>
          {{ a.action }}
          <span class="font-medium text-slate-700">“{{ a.target }}”</span>
        </p>
        <p class="text-[11px] text-slate-400">{{ formatDate(a.time, { weekday: 'short' }) }}</p>
      </div>
    </li>
  </ul>
</template>
