<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/features/projects/stores/project'
import { useToast } from '@/shared/composables/useToast'
import { formatDate } from '@/shared/utils/format'
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  ViewColumnsIcon,
  CalendarDaysIcon,
  FlagIcon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
  UserPlusIcon,
} from '@heroicons/vue/24/outline'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import TaskAssignModal from '@/features/projects/components/TaskAssignModal.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const { error: toastError } = useToast()

const project = ref(null)
const loading = ref(true)
const notFound = ref(false)

// Task-assign modal
const assignOpen = ref(false)
const activeTask = ref(null)

function openAssign(task) {
  activeTask.value = task
  assignOpen.value = true
}

/** "IN_HOUSE" / "in_house" → "In House". */
function humanize(value) {
  if (!value) return '—'
  return String(value)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Colors follow the statuses/priorities defined in the project context.
const STATUS_COLORS = {
  draft: 'slate',
  active: 'info',
  'on hold': 'warning',
  completed: 'success',
  cancelled: 'danger',
}
const PRIORITY_COLORS = { low: 'slate', medium: 'info', high: 'warning', critical: 'danger' }

const statusColor = (name) => STATUS_COLORS[String(name).toLowerCase()] ?? 'slate'
const priorityColor = (name) => PRIORITY_COLORS[String(name).toLowerCase()] ?? 'slate'

const milestones = computed(() => project.value?.milestones ?? [])
const taskCount = computed(() =>
  milestones.value.reduce((sum, m) => sum + (m.tasks?.length ?? 0), 0),
)

function goToEdit() {
  router.push({ name: 'project-edit', params: { id: route.params.id } })
}

function goToBoard() {
  router.push({ name: 'project-board', params: { id: route.params.id } })
}

async function loadProject() {
  const data = await projectStore.fetchProjectDetail(route.params.id)
  if (!data) {
    notFound.value = true
    return
  }
  project.value = data
}

/** Refresh after an assignment change so the new assignees show up. */
async function onAssigned() {
  try {
    await loadProject()
  } catch (err) {
    toastError(err.message)
  }
}

onMounted(async () => {
  try {
    await loadProject()
  } catch (err) {
    toastError(err.message)
    notFound.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <!-- Header -->
    <div class="flex items-start gap-3">
      <BaseButton variant="ghost" size="sm" @click="router.back()">
        <ArrowLeftIcon class="h-4 w-4" />
      </BaseButton>
      <div class="min-w-0 flex-1">
        <p class="font-mono text-xs text-slate-500">
          {{ project?.fullCode || project?.prefix || '' }}
        </p>
        <h1 class="text-heading truncate">{{ project?.name || 'Project Detail' }}</h1>
      </div>
      <div v-if="project" class="flex shrink-0 items-center gap-2">
        <BaseButton variant="outline" @click="goToBoard">
          <ViewColumnsIcon class="h-4 w-4" />
          Board
        </BaseButton>
        <BaseButton variant="primary" @click="goToEdit">
          <PencilSquareIcon class="h-4 w-4" />
          Edit
        </BaseButton>
      </div>
    </div>

    <!-- Loading -->
    <BaseCard v-if="loading">
      <p class="py-12 text-center text-sm text-slate-400">Loading…</p>
    </BaseCard>

    <!-- Not found -->
    <BaseCard v-else-if="notFound">
      <BaseEmpty
        title="Project not found"
        description="The project you’re looking for doesn’t exist."
      />
    </BaseCard>

    <div v-else-if="project" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Left · Milestones → Tasks (main content) -->
      <div class="space-y-6 lg:col-span-2">
        <BaseCard title="Overview">
          <div class="flex flex-wrap items-center gap-1.5">
            <BaseBadge
              v-if="project.currentStatus?.name"
              :color="statusColor(project.currentStatus.name)"
              size="sm"
              dot
            >
              {{ project.currentStatus.name }}
            </BaseBadge>
            <BaseBadge color="primary" size="sm">{{ humanize(project.projectCategory) }}</BaseBadge>
            <BaseBadge color="slate" size="sm">{{ humanize(project.projectMode) }}</BaseBadge>
            <BaseBadge v-if="project.isClosed" color="danger" size="sm">
              <LockClosedIcon class="h-3.5 w-3.5" />
              Closed
            </BaseBadge>
          </div>
          <p class="mt-3 text-sm leading-relaxed text-slate-600">
            {{ project.description || 'No description.' }}
          </p>
        </BaseCard>

        <BaseCard
          title="Milestones"
          :subtitle="`${milestones.length} milestone(s) · ${taskCount} task(s)`"
        >
          <div v-if="milestones.length" class="space-y-4">
            <div
              v-for="m in milestones"
              :key="m.id"
              class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <FlagIcon class="h-4 w-4 text-primary-500" />
                  {{ m.name }}
                </p>
                <BaseBadge :color="m.isCounted ? 'success' : 'slate'" size="sm">
                  {{ m.isCounted ? 'Counted' : 'Not counted' }}
                </BaseBadge>
              </div>

              <p v-if="m.description" class="mt-1 text-xs text-slate-500">{{ m.description }}</p>

              <div class="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarDaysIcon class="h-3.5 w-3.5" />
                <span>
                  {{ formatDate(m.expectedStartDate) }} → {{ formatDate(m.expectedEndDate) }}
                </span>
              </div>

              <!-- Tasks under this milestone -->
              <ul v-if="m.tasks?.length" class="mt-3 space-y-1.5">
                <li
                  v-for="t in m.tasks"
                  :key="t.id"
                  class="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm"
                >
                  <ClipboardDocumentListIcon class="h-4 w-4 shrink-0 text-slate-400" />
                  <span class="min-w-0 flex-1 truncate text-slate-700">{{ t.title }}</span>

                  <!-- Assignees -->
                  <div v-if="t.assignments?.length" class="flex shrink-0 -space-x-1.5">
                    <BaseAvatar
                      v-for="a in t.assignments"
                      :key="a.id"
                      :name="a.employee?.fullName || '?'"
                      size="xs"
                    />
                  </div>

                  <BaseBadge v-if="t.priority" :color="priorityColor(t.priority)" size="sm">
                    {{ humanize(t.priority) }}
                  </BaseBadge>

                  <button
                    type="button"
                    class="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
                    title="Assign employees"
                    @click="openAssign(t)"
                  >
                    <UserPlusIcon class="h-4 w-4" />
                  </button>
                </li>
              </ul>
              <p v-else class="mt-2 text-xs text-slate-400">No tasks in this milestone.</p>
            </div>
          </div>
          <BaseEmpty
            v-else
            :icon="FlagIcon"
            title="No milestones yet"
            description="Edit the project to add milestones and tasks."
          />
        </BaseCard>
      </div>

      <!-- Right · Info + Units -->
      <div class="space-y-6">
        <BaseCard title="Information">
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Code</dt>
              <dd class="font-medium text-slate-800">{{ project.fullCode || project.prefix }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Start Date</dt>
              <dd class="font-medium text-slate-800">{{ formatDate(project.startDate) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Expected End</dt>
              <dd class="font-medium text-slate-800">{{ formatDate(project.expectedEndDate) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">End Date</dt>
              <dd class="font-medium text-slate-800">{{ formatDate(project.endDate) }}</dd>
            </div>
          </dl>
        </BaseCard>

        <BaseCard :title="`Units & Roles (${project.projectUnits?.length || 0})`">
          <ul v-if="project.projectUnits?.length" class="space-y-2">
            <li
              v-for="pu in project.projectUnits"
              :key="pu.id"
              class="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/60 px-3 py-2"
            >
              <BaseAvatar :name="pu.unit?.name || '?'" size="sm" />
              <span class="min-w-0 truncate text-sm font-medium text-slate-800">
                {{ pu.unit?.name || '—' }}
              </span>
              <BaseBadge v-if="pu.role?.name" color="info" size="sm" class="ml-auto shrink-0">
                {{ pu.role.name }}
              </BaseBadge>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-400">No units assigned.</p>
        </BaseCard>
      </div>
    </div>

    <TaskAssignModal v-model="assignOpen" :task="activeTask" @saved="onAssigned" />
  </div>
</template>
