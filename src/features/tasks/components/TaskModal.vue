<script setup>
import { ref, computed, watch } from 'vue'
import { TASK_STATUS_META, TASK_PRIORITY_META } from '@/shared/constants'
import { users } from '@/shared/services/mockUsers'
import { formatDate } from '@/shared/utils/format'
import { ClockIcon } from '@heroicons/vue/24/outline'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // When a task is passed the modal is in "detail/edit" mode, otherwise "create".
  task: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'save'])

const isEdit = computed(() => !!props.task)

const blank = () => ({
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  assignedTo: '',
  dueDate: '',
})

const form = ref(blank())
const errors = ref({})

const statusOptions = Object.entries(TASK_STATUS_META).map(([value, m]) => ({ value, label: m.label }))
const priorityOptions = Object.entries(TASK_PRIORITY_META).map(([value, m]) => ({ value, label: m.label }))
const userOptions = users.map((u) => ({ value: u.id, label: u.name }))

// Dummy history shown for existing tasks.
const history = [
  { id: 'h1', text: 'Status changed to In Progress', time: '2026-06-22T10:00:00Z' },
  { id: 'h2', text: 'Priority set to High', time: '2026-06-20T09:30:00Z' },
  { id: 'h3', text: 'Task created', time: '2026-06-18T08:00:00Z' },
]

watch(
  () => [props.modelValue, props.task],
  () => {
    if (props.modelValue) {
      form.value = props.task ? { ...props.task } : blank()
      errors.value = {}
    }
  },
  { immediate: true },
)

function validate() {
  const e = {}
  if (!form.value.title.trim()) e.title = 'Title is required'
  if (!form.value.dueDate) e.dueDate = 'Due date is required'
  errors.value = e
  return Object.keys(e).length === 0
}

function submit() {
  if (!validate()) return
  emit('save', { ...form.value })
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="lg"
    :title="isEdit ? 'Task Detail' : 'Create Task'"
    :subtitle="isEdit ? 'View and update task information' : 'Add a new task to this project'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <!-- Form -->
      <div class="space-y-4 lg:col-span-2">
        <BaseInput v-model="form.title" label="Title" placeholder="Task title" required :error="errors.title" />
        <BaseTextarea v-model="form.description" label="Description" placeholder="Describe the task…" :rows="4" />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseSelect v-model="form.status" label="Status" :options="statusOptions" />
          <BaseSelect v-model="form.priority" label="Priority" :options="priorityOptions" />
          <BaseSelect v-model="form.assignedTo" label="Assigned User" :options="userOptions" placeholder="Unassigned" />
          <BaseInput v-model="form.dueDate" type="date" label="Due Date" required :error="errors.dueDate" />
        </div>
      </div>

      <!-- History (dummy) -->
      <div class="lg:col-span-1">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">History</p>
        <div v-if="isEdit" class="space-y-4">
          <div v-for="h in history" :key="h.id" class="flex gap-3">
            <div class="flex flex-col items-center">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ClockIcon class="h-4 w-4" />
              </span>
              <span class="mt-1 w-px flex-1 bg-slate-200" />
            </div>
            <div class="pb-1">
              <p class="text-sm text-slate-700">{{ h.text }}</p>
              <p class="text-[11px] text-slate-400">{{ formatDate(h.time) }}</p>
            </div>
          </div>
        </div>
        <p v-else class="rounded-xl bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">
          History will appear after the task is created.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" @click="emit('update:modelValue', false)">Cancel</BaseButton>
        <BaseButton variant="primary" @click="submit">
          {{ isEdit ? 'Save Changes' : 'Create Task' }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
