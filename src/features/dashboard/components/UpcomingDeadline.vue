<script setup>
import { RouterLink } from 'vue-router'
import { formatDate, fromNow, isOverdue } from '@/shared/utils/format'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'

defineProps({
  // [{ id, name, endDate }]
  projects: { type: Array, default: () => [] },
})
</script>

<template>
  <ul class="divide-y divide-slate-100">
    <li v-for="p in projects" :key="p.id">
      <RouterLink
        :to="{ name: 'project-detail', params: { id: p.id } }"
        class="flex items-center gap-3 py-3 transition hover:bg-slate-50 -mx-2 px-2 rounded-lg"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          :class="isOverdue(p.endDate) ? 'bg-red-50 text-danger' : 'bg-primary-50 text-primary-600'"
        >
          <CalendarDaysIcon class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-800">{{ p.name }}</p>
          <p class="text-xs text-slate-400">{{ formatDate(p.endDate) }}</p>
        </div>
        <span
          class="shrink-0 text-xs font-medium"
          :class="isOverdue(p.endDate) ? 'text-danger' : 'text-slate-500'"
        >
          {{ fromNow(p.endDate) }}
        </span>
      </RouterLink>
    </li>
  </ul>
</template>
