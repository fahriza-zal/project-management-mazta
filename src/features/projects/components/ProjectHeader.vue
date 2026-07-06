<script setup>
import { RouterLink } from 'vue-router'
import { formatDate } from '@/shared/utils/format'
import { CalendarDaysIcon, ViewColumnsIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import ProjectStatus from './ProjectStatus.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

defineProps({
  project: { type: Object, required: true },
})
</script>

<template>
  <div class="surface p-5 lg:p-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-caption font-medium">{{ project.code }}</span>
          <ProjectStatus :status="project.status" />
        </div>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">{{ project.name }}</h1>
        <p class="mt-2 max-w-2xl text-sm text-slate-500">{{ project.description }}</p>

        <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5">
            <CalendarDaysIcon class="h-4 w-4" />
            {{ formatDate(project.startDate) }} — {{ formatDate(project.endDate) }}
          </span>
        </div>
      </div>

      <div class="flex shrink-0 gap-2">
        <RouterLink :to="{ name: 'project-board', params: { id: project.id } }">
          <BaseButton variant="primary">
            <ViewColumnsIcon class="h-4 w-4" />
            Open Board
          </BaseButton>
        </RouterLink>
        <BaseButton variant="outline">
          <PencilSquareIcon class="h-4 w-4" />
          Edit
        </BaseButton>
      </div>
    </div>
  </div>
</template>
