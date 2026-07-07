<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/features/projects/stores/project'
import { useToast } from '@/shared/composables/useToast'
import { ArrowLeftIcon, CheckCircleIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseDatePicker from '@/shared/components/base/BaseDatePicker.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseSearchSelect from '@/shared/components/base/BaseSearchSelect.vue'
import ConfirmDialog from '@/shared/components/base/ConfirmDialog.vue'
import ProjectUnitBuilder from '@/features/projects/components/ProjectUnitBuilder.vue'
import MilestoneBuilder from '@/features/projects/components/MilestoneBuilder.vue'
import InitialTaskBuilder from '@/features/projects/components/InitialTaskBuilder.vue'

const router = useRouter()
const projectStore = useProjectStore()
const { success, error: toastError } = useToast()

const form = ref({
  name: '',
  prefix: '',
  description: '',
  projectCategory: '',
  projectMode: '',
  startDate: '',
  expectedEndDate: '',
  hasParent: false,
  parentId: null,
  units: [{ unitId: null, roleId: '' }],
})
const milestones = ref([])
const initialTasks = ref([])
const errors = ref({})

// Staged flow: the project is created first; its id then unlocks steps 2 & 3.
const createdProject = ref(null)
const projectCreated = computed(() => !!createdProject.value)

const submittingProject = ref(false)
const submittingMilestones = ref(false)
const submittingTasks = ref(false)

const categoryOptions = ref([])
const modeOptions = ref([])
const priorityOptions = ref([])

/** "IN_HOUSE" → "In House" for readable enum labels. */
function humanize(name) {
  return name
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function loadEnum(typeName, target) {
  try {
    const names = await projectStore.fetchEnumValues(typeName)
    target.value = names.map((name) => ({ value: name, label: humanize(name) }))
  } catch {
    target.value = []
  }
}

const fetchParents = (term) => projectStore.fetchParentOptions(term)
const fetchUnits = (term) => projectStore.fetchUnitOptions(term)
const fetchRoles = (term) => projectStore.fetchRoleOptions(term)

/** A <input type="date"> needs `YYYY-MM-DD`; trim any time part from the API value. */
function toDateInput(value) {
  return value ? String(value).slice(0, 10) : ''
}

/** Match an API enum value to its select option (case-insensitive); fall back to raw. */
function matchEnum(options, value) {
  if (value == null || value === '') return ''
  const v = String(value).toLowerCase()
  return options.value.find((o) => String(o.value).toLowerCase() === v)?.value ?? value
}

/**
 * Show the default milestones (and their tasks) the backend generates for a new
 * project. Rows are stamped `_id`/`_saved` so they render as existing entries.
 */
function fillFromProject(project) {
  milestones.value = (project.milestones ?? []).map((m) => ({
    name: m.name ?? '',
    description: m.description ?? '',
    expectedStartDate: toDateInput(m.expectedStartDate),
    expectedEndDate: toDateInput(m.expectedEndDate),
    isCounted: m.isCounted ?? true,
    _id: m.id,
    _saved: true,
  }))

  const indexByMilestoneId = new Map(milestones.value.map((m, i) => [m._id, i]))
  initialTasks.value = (project.milestones ?? []).flatMap((m) =>
    (m.tasks ?? []).map((t) => ({
      title: t.title ?? '',
      description: t.description ?? '',
      priority: matchEnum(priorityOptions, t.priority),
      taskType: t.taskType ?? '',
      dueDate: toDateInput(t.dueDate),
      milestoneIndex: indexByMilestoneId.has(t.milestone?.id)
        ? String(indexByMilestoneId.get(t.milestone?.id))
        : '',
      _id: t.id,
      _saved: true,
    })),
  )
}

function toggleParent() {
  form.value.hasParent = !form.value.hasParent
  if (!form.value.hasParent) form.value.parentId = null
}

// ── Step 1 · Project ───────────────────────────────────────────────────────
function validateProject() {
  const e = {}
  if (!form.value.name.trim()) e.name = 'Project name is required'
  if (!form.value.prefix.trim()) e.prefix = 'Prefix is required'
  if (!form.value.projectCategory) e.projectCategory = 'Category is required'
  if (!form.value.projectMode) e.projectMode = 'Mode is required'
  if (form.value.hasParent && !form.value.parentId) e.parentId = 'Select a parent project'
  // A unit row that has a role but no unit is incomplete.
  if (form.value.units.some((u) => u.roleId && !u.unitId))
    e.units = 'Every assigned role needs a unit'

  errors.value = e
  return Object.keys(e).length === 0
}

function buildProjectInput() {
  // Send only complete unit rows ({ unitId, roleId }); ids are numeric refs.
  const units = form.value.units
    .filter((u) => u.unitId)
    .map((u) => ({
      unitId: Number(u.unitId),
      roleId: u.roleId ? Number(u.roleId) : null,
    }))

  return {
    name: form.value.name.trim(),
    prefix: form.value.prefix.trim(),
    description: form.value.description.trim() || null,
    projectCategory: form.value.projectCategory,
    projectMode: form.value.projectMode,
    startDate: form.value.startDate || null,
    expectedEndDate: form.value.expectedEndDate || null,
    parentId: form.value.hasParent ? form.value.parentId : null,
    units,
    attachments: [],
  }
}

async function submitProject() {
  if (projectCreated.value || !validateProject()) return
  submittingProject.value = true
  try {
    const created = await projectStore.createProject(buildProjectInput())
    // Pull the default milestones/tasks the backend generated, and populate the
    // builders BEFORE unlocking steps 2 & 3 so they mount already filled.
    try {
      const full = await projectStore.fetchProject(created.id)
      if (full) fillFromProject(full)
    } catch {
      /* defaults are optional — ignore if the fetch fails */
    }
    createdProject.value = created
    success('Project created — review its default milestones and tasks below.')
  } catch (err) {
    toastError(err.message)
  } finally {
    submittingProject.value = false
  }
}

// ── Step 2 · Milestones (update existing/default + create new) ────────────────
async function submitMilestones() {
  if (!projectCreated.value) return
  const rows = milestones.value.filter((m) => m.name.trim())
  if (!rows.length) {
    errors.value = { ...errors.value, milestones: 'Add at least one milestone' }
    return
  }
  errors.value = { ...errors.value, milestones: '' }

  const projectId = Number(createdProject.value.id)
  submittingMilestones.value = true
  try {
    for (let i = 0; i < milestones.value.length; i++) {
      const m = milestones.value[i]
      if (!m.name.trim()) continue
      const input = {
        projectId,
        name: m.name.trim(),
        description: m.description.trim() || null,
        expectedStartDate: m.expectedStartDate || null,
        expectedEndDate: m.expectedEndDate || null,
        isCounted: m.isCounted,
        order: i + 1,
      }
      if (m._id) {
        await projectStore.updateMilestone(m._id, input)
      } else {
        const created = await projectStore.createMilestone(input)
        m._id = created?.id ?? null
        m._saved = true
      }
    }
    success('Milestones saved.')
  } catch (err) {
    toastError(err.message)
  } finally {
    submittingMilestones.value = false
  }
}

// ── Step 3 · Tasks (update existing/default + create new) ─────────────────────
async function submitTasks() {
  if (!projectCreated.value) return
  const rows = initialTasks.value.filter((t) => t.title.trim())
  if (!rows.length) {
    errors.value = { ...errors.value, initialTasks: 'Add at least one task' }
    return
  }
  errors.value = { ...errors.value, initialTasks: '' }

  submittingTasks.value = true
  try {
    let order = 1
    for (const t of initialTasks.value) {
      if (!t.title.trim()) {
        order++
        continue
      }
      const milestone =
        t.milestoneIndex === '' ? null : (milestones.value[Number(t.milestoneIndex)] ?? null)
      const input = {
        title: t.title.trim(),
        description: t.description.trim() || null,
        priority: t.priority || null,
        dueDate: t.dueDate || null,
        milestoneId: milestone?._id ?? null,
        parentId: null,
        taskType: t.taskType.trim() || null,
        order: order++,
      }
      if (t._id) {
        await projectStore.updateTask(t._id, input)
      } else {
        const created = await projectStore.createTask(input)
        t._id = created?.id ?? null
        t._saved = true
      }
    }
    success('Tasks saved.')
  } catch (err) {
    toastError(err.message)
  } finally {
    submittingTasks.value = false
  }
}

// ── Delete milestone / task (default or newly added) ─────────────────────────
const milestoneBuilderKey = ref(0)
const taskBuilderKey = ref(0)
const deleteState = ref({ open: false, kind: null, index: -1, loading: false, taskCount: 0 })

function tasksInMilestone(index) {
  return initialTasks.value.filter(
    (t) => t.milestoneIndex !== '' && Number(t.milestoneIndex) === index,
  )
}

const deleteTitle = computed(() =>
  deleteState.value.kind === 'task' ? 'Delete task?' : 'Delete milestone?',
)

const deleteMessage = computed(() => {
  if (deleteState.value.kind === 'task') {
    return 'This task will be permanently deleted. This action cannot be undone.'
  }
  const n = deleteState.value.taskCount
  return n > 0
    ? `This milestone and its ${n} task${n > 1 ? 's' : ''} inside it will be permanently deleted. This action cannot be undone.`
    : 'This milestone will be permanently deleted. This action cannot be undone.'
})

function requestDeleteMilestone(index) {
  deleteState.value = {
    open: true,
    kind: 'milestone',
    index,
    loading: false,
    taskCount: tasksInMilestone(index).length,
  }
}

function requestDeleteTask(index) {
  deleteState.value = { open: true, kind: 'task', index, loading: false, taskCount: 0 }
}

function confirmDelete() {
  return deleteState.value.kind === 'task' ? confirmDeleteTask() : confirmDeleteMilestone()
}

async function confirmDeleteTask() {
  const index = deleteState.value.index
  const t = initialTasks.value[index]
  if (!t) {
    deleteState.value.open = false
    return
  }
  deleteState.value.loading = true
  try {
    if (t._id) await projectStore.deleteTask(t._id)
    initialTasks.value.splice(index, 1)
    taskBuilderKey.value++
    success('Task deleted.')
    deleteState.value.open = false
  } catch (err) {
    toastError(err.message)
  } finally {
    deleteState.value.loading = false
  }
}

async function confirmDeleteMilestone() {
  const index = deleteState.value.index
  const m = milestones.value[index]
  if (!m) {
    deleteState.value.open = false
    return
  }
  deleteState.value.loading = true
  try {
    if (m._id) await projectStore.deleteMilestone(m._id)
    milestones.value.splice(index, 1)

    // Persisted tasks under this milestone are cascade-deleted on the backend, so
    // drop them from the list too; new (unsaved) tasks are just unlinked.
    initialTasks.value = initialTasks.value.filter(
      (t) => !(t._id && t.milestoneIndex !== '' && Number(t.milestoneIndex) === index),
    )
    initialTasks.value.forEach((t) => {
      if (t.milestoneIndex === '') return
      const mi = Number(t.milestoneIndex)
      if (mi === index) t.milestoneIndex = ''
      else if (mi > index) t.milestoneIndex = String(mi - 1)
    })

    milestoneBuilderKey.value++
    taskBuilderKey.value++
    success('Milestone deleted.')
    deleteState.value.open = false
  } catch (err) {
    toastError(err.message)
  } finally {
    deleteState.value.loading = false
  }
}

function finish() {
  router.push({ name: 'projects' })
}

onMounted(() => {
  loadEnum('ProjectCategoryChoices', categoryOptions)
  loadEnum('ProjectModeChoices', modeOptions)
  loadEnum('PriorityChoices', priorityOptions)
})
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <BaseButton variant="ghost" size="sm" @click="router.back()">
        <ArrowLeftIcon class="h-4 w-4" />
      </BaseButton>
      <div>
        <h1 class="text-heading">Create Project</h1>
        <p class="text-body mt-1">
          Create the project first, then add its milestones and tasks — each saved separately.
        </p>
      </div>
    </div>

    <!-- Step 1 · Project (form) — swapped for a summary once created -->
    <BaseCard
      v-if="!projectCreated"
      title="Project Information"
      subtitle="Step 1 · Create the project"
    >
      <form class="space-y-6" @submit.prevent="submitProject">
        <div class="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
          <!-- Left column: identity -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BaseInput
                v-model="form.prefix"
                class="sm:col-span-1"
                label="Prefix"
                placeholder="PRJ"
                required
                :error="errors.prefix"
              />
              <BaseInput
                v-model="form.name"
                class="sm:col-span-2"
                label="Project Name"
                placeholder="e.g. Website Revamp"
                required
                :error="errors.name"
              />
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <BaseSelect
                v-model="form.projectCategory"
                label="Category"
                placeholder="Select category…"
                :options="categoryOptions"
                required
                :error="errors.projectCategory"
              />
              <BaseSelect
                v-model="form.projectMode"
                label="Mode"
                placeholder="Select mode…"
                :options="modeOptions"
                required
                :error="errors.projectMode"
              />
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <BaseDatePicker v-model="form.startDate" label="Start Date" />
              <BaseDatePicker v-model="form.expectedEndDate" label="Expected End Date" />
            </div>
          </div>

          <!-- Right column: description & parent -->
          <div class="space-y-4">
            <BaseTextarea
              v-model="form.description"
              label="Description"
              placeholder="What is this project about?"
              :rows="5"
            />

            <!-- Parent project (optional) -->
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-800">Has parent project</p>
                  <p class="text-xs text-slate-400">Make this a sub-project of another project.</p>
                </div>
                <button
                  type="button"
                  class="relative h-6 w-11 shrink-0 rounded-full transition"
                  :class="form.hasParent ? 'bg-primary-600' : 'bg-slate-200'"
                  role="switch"
                  :aria-checked="form.hasParent"
                  @click="toggleParent"
                >
                  <span
                    class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                    :class="form.hasParent ? 'left-[22px]' : 'left-0.5'"
                  />
                </button>
              </div>

              <BaseSearchSelect
                v-if="form.hasParent"
                v-model="form.parentId"
                class="mt-3"
                placeholder="Search parent project…"
                empty-text="No projects found."
                :fetcher="fetchParents"
                :error="errors.parentId"
              />
            </div>
          </div>
        </div>

        <!-- Units — unitId from listUnit, roleId from project roles -->
        <div class="border-t border-slate-100 pt-5">
          <div class="mb-3">
            <p class="text-sm font-medium text-slate-800">Units & Roles</p>
            <p class="text-xs text-slate-400">
              Assign the units working on this project and their project role (optional).
            </p>
          </div>
          <ProjectUnitBuilder
            v-model="form.units"
            :unit-fetcher="fetchUnits"
            :role-fetcher="fetchRoles"
          />
          <p v-if="errors.units" class="mt-2 text-xs text-danger">{{ errors.units }}</p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 border-t border-slate-100 pt-5">
          <BaseButton variant="outline" type="button" @click="router.back()">Cancel</BaseButton>
          <BaseButton variant="primary" type="submit" :loading="submittingProject">
            Create Project
          </BaseButton>
        </div>
      </form>
    </BaseCard>

    <!-- Step 1 done · summary -->
    <div
      v-else
      class="surface flex flex-wrap items-center justify-between gap-4 border border-success/30 bg-success/5 px-5 py-4"
    >
      <div class="flex items-center gap-3">
        <CheckCircleIcon class="h-8 w-8 shrink-0 text-success" />
        <div>
          <p class="text-sm font-semibold text-slate-800">Project created</p>
          <p class="text-xs text-slate-500">
            {{ createdProject.prefix }} · {{ createdProject.name }} — add milestones and tasks
            below.
          </p>
        </div>
      </div>
      <BaseButton variant="outline" size="sm" @click="finish">Finish</BaseButton>
    </div>

    <!-- Steps 2 & 3 · Builders side by side (locked until the project exists) -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Milestones -->
      <BaseCard title="Milestones" subtitle="Step 2 · Group the project into phases (optional).">
        <div
          v-if="!projectCreated"
          class="flex flex-col items-center gap-2 py-8 text-center text-slate-400"
        >
          <LockClosedIcon class="h-6 w-6" />
          <p class="text-xs">Create the project first to add milestones.</p>
        </div>
        <template v-else>
          <MilestoneBuilder
            :key="milestoneBuilderKey"
            v-model="milestones"
            allow-edit
            @delete-saved="requestDeleteMilestone"
          />
          <p v-if="errors.milestones" class="mt-2 text-xs text-danger">{{ errors.milestones }}</p>
          <div class="mt-4 flex justify-end">
            <BaseButton
              variant="secondary"
              size="sm"
              :loading="submittingMilestones"
              @click="submitMilestones"
            >
              Save Milestones
            </BaseButton>
          </div>
        </template>
      </BaseCard>

      <!-- Initial Tasks -->
      <BaseCard title="Initial Tasks" subtitle="Step 3 · Create the first tasks (optional).">
        <div
          v-if="!projectCreated"
          class="flex flex-col items-center gap-2 py-8 text-center text-slate-400"
        >
          <LockClosedIcon class="h-6 w-6" />
          <p class="text-xs">Create the project first to add tasks.</p>
        </div>
        <template v-else>
          <InitialTaskBuilder
            :key="taskBuilderKey"
            v-model="initialTasks"
            :milestones="milestones"
            :priority-options="priorityOptions"
            allow-edit
            @delete-saved="requestDeleteTask"
          />
          <p v-if="errors.initialTasks" class="mt-2 text-xs text-danger">
            {{ errors.initialTasks }}
          </p>
          <div class="mt-4 flex justify-end">
            <BaseButton
              variant="secondary"
              size="sm"
              :loading="submittingTasks"
              @click="submitTasks"
            >
              Save Tasks
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </div>

    <ConfirmDialog
      v-model="deleteState.open"
      :title="deleteTitle"
      :message="deleteMessage"
      confirm-text="Delete"
      :loading="deleteState.loading"
      @confirm="confirmDelete"
    />
  </div>
</template>
