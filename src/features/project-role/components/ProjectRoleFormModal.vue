<script setup>
import { ref, watch, computed } from 'vue'
import { useProjectRoleStore } from '@/features/project-role/stores/projectRole'
import { useToast } from '@/shared/composables/useToast'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

/**
 * Create/edit modal for a project role.
 * Pass `roleId` to edit (detail is fetched on open); omit it to create.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  roleId: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const store = useProjectRoleStore()
const { success, error: toastError } = useToast()

const form = ref({ name: '', isWatcher: false })
const errors = ref({})
const loadingDetail = ref(false)

const isEdit = computed(() => props.roleId != null)
const title = computed(() => (isEdit.value ? 'Edit Project Role' : 'Create Project Role'))

function reset() {
  form.value = { name: '', isWatcher: false }
  errors.value = {}
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    const data = await store.fetchById(props.roleId)
    if (data) {
      form.value = { name: data.name ?? '', isWatcher: data.isWatcher ?? false }
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
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  const input = { name: form.value.name.trim(), isWatcher: form.value.isWatcher }
  try {
    if (isEdit.value) {
      await store.update(props.roleId, input)
      success('Project role updated')
    } else {
      await store.create(input)
      success('Project role created')
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
    <form v-else id="project-role-form" class="space-y-4" @submit.prevent="onSubmit">
      <BaseInput
        v-model="form.name"
        label="Name"
        placeholder="e.g. Project Manager"
        required
        :error="errors.name"
      />

      <div class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
        <div>
          <p class="text-sm font-medium text-slate-800">Watcher</p>
          <p class="text-xs text-slate-400">Members with this role only watch, they aren't assignable.</p>
        </div>
        <button
          type="button"
          class="relative h-6 w-11 shrink-0 rounded-full transition"
          :class="form.isWatcher ? 'bg-primary-600' : 'bg-slate-200'"
          role="switch"
          :aria-checked="form.isWatcher"
          @click="form.isWatcher = !form.isWatcher"
        >
          <span
            class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
            :class="form.isWatcher ? 'left-[22px]' : 'left-0.5'"
          />
        </button>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" type="button" @click="emit('update:modelValue', false)">
          Cancel
        </BaseButton>
        <BaseButton
          variant="primary"
          type="submit"
          form="project-role-form"
          :loading="store.saving"
          :disabled="loadingDetail"
        >
          {{ isEdit ? 'Save Changes' : 'Create' }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
