<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/features/projects/stores/project'
import { useTaskStore } from '@/features/tasks/stores/task'
import { useAuthStore } from '@/features/auth/stores/auth'
import { taskTrend, activities } from '@/features/dashboard/services/mockDashboard'
import { PROJECT_STATUS, TASK_STATUS } from '@/shared/constants'
import {
  FolderIcon,
  BoltIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'
import StatCard from '@/features/dashboard/components/StatCard.vue'
import TaskProgressChart from '@/features/dashboard/components/TaskProgressChart.vue'
import UpcomingDeadline from '@/features/dashboard/components/UpcomingDeadline.vue'
import RecentActivity from '@/features/dashboard/components/RecentActivity.vue'
import ProjectCard from '@/features/projects/components/ProjectCard.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'

const auth = useAuthStore()
const { projects } = storeToRefs(useProjectStore())
const { tasks } = storeToRefs(useTaskStore())

const stats = computed(() => [
  {
    label: 'Total Projects',
    value: projects.value.length,
    icon: FolderIcon,
    color: 'primary',
    trend: '+8%',
  },
  {
    label: 'Active Projects',
    value: projects.value.filter((p) => p.status === PROJECT_STATUS.ACTIVE).length,
    icon: BoltIcon,
    color: 'info',
    trend: '+3%',
  },
  {
    label: 'Completed',
    value: projects.value.filter((p) => p.status === PROJECT_STATUS.COMPLETED).length,
    icon: CheckBadgeIcon,
    color: 'success',
    trend: '+12%',
  },
  {
    label: 'Total Tasks',
    value: tasks.value.length,
    icon: ClipboardDocumentListIcon,
    color: 'warning',
    trend: '+5%',
  },
])

const recentProjects = computed(() =>
  [...projects.value]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3),
)

const upcoming = computed(() =>
  [...projects.value]
    .filter((p) => p.status !== PROJECT_STATUS.COMPLETED && p.status !== PROJECT_STATUS.CANCELLED)
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
    .slice(0, 5),
)

// Task status distribution for the small breakdown.
const taskBreakdown = computed(() => {
  const counts = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 }
  for (const t of tasks.value) counts[t.status] = (counts[t.status] || 0) + 1
  return [
    { label: 'Todo', value: counts[TASK_STATUS.TODO], color: 'bg-slate-400' },
    { label: 'In Progress', value: counts[TASK_STATUS.IN_PROGRESS], color: 'bg-info' },
    { label: 'Review', value: counts[TASK_STATUS.REVIEW], color: 'bg-warning' },
    { label: 'Done', value: counts[TASK_STATUS.DONE], color: 'bg-success' },
  ]
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-heading">Welcome back, {{ auth.profile?.name?.split(' ')[0] || 'there' }}</h1>
      <p class="text-body mt-1">Here’s what’s happening across your projects today.</p>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard v-for="s in stats" :key="s.label" v-bind="s" />
    </div>

    <!-- Chart + deadlines -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <BaseCard class="lg:col-span-2" title="Task Completion" subtitle="Tasks completed this week">
        <TaskProgressChart :data="taskTrend" />
        <div class="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <div v-for="b in taskBreakdown" :key="b.label" class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full" :class="b.color" />
            <div>
              <p class="text-lg font-bold leading-none text-slate-900">{{ b.value }}</p>
              <p class="text-[11px] text-slate-400">{{ b.label }}</p>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard title="Upcoming Deadlines" subtitle="Projects due soon">
        <UpcomingDeadline :projects="upcoming" />
      </BaseCard>
    </div>

    <!-- Recent projects -->
    <div>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-subheading">Recent Projects</h2>
        <RouterLink
          :to="{ name: 'projects' }"
          class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          View all <ArrowRightIcon class="h-4 w-4" />
        </RouterLink>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ProjectCard v-for="p in recentProjects" :key="p.id" :project="p" />
      </div>
    </div>

    <!-- Recent activity -->
    <BaseCard title="Recent Activity" subtitle="Latest updates from your team">
      <RecentActivity :activities="activities" />
    </BaseCard>
  </div>
</template>
