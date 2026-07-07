<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/features/projects/stores/project'
import { useToast } from '@/shared/composables/useToast'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseMultiSelect from '@/shared/components/base/BaseMultiSelect.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

/**
 * Assign/unassign employees on a single task.
 *
 * The picker is a searchable multi-select of employees (`listEmployee`). On save
 * we diff the chosen employees against the task's existing `assignments`:
 * newly-added employees create an assignment, removed ones delete theirs — since
 * `createTaskAssignment` takes a single employee/task pair, both run one call each.
 *
 * `task` = { id, title, assignments: [{ id, employee: { id, fullName } }] }.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const store = useProjectStore()
const { success, error: toastError } = useToast()

const selectedIds = ref([])
const saving = ref(false)
// Bump to force BaseMultiSelect to remount and re-read initialItems on each open.
const pickerKey = ref(0)

const assignments = computed(() => props.task?.assignments ?? [])

/** Existing assignees as picker items ({ id, name }) to prefill the chips. */
const initialItems = computed(() =>
  assignments.value
    .filter((a) => a.employee)
    .map((a) => ({ id: a.employee.id, name: a.employee.fullName })),
)

// Seed the selection from the task's current assignees each time the modal opens.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    selectedIds.value = initialItems.value.map((i) => i.id)
    pickerKey.value += 1
  },
)

async function onSave() {
  if (!props.task) return
  const taskId = props.task.id
  const selected = selectedIds.value.map(Number)
  // employeeId -> assignmentId, to resolve which assignment to delete.
  const existing = new Map(assignments.value.map((a) => [Number(a.employee?.id), a.id]))

  const toAdd = selected.filter((id) => !existing.has(id))
  const toRemove = [...existing.entries()]
    .filter(([employeeId]) => !selected.includes(employeeId))
    .map(([, assignmentId]) => assignmentId)

  if (!toAdd.length && !toRemove.length) {
    emit('update:modelValue', false)
    return
  }

  saving.value = true
  try {
    await Promise.all([
      ...toAdd.map((employeeId) => store.createTaskAssignment({ employeeId, taskId })),
      ...toRemove.map((assignmentId) => store.deleteTaskAssignment(assignmentId)),
    ])
    success('Assignee task diperbarui.')
    emit('saved')
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
    title="Assign Task"
    :subtitle="task?.title"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- min-height reserves room so the picker's dropdown isn't clipped by the modal scroll area -->
    <div class="min-h-[320px]">
      <BaseMultiSelect
        :key="pickerKey"
        v-model="selectedIds"
        :fetcher="store.fetchEmployeeOptions"
        :initial-items="initialItems"
        label="Employees"
        placeholder="Cari employee…"
        empty-text="Employee tidak ditemukan."
      />
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" type="button" @click="emit('update:modelValue', false)">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="button" :loading="saving" @click="onSave">
          Save
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
