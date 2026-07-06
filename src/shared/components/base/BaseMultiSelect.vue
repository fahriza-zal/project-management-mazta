<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon } from '@heroicons/vue/24/outline'

/**
 * Generic searchable multi-select.
 *
 * v-model is an array of ids (Int[]). Provide a `fetcher(term) => Promise<[{ id, name }]>`
 * that returns the options for a search term (server-side search recommended).
 * Pass `initialItems` ([{ id, name }]) to prefill the selected chips when editing.
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  initialItems: { type: Array, default: () => [] },
  fetcher: { type: Function, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Search…' },
  emptyText: { type: String, default: 'No results found.' },
  error: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const DEBOUNCE_MS = 300

const options = ref([])
const loading = ref(false)
// Track selected items as { id, name } so chips render without re-fetching.
const selected = ref([...props.initialItems])
const open = ref(false)
const query = ref('')
const root = ref(null)
let timer = null

const selectedIds = computed(() => selected.value.map((i) => i.id))

function isSelected(id) {
  return selectedIds.value.includes(id)
}

function emitChange() {
  emit('update:modelValue', selectedIds.value)
}

async function fetchOptions(term) {
  loading.value = true
  try {
    options.value = (await props.fetcher(term)) ?? []
  } catch {
    options.value = []
  } finally {
    loading.value = false
  }
}

function toggle(item) {
  if (isSelected(item.id)) {
    selected.value = selected.value.filter((i) => i.id !== item.id)
  } else {
    selected.value.push({ id: item.id, name: item.name })
  }
  emitChange()
}

function remove(id) {
  selected.value = selected.value.filter((i) => i.id !== id)
  emitChange()
}

function openDropdown() {
  open.value = true
  if (!options.value.length) fetchOptions('')
}

function onSearch(value) {
  query.value = value
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => fetchOptions(value.trim()), DEBOUNCE_MS)
}

function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative">
    <label v-if="label" class="mb-1.5 block text-sm font-medium text-slate-700">{{ label }}</label>

    <!-- Selected chips -->
    <div v-if="selected.length" class="mb-2 flex flex-wrap gap-1.5">
      <span
        v-for="i in selected"
        :key="i.id"
        class="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700"
      >
        {{ i.name }}
        <button type="button" class="hover:text-primary-900" @click="remove(i.id)">
          <XMarkIcon class="h-3.5 w-3.5" />
        </button>
      </span>
    </div>

    <!-- Search input -->
    <div class="relative">
      <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        <MagnifyingGlassIcon class="h-4 w-4" />
      </span>
      <input
        :value="query"
        type="text"
        :placeholder="placeholder"
        class="block h-10 w-full rounded-xl border bg-white/70 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 backdrop-blur focus-ring"
        :class="error ? 'border-danger focus:ring-danger/30 focus:border-danger' : 'border-white/70'"
        @focus="openDropdown"
        @input="onSearch($event.target.value)"
      />
    </div>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-white/60 bg-white/85 py-1 shadow-dropdown backdrop-blur-xl"
    >
      <p v-if="loading" class="px-3 py-2 text-sm text-slate-400">Loading…</p>
      <p v-else-if="!options.length" class="px-3 py-2 text-sm text-slate-400">{{ emptyText }}</p>
      <button
        v-for="item in options"
        v-else
        :key="item.id"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        @click="toggle(item)"
      >
        {{ item.name }}
        <CheckIcon v-if="isSelected(item.id)" class="h-4 w-4 text-primary-600" />
      </button>
    </div>

    <p v-if="error" class="mt-1.5 text-xs text-danger">{{ error }}</p>
  </div>
</template>
