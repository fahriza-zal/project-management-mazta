<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useProjectStore } from '@/features/projects/stores/project'
import { useTaskStore } from '@/features/tasks/stores/task'
import { UserIcon, BriefcaseIcon, BuildingOffice2Icon } from '@heroicons/vue/24/outline'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import ProjectStatistic from '@/features/projects/components/ProjectStatistic.vue'
import ProjectCard from '@/features/projects/components/ProjectCard.vue'
import { ClipboardDocumentListIcon, FolderIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const { projects } = storeToRefs(useProjectStore())
const { tasks } = storeToRefs(useTaskStore())

const myId = computed(() => auth.profile?.id)

const myProjects = computed(() =>
  projects.value.filter((p) => (p.memberIds || []).includes(myId.value)),
)
const myTasks = computed(() => tasks.value.filter((t) => t.assignedTo === myId.value))

const stats = computed(() => [
  { label: 'My Projects', value: myProjects.value.length, icon: FolderIcon, color: 'primary' },
  {
    label: 'Assigned Tasks',
    value: myTasks.value.length,
    icon: ClipboardDocumentListIcon,
    color: 'info',
  },
  {
    label: 'Completed Tasks',
    value: myTasks.value.filter((t) => t.status === 'DONE').length,
    icon: CheckCircleIcon,
    color: 'success',
  },
])
</script>

<template>
  <div class="space-y-6">
    <!-- Profile header -->
    <BaseCard>
      <div class="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <BaseAvatar :name="auth.profile?.name || 'Guest'" size="lg" />
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-bold text-slate-900">{{ auth.profile?.name }}</h1>
          <div
            class="mt-1 flex flex-col items-center gap-1 text-sm text-slate-500 sm:flex-row sm:gap-4"
          >
            <span class="inline-flex items-center gap-1.5"
              ><UserIcon class="h-4 w-4" />{{ auth.profile?.username }}</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><BriefcaseIcon class="h-4 w-4" />{{ auth.profile?.role }}</span
            >
            <span v-if="auth.profile?.units?.length" class="inline-flex items-center gap-1.5">
              <BuildingOffice2Icon class="h-4 w-4" />{{
                auth.profile.units.map((u) => u.name).join(', ')
              }}
            </span>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Stats -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ProjectStatistic v-for="s in stats" :key="s.label" v-bind="s" />
    </div>

    <!-- My projects -->
    <div>
      <h2 class="text-subheading mb-3">My Projects</h2>
      <div v-if="myProjects.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ProjectCard v-for="p in myProjects" :key="p.id" :project="p" />
      </div>
      <BaseCard v-else>
        <p class="py-6 text-center text-sm text-slate-400">
          You’re not assigned to any projects yet.
        </p>
      </BaseCard>
    </div>
  </div>
</template>
