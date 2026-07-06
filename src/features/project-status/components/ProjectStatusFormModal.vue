<script setup>
import { ref, watch, computed } from 'vue'
import { useProjectStatusStore } from '@/features/project-status/stores/projectStatus'
import { useToast } from '@/shared/composables/useToast'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseMultiSelect from '@/shared/components/base/BaseMultiSelect.vue'

/**
 * Create/edit modal for a project status definition.
 * Pass `statusId` to edit (detail is fetched on open); omit it to create.
 *
 * Note: getProjectStatusDefinition returns `units` but not companies, so on edit
 * the unit picker is prefilled while the company picker starts empty.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  statusId: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const store = useProjectStatusStore()
const { success, error: toastError } = useToast()

function emptyForm() {
  return { name: '', ordering: '', isClosed: false, isDefault: false, unitIds: [], companyIds: [] }
}

const form = ref(emptyForm())
const initialUnits = ref([])
const errors = ref({})
const loadingDetail = ref(false)
// Remount the pickers on open so their internal chip state resets/reseeds.
const pickerKey = ref(0)

const isEdit = computed(() => props.statusId != null)
const title = computed(() => (isEdit.value ? 'Edit Project Status' : 'Create Project Status'))

const fetchUnits = (term) => store.fetchUnitOptions(term)
const fetchCompanies = (term) => store.fetchCompanyOptions(term)

function reset() {
  form.value = emptyForm()
  initialUnits.value = []
  errors.value = {}
  pickerKey.value += 1
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const data = await store.fetchById(props.statusId)
    if (data) {
      form.value = {
        name: data.name ?? '',
        ordering: data.ordering ?? '',
        isClosed: data.isClosed ?? false,
        isDefault: data.isDefault ?? false,
        unitIds: (data.units ?? []).map((u) => u.id),
        companyIds: [],
      }
      initialUnits.value = data.units ?? []
      pickerKey.value += 1
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
  if (!form.value.name.trim()) e.name = 'Name is required'
  if (form.value.ordering === '' || form.value.ordering === null) e.ordering = 'Ordering is required'
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  const input = {
    name: form.value.name.trim(),
    ordering: Number(form.value.ordering),
    isClosed: form.value.isClosed,
    isDefault: form.value.isDefault,
    relatedUnitIds: form.value.unitIds,
    relatedCompanyIds: form.value.companyIds,
  }
  try {
    if (isEdit.value) {
      await store.update(props.statusId, input)
      success('Project status updated')
    } else {
      await store.create(input)
      success('Project status created')
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
    <form v-else id="project-status-form" class="space-y-4" @submit.prevent="onSubmit">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <BaseInput
            v-model="form.name"
            label="Name"
            placeholder="e.g. In Review"
            required
            :error="errors.name"
          />
        </div>
        <BaseInput
          v-model="form.ordering"
          label="Ordering"
          type="number"
          placeholder="0"
          required
          :error="errors.ordering"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
          <div>
            <p class="text-sm font-medium text-slate-800">Closed status</p>
            <p class="text-xs text-slate-400">Projects here count as finished.</p>
          </div>
          <button
            type="button"
            class="relative h-6 w-11 shrink-0 rounded-full transition"
            :class="form.isClosed ? 'bg-primary-600' : 'bg-slate-200'"
            role="switch"
            :aria-checked="form.isClosed"
            @click="form.isClosed = !form.isClosed"
          >
            <span
              class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              :class="form.isClosed ? 'left-[22px]' : 'left-0.5'"
            />
          </button>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
          <div>
            <p class="text-sm font-medium text-slate-800">Default status</p>
            <p class="text-xs text-slate-400">Applied to new projects.</p>
          </div>
          <button
            type="button"
            class="relative h-6 w-11 shrink-0 rounded-full transition"
            :class="form.isDefault ? 'bg-primary-600' : 'bg-slate-200'"
            role="switch"
            :aria-checked="form.isDefault"
            @click="form.isDefault = !form.isDefault"
          >
            <span
              class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              :class="form.isDefault ? 'left-[22px]' : 'left-0.5'"
            />
          </button>
        </div>
      </div>

      <BaseMultiSelect
        :key="`units-${pickerKey}`"
        v-model="form.unitIds"
        :fetcher="fetchUnits"
        :initial-items="initialUnits"
        label="Units"
        placeholder="Search units…"
        empty-text="No units found."
      />

      <BaseMultiSelect
        :key="`companies-${pickerKey}`"
        v-model="form.companyIds"
        :fetcher="fetchCompanies"
        label="Companies"
        placeholder="Search companies…"
        empty-text="No companies found."
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
          form="project-status-form"
          :loading="store.saving"
          :disabled="loadingDetail"
        >
          {{ isEdit ? 'Save Changes' : 'Create' }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
