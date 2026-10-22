<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useProjectStore } from '@/features/projects/stores/project'
import { useAuthStore } from '@/features/auth/stores/auth'
import { PERM } from '@/features/projects/permissions'
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
 *
 * The compose box supports @-mentions: typing `@` opens a dropdown of employees
 * (scoped to the signed-in user's units/division). Selecting one inserts the
 * token `@[Full Name](id)` — that literal string is what gets stored. When
 * rendering a comment those tokens show as highlighted `@Name` chips.
 */
const props = defineProps({
  task: { type: Object, required: true },
  // When false the thread is always shown (no toggle) — used inside a modal.
  collapsible: { type: Boolean, default: true },
})
const emit = defineEmits(['saved'])

const store = useProjectStore()
const auth = useAuthStore()
const { success, error: toastError } = useToast()

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

/* ------------------------------------------------------------------ */
/* Rendering stored comments: split `@[Name](id)` tokens into chips.   */
/* ------------------------------------------------------------------ */
const MENTION_RE = /@\[([^\]]+)\]\((\d+)\)/g

function renderSegments(text) {
  const out = []
  let last = 0
  let m
  MENTION_RE.lastIndex = 0
  while ((m = MENTION_RE.exec(text ?? ''))) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) })
    out.push({ type: 'mention', value: m[1], id: m[2] })
    last = m.index + m[0].length
  }
  if (last < (text?.length ?? 0)) out.push({ type: 'text', value: text.slice(last) })
  return out
}

/* ------------------------------------------------------------------ */
/* @-mention autocomplete in the compose box.                          */
/* ------------------------------------------------------------------ */
// Scope mentions to the signed-in employee's units (their division). Empty → no
// unit filter (super users with no employee record just see everyone).
const myUnitIds = computed(() =>
  (auth.employee?.units ?? []).map((u) => Number(u.id)).filter(Boolean),
)

const textareaRef = ref(null)
const mentionOpen = ref(false)
const mentionQuery = ref('')
const mentionItems = ref([])
const mentionActive = ref(0)
const mentionLoading = ref(false)
// Index of the triggering `@` in `draft`, so we know what to replace on select.
const mentionStart = ref(0)
// Picked mentions: the textarea shows the friendly `@Full Name`, and on submit we
// turn each back into the stored `@[Full Name](id)` token using this registry.
const picked = ref([])
let fetchTimer = null
let fetchSeq = 0

function closeMention() {
  mentionOpen.value = false
  mentionQuery.value = ''
  mentionItems.value = []
  mentionActive.value = 0
}

/** Re-evaluate whether the caret sits inside an `@query` and update state. */
function detectMention() {
  const el = textareaRef.value
  if (!el) return closeMention()
  const pos = el.selectionStart ?? draft.value.length
  const upto = draft.value.slice(0, pos)
  // `@` at start or after whitespace, then non-space chars (the query stops at a
  // space — Slack/GitHub style). This also means an inserted `@Full Name ` chip
  // (always followed by a space) won't re-trigger the dropdown.
  const m = upto.match(/(?:^|\s)@(\S{0,30})$/)
  if (!m) return closeMention()
  mentionStart.value = pos - m[1].length - 1
  mentionQuery.value = m[1]
  mentionOpen.value = true
  mentionActive.value = 0
  scheduleFetch(m[1])
}

function scheduleFetch(query) {
  clearTimeout(fetchTimer)
  mentionLoading.value = true
  fetchTimer = setTimeout(async () => {
    const seq = ++fetchSeq
    try {
      const items = await store.fetchEmployeeOptions(query, { unitIds: myUnitIds.value })
      if (seq !== fetchSeq || !mentionOpen.value) return // stale / closed
      mentionItems.value = items
      mentionActive.value = 0
    } catch {
      if (seq === fetchSeq) mentionItems.value = []
    } finally {
      if (seq === fetchSeq) mentionLoading.value = false
    }
  }, 200)
}

function selectMention(item) {
  const el = textareaRef.value
  const pos = el?.selectionStart ?? draft.value.length
  const before = draft.value.slice(0, mentionStart.value)
  const after = draft.value.slice(pos)
  // Insert the friendly display name; the stored token is rebuilt at submit time.
  const display = `@${item.name}`
  draft.value = `${before}${display} ${after}`
  if (!picked.value.some((p) => p.name === item.name && String(p.id) === String(item.id))) {
    picked.value.push({ name: item.name, id: item.id })
  }
  closeMention()
  nextTick(() => {
    if (!el) return
    const caret = `${before}${display} `.length
    el.focus()
    el.setSelectionRange(caret, caret)
  })
}

/**
 * Turn the display text back into stored tokens: each picked `@Full Name`
 * becomes `@[Full Name](id)`. Longer names first so a shorter name that's a
 * prefix of another doesn't get replaced inside it.
 */
function toMarkup(text) {
  let out = text
  const sorted = [...picked.value].sort((a, b) => b.name.length - a.name.length)
  for (const p of sorted) {
    out = out.split(`@${p.name}`).join(`@[${p.name}](${p.id})`)
  }
  return out
}

function onKeydown(e) {
  // When the mention dropdown is open, arrows/enter/esc drive it.
  if (mentionOpen.value && mentionItems.value.length) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionActive.value = (mentionActive.value + 1) % mentionItems.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionActive.value =
        (mentionActive.value - 1 + mentionItems.value.length) % mentionItems.value.length
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      selectMention(mentionItems.value[mentionActive.value])
      return
    }
  }
  if (mentionOpen.value && e.key === 'Escape') {
    e.preventDefault()
    closeMention()
    return
  }
  // Otherwise Enter (without Shift) submits the comment.
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

// Close on blur, but defer so a click on a suggestion still registers.
function onBlur() {
  setTimeout(closeMention, 120)
}

onMounted(() => auth.hydrate()) // ensure employee.units is available for the mention scope
onBeforeUnmount(() => clearTimeout(fetchTimer))

async function submit() {
  const display = draft.value.trim()
  if (!display || saving.value) return

  auth.hydrate()
  const employeeId = auth.employee?.id
  if (!employeeId) {
    toastError('Sesi Anda tidak memuat data employee. Silakan login ulang.')
    return
  }

  // Store the token form (`@[Name](id)`), not the friendly display text.
  const comment = toMarkup(display)

  saving.value = true
  try {
    await store.createTaskComment({ comment, taskId: props.task.id, employeeId })
    draft.value = ''
    picked.value = []
    closeMention()
    success('Komentar terkirim.')
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
              <template v-for="(seg, i) in renderSegments(c.comment)" :key="i">
                <span
                  v-if="seg.type === 'mention'"
                  class="rounded bg-primary-50 px-1 font-medium text-primary-700"
                  >@{{ seg.value }}</span
                >
                <template v-else>{{ seg.value }}</template>
              </template>
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
      <div v-if="auth.can(PERM.COMMENT)" class="relative flex items-end gap-2">
        <div class="relative flex-1">
          <textarea
            ref="textareaRef"
            v-model="draft"
            rows="1"
            placeholder="Tulis komentar… ketik @ untuk menyebut rekan"
            class="focus-ring min-h-[38px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400"
            @input="detectMention"
            @click="detectMention"
            @keyup="detectMention"
            @keydown="onKeydown"
            @blur="onBlur"
          />

          <!-- @-mention dropdown (opens upward so it isn't clipped at the bottom) -->
          <div
            v-if="mentionOpen"
            class="absolute bottom-full left-0 z-20 mb-1 max-h-52 w-72 max-w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            <p v-if="mentionLoading" class="px-3 py-2 text-caption">Mencari…</p>
            <template v-else-if="mentionItems.length">
              <button
                v-for="(item, i) in mentionItems"
                :key="item.id"
                type="button"
                class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition"
                :class="
                  i === mentionActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-700 hover:bg-slate-50'
                "
                @mousedown.prevent="selectMention(item)"
                @mouseenter="mentionActive = i"
              >
                <span
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <UserIcon class="h-3.5 w-3.5" />
                </span>
                <span class="truncate">{{ item.name }}</span>
              </button>
            </template>
            <p v-else class="px-3 py-2 text-caption">Employee tidak ditemukan.</p>
          </div>
        </div>

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
