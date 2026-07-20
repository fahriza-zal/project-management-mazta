<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/features/projects/stores/project'
import { useAuthStore } from '@/features/auth/stores/auth'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

/**
 * Update a project's status. Status options come from `listProjectStatusDefinition`
 * scoped to the signed-in employee's units & companies (from `pm_profile`). Submit
 * hits the `updateProject` status mutation with { employeeId, newStatusId, oldStatusId }.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  project: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'updated'])

const store = useProjectStore()
const auth = useAuthStore()

const options = ref([])
const loading = ref(false)
const saving = ref(false)
const selectedId = ref('')
const errorMsg = ref('')

const oldStatusId = computed(() => props.project?.currentStatus?.id ?? null)

const unitIds = computed(() =>
  (auth.employee?.units ?? []).map((u) => Number(u.id)).filter(Boolean),
)
const companyIds = computed(() =>
  (auth.employee?.companies ?? []).map((c) => Number(c.id)).filter(Boolean),
)

const statusOptions = computed(() =>
  options.value.map((s) => ({ value: String(s.id), label: humanize(s.name) })),
)

const unchanged = computed(
  () => selectedId.value === '' || String(selectedId.value) === String(oldStatusId.value ?? ''),
)

function humanize(v) {
  return String(v ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function loadOptions() {
  loading.value = true
  errorMsg.value = ''
  try {
    options.value = await store.fetchProjectStatusOptions({
      unitIds: unitIds.value,
      companyIds: companyIds.value,
    })
    // Preselect the project's current status when present.
    selectedId.value = oldStatusId.value != null ? String(oldStatusId.value) : ''
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal memuat daftar status.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selectedId.value = ''
      errorMsg.value = ''
      loadOptions()
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (unchanged.value || !props.project?.id) return
  saving.value = true
  errorMsg.value = ''
  try {
    const result = await store.updateProjectStatus({
      projectId: props.project.id,
      newStatusId: Number(selectedId.value),
      oldStatusId: oldStatusId.value,
      employeeId: auth.employee?.id ?? null,
    })
    emit('updated', result)
    close()
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal memperbarui status project.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Ubah Status Project"
    subtitle="Pilih status baru untuk project ini."
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div v-if="project?.currentStatus?.name" class="text-sm text-slate-500">
        Status saat ini:
        <span class="font-medium text-slate-700">{{ humanize(project.currentStatus.name) }}</span>
      </div>

      <BaseSelect
        v-model="selectedId"
        label="Status Baru"
        :placeholder="loading ? 'Memuat status…' : 'Pilih status…'"
        :options="statusOptions"
        :disabled="loading || !statusOptions.length"
        required
      />

      <p v-if="errorMsg" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ errorMsg }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" :disabled="saving" @click="close">Batal</BaseButton>
        <BaseButton variant="primary" :loading="saving" :disabled="unchanged" @click="submit">
          Simpan Status
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
