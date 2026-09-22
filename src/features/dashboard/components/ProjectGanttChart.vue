<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  LockClosedIcon,
  ChevronDownIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/vue/24/outline'

/**
 * Gantt-style timeline for projects — a three-level WBS (Project → Milestone →
 * Task) sharing one monthly timeline. No charting dependency: pure div/CSS.
 *
 * Readability model (redesign): **hierarchy is shown by the label column
 * (indent + dot shape); the bar COLOR encodes STATUS**, which is what a PM scans
 * for:
 *   • Berjalan (in progress) → blue
 *   • Selesai (done)         → green
 *   • Terlambat (overdue)    → red
 *   • Belum mulai (pending)  → slate
 * Every bar is a soft status-tinted track with a solid fill = progress, and a
 * "NN%" caption to its right (tasks also show the assignee). Names live in the
 * sticky left column so short bars never clip them.
 *
 * Progress rolls up: milestone % = mean of its tasks, project % = mean of all
 * its tasks (fallback to closed → 100%).
 *
 * Consumes the raw rows from `getRangeProject`:
 *   { startDate, expectedEndDate, endDate, project {
 *       id, name, fullCode, isClosed, isLocked,
 *       milestones { id, name, status, expectedStartDate, expectedEndDate,
 *         actualEndDate, tasks { id, title, startedAt, dueDate, doneAt,
 *           assignments { employee { id, fullName } } } } } }
 */
const props = defineProps({
  ranges: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  title: { type: String, default: 'Timeline Project' },
  subtitle: {
    type: String,
    default: 'Warna bar = status · panjang = durasi · isian = progres.',
  },
  // Start expanded (revealed on demand, e.g. after picking a unit).
  initialOpen: { type: Boolean, default: false },
  // Render without card chrome/collapse header (embedded in an existing accordion).
  bare: { type: Boolean, default: false },
})

const DAY = 86400000
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// Whole-card collapse — closed on page load; the header arrow opens it. In `bare`
// mode there is no toggle, so it's always open.
const open = ref(props.initialOpen || props.bare)

/** Parse a 'yyyy-MM-dd[…]' string to a local-midnight timestamp (or null). */
function parseDay(v) {
  if (!v) return null
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).getTime()
}

/** Today at local midnight. */
const today = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  new Date().getDate(),
).getTime()

/** Short local date label, e.g. "1 Jul 2026" / "1 Jul" (year optional). */
function fmt(ts, withYear = true) {
  if (ts == null) return '—'
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

/** Whole-day count between two timestamps, inclusive. */
function durDays(from, to) {
  if (from == null || to == null) return null
  return Math.max(1, Math.round((to - from) / DAY) + 1)
}
/** Duration chip label, e.g. "19h" (h = hari). */
function durLabel(from, to) {
  const n = durDays(from, to)
  return n == null ? '—' : `${n}h`
}

/** Unique assignee full names for a task. */
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
  return names
}

// Phase of a start → expected-end → actual-end entity (used for status/overdue).
function phase(start, expEnd, actEnd, closedFlag = false) {
  const closed = closedFlag || actEnd != null
  const plannedEnd = expEnd ?? actEnd ?? start
  const overdue = !closed && expEnd != null && start != null && today > expEnd
  const state = closed ? 'done' : overdue ? 'overdue' : 'active'
  return { start, expEnd, actEnd, plannedEnd, overdue, state }
}

const mean = (arr) => (arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0)

// Normalize the tasks of a single milestone into placeable bars, each with a
// timeline-derived progress (done → 100%, running → elapsed share, pending → 0%).
function normalizeTasks(ms) {
  const out = []
  for (const t of ms?.tasks ?? []) {
    const start = parseDay(t.startedAt)
    const due = parseDay(t.dueDate)
    const done = parseDay(t.doneAt)
    const started = start != null
    const isDone = done != null
    const barStart = started ? start : due != null ? Math.min(today, due) : (done ?? today)
    const plannedEnd = done ?? due ?? barStart
    const barEnd = isDone ? done : (due ?? barStart)
    const overdue = !isDone && due != null && today > due
    const denom = plannedEnd - barStart || 1
    const progress = isDone
      ? 100
      : started
        ? Math.max(
            0,
            Math.min(100, Math.round(((Math.min(today, plannedEnd) - barStart) / denom) * 100)),
          )
        : 0
    const names = assigneeNames(t)
    out.push({
      id: t.id,
      title: t.title || 'Untitled',
      milestone: ms.name || '',
      assignee: names.length ? names.join(', ') : 'Belum ditugaskan',
      hasAssignee: names.length > 0,
      start,
      barStart,
      due,
      done,
      barEnd,
      plannedEnd,
      progress,
      overdue,
      started,
      state: isDone ? 'done' : overdue ? 'overdue' : started ? 'active' : 'pending',
    })
  }
  return out.sort((a, b) => a.barStart - b.barStart)
}

// Normalize a project's milestones. Each milestone spans its own expected dates,
// falling back to the min→max of its tasks so the summary bar always positions.
function normalizeMilestones(project) {
  const out = []
  for (const ms of project?.milestones ?? []) {
    const tasks = normalizeTasks(ms)
    const ownStart = parseDay(ms.expectedStartDate)
    const expEnd =
      parseDay(ms.expectedEndDate) ??
      (tasks.length ? Math.max(...tasks.map((t) => t.barEnd)) : null)
    const actEnd = parseDay(ms.actualEndDate)
    const start = ownStart ?? (tasks.length ? Math.min(...tasks.map((t) => t.barStart)) : null)
    const ph = phase(start, expEnd, actEnd)
    const progress = tasks.length
      ? mean(tasks.map((t) => t.progress))
      : ph.state === 'done'
        ? 100
        : 0
    out.push({
      key: `${project.id}-${ms.id}`,
      id: ms.id,
      name: ms.name || 'Tanpa nama',
      status: ms.status || '',
      hasBar: start != null,
      progress,
      ...ph,
      tasks,
    })
  }
  return out.sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity))
}

// Normalize rows into projects; drop anything without a start date.
const rows = computed(() =>
  (props.ranges ?? [])
    .map((r) => {
      const p = r.project ?? {}
      const start = parseDay(r.startDate) ?? parseDay(p.startDate)
      const expEnd = parseDay(r.expectedEndDate) ?? parseDay(p.expectedEndDate)
      const actEnd = parseDay(r.endDate) ?? parseDay(p.endDate)
      const milestones = normalizeMilestones(p)
      const allTasks = milestones.flatMap((m) => m.tasks)
      const ph = phase(start, expEnd, actEnd, !!p.isClosed)
      const progress = allTasks.length
        ? mean(allTasks.map((t) => t.progress))
        : ph.state === 'done'
          ? 100
          : 0
      return {
        id: p.id,
        name: p.name || 'Untitled',
        code: p.fullCode || p.prefix || '',
        locked: !!p.isLocked,
        progress,
        ...ph,
        milestones,
        taskCount: allTasks.length,
      }
    })
    .filter((r) => r.start != null)
    .sort((a, b) => a.start - b.start),
)

// Fold state — projects open by default (milestones visible); tasks collapsed.
// The chart is remounted per unit (parent `:key`), so this default re-applies.
const openP = ref(new Set())
const openM = ref(new Set())
let defaulted = false
watch(
  rows,
  (rs) => {
    if (defaulted || !rs.length) return
    openP.value = new Set(rs.map((r) => r.id))
    defaulted = true
  },
  { immediate: true },
)

function toggleP(id) {
  const next = new Set(openP.value)
  next.has(id) ? next.delete(id) : next.add(id)
  openP.value = next
}
function toggleM(key) {
  const next = new Set(openM.value)
  next.has(key) ? next.delete(key) : next.add(key)
  openM.value = next
}
const isPOpen = (id) => openP.value.has(id)
const isMOpen = (key) => openM.value.has(key)

function expandAll() {
  openP.value = new Set(rows.value.map((r) => r.id))
  openM.value = new Set(rows.value.flatMap((r) => r.milestones.map((m) => m.key)))
}
function collapseAll() {
  openP.value = new Set()
  openM.value = new Set()
}

// Flattened, currently-visible rows (respecting folds) — one source of truth for
// both the label column and the timeline so their rows line up.
const visibleRows = computed(() => {
  const op = openP.value
  const om = openM.value
  const out = []
  for (const p of rows.value) {
    out.push({ kind: 'project', key: 'p' + p.id, p })
    if (!op.has(p.id)) continue
    for (const m of p.milestones) {
      out.push({ kind: 'milestone', key: 'm' + m.key, p, m })
      if (!om.has(m.key)) continue
      for (const t of m.tasks) out.push({ kind: 'task', key: 't' + m.key + '-' + t.id, p, m, t })
    }
  }
  return out
})

// Time domain spans every bar plus today, padded to whole months on each side.
const domain = computed(() => {
  if (!rows.value.length) return { start: today - 20 * DAY, end: today + 40 * DAY }
  let min = today
  let max = today
  const cover = (a, b) => {
    if (a != null) min = Math.min(min, a)
    if (b != null) max = Math.max(max, b)
  }
  for (const r of rows.value) {
    cover(r.start, r.plannedEnd ?? r.start)
    for (const m of r.milestones) {
      cover(m.start, m.plannedEnd ?? m.start)
      for (const t of m.tasks) cover(t.barStart, t.barEnd ?? t.barStart)
    }
  }
  const a = new Date(min)
  const b = new Date(max)
  const start = new Date(a.getFullYear(), a.getMonth() - 1, 1).getTime() // pad 1 month left
  const end = new Date(b.getFullYear(), b.getMonth() + 2, 1).getTime() // pad 1 month right
  return { start, end }
})

/** Timestamp → 0–100% within the domain (clamped). */
function pct(ts) {
  const { start, end } = domain.value
  if (ts == null || end === start) return 0
  return Math.max(0, Math.min(100, ((ts - start) / (end - start)) * 100))
}
/** Absolute style for a [from, to] segment. */
function seg(from, to) {
  const l = pct(from)
  return { left: l + '%', width: Math.max(0, pct(to) - l) + '%' }
}
const todayLeft = computed(() => pct(today) + '%')
const todayVisible = computed(() => {
  const { start, end } = domain.value
  return today >= start && today <= end
})

// Month cells + year bands across the domain (for the axis header + gridlines).
const months = computed(() => {
  const { start, end } = domain.value
  const out = []
  let d = new Date(start)
  d = new Date(d.getFullYear(), d.getMonth(), 1)
  while (d.getTime() < end) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const l = pct(d.getTime())
    const r = pct(Math.min(next.getTime(), end))
    out.push({
      key: d.getTime(),
      label: MO[d.getMonth()],
      year: d.getFullYear(),
      quarter: d.getMonth() % 3 === 0,
      left: l,
      width: Math.max(0, r - l),
    })
    d = next
  }
  return out
})
const years = computed(() => {
  const out = []
  for (const m of months.value) {
    const last = out[out.length - 1]
    if (last && last.year === m.year) last.width += m.width
    else out.push({ year: m.year, left: m.left, width: m.width })
  }
  return out
})

const STATE_LABEL = {
  active: 'Berjalan',
  done: 'Selesai',
  overdue: 'Terlambat',
  pending: 'Belum mulai',
}

function barTitle(r) {
  return [
    r.name,
    `Status: ${STATE_LABEL[r.state]} · ${r.progress}%`,
    `Awal: ${fmt(r.start)}`,
    `Perkiraan selesai: ${fmt(r.expEnd)}`,
    r.actEnd ? `Selesai: ${fmt(r.actEnd)}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}
function taskTitle(t) {
  return [
    t.title,
    t.milestone ? `Milestone: ${t.milestone}` : null,
    `Status: ${STATE_LABEL[t.state]} · ${t.progress}%`,
    `Dikerjakan: ${t.assignee}`,
    `${fmt(t.start)} → ${t.done ? fmt(t.done) : fmt(t.due)}`,
  ]
    .filter(Boolean)
    .join('\n')
}
</script>

<template>
  <section class="gc" :class="bare ? '' : 'surface p-5'">
    <!-- Title header (collapsible card only) -->
    <div
      v-if="!bare"
      class="flex flex-wrap items-center justify-between gap-3"
      :class="open ? 'mb-3' : ''"
    >
      <button
        type="button"
        class="flex min-w-0 items-start gap-2 text-left"
        :aria-expanded="open"
        @click="open = !open"
      >
        <ChevronDownIcon
          class="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform"
          :class="open ? '' : '-rotate-90'"
        />
        <div class="min-w-0">
          <h2 class="text-subheading">{{ title }}</h2>
          <p class="text-caption mt-0.5">{{ subtitle }}</p>
        </div>
      </button>
    </div>

    <template v-if="open">
      <!-- Loading -->
      <div v-if="loading" class="py-14 text-center text-sm text-slate-400">Memuat timeline…</div>

      <!-- Empty -->
      <div
        v-else-if="!rows.length"
        class="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-14 text-center text-sm text-slate-400"
      >
        Belum ada project untuk ditampilkan pada unit Anda.
      </div>

      <template v-else>
        <!-- Toolbar: expand/collapse + status legend -->
        <div class="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div class="flex items-center gap-1.5">
            <button type="button" class="gc-ctl" @click="expandAll">
              <ArrowsPointingOutIcon class="h-3.5 w-3.5" /> Perluas semua
            </button>
            <button type="button" class="gc-ctl" @click="collapseAll">
              <ArrowsPointingInIcon class="h-3.5 w-3.5" /> Ciutkan semua
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-slate-500">
            <span class="flex items-center gap-1.5"><i class="gc-key gc-s-active" />Berjalan</span>
            <span class="flex items-center gap-1.5"><i class="gc-key gc-s-done" />Selesai</span>
            <span class="flex items-center gap-1.5"
              ><i class="gc-key gc-s-overdue" />Terlambat</span
            >
            <span class="flex items-center gap-1.5"
              ><i class="gc-key gc-s-pending" />Belum mulai</span
            >
            <span class="flex items-center gap-1.5"><i class="gc-key-today" />Hari ini</span>
          </div>
        </div>

        <!-- Chart -->
        <div class="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div class="gc-grid min-w-[760px]">
            <!-- Label column -->
            <div class="gc-side">
              <!-- corner header -->
              <div class="gc-corner">
                <span class="flex-1">Aktivitas</span>
                <span class="w-11 text-right">Progres</span>
                <span class="w-12 text-right">Durasi</span>
              </div>

              <template v-for="row in visibleRows" :key="'s-' + row.key">
                <!-- Project label -->
                <div v-if="row.kind === 'project'" class="gc-row gc-row-project">
                  <button
                    type="button"
                    class="gc-toggle"
                    :disabled="!row.p.milestones.length"
                    @click="toggleP(row.p.id)"
                  >
                    <ChevronDownIcon
                      class="h-3 w-3 transition-transform"
                      :class="isPOpen(row.p.id) ? '' : '-rotate-90'"
                    />
                  </button>
                  <span class="gc-dot gc-dot-project" :class="'gc-s-' + row.p.state" />
                  <LockClosedIcon v-if="row.p.locked" class="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <RouterLink
                    :to="{ name: 'project-detail', params: { id: row.p.id } }"
                    class="gc-name gc-name-project hover:text-primary-600 hover:underline"
                    :title="row.p.name"
                  >
                    {{ row.p.name }}
                  </RouterLink>
                  <span class="gc-pct" :class="'gc-t-' + row.p.state">{{ row.p.progress }}%</span>
                  <span class="gc-dur">{{ durLabel(row.p.start, row.p.plannedEnd) }}</span>
                </div>

                <!-- Milestone label -->
                <div v-else-if="row.kind === 'milestone'" class="gc-row">
                  <span class="gc-indent" style="width: 14px" />
                  <button
                    type="button"
                    class="gc-toggle"
                    :disabled="!row.m.tasks.length"
                    @click="toggleM(row.m.key)"
                  >
                    <ChevronDownIcon
                      class="h-3 w-3 transition-transform"
                      :class="isMOpen(row.m.key) ? '' : '-rotate-90'"
                    />
                  </button>
                  <span class="gc-dot gc-dot-milestone" :class="'gc-s-' + row.m.state" />
                  <span class="gc-name gc-name-milestone" :title="row.m.name">{{
                    row.m.name
                  }}</span>
                  <span class="gc-pct" :class="'gc-t-' + row.m.state">{{ row.m.progress }}%</span>
                  <span class="gc-dur">{{
                    row.m.hasBar ? durLabel(row.m.start, row.m.plannedEnd) : '—'
                  }}</span>
                </div>

                <!-- Task label -->
                <div v-else class="gc-row">
                  <span class="gc-indent" style="width: 36px" />
                  <span class="gc-toggle gc-leaf" />
                  <span class="gc-dot gc-dot-task" :class="'gc-s-' + row.t.state" />
                  <span class="gc-name gc-name-task" :title="row.t.title">{{ row.t.title }}</span>
                  <span class="gc-pct" :class="'gc-t-' + row.t.state">{{ row.t.progress }}%</span>
                  <span class="gc-dur">{{ durLabel(row.t.barStart, row.t.barEnd) }}</span>
                </div>
              </template>
            </div>

            <!-- Timeline column -->
            <div class="gc-main">
              <!-- axis header: year bands + month cells -->
              <div class="gc-head">
                <span
                  v-for="y in years"
                  :key="'y-' + y.year"
                  class="gc-year"
                  :style="{ left: y.left + '%', width: y.width + '%' }"
                >
                  {{ y.year }}
                </span>
                <span
                  v-for="m in months"
                  :key="'mo-' + m.key"
                  class="gc-month"
                  :class="m.quarter ? 'gc-month-q' : ''"
                  :style="{ left: m.left + '%', width: m.width + '%' }"
                >
                  {{ m.label }}
                </span>
              </div>

              <!-- body -->
              <div class="gc-body">
                <!-- month gridlines -->
                <div
                  v-for="m in months"
                  :key="'g-' + m.key"
                  class="gc-grid-line"
                  :class="m.quarter ? 'gc-grid-line-q' : ''"
                  :style="{ left: m.left + '%' }"
                />
                <!-- today line -->
                <div v-if="todayVisible" class="gc-today" :style="{ left: todayLeft }">
                  <span class="gc-today-flag">Hari ini · {{ fmt(today, false) }}</span>
                </div>

                <!-- bar rows -->
                <template v-for="row in visibleRows" :key="'t-' + row.key">
                  <!-- Project bar -->
                  <div v-if="row.kind === 'project'" class="gc-trow gc-trow-project">
                    <div
                      class="gc-bar gc-bar-project"
                      :class="'gc-s-' + row.p.state"
                      :style="seg(row.p.start, row.p.plannedEnd)"
                      :title="barTitle(row.p)"
                    >
                      <span class="gc-fill" :style="{ width: row.p.progress + '%' }" />
                    </div>
                    <span class="gc-cap" :style="{ left: pct(row.p.plannedEnd) + '%' }">
                      <b :class="'gc-t-' + row.p.state">{{ row.p.progress }}%</b>
                    </span>
                  </div>

                  <!-- Milestone bar -->
                  <div v-else-if="row.kind === 'milestone'" class="gc-trow">
                    <template v-if="row.m.hasBar">
                      <div
                        class="gc-bar gc-bar-milestone"
                        :class="'gc-s-' + row.m.state"
                        :style="seg(row.m.start, row.m.plannedEnd)"
                        :title="barTitle(row.m)"
                      >
                        <span class="gc-fill" :style="{ width: row.m.progress + '%' }" />
                      </div>
                      <span class="gc-cap" :style="{ left: pct(row.m.plannedEnd) + '%' }">
                        <b :class="'gc-t-' + row.m.state">{{ row.m.progress }}%</b>
                      </span>
                    </template>
                  </div>

                  <!-- Task bar -->
                  <div v-else class="gc-trow">
                    <div
                      class="gc-bar gc-bar-task"
                      :class="'gc-s-' + row.t.state"
                      :style="seg(row.t.barStart, row.t.plannedEnd)"
                      :title="taskTitle(row.t)"
                    >
                      <span class="gc-fill" :style="{ width: row.t.progress + '%' }" />
                    </div>
                    <span class="gc-cap" :style="{ left: pct(row.t.plannedEnd) + '%' }">
                      <b :class="'gc-t-' + row.t.state">{{ row.t.progress }}%</b>
                      <span v-if="row.t.hasAssignee" class="gc-who"> · {{ row.t.assignee }}</span>
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.gc {
  /* Status palette (brand-aligned): color encodes state, not hierarchy. */
  --st-active: #3b82f6;
  --st-active-soft: #dbeafe;
  --st-done: #22c55e;
  --st-done-soft: #dcfce7;
  --st-overdue: #ef4444;
  --st-overdue-soft: #fee2e2;
  --st-pending: #94a3b8;
  --st-pending-soft: #eef2f6;
  --gc-accent: #653ef1; /* brand — reserved for the "today" now-line */

  --gc-line: #eef2f6;
  --gc-line-strong: #dbe1ea;
  --gc-ink: #1e293b;
  --gc-ink-soft: #475569;
  --gc-ink-faint: #94a3b8;
  --gc-band: #f8fafc;
  --gc-row: 42px;
  --gc-head: 46px;
  --gc-side: 300px;
}

/* Status → color mapping (applied to bar, fill, dot, text, legend key). */
.gc-s-active {
  --c: var(--st-active);
  --cs: var(--st-active-soft);
}
.gc-s-done {
  --c: var(--st-done);
  --cs: var(--st-done-soft);
}
.gc-s-overdue {
  --c: var(--st-overdue);
  --cs: var(--st-overdue-soft);
}
.gc-s-pending {
  --c: var(--st-pending);
  --cs: var(--st-pending-soft);
}
.gc-t-active {
  color: var(--st-active);
}
.gc-t-done {
  color: var(--st-done);
}
.gc-t-overdue {
  color: var(--st-overdue);
}
.gc-t-pending {
  color: var(--gc-ink-faint);
}

/* legend keys */
.gc-key {
  width: 20px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
  background: var(--cs);
  border: 1px solid var(--c);
  position: relative;
  overflow: hidden;
}
.gc-key::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 60%;
  background: var(--c);
}
.gc-key-today {
  width: 0;
  height: 13px;
  border-left: 2px dashed var(--gc-accent);
  display: inline-block;
}

/* toolbar controls */
.gc-ctl {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--gc-ink-soft);
  padding: 4px 9px;
  border-radius: 8px;
  border: 1px solid var(--gc-line-strong);
  background: #fff;
  transition: background 0.12s;
}
.gc-ctl:hover {
  background: var(--gc-band);
}

/* grid: sidebar + timeline */
.gc-grid {
  display: grid;
  grid-template-columns: var(--gc-side) 1fr;
}
.gc-side {
  border-right: 1px solid var(--gc-line-strong);
}
.gc-main {
  position: relative;
  min-width: 0;
}

.gc-corner {
  height: var(--gc-head);
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 0 12px 8px;
  border-bottom: 1px solid var(--gc-line-strong);
  font-size: 10.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--gc-ink-faint);
}

/* label rows */
.gc-row {
  height: var(--gc-row);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px 0 10px;
  border-bottom: 1px solid var(--gc-line);
}
.gc-row:hover {
  background: var(--gc-band);
}
.gc-row-project {
  background: #fcfcfe;
}
.gc-indent {
  flex: 0 0 auto;
}
.gc-toggle {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--gc-ink-faint);
  background: transparent;
}
.gc-toggle:hover:not(:disabled) {
  background: var(--gc-line-strong);
  color: var(--gc-ink-soft);
}
.gc-toggle:disabled {
  opacity: 0;
  cursor: default;
}
.gc-leaf {
  visibility: hidden;
}
.gc-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  background: var(--c);
}
.gc-dot-project {
  border-radius: 2px;
}
.gc-dot-milestone {
  border-radius: 1px;
  transform: rotate(45deg);
  width: 9px;
  height: 9px;
}
.gc-dot-task {
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--c);
}
.gc-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}
.gc-name-project {
  font-weight: 600;
  font-size: 13.5px;
  color: var(--gc-ink);
}
.gc-name-milestone {
  font-weight: 500;
  color: var(--gc-ink-soft);
}
.gc-name-task {
  color: var(--gc-ink-soft);
  font-size: 12.5px;
}
.gc-pct {
  width: 2.75rem;
  flex: 0 0 auto;
  text-align: right;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.gc-dur {
  width: 3rem;
  flex: 0 0 auto;
  text-align: right;
  font-size: 11px;
  color: var(--gc-ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* axis header */
.gc-head {
  height: var(--gc-head);
  position: relative;
  border-bottom: 1px solid var(--gc-line-strong);
}
.gc-year {
  position: absolute;
  top: 0;
  height: 22px;
  display: flex;
  align-items: center;
  padding-left: 8px;
  border-right: 1px solid var(--gc-line-strong);
  background: var(--gc-band);
  font-size: 12px;
  font-weight: 600;
  color: var(--gc-ink-soft);
}
.gc-month {
  position: absolute;
  top: 22px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--gc-line);
  font-size: 11px;
  color: var(--gc-ink-soft);
}
.gc-month-q {
  border-right-color: var(--gc-line-strong);
}

/* body */
.gc-body {
  position: relative;
}
.gc-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--gc-line);
  z-index: 0;
}
.gc-grid-line-q {
  background: var(--gc-line-strong);
}
.gc-today {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 2px dashed var(--gc-accent);
  z-index: 5;
  pointer-events: none;
}
.gc-today-flag {
  position: absolute;
  top: 2px;
  transform: translateX(-50%);
  background: var(--gc-accent);
  color: #fff;
  font-size: 9.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.gc-trow {
  height: var(--gc-row);
  position: relative;
  border-bottom: 1px solid var(--gc-line);
  z-index: 1;
}
.gc-trow-project {
  background: #fcfcfe;
}

/* unified bar: soft status track + solid fill (=progress) */
.gc-bar {
  position: absolute;
  min-width: 6px;
  background: var(--cs);
  border: 1px solid var(--c);
  border-radius: 6px;
  overflow: hidden;
}
.gc-bar-project {
  top: 9px;
  height: 24px;
  box-shadow: 0 1px 2px rgba(30, 41, 59, 0.1);
}
.gc-bar-milestone {
  top: 12px;
  height: 18px;
}
.gc-bar-task {
  top: 14px;
  height: 14px;
  border-radius: 5px;
}
.gc-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--c);
  transition: width 0.3s ease;
}

/* progress / assignee caption to the right of the bar */
.gc-cap {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  padding-left: 8px;
  font-size: 11px;
  color: var(--gc-ink-faint);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  max-width: 46%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gc-cap b {
  font-weight: 600;
}
.gc-cap .gc-who {
  color: var(--gc-ink-faint);
  font-weight: 400;
}
</style>
