<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getUserById } from '@/shared/services/mockUsers'
import { formatDate, isOverdue } from '@/shared/utils/format'
import { CalendarDaysIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import ProjectStatus from './ProjectStatus.vue'
import ProjectProgress from './ProjectProgress.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'

const props = defineProps({
  project: { type: Object, required: true },
})

const members = computed(() => (props.project.memberIds || []).map(getUserById).filter(Boolean))
const overdue = computed(() => isOverdue(props.project.endDate) && props.project.progress < 100)
</script>

<template>
  <RouterLink
    :to="{ name: 'project-detail', params: { id: project.id } }"
    class="surface group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-caption font-medium">{{ project.code }}</p>
        <h3 class="truncate text-base font-semibold text-slate-900 group-hover:text-primary-700">
          {{ project.name }}
        </h3>
      </div>
      <ProjectStatus :status="project.status" />
    </div>

    <p class="mt-2 line-clamp-2 text-sm text-slate-500">{{ project.description }}</p>

    <div class="mt-4">
      <ProjectProgress :value="project.progress" />
    </div>

    <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
      <!-- Member avatars -->
      <div class="flex -space-x-2">
        <BaseAvatar v-for="m in members.slice(0, 3)" :key="m.id" :name="m.name" size="xs" />
        <span
          v-if="members.length > 3"
          class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-2 ring-white"
        >
          +{{ members.length - 3 }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 text-xs" :class="overdue ? 'text-danger' : 'text-slate-400'">
        <CheckCircleIcon class="h-4 w-4" />
        <span>{{ project.doneCount }}/{{ project.taskCount }}</span>
        <CalendarDaysIcon class="ml-2 h-4 w-4" />
        <span>{{ formatDate(project.endDate, { year: undefined }) }}</span>
      </div>
    </div>
  </RouterLink>
</template>
