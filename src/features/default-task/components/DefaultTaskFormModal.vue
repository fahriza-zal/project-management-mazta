<script setup>
import { ref, watch, computed } from 'vue'
import { useDefaultTaskStore } from '@/features/default-task/stores/defaultTask'
import { useToast } from '@/shared/composables/useToast'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import UnitMultiSelect from '@/features/default-task/components/UnitMultiSelect.vue'

/**
 * Create/edit modal for a default task.
 * Pass `taskId` to edit (detail is fetched on open); omit it to create.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  taskId: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const store = useDefaultTaskStore()
const { success, error: toastError } = useToast()

const form = ref({ title: '', unitIds: [] })
const initialUnits = ref([])
const errors = ref({})
const loadingDetail = ref(false)

const isEdit = computed(() => props.taskId != null)
const title = computed(() => (isEdit.value ? 'Edit Default Task' : 'Create Default Task'))

function reset() {
  form.value = { title: '', unitIds: [] }
  initialUnits.value = []
  errors.value = {}
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const data = await store.fetchById(props.taskId)
    if (data) {
      form.value = { title: data.title ?? '', unitIds: (data.units ?? []).map((u) => u.id) }
      initialUnits.value = data.units ?? []
    }
  } catch (err) {
    toastError(err.message)
  } finally {
    loadingDetail.value = false
  }
}

// When the modal opens, seed for create or fetch for edit.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    reset()
    if (isEdit.value) loadDetail()
  },
)

function validate() {
  const e = {}
  if (!form.value.title.trim()) e.title = 'Title is required'
  if (!form.value.unitIds.length) e.unitIds = 'Select at least one unit'
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  const input = { title: form.value.title.trim(), unitIds: form.value.unitIds }
  try {
    if (isEdit.value) {
      await store.update(props.taskId, input)
      success('Default task updated')
    } else {
      await store.create(input)
      success('Default task created')
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch (err) {
    toastError(err.message)
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="loadingDetail" class="py-8 text-center text-sm text-slate-400">Loading…</div>
    <form v-else id="default-task-form" class="space-y-4" @submit.prevent="onSubmit">
      <BaseInput
        v-model="form.title"
        label="Title"
        placeholder="e.g. Initial QC Inspection"
        required
        :error="errors.title"
      />
      <UnitMultiSelect
        v-model="form.unitIds"
        :initial-units="initialUnits"
        label="Units"
        :error="errors.unitIds"
      />
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" type="button" @click="emit('update:modelValue', false)">
          Cancel
        </BaseButton>
        <BaseButton
          variant="primary"
          type="submit"
          form="default-task-form"
          :loading="store.saving"
          :disabled="loadingDetail"
        >
          {{ isEdit ? 'Save Changes' : 'Create' }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
