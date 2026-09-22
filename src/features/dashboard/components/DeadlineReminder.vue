<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  BellAlertIcon,
  CheckCircleIcon,
  FolderIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/vue/24/outline'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'

/**
 * "Deadline Minggu Ini" — pengingat project & task yang jatuh tempo dalam 7 hari
 * ke depan. Dihitung dari baris `getRangeProject` yang sama dengan Gantt
 * (`ranges`), jadi tidak butuh query tambahan. Yang sudah selesai/tutup di-skip.
 *
 *   • Task    → dueDate belum lewat & belum `doneAt`, dalam jendela 7 hari.
 *   • Project → expectedEndDate belum lewat & belum `isClosed`/`endDate`.
 */
const props = defineProps({
  ranges: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  windowDays: { type: Number, default: 7 },
})

const DAY = 86400000
const today = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  new Date().getDate(),
).getTime()

function parseDay(v) {
  if (!v) return null
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).getTime()
}
function fmt(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
function assigneeNames(task) {
  const seen = new Set()
  const names = []
  for (const a of task?.assignments ?? []) {
    const n = a?.employee?.fullName
    if (n && !seen.has(n)) {
      seen.add(n)
      names.push(n)
    }
  }
  return names.join(', ')
}

// Relative-day label + urgency tone.
function rel(due) {
  const d = Math.round((due - today) / DAY)
  if (d <= 0) return { label: 'Hari ini', tone: 'danger' }
  if (d === 1) return { label: 'Besok', tone: 'warning' }
  return { label: `${d} hari lagi`, tone: 'info' }
}
const TONE = {
  danger: { dot: '#ef4444', chip: 'bg-red-50 text-danger' },
  warning: { dot: '#f59e0b', chip: 'bg-amber-50 text-warning' },
  info: { dot: '#3b82f6', chip: 'bg-blue-50 text-info' },
}

const items = computed(() => {
  const end = today + props.windowDays * DAY
  const out = []
  for (const r of props.ranges ?? []) {
    const p = r?.project
    if (!p?.id) continue

    // Project deadline
    const pClosed = p.isClosed || parseDay(r.endDate) != null || parseDay(p.endDate) != null
    const pDue = parseDay(r.expectedEndDate) ?? parseDay(p.expectedEndDate)
    if (!pClosed && pDue != null && pDue >= today && pDue <= end) {
      out.push({
        key: `p-${p.id}`,
        type: 'project',
        projectId: p.id,
        title: p.name || 'Tanpa nama',
        sub: p.fullCode || p.prefix || '',
        assignee: '',
        due: pDue,
      })
    }

    // Task deadlines
    for (const ms of p.milestones ?? []) {
      for (const t of ms.tasks ?? []) {
        if (parseDay(t.doneAt) != null) continue
        const due = parseDay(t.dueDate)
        if (due == null || due < today || due > end) continue
        out.push({
          key: `t-${t.id}`,
          type: 'task',
          projectId: p.id,
          title: t.title || 'Untitled',
          sub: [p.name, ms.name].filter(Boolean).join(' · '),
          assignee: assigneeNames(t),
          due,
        })
      }
    }
  }
  return out.sort((a, b) => a.due - b.due || a.title.localeCompare(b.title))
})
</script>

<template>
  <section class="surface p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-start gap-2.5">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
          <BellAlertIcon class="h-5 w-5 text-warning" />
        </span>
        <div class="min-w-0">
          <h2 class="text-subheading">Deadline Minggu Ini</h2>
          <p class="text-caption mt-0.5">Jatuh tempo dalam {{ windowDays }} hari ke depan.</p>
        </div>
      </div>
      <span
        v-if="items.length"
        class="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-warning"
      >
        {{ items.length }} item
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-10 text-center text-sm text-slate-400">Memuat pengingat…</div>

    <!-- Empty -->
    <BaseEmpty
      v-else-if="!items.length"
      :icon="CheckCircleIcon"
      title="Tidak ada deadline minggu ini"
      description="Tidak ada project atau task yang jatuh tempo dalam waktu dekat."
    />

    <!-- List (scroll saat banyak) -->
    <ul v-else class="max-h-96 space-y-1.5 overflow-y-auto pr-1">
      <li v-for="it in items" :key="it.key">
        <RouterLink
          :to="{ name: 'project-detail', params: { id: it.projectId } }"
          class="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50"
        >
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :style="{ backgroundColor: TONE[rel(it.due).tone].dot }"
          />
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1.5">
              <component
                :is="it.type === 'project' ? FolderIcon : ClipboardDocumentCheckIcon"
                class="h-3.5 w-3.5 shrink-0 text-slate-400"
              />
              <span class="truncate text-sm font-semibold text-slate-700">{{ it.title }}</span>
            </span>
            <span v-if="it.sub || it.assignee" class="mt-0.5 block truncate text-xs text-slate-400">
              {{ it.sub }}<template v-if="it.assignee"> · {{ it.assignee }}</template>
            </span>
          </span>
          <span class="shrink-0 text-right">
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="TONE[rel(it.due).tone].chip"
            >
              {{ rel(it.due).label }}
            </span>
            <span class="mt-0.5 block text-[11px] tabular-nums text-slate-400">{{
              fmt(it.due)
            }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
