<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon } from '@heroicons/vue/24/outline'

/**
 * Generic searchable single-select.
 *
 * v-model is a single id (or null). Provide a `fetcher(term) => Promise<[{ id, name }]>`
 * that returns the options for a search term (server-side search recommended).
 * Pass `initialItem` ({ id, name }) to prefill the selected value when editing.
 */
const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  initialItem: { type: Object, default: null },
  fetcher: { type: Function, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Search…' },
  emptyText: { type: String, default: 'No results found.' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const DEBOUNCE_MS = 300

const options = ref([])
const loading = ref(false)
const selected = ref(props.initialItem)
const open = ref(false)
const query = ref('')
const root = ref(null)
let timer = null

// Keep the chip in sync when the parent clears or prefills the value externally.
watch(
  () => props.modelValue,
  (val) => {
    if (val == null) selected.value = null
  },
)
watch(
  () => props.initialItem,
  (val) => {
    if (val) selected.value = val
  },
)

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

function choose(item) {
  selected.value = { id: item.id, name: item.name }
  emit('update:modelValue', item.id)
  query.value = ''
  open.value = false
}

function clear() {
  selected.value = null
  emit('update:modelValue', null)
  query.value = ''
}

function openDropdown() {
  if (props.disabled) return
  query.value = ''
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

    <div class="relative">
      <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        <MagnifyingGlassIcon class="h-4 w-4" />
      </span>
      <input
        :value="open ? query : (selected?.name ?? '')"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="block h-10 w-full rounded-xl border bg-white/70 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 backdrop-blur focus-ring disabled:bg-slate-100/60"
        :class="error ? 'border-danger focus:ring-danger/30 focus:border-danger' : 'border-white/70'"
        @focus="openDropdown"
        @input="onSearch($event.target.value)"
      />
      <button
        v-if="selected && !disabled"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
        @click="clear"
      >
        <XMarkIcon class="h-4 w-4" />
      </button>
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
        @click="choose(item)"
      >
        {{ item.name }}
        <CheckIcon v-if="selected?.id === item.id" class="h-4 w-4 text-primary-600" />
      </button>
    </div>

    <p v-if="error" class="mt-1.5 text-xs text-danger">{{ error }}</p>
  </div>
</template>
