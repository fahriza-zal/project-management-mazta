<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useProjectStore } from '@/features/projects/stores/project'
import { useAuthStore } from '@/features/auth/stores/auth'
import { PERM } from '@/features/projects/permissions'
import { useToast } from '@/shared/composables/useToast'
import {
  PaperClipIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  PhotoIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PresentationChartBarIcon,
} from '@heroicons/vue/24/outline'

/**
 * Upload & list attachments for a project OR a task (exactly one target).
 * Pass `projectId` for project files, or `taskId` for task files.
 *
 * Mirrors TaskComments: collapsible in a card (per-task), or always-open in a
 * panel (`collapsible=false`). Emits `saved` after a successful upload so the
 * parent can refetch and keep the list/count in sync.
 */
const props = defineProps({
  projectId: { type: [Number, String], default: null },
  taskId: { type: [Number, String], default: null },
  attachments: { type: Array, default: () => [] },
  collapsible: { type: Boolean, default: true },
})
const emit = defineEmits(['saved'])

const store = useProjectStore()
const auth = useAuthStore()
const { success, error: toastError } = useToast()

const canUpload = computed(() => auth.can(PERM.CREATE_ATTACHMENT))

// ── Allowed files: images, pdf, office (word/excel/powerpoint), ≤ 5 MB each ────
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_EXT = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'pdf',
  'xls',
  'xlsx',
  'doc',
  'docx',
  'ppt',
  'pptx',
]
const ACCEPT = 'image/*,.pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx'

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']

const extOf = (name) =>
  String(name || '')
    .split('.')
    .pop()
    .toLowerCase()

/** Icon for a file, chosen by extension. */
function iconFor(name) {
  const ext = extOf(name)
  if (IMAGE_EXT.includes(ext)) return PhotoIcon
  if (ext === 'pdf') return DocumentTextIcon
  if (['xls', 'xlsx'].includes(ext)) return TableCellsIcon
  if (['ppt', 'pptx'].includes(ext)) return PresentationChartBarIcon
  return DocumentIcon
}

/** Human file size, e.g. "1.4 MB". */
function humanSize(bytes) {
  const b = Number(bytes) || 0
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

// ── Existing attachments ──────────────────────────────────────────────────────
/** `files` may be a single URL string or an array (or a JSON-encoded array). */
function normalizeFiles(files) {
  if (Array.isArray(files)) return files.filter(Boolean)
  if (typeof files === 'string') {
    const s = files.trim()
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s)
        if (Array.isArray(arr)) return arr.filter(Boolean)
      } catch {
        /* fall through to single */
      }
    }
    return s ? [s] : []
  }
  return []
}

/** Flatten attachments → one row per file URL. (`attachments` can be null.) */
const fileRows = computed(() =>
  (props.attachments ?? []).flatMap((a) =>
    normalizeFiles(a.files).map((url, i) => {
      const name = String(url).split(/[/\\]/).pop() || 'file'
      return { key: `${a.id}-${i}`, url, name, isImage: IMAGE_EXT.includes(extOf(name)) }
    }),
  ),
)
const count = computed(() => fileRows.value.length)

// ── Selection + upload (one file at a time) ───────────────────────────────────
const open = ref(false)
const expanded = computed(() => !props.collapsible || open.value)
const fileInput = ref(null)
const selected = ref(null) // File | null
const previewUrl = ref('') // object URL for an image preview (revoked on change)
const error = ref('') // single validation error
const uploading = ref(false)

const selectedIsImage = computed(
  () => selected.value && IMAGE_EXT.includes(extOf(selected.value.name)),
)

function pick() {
  fileInput.value?.click()
}

function validate(file) {
  if (!ALLOWED_EXT.includes(extOf(file.name))) return `“${file.name}”: format tidak didukung.`
  if (file.size > MAX_SIZE) return `“${file.name}”: melebihi 5 MB.`
  return null
}

/** Drop the staged file and free any preview object URL. */
function clearSelected() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  selected.value = null
}

function onSelect(event) {
  error.value = ''
  const file = event.target.files?.[0] // single file only
  // Reset so picking the same file again re-fires change.
  event.target.value = ''
  if (!file) return

  const err = validate(file)
  if (err) {
    error.value = err
    return
  }
  clearSelected()
  selected.value = file
  if (IMAGE_EXT.includes(extOf(file.name))) previewUrl.value = URL.createObjectURL(file)
}

async function upload() {
  if (!selected.value || uploading.value) return
  uploading.value = true
  try {
    await store.createAttachment({
      projectId: props.projectId,
      taskId: props.taskId,
      file: selected.value,
    })
    success('File diunggah.')
    clearSelected()
    error.value = ''
    emit('saved')
  } catch (err) {
    toastError(err.message)
  } finally {
    uploading.value = false
  }
}

onBeforeUnmount(clearSelected)
</script>

<template>
  <div :class="collapsible ? 'mt-2.5 border-t border-slate-100 pt-2.5' : ''">
    <!-- Toggle (collapsible: per-task card) -->
    <button
      v-if="collapsible"
      type="button"
      class="text-caption flex items-center gap-1.5 transition hover:text-primary-600"
      @click="open = !open"
    >
      <PaperClipIcon class="h-3.5 w-3.5" />
      {{ count }} {{ count === 1 ? 'File' : 'Files' }}
      <ChevronUpIcon v-if="open" class="h-3.5 w-3.5" />
      <ChevronDownIcon v-else class="h-3.5 w-3.5" />
    </button>

    <div v-if="expanded" :class="collapsible ? 'mt-2.5 space-y-3' : 'space-y-3'">
      <!-- Existing files -->
      <ul v-if="fileRows.length" class="space-y-1.5">
        <li
          v-for="f in fileRows"
          :key="f.key"
          class="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white/70 px-3 py-2"
        >
          <!-- Real thumbnail for images; type icon otherwise -->
          <a v-if="f.isImage" :href="f.url" target="_blank" rel="noopener" class="shrink-0">
            <img
              :src="f.url"
              :alt="f.name"
              class="h-9 w-9 rounded-lg border border-slate-100 object-cover"
            />
          </a>
          <component :is="iconFor(f.name)" v-else class="h-4.5 w-4.5 shrink-0 text-slate-400" />
          <a
            :href="f.url"
            target="_blank"
            rel="noopener"
            class="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:text-primary-600"
          >
            {{ f.name }}
          </a>
        </li>
      </ul>
      <p v-else class="text-caption">Belum ada file.</p>

      <!-- Upload control (permission-gated) — one file at a time -->
      <div v-if="canUpload" class="space-y-2">
        <input ref="fileInput" type="file" :accept="ACCEPT" class="hidden" @change="onSelect" />

        <!-- Staged file preview, pending upload -->
        <div
          v-if="selected"
          class="flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/50 p-2.5"
        >
          <!-- Image thumbnail, else a type icon -->
          <img
            v-if="selectedIsImage && previewUrl"
            :src="previewUrl"
            :alt="selected.name"
            class="h-12 w-12 shrink-0 rounded-lg border border-white object-cover"
          />
          <span
            v-else
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-primary-500"
          >
            <component :is="iconFor(selected.name)" class="h-6 w-6" />
          </span>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-800">{{ selected.name }}</p>
            <p class="text-caption">{{ humanSize(selected.size) }}</p>
          </div>

          <button
            type="button"
            class="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-danger"
            title="Hapus file"
            @click="clearSelected"
          >
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>

        <!-- Validation error -->
        <p v-if="error" class="text-xs text-danger">{{ error }}</p>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-600"
            @click="pick"
          >
            <PaperClipIcon class="h-4 w-4" />
            {{ selected ? 'Ganti file' : 'Pilih file' }}
          </button>
          <button
            v-if="selected"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="uploading"
            @click="upload"
          >
            <ArrowUpTrayIcon class="h-4 w-4" />
            {{ uploading ? 'Mengunggah…' : 'Unggah' }}
          </button>
        </div>
        <p class="text-caption">Gambar, PDF, Word, Excel, PowerPoint · maks 5 MB · 1 file.</p>
      </div>
    </div>
  </div>
</template>
