<script setup>
import { ref, watch } from 'vue'
import { PlusIcon, TrashIcon, FlagIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseDatePicker from '@/shared/components/base/BaseDatePicker.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseMultiSelect from '@/shared/components/base/BaseMultiSelect.vue'

/**
 * Dynamic Milestone Builder — add several milestones for a project. v-model is
 * an array of `{ name, description, expectedStartDate, expectedEndDate, isCounted,
 * dependsOnIds }`. `order` and `projectId` are assigned by the page at submit time.
 *
 * `dependsOnIds` lists the ids of *already-saved* milestones this one depends on
 * (a milestone can only start once its dependencies are done). Because it can only
 * reference persisted milestones, the picker offers the other rows that carry an
 * `_id` (excluding itself).
 *
 * A persisted row carries an `_id`. By default persisted rows are read-only with
 * a "Saved" badge (create flow). Pass `allowEdit` to keep them editable so the
 * Edit Project page can change existing milestones too.
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  allowEdit: { type: Boolean, default: false },
})
// `delete-saved` asks the page to delete a persisted milestone (row with `_id`)
// via the API; the page removes it from the model on success.
const emit = defineEmits(['update:modelValue', 'delete-saved'])

const newRow = () => ({
  name: '',
  description: '',
  expectedStartDate: '',
  expectedEndDate: '',
  isCounted: true,
  dependsOnIds: [],
})
const rows = ref(props.modelValue.length ? [...props.modelValue] : [])

watch(rows, (value) => emit('update:modelValue', value), { deep: true })

function add() {
  rows.value.push(newRow())
}

function remove(index) {
  rows.value.splice(index, 1)
}

/** Whether a row's fields are editable (new row, or saved row with `allowEdit`). */
function editable(milestone) {
  return !milestone._id || props.allowEdit
}

/**
 * Candidate dependencies for the row at `index`: every *other* row that is
 * already saved (has `_id`), optionally filtered by the search term. Returned as
 * `{ id, name }` for BaseMultiSelect. Local (no server call) — resolved via a
 * Promise so it matches the component's `fetcher` contract.
 */
function dependencyFetcher(index) {
  return (term) => {
    const t = String(term || '').toLowerCase()
    const options = rows.value
      .filter(
        (m, i) =>
          i !== index &&
          m._id != null &&
          String(m.name || '')
            .toLowerCase()
            .includes(t),
      )
      .map((m) => ({ id: m._id, name: m.name || `Milestone #${m._id}` }))
    return Promise.resolve(options)
  }
}

/**
 * Prefill chips for a row's already-selected dependencies, so the selection
 * survives a builder remount (the `:key` bump the page does after a delete).
 */
function initialDependencies(milestone) {
  return (milestone.dependsOnIds ?? []).map((id) => {
    const found = rows.value.find((m) => m._id === id)
    return { id, name: found?.name || `Milestone #${id}` }
  })
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(milestone, index) in rows"
      :key="index"
      class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <p class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <FlagIcon class="h-4 w-4 text-primary-500" />
          Milestone {{ index + 1 }}
        </p>
        <div class="flex items-center gap-2">
          <span
            v-if="milestone._id"
            class="inline-flex items-center gap-1 text-xs font-medium text-success"
          >
            <CheckCircleIcon class="h-4 w-4" />
            Saved
          </span>
          <BaseButton
            v-if="!milestone._id"
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
            title="Delete milestone"
            @click="emit('delete-saved', index)"
          >
            <TrashIcon class="h-4 w-4 text-danger" />
          </BaseButton>
        </div>
      </div>

      <div class="space-y-4">
        <BaseInput
          v-model="milestone.name"
          label="Milestone Name"
          placeholder="e.g. Requirement Gathering"
          :disabled="milestone._id && !allowEdit"
        />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseDatePicker
            v-model="milestone.expectedStartDate"
            label="Expected Start"
            :disabled="milestone._id && !allowEdit"
          />
          <BaseDatePicker
            v-model="milestone.expectedEndDate"
            label="Expected End"
            :disabled="milestone._id && !allowEdit"
          />
        </div>

        <BaseTextarea
          v-model="milestone.description"
          label="Description"
          placeholder="Short description of this phase (optional)"
          :rows="2"
          :disabled="milestone._id && !allowEdit"
        />

        <div
          class="flex items-center justify-between rounded-xl border border-slate-100 bg-white/60 px-3 py-2.5"
        >
          <div>
            <p class="text-sm font-medium text-slate-800">Counted in progress</p>
            <p class="text-xs text-slate-400">
              Include this milestone in the progress calculation.
            </p>
          </div>
          <button
            type="button"
            class="relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60"
            :class="milestone.isCounted ? 'bg-primary-600' : 'bg-slate-200'"
            role="switch"
            :aria-checked="milestone.isCounted"
            :disabled="milestone._id && !allowEdit"
            @click="!(milestone._id && !allowEdit) && (milestone.isCounted = !milestone.isCounted)"
          >
            <span
              class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              :class="milestone.isCounted ? 'left-[22px]' : 'left-0.5'"
            />
          </button>
        </div>

        <!-- Depends on: only offer other, already-saved milestones. Hidden when
             this row isn't editable or there is nothing saved to depend on yet. -->
        <BaseMultiSelect
          v-if="editable(milestone) && rows.some((m, i) => i !== index && m._id != null)"
          v-model="milestone.dependsOnIds"
          :initial-items="initialDependencies(milestone)"
          :fetcher="dependencyFetcher(index)"
          label="Depends on"
          placeholder="Milestone yang harus selesai lebih dulu…"
          empty-text="Belum ada milestone tersimpan lain."
        />
      </div>
    </div>

    <BaseButton variant="outline" size="sm" type="button" block @click="add">
      <PlusIcon class="h-4 w-4" />
      Add Milestone
    </BaseButton>

    <p v-if="!rows.length" class="text-center text-xs text-slate-400">
      No milestones yet. Milestones are optional and group the project into phases.
    </p>
  </div>
</template>
