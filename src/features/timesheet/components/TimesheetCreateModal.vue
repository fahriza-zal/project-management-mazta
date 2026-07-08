<script setup>
import { ref, computed, watch } from 'vue'
import { useTimesheetStore } from '@/features/timesheet/stores/timesheet'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useToast } from '@/shared/composables/useToast'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

/**
 * Create a timesheet. The employee is the signed-in user (from the auth store /
 * `pm_profile`), not a picked value. The user only chooses a task from their
 * `availableTasks`; its `category` decides both the target field
 * (PROJECT → `taskId`, COMMON → `defaultTaskId`) and the derived `sheetType`.
 */
const emit = defineEmits(['update:modelValue', 'created'])
const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const store = useTimesheetStore()
const auth = useAuthStore()
const { success, error: toastError } = useToast()

const saving = ref(false)
const errors = ref({})
const availableTasks = ref([])
const loadingTasks = ref(false)

// Signed-in employee (id + name) from the auth store, hydrated from `pm_profile`.
const employee = computed(() => {
  auth.hydrate()
  return auth.employee
})

function emptyForm() {
  return {
    taskId: '', // id of the chosen availableTask (routed to taskId/defaultTaskId on submit)
    description: '',
  }
}
const form = ref(emptyForm())

/** "IN_HOUSE" / "in_house" → "In House". */
function humanize(name) {
  return String(name)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** availableTasks → BaseSelect options, category shown as a prefix. */
const taskOptions = computed(() =>
  availableTasks.value.map((t) => ({
    value: t.id,
    label: `[${humanize(t.category)}] ${t.title}`,
  })),
)

async function loadTasks() {
  const id = employee.value?.id
  availableTasks.value = []
  if (id == null) return
  loadingTasks.value = true
  try {
    availableTasks.value = await store.fetchEmployeeTasks(id)
  } catch (err) {
    toastError(err.message)
  } finally {
    loadingTasks.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.value = emptyForm()
    errors.value = {}
    loadTasks()
  },
)

function validate() {
  const e = {}
  if (employee.value?.id == null)
    e.employee = 'Profil employee tidak ditemukan. Silakan login ulang.'
  if (!form.value.taskId) e.taskId = 'Task wajib dipilih'
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  saving.value = true
  try {
    const chosen = availableTasks.value.find((t) => String(t.id) === String(form.value.taskId))
    const isProject = chosen?.category?.toUpperCase() === 'PROJECT'
    const input = {
      employeeId: Number(employee.value.id),
      sheetType: chosen?.category ?? null, // derived from the task's category
      taskId: isProject ? Number(chosen.id) : null,
      defaultTaskId: isProject ? null : chosen ? Number(chosen.id) : null,
      description: form.value.description.trim() || null,
    }
    await store.create(input)
    success('Timesheet dibuat.')
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
    title="Buat Timesheet"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="timesheet-form" class="space-y-4" @submit.prevent="onSubmit">
      <!-- Employee is the signed-in user (read-only). -->
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">Employee</label>
        <div
          class="flex h-10 items-center rounded-xl border border-white/70 bg-slate-100/60 px-3 text-sm text-slate-700"
        >
          {{ employee?.fullName || 'Profil tidak ditemukan' }}
        </div>
        <p v-if="errors.employee" class="mt-1.5 text-xs text-danger">{{ errors.employee }}</p>
      </div>

      <BaseSelect
        v-model="form.taskId"
        label="Task"
        :placeholder="loadingTasks ? 'Memuat task…' : 'Pilih task…'"
        :options="taskOptions"
        :disabled="loadingTasks || !taskOptions.length"
        :error="errors.taskId"
      />

      <BaseTextarea
        v-model="form.description"
        label="Description"
        placeholder="Catatan (opsional)"
        :rows="2"
      />
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" type="button" @click="emit('update:modelValue', false)">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="submit" form="timesheet-form" :loading="saving">
          Buat Timesheet
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
