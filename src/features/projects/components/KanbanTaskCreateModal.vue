<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/features/projects/stores/project'
import { useToast } from '@/shared/composables/useToast'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseDatePicker from '@/shared/components/base/BaseDatePicker.vue'
import BaseMultiSelect from '@/shared/components/base/BaseMultiSelect.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

/**
 * Full "create task" for the Kanban — mirrors the fields of the project's initial
 * task builder (title, description, type, priority, due date, milestone) plus an
 * assignee picker. The new task lands in the column it was opened from
 * (`currentStatusId`). Assignees matter: the board only shows assigned tasks, so
 * a task created without one won't appear as a card.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  statusId: { type: [Number, String, null], default: null }, // column status
  statusName: { type: String, default: '' },
  milestones: { type: Array, default: () => [] }, // [{ id, name }]
})
const emit = defineEmits(['update:modelValue', 'created'])

const store = useProjectStore()
const { success, error: toastError } = useToast()

const saving = ref(false)
const errors = ref({})
const priorityOptions = ref([])
// Bump to remount the employee picker so its chips reset on each open.
const pickerKey = ref(0)

function emptyForm() {
  return {
    title: '',
    description: '',
    taskType: '',
    priority: '',
    dueDate: '',
    milestoneId: '',
    employeeIds: [],
  }
}
const form = ref(emptyForm())

const milestoneOptions = computed(() =>
  props.milestones.map((m) => ({ value: m.id, label: m.name })),
)

/** "IN_HOUSE" / "in_house" → "In House". */
function humanize(name) {
  return String(name)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function loadPriority() {
  try {
    const names = await store.fetchEnumValues('PriorityChoices')
    priorityOptions.value = names.map((n) => ({ value: n, label: humanize(n) }))
  } catch {
    priorityOptions.value = []
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.value = emptyForm()
    // Default to the first milestone so the new task is nested under the project
    // (the board reads tasks via milestones → tasks).
    form.value.milestoneId = milestoneOptions.value[0]?.value ?? ''
    errors.value = {}
    pickerKey.value += 1
    if (!priorityOptions.value.length) loadPriority()
  },
)

function validate() {
  const e = {}
  if (!form.value.title.trim()) e.title = 'Judul task wajib diisi'
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  saving.value = true
  try {
    const input = {
      title: form.value.title.trim(),
      description: form.value.description.trim() || null,
      priority: form.value.priority || null,
      dueDate: form.value.dueDate || null,
      milestoneId: form.value.milestoneId ? Number(form.value.milestoneId) : null,
      parentId: null,
      taskType: form.value.taskType.trim() || null,
      currentStatusId: props.statusId == null ? null : Number(props.statusId),
    }
    const created = await store.createTask(input)
    // Assign the chosen employees (one call per employee/task pair).
    if (created?.id && form.value.employeeIds.length) {
      await Promise.all(
        form.value.employeeIds.map((employeeId) =>
          store.createTaskAssignment({ employeeId, taskId: created.id }),
        ),
      )
    }
    success('Task dibuat.')
    emit('created')
    emit('update:modelValue', false)
  } catch (err) {
    toastError(err.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="lg"
    title="Buat Task"
    :subtitle="statusName ? `Kolom: ${statusName}` : ''"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="kanban-task-form" class="space-y-4" @submit.prevent="onSubmit">
      <BaseInput
        v-model="form.title"
        label="Task Title"
        placeholder="e.g. Setup repository"
        required
        :error="errors.title"
      />

      <BaseTextarea
        v-model="form.description"
        label="Description"
        placeholder="Detail task (opsional)"
        :rows="2"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput v-model="form.taskType" label="Task Type" placeholder="e.g. Development" />
        <BaseSelect
          v-model="form.priority"
          label="Priority"
          placeholder="Select…"
          :options="priorityOptions"
        />
        <BaseDatePicker v-model="form.dueDate" label="Due Date" />
        <BaseSelect
          v-model="form.milestoneId"
          label="Milestone"
          placeholder="No milestone"
          :options="milestoneOptions"
          :disabled="!milestoneOptions.length"
        />
      </div>

      <BaseMultiSelect
        :key="pickerKey"
        v-model="form.employeeIds"
        :fetcher="store.fetchEmployeeOptions"
        label="Assignees"
        placeholder="Cari employee…"
        empty-text="Employee tidak ditemukan."
      />
      <p class="text-xs text-slate-400">Board hanya menampilkan task yang punya assignee.</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" type="button" @click="emit('update:modelValue', false)">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="submit" form="kanban-task-form" :loading="saving">
          Buat Task
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
