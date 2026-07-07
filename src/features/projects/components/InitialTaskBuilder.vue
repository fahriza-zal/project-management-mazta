<script setup>
import { ref, computed, watch } from 'vue'
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseDatePicker from '@/shared/components/base/BaseDatePicker.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

/**
 * Dynamic Initial Task Builder — create the first tasks of a project before it
 * is saved. v-model is an array of
 * `{ title, description, priority, dueDate, milestoneIndex }`.
 *
 * A task may optionally be linked to one of the milestones created in the same
 * form; the link is by array index and the page resolves it to the saved
 * milestone id at submit. `order`, `parentId`, and `taskType` are handled by the
 * page. A persisted row carries an `_id`; such rows are read-only with a "Saved"
 * badge by default, or editable when `allowEdit` is set (Edit Project page).
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  // Milestones from the sibling builder, so a task can be attached to one.
  milestones: { type: Array, default: () => [] },
  // Priority options ({ value, label }) sourced from the PriorityChoices enum.
  priorityOptions: { type: Array, default: () => [] },
  // Keep persisted rows (with `_id`) editable instead of read-only.
  allowEdit: { type: Boolean, default: false },
})
// `delete-saved` asks the page to delete a persisted task (row with `_id`) via
// the API; the page removes it from the model on success.
const emit = defineEmits(['update:modelValue', 'delete-saved'])

const newRow = () => ({
  title: '',
  description: '',
  priority: '',
  taskType: '',
  dueDate: '',
  milestoneIndex: '',
})
const rows = ref(props.modelValue.length ? [...props.modelValue] : [])

watch(rows, (value) => emit('update:modelValue', value), { deep: true })

const milestoneOptions = computed(() =>
  props.milestones.map((m, i) => ({
    value: String(i),
    label: m.name?.trim() || `Milestone ${i + 1}`,
  })),
)

function add() {
  rows.value.push(newRow())
}

function remove(index) {
  rows.value.splice(index, 1)
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(task, index) in rows"
      :key="index"
      class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <p class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <ClipboardDocumentListIcon class="h-4 w-4 text-primary-500" />
          Task {{ index + 1 }}
        </p>
        <div class="flex items-center gap-2">
          <span
            v-if="task._id"
            class="inline-flex items-center gap-1 text-xs font-medium text-success"
          >
            <CheckCircleIcon class="h-4 w-4" />
            Saved
          </span>
          <BaseButton
            v-if="!task._id"
            variant="ghost"
            size="sm"
            type="button"
            @click="remove(index)"
          >
            <TrashIcon class="h-4 w-4 text-danger" />
          </BaseButton>
          <BaseButton
            v-else-if="allowEdit"
            variant="ghost"
            size="sm"
            type="button"
            title="Delete task"
            @click="emit('delete-saved', index)"
          >
            <TrashIcon class="h-4 w-4 text-danger" />
          </BaseButton>
        </div>
      </div>

      <div class="space-y-4">
        <BaseInput
          v-model="task.title"
          label="Task Title"
          placeholder="e.g. Setup repository"
          :disabled="task._id && !allowEdit"
        />

        <BaseTextarea
          v-model="task.description"
          label="Description"
          placeholder="Details of this task (optional)"
          :rows="2"
          :disabled="task._id && !allowEdit"
        />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="task.taskType"
            label="Task Type"
            placeholder="e.g. Development"
            :disabled="task._id && !allowEdit"
          />
          <BaseSelect
            v-model="task.priority"
            label="Priority"
            placeholder="Select…"
            :options="priorityOptions"
            :disabled="task._id && !allowEdit"
          />
          <BaseDatePicker
            v-model="task.dueDate"
            label="Due Date"
            :disabled="task._id && !allowEdit"
          />
          <BaseSelect
            v-model="task.milestoneIndex"
            label="Milestone"
            placeholder="No milestone"
            :options="milestoneOptions"
            :disabled="(task._id && !allowEdit) || !milestoneOptions.length"
          />
        </div>
      </div>
    </div>

    <BaseButton variant="outline" size="sm" type="button" block @click="add">
      <PlusIcon class="h-4 w-4" />
      Add Task
    </BaseButton>

    <p v-if="!rows.length" class="text-center text-xs text-slate-400">
      No initial tasks yet. You can also add tasks later from the project board.
    </p>
  </div>
</template>
