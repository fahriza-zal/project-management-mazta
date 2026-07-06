<script setup>
import { ref, watch } from 'vue'
import { PlusIcon, TrashIcon, UsersIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseSearchSelect from '@/shared/components/base/BaseSearchSelect.vue'

/**
 * Project Unit Builder — assign the units that work on the project, each with a
 * project role. v-model is an array of `{ unitId, roleId }`, matching the shape
 * of `ProjectInput.units`.
 *
 * Both `unitId` and `roleId` are picked from server-searched pickers
 * (`unitFetcher` / `roleFetcher`). When prefilling (edit), set `_unitName` /
 * `_roleName` on a row so each picker shows its current selection.
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  // fetcher(term) => Promise<[{ id, name }]> for the unit picker.
  unitFetcher: { type: Function, required: true },
  // fetcher(term) => Promise<[{ id, name }]> for the role picker.
  roleFetcher: { type: Function, required: true },
})
const emit = defineEmits(['update:modelValue'])

const newRow = () => ({ unitId: null, roleId: null })
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
      v-for="(unit, index) in rows"
      :key="index"
      class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <p class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <UsersIcon class="h-4 w-4 text-primary-500" />
          Unit {{ index + 1 }}
        </p>
        <BaseButton variant="ghost" size="sm" type="button" @click="remove(index)">
          <TrashIcon class="h-4 w-4 text-danger" />
        </BaseButton>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Unit</label>
          <BaseSearchSelect
            v-model="unit.unitId"
            placeholder="Search unit…"
            empty-text="No units found."
            :fetcher="unitFetcher"
            :initial-item="unit._unitName ? { id: unit.unitId, name: unit._unitName } : null"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
          <BaseSearchSelect
            v-model="unit.roleId"
            placeholder="Search role…"
            empty-text="No roles found."
            :fetcher="roleFetcher"
            :initial-item="unit._roleName ? { id: unit.roleId, name: unit._roleName } : null"
          />
        </div>
      </div>
    </div>

    <BaseButton variant="outline" size="sm" type="button" block @click="add">
      <PlusIcon class="h-4 w-4" />
      Add Unit
    </BaseButton>

    <p v-if="!rows.length" class="text-center text-xs text-slate-400">
      No units assigned yet. Assign units and their project roles (optional).
    </p>
  </div>
</template>
