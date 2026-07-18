<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { LockClosedIcon } from '@heroicons/vue/24/outline'
import { CheckIcon } from '@heroicons/vue/24/solid'

/**
 * Lightweight Gantt-style timeline for projects (no charting dependency — pure
 * div/CSS + Tailwind, matching the app's custom charts). Each project row makes
 * three moments explicit and color-coded:
 *   • Awal (startDate)            → green start dot
 *   • Perkiraan selesai (expectedEndDate) → amber diamond
 *   • Selesai (endDate)           → green check flag
 * The bar between them is filled by phase: berjalan (blue), selesai (green),
 * terlambat (red, with a hatched overrun past the expected end).
 *
 * Consumes the raw rows from `getRangeProject`:
 *   { startDate, expectedEndDate, endDate, project { id, name, fullCode, isClosed, isLocked } }
 */
const props = defineProps({
  ranges: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const DAY = 86400000

/** Parse a 'yyyy-MM-dd[…]' string to a local-midnight timestamp (or null). */
function parseDay(v) {
  if (!v) return null
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).getTime()
}

/** Today at local midnight. */
const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()

/** Short local date label, e.g. "1 Jul 2026" / "1 Jul" (year optional). */
function fmt(ts, withYear = true) {
  if (ts == null) return '—'
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

// Normalize rows into placeable bars; drop anything without a start date.
const rows = computed(() =>
  (props.ranges ?? [])
    .map((r) => {
      const start = parseDay(r.startDate)
      const expEnd = parseDay(r.expectedEndDate)
      const actEnd = parseDay(r.endDate)
      const p = r.project ?? {}
      const closed = !!p.isClosed || actEnd != null
      const plannedEnd = expEnd ?? actEnd ?? start
      const overdue = !closed && expEnd != null && today > expEnd
      // Colored fill end: closed → actual end; otherwise up to today, capped at
      // the planned end (any overrun is drawn separately as a hatch).
      const fillEnd = closed ? (actEnd ?? plannedEnd) : Math.min(today, plannedEnd ?? today)
      const state = closed ? 'done' : overdue ? 'overdue' : 'active'
      return {
        id: p.id,
        name: p.name || 'Untitled',
        code: p.fullCode || p.prefix || '',
        locked: !!p.isLocked,
        start,
        expEnd,
        actEnd,
        plannedEnd,
        fillEnd,
        overdue,
        state,
      }
    })
    .filter((r) => r.start != null)
    .sort((a, b) => a.start - b.start),
)

// Time domain spans every bar plus today, padded a little for breathing room.
const domain = computed(() => {
  if (!rows.value.length) return { start: today - 15 * DAY, end: today + 15 * DAY }
  let min = today
  let max = today
  for (const r of rows.value) {
    min = Math.min(min, r.start)
    max = Math.max(max, r.plannedEnd ?? r.start, r.actEnd ?? r.start)
  }
  const pad = Math.max(3 * DAY, Math.round((max - min) * 0.05))
  return { start: min - pad, end: max + pad }
})

/** Timestamp → 0–100% position within the domain (clamped). */
function pct(ts) {
  const { start, end } = domain.value
  if (ts == null || end === start) return 0
  return Math.max(0, Math.min(100, ((ts - start) / (end - start)) * 100))
}

/** Absolute-position style for a [from, to] segment. */
function seg(from, to) {
  const l = pct(from)
  const w = Math.max(0, pct(to) - l)
  return { left: l + '%', width: w + '%' }
}

/** Left-offset style for a single marker at `ts`. */
function at(ts) {
  return { left: pct(ts) + '%' }
}

const todayLeft = computed(() => pct(today) + '%')

// Axis ticks: weekly for short spans, monthly for long ones.
const ticks = computed(() => {
  const { start, end } = domain.value
  const spanDays = (end - start) / DAY
  const out = []
  if (spanDays <= 100) {
    const d = new Date(start)
    d.setHours(0, 0, 0, 0)
    const dow = (d.getDay() + 6) % 7 // 0 = Monday
    d.setDate(d.getDate() + (dow ? 7 - dow : 0))
    for (let t = d.getTime(); t <= end; t += 7 * DAY) {
      out.push({ ts: t, label: fmt(t, false), left: pct(t) + '%' })
    }
  } else {
    const d = new Date(start)
    d.setDate(1)
    if (d.getTime() < start) d.setMonth(d.getMonth() + 1)
    for (let x = d; x.getTime() <= end; x.setMonth(x.getMonth() + 1)) {
      const t = x.getTime()
      const label = x.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      out.push({ ts: t, label, left: pct(t) + '%' })
    }
  }
  return out
})

// Bold, high-contrast fill per phase.
const STATE = {
  active: { fill: 'bg-blue-500', label: 'Berjalan' },
  done: { fill: 'bg-emerald-500', label: 'Selesai' },
  overdue: { fill: 'bg-rose-500', label: 'Terlambat' },
}

function barTitle(r) {
  return [
    r.name,
    `Awal: ${fmt(r.start)}`,
    `Perkiraan selesai: ${fmt(r.expEnd)}`,
    r.actEnd ? `Selesai: ${fmt(r.actEnd)}` : `Status: ${STATE[r.state].label}`,
  ].join('\n')
}

// Legend — one entry per visual element so each phase is unmistakable.
const legend = [
  { kind: 'dot', class: 'bg-emerald-500', label: 'Awal projek' },
  { kind: 'bar', class: 'bg-blue-500', label: 'Berjalan' },
  { kind: 'diamond', class: 'bg-amber-400', label: 'Perkiraan selesai' },
  { kind: 'check', class: 'bg-emerald-500', label: 'Projek selesai' },
  { kind: 'bar', class: 'bg-rose-500', label: 'Terlambat' },
]
</script>

<template>
  <section class="surface p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-subheading">Timeline Project</h2>
        <p class="text-caption mt-0.5">Awal, perkiraan selesai, dan penyelesaian tiap project.</p>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span
          v-for="l in legend"
          :key="l.label"
          class="flex items-center gap-1.5 text-xs text-slate-500"
        >
          <span v-if="l.kind === 'dot'" class="h-2.5 w-2.5 rounded-full" :class="l.class" />
          <span
            v-else-if="l.kind === 'diamond'"
            class="h-2.5 w-2.5 rotate-45 rounded-[1px]"
            :class="l.class"
          />
          <span
            v-else-if="l.kind === 'check'"
            class="flex h-3.5 w-3.5 items-center justify-center rounded-full"
            :class="l.class"
          >
            <CheckIcon class="h-2.5 w-2.5 text-white" />
          </span>
          <span v-else class="h-2.5 w-4 rounded-sm" :class="l.class" />
          {{ l.label }}
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-14 text-center text-sm text-slate-400">Memuat timeline…</div>

    <!-- Empty -->
    <div
      v-else-if="!rows.length"
      class="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-14 text-center text-sm text-slate-400"
    >
      Belum ada project untuk ditampilkan pada unit Anda.
    </div>

    <!-- Chart -->
    <div v-else class="flex text-sm">
      <!-- Label column -->
      <div class="w-40 shrink-0 sm:w-52">
        <div class="h-6" />
        <div v-for="r in rows" :key="'lbl-' + r.id" class="flex h-14 items-center gap-1.5 pr-3">
          <LockClosedIcon v-if="r.locked" class="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <div class="min-w-0">
            <RouterLink
              :to="{ name: 'project-detail', params: { id: r.id } }"
              class="block truncate font-medium text-slate-700 hover:text-primary-600 hover:underline"
              :title="r.name"
            >
              {{ r.name }}
            </RouterLink>
            <p v-if="r.code" class="truncate text-[11px] text-slate-400">{{ r.code }}</p>
          </div>
        </div>
      </div>

      <!-- Timeline column -->
      <div class="relative min-w-0 flex-1">
        <!-- Axis header (tick labels) -->
        <div class="relative h-6">
          <span
            v-for="t in ticks"
            :key="'t-' + t.ts"
            class="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400"
            :style="{ left: t.left }"
          >
            {{ t.label }}
          </span>
        </div>

        <!-- Body: gridlines + today marker + bars -->
        <div class="relative">
          <!-- Gridlines -->
          <div
            v-for="t in ticks"
            :key="'g-' + t.ts"
            class="absolute inset-y-0 w-px bg-slate-100"
            :style="{ left: t.left }"
          />
          <!-- Today marker -->
          <div class="absolute inset-y-0 z-10 w-0.5 bg-primary-400/70" :style="{ left: todayLeft }">
            <span
              class="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500"
            />
          </div>

          <!-- Rows -->
          <div v-for="r in rows" :key="'row-' + r.id" class="relative h-14">
            <!-- Bar band -->
            <div class="absolute inset-x-0 top-3">
              <div class="relative h-5">
                <!-- Planned track: awal → perkiraan selesai -->
                <div
                  class="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-slate-200"
                  :style="seg(r.start, r.plannedEnd)"
                />
                <!-- Colored fill by phase -->
                <div
                  class="absolute top-1/2 h-3 min-w-[3px] -translate-y-1/2 rounded-full"
                  :class="STATE[r.state].fill"
                  :style="seg(r.start, r.fillEnd)"
                  :title="barTitle(r)"
                />
                <!-- Overdue overrun: perkiraan selesai → hari ini (hatched) -->
                <div
                  v-if="r.overdue"
                  class="gantt-overrun absolute top-1/2 h-3 -translate-y-1/2 rounded-full"
                  :style="seg(r.plannedEnd, today)"
                  :title="barTitle(r)"
                />

                <!-- Start marker (awal) -->
                <span
                  class="absolute top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow"
                  :style="at(r.start)"
                  :title="`Awal: ${fmt(r.start)}`"
                />
                <!-- Expected end marker (perkiraan selesai) -->
                <span
                  v-if="r.expEnd != null"
                  class="absolute top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-white bg-amber-400 shadow"
                  :style="at(r.expEnd)"
                  :title="`Perkiraan selesai: ${fmt(r.expEnd)}`"
                />
                <!-- Actual end marker (selesai) -->
                <span
                  v-if="r.actEnd != null"
                  class="absolute top-1/2 z-30 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow"
                  :style="at(r.actEnd)"
                  :title="`Selesai: ${fmt(r.actEnd)}`"
                >
                  <CheckIcon class="h-2.5 w-2.5 text-white" />
                </span>
              </div>
            </div>

            <!-- Date captions under the bar -->
            <div class="absolute inset-x-0 bottom-0.5 h-4">
              <span
                class="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-emerald-600"
                :style="at(r.start)"
              >
                {{ fmt(r.start, false) }}
              </span>
              <span
                v-if="r.actEnd != null"
                class="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-emerald-700"
                :style="at(r.actEnd)"
              >
                {{ fmt(r.actEnd, false) }}
              </span>
              <span
                v-else-if="r.expEnd != null"
                class="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium"
                :class="r.overdue ? 'text-rose-600' : 'text-amber-600'"
                :style="at(r.expEnd)"
              >
                {{ fmt(r.expEnd, false) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Hatched fill marking schedule overrun (planned end → today). */
.gantt-overrun {
  background-image: repeating-linear-gradient(
    45deg,
    #e11d48,
    #e11d48 4px,
    #fda4af 4px,
    #fda4af 8px
  );
}
</style>
