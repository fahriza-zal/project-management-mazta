<script setup>
import { ref, computed, watch } from 'vue'
import { useTaskStatusStore } from '@/features/task-status/stores/taskStatus'
import { useToast } from '@/shared/composables/useToast'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

/**
 * Live editor for the outgoing transitions of one task status (Opsi B).
 * Opened per-status from the list; each change persists immediately via its own
 * mutation (create / edit / delete) — there is no Save button here.
 *
 * Pass `status` = { id, name } (the "from" status). Only meaningful in edit context:
 * a transition needs an existing fromStatusId, so this is never shown during create.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  status: { type: Object, default: null }, // { id, name }
})
const emit = defineEmits(['update:modelValue'])

const store = useTaskStatusStore()
const { success, error: toastError } = useToast()

const loading = ref(false)
const busyId = ref(null) // toStatusId yang sedang diproses (untuk spinner + kunci baris)
const detail = ref(null) // status detail termasuk transitionTo
const allStatuses = ref([]) // kandidat status tujuan
const approvalTypeOptions = ref([]) // { value, label } dari enum ApprovalTypeChoices

const fromName = computed(() => props.status?.name ?? '')

/** "LINE_MANAGER" / "line_manager" → "Line Manager" untuk label enum yang enak dibaca. */
function humanize(name) {
  return String(name)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Cocokkan nilai dari API (sering lowercase) ke value opsi enum, case-insensitive.
function normalizeApproval(val) {
  if (!val) return ''
  const match = approvalTypeOptions.value.find(
    (o) => String(o.value).toLowerCase() === String(val).toLowerCase(),
  )
  return match ? match.value : String(val)
}

async function load() {
  if (!props.status) return
  loading.value = true
  try {
    const [d, list, enumNames] = await Promise.all([
      store.fetchById(props.status.id),
      store.fetchStatusOptions(),
      store.fetchEnumValues('ApprovalTypeChoices').catch(() => []),
    ])
    detail.value = d
    allStatuses.value = list
    approvalTypeOptions.value = enumNames.map((name) => ({ value: name, label: humanize(name) }))
  } catch (err) {
    toastError(err.message)
  } finally {
    loading.value = false
  }
}

/** Re-read just the transitions after a mutation so ids/isDeleted stay in sync. */
async function reloadDetail() {
  try {
    detail.value = await store.fetchById(props.status.id)
  } catch (err) {
    toastError(err.message)
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    detail.value = null
    allStatuses.value = []
    load()
  },
)

// One row per other status, with its transition if one exists.
const rows = computed(() => {
  const fromId = Number(props.status?.id)
  const transitions = detail.value?.transitionTo ?? []
  return allStatuses.value
    .filter((s) => Number(s.id) !== fromId)
    .map((s) => {
      const toId = Number(s.id)
      const t = transitions.find((tr) => Number(tr.toStatus?.id) === toId) || null
      return {
        toStatus: s,
        transition: t,
        active: !!t,
        requireApproval: t?.requireApproval ?? false,
        approvalType: normalizeApproval(t?.approvalType),
      }
    })
})

/** Run a mutation with per-row spinner, then resync. */
async function run(toStatusId, fn, okMsg) {
  busyId.value = toStatusId
  try {
    await fn()
    await reloadDetail()
    if (okMsg) success(okMsg)
  } catch (err) {
    toastError(err.message)
  } finally {
    busyId.value = null
  }
}

// Master toggle: on = create the transition, off = delete it.
function toggle(row) {
  const toId = Number(row.toStatus.id)
  const fromId = Number(props.status.id)
  if (row.active) {
    run(toId, () => store.deleteTransition(row.transition.id), 'Transisi dihapus')
  } else {
    run(
      toId,
      () =>
        store.createTransition({
          fromStatusId: fromId,
          toStatusId: toId,
          requireApproval: false,
          approvalType: null,
        }),
      'Transisi ditambahkan',
    )
  }
}

function setRequireApproval(row, val) {
  const toId = Number(row.toStatus.id)
  run(
    toId,
    () =>
      store.editTransition(row.transition.id, {
        fromStatusId: Number(props.status.id),
        toStatusId: toId,
        requireApproval: val,
        approvalType: val ? row.approvalType || null : null,
      }),
    'Transisi diperbarui',
  )
}

function setApprovalType(row, val) {
  const toId = Number(row.toStatus.id)
  run(
    toId,
    () =>
      store.editTransition(row.transition.id, {
        fromStatusId: Number(props.status.id),
        toStatusId: toId,
        requireApproval: true,
        approvalType: val || null,
      }),
    'Transisi diperbarui',
  )
}

const isBusy = (row) => busyId.value === Number(row.toStatus.id)
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="lg"
    title="Kelola Transisi"
    :subtitle="
      fromName
        ? `Dari “${fromName}”, task boleh dipindah ke status berikut. Perubahan tersimpan otomatis.`
        : ''
    "
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="loading" class="py-10 text-center text-sm text-slate-400">Memuat…</div>

    <p v-else-if="!rows.length" class="py-10 text-center text-sm text-slate-400">
      Belum ada status lain untuk dijadikan tujuan transisi.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.toStatus.id"
        class="overflow-hidden rounded-xl border transition-colors"
        :class="row.active ? 'border-primary-100 bg-primary-50/30' : 'border-slate-100'"
      >
        <!-- Target status + master toggle -->
        <div class="flex items-center justify-between gap-3 px-3 py-2.5">
          <span class="text-sm font-medium text-slate-800">{{ row.toStatus.name }}</span>

          <div class="flex items-center gap-2">
            <svg
              v-if="isBusy(row)"
              class="h-4 w-4 animate-spin text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <button
              type="button"
              class="relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50"
              :class="row.active ? 'bg-primary-600' : 'bg-slate-200'"
              role="switch"
              :aria-checked="row.active"
              :disabled="busyId !== null"
              :title="row.active ? 'Hapus transisi' : 'Tambah transisi'"
              @click="toggle(row)"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                :class="row.active ? 'left-[22px]' : 'left-0.5'"
              />
            </button>
          </div>
        </div>

        <!-- Approval config, only for active transitions -->
        <div
          v-if="row.active"
          class="space-y-3 border-t border-primary-100/70 bg-white/60 px-3 py-3"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-slate-800">Butuh approval</p>
              <p class="text-xs text-slate-400">Task perlu disetujui sebelum pindah ke sini.</p>
            </div>
            <button
              type="button"
              class="relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50"
              :class="row.requireApproval ? 'bg-primary-600' : 'bg-slate-200'"
              role="switch"
              :aria-checked="row.requireApproval"
              :disabled="busyId !== null"
              @click="setRequireApproval(row, !row.requireApproval)"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                :class="row.requireApproval ? 'left-[22px]' : 'left-0.5'"
              />
            </button>
          </div>

          <BaseSelect
            v-if="row.requireApproval"
            :model-value="row.approvalType"
            :options="approvalTypeOptions"
            label="Tipe approval"
            placeholder="Pilih tipe approval"
            :disabled="busyId !== null"
            @update:model-value="setApprovalType(row, $event)"
          />
        </div>
      </li>
    </ul>

    <template #footer>
      <div class="flex justify-end">
        <BaseButton variant="outline" @click="emit('update:modelValue', false)">Selesai</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
