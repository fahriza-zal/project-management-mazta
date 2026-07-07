<script setup>
import { ref, watch } from 'vue'
import { PlusIcon, TrashIcon, FlagIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseDatePicker from '@/shared/components/base/BaseDatePicker.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

/**
 * Dynamic Milestone Builder — add several milestones for a project. v-model is
 * an array of `{ name, description, expectedStartDate, expectedEndDate, isCounted }`.
 * `order` and `projectId` are assigned by the page at submit time.
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
})
const rows = ref(props.modelValue.length ? [...props.modelValue] : [])

watch(rows, (value) => emit('update:modelValue', value), { deep: true })

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
