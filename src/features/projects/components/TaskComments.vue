<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '@/features/projects/stores/project'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useToast } from '@/shared/composables/useToast'
import { formatDate } from '@/shared/utils/format'
import {
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PaperAirplaneIcon,
  UserIcon,
} from '@heroicons/vue/24/outline'

/**
 * Comments on a single task: a collapsible thread that shows the 5 most-recent
 * comments (with a "show all" toggle) and a box to add one. The author is the
 * signed-in employee (auth store / `pm_profile`), so it isn't picked.
 *
 * `task` = { id, title, comments: [{ id, comment, createdAt }] }.
 * Emits `saved` after a successful post so the parent can refetch and keep the
 * count/list in sync (same pattern as TaskAssignModal).
 */
const props = defineProps({
  task: { type: Object, required: true },
  // When false the thread is always shown (no toggle) — used inside a modal.
  collapsible: { type: Boolean, default: true },
})
const emit = defineEmits(['saved'])

const store = useProjectStore()
const auth = useAuthStore()
const { error: toastError } = useToast()

const PREVIEW_COUNT = 5

const open = ref(false)
const expanded = computed(() => !props.collapsible || open.value)
const showAll = ref(false)
const draft = ref('')
const saving = ref(false)

// Newest first.
const comments = computed(() =>
  [...(props.task?.comments ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
)
const count = computed(() => comments.value.length)
const visible = computed(() =>
  showAll.value ? comments.value : comments.value.slice(0, PREVIEW_COUNT),
)
const hasMore = computed(() => count.value > PREVIEW_COUNT)

async function submit() {
  const comment = draft.value.trim()
  if (!comment || saving.value) return

  auth.hydrate()
  const employeeId = auth.employee?.id
  if (!employeeId) {
    toastError('Sesi Anda tidak memuat data employee. Silakan login ulang.')
    return
  }

  saving.value = true
  try {
    await store.createTaskComment({ comment, taskId: props.task.id, employeeId })
    draft.value = ''
    emit('saved')
  } catch (err) {
    toastError(err.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div :class="collapsible ? 'mt-2.5 border-t border-slate-100 pt-2.5' : ''">
    <!-- Toggle (hidden when not collapsible, e.g. inside a modal) -->
    <button
      v-if="collapsible"
      type="button"
      class="flex items-center gap-1.5 text-caption transition hover:text-primary-600"
      @click="open = !open"
    >
      <ChatBubbleLeftRightIcon class="h-3.5 w-3.5" />
      {{ count }} {{ count === 1 ? 'Comment' : 'Comments' }}
      <ChevronUpIcon v-if="open" class="h-3.5 w-3.5" />
      <ChevronDownIcon v-else class="h-3.5 w-3.5" />
    </button>

    <div v-if="expanded" :class="collapsible ? 'mt-2.5 space-y-3' : 'space-y-3'">
      <!-- List -->
      <ul v-if="visible.length" class="space-y-2.5">
        <li v-for="c in visible" :key="c.id" class="flex gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600"
          >
            <UserIcon class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2">
            <div class="flex flex-wrap items-baseline gap-x-2">
              <span class="text-xs font-semibold text-slate-800">
                {{ c.employee?.fullName || 'Unknown' }}
              </span>
              <span v-if="c.employee?.user?.email" class="text-caption truncate">
                {{ c.employee.user.email }}
              </span>
            </div>
            <p class="mt-0.5 whitespace-pre-line break-words text-sm text-slate-700">
              {{ c.comment }}
            </p>
            <p v-if="c.createdAt" class="text-caption mt-0.5">
              {{ formatDate(c.createdAt, { hour: '2-digit', minute: '2-digit' }) }}
            </p>
          </div>
        </li>
      </ul>
      <p v-else class="text-caption">Belum ada komentar.</p>

      <button
        v-if="hasMore"
        type="button"
        class="text-xs font-medium text-primary-600 hover:text-primary-700"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Show less' : `Show all ${count} comments` }}
      </button>

      <!-- Add comment -->
      <div class="flex items-end gap-2">
        <textarea
          v-model="draft"
          rows="1"
          placeholder="Tulis komentar…"
          class="focus-ring min-h-[38px] flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400"
          @keydown.enter.exact.prevent="submit"
        />
        <button
          type="button"
          class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="saving || !draft.trim()"
          title="Kirim komentar"
          @click="submit"
        >
          <PaperAirplaneIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
