<script setup>
import { computed, ref, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useGeneralDashboard } from '@/features/dashboard/composables/useDashboard'
import {
  FolderIcon,
  BoltIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarDaysIcon,
  ShieldExclamationIcon,
  PauseCircleIcon,
  ArrowRightIcon,
  FireIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'
import GaugeChart from '@/features/dashboard/components/charts/GaugeChart.vue'
import DonutChart from '@/features/dashboard/components/charts/DonutChart.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'

// `ranges` = data getRangeProject (dipakai Gantt/reminder) — dipakai di sini untuk
// MEMPERKAYA baris list (due date, progres, assignee) yang tak ada di payload
// `generalDashboard`. Cocok by project id; kalau tak ada (mis. user tanpa izin
// getRangeProject) baris jatuh balik ke nama + unit saja.
const props = defineProps({
  ranges: { type: Array, default: () => [] },
})

// Live org-wide metrics over the WebSocket subscription.
const { general, loading, error } = useGeneralDashboard()

/* The API sends several numbers as strings, incl. scientific notation like
   "0E-20" (== 0) and long decimals like "9.8765…". Coerce defensively. */
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round = (v) => Math.round(num(v))
const clampPct = (v) => Math.max(0, Math.min(100, num(v)))
const listLen = (l) => (Array.isArray(l) ? l.length : 0)
const unitLabel = (p) =>
  (p?.projectUnits ?? [])
    .map((pu) => pu?.unit?.name)
    .filter(Boolean)
    .join(' · ')

// ── Enrichment dari getRangeProject (due/progres/assignee asli, bukan dummy) ───
const DAY = 86400000
const today = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  new Date().getDate(),
).getTime()
const parseDay = (v) => {
  if (!v) return null
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).getTime()
}
// Map project id → { progress, due, closed, overdueTasks, assignees[] } dari ranges.
const richById = computed(() => {
  const map = new Map()
  for (const r of props.ranges ?? []) {
    const p = r?.project
    if (!p?.id) continue
    const tasks = (p.milestones ?? []).flatMap((m) => m.tasks ?? [])
    const progs = []
    const assignees = new Map()
    let overdueTasks = 0
    for (const t of tasks) {
      const start = parseDay(t.startedAt)
      const due = parseDay(t.dueDate)
      const done = parseDay(t.doneAt)
      const isDone = done != null
      let prog = 0
      if (isDone) prog = 100
      else if (start != null) {
        const plannedEnd = done ?? due ?? start
        const denom = plannedEnd - start || 1
        prog = Math.max(
          0,
          Math.min(100, Math.round(((Math.min(today, plannedEnd) - start) / denom) * 100)),
        )
      }
      progs.push(prog)
      if (!isDone && due != null && today > due) overdueTasks++
      for (const a of t.assignments ?? []) {
        const e = a?.employee
        if (e?.id && !assignees.has(e.id)) assignees.set(e.id, e.fullName || '')
      }
    }
    const closed = p.isClosed || parseDay(r.endDate) != null || parseDay(p.endDate) != null
    map.set(String(p.id), {
      progress: progs.length
        ? Math.round(progs.reduce((s, n) => s + n, 0) / progs.length)
        : closed
          ? 100
          : 0,
      due: parseDay(r.expectedEndDate) ?? parseDay(p.expectedEndDate),
      closed,
      overdueTasks,
      assignees: [...assignees.values()].filter(Boolean),
    })
  }
  return map
})
const richOf = (p) => richById.value.get(String(p?.id)) ?? null

const fmtDate = (ts) =>
  ts == null ? '' : new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

// Due date → label ringkas + tone warna.
function dueInfo(rich) {
  if (!rich || rich.due == null) return null
  if (rich.closed) return { text: 'Selesai', tone: 'ok' }
  const d = Math.round((rich.due - today) / DAY)
  if (d < 0) return { text: `Telat ${-d}h`, tone: 'late' }
  if (d === 0) return { text: 'Hari ini', tone: 'late' }
  if (d === 1) return { text: 'Besok', tone: 'soon' }
  if (d <= 7) return { text: `${d} hari lagi`, tone: 'soon' }
  return { text: fmtDate(rich.due), tone: 'normal' }
}
const DUE_TONE = {
  late: 'text-danger',
  soon: 'text-warning',
  ok: 'text-success',
  normal: 'text-slate-500',
}
const progColor = (v) => (v >= 100 ? 'bg-success' : v >= 34 ? 'bg-brand' : 'bg-warning')

// ── 1 · Butuh Perhatian (action tiles) ────────────────────────────────────────
// Each tile is the count of a problem bucket and jumps to that bucket's list.
const tiles = computed(() => {
  const g = general.value ?? {}
  return [
    {
      key: 'overdue',
      label: 'Overdue',
      value: round(g.projectOverdue),
      icon: ClockIcon,
      accent: '#EF4444',
      iconClass: 'bg-red-50 text-danger',
    },
    {
      key: 'near',
      label: 'Mendekati Deadline',
      value: listLen(g.nearDeadlineProjectList),
      icon: CalendarDaysIcon,
      accent: '#F59E0B',
      iconClass: 'bg-amber-50 text-warning',
    },
    {
      key: 'risk',
      label: 'High Risk',
      value: round(g.highRiskProjects),
      icon: ShieldExclamationIcon,
      accent: '#EF4444',
      iconClass: 'bg-red-50 text-danger',
    },
    {
      key: 'idle',
      label: 'Idle',
      value: listLen(g.idleProjectList),
      icon: PauseCircleIcon,
      accent: '#94A3B8',
      iconClass: 'bg-slate-100 text-slate-500',
    },
  ]
})

// ── 2 · Kesehatan Portfolio ───────────────────────────────────────────────────
// Score gauges. Health = higher-is-better, Risk = higher-is-worse. Health & Risk
// jump to the High Risk list so a bad score leads straight to its cause.
const gauges = computed(() => {
  const g = general.value ?? {}
  return [
    { label: 'Progress', value: clampPct(g.progressProject), polarity: 'neutral' },
    { label: 'Completion', value: clampPct(g.completionRate), polarity: 'neutral' },
    { label: 'Health', value: clampPct(g.healthScoreProject), polarity: 'good', jump: 'risk' },
    { label: 'Risk', value: clampPct(g.riskScoreProject), polarity: 'bad', jump: 'risk' },
  ]
})

// Lifecycle donut: Active vs Closed → jumlahnya = totalProjects.
const projectSegments = computed(() => {
  const g = general.value ?? {}
  return [
    { label: 'Active', value: round(g.activeProjects), color: '#3b82f6' },
    { label: 'Closed', value: round(g.closedProjects), color: '#10b981' },
  ]
})

const miniKpi = computed(() => {
  const g = general.value ?? {}
  return [
    { label: 'Total Project', value: round(g.totalProjects) },
    { label: 'On Time', value: round(g.onTimeProjects) },
    { label: 'Total Task', value: round(g.totalTasks) },
  ]
})

// ── 3 · Daftar Project (problem-first) ────────────────────────────────────────
// The subscription's list rows only carry { id, name } (+ projectUnits on some),
// so a row shows name + unit — no progress/assignee/due (not in the payload).
const problemGroups = computed(() => {
  const g = general.value ?? {}
  return [
    {
      key: 'overdue',
      title: 'Overdue',
      items: g.overdueProjectList,
      icon: ClockIcon,
      color: 'danger',
      sev: '#EF4444',
    },
    {
      key: 'near',
      title: 'Mendekati Deadline',
      items: g.nearDeadlineProjectList,
      icon: CalendarDaysIcon,
      color: 'warning',
      sev: '#F59E0B',
    },
    {
      key: 'risk',
      title: 'High Risk',
      items: g.highRiskProjectList,
      icon: ShieldExclamationIcon,
      color: 'danger',
      sev: '#EF4444',
    },
    {
      key: 'idle',
      title: 'Idle',
      items: g.idleProjectList,
      icon: PauseCircleIcon,
      color: 'slate',
      sev: '#94A3B8',
    },
  ].map((grp) => ({ ...grp, items: grp.items ?? [] }))
})

// Client-side search over the loaded lists (matches project name or unit).
const listSearch = ref('')
const matchProject = (p) => {
  const q = listSearch.value.trim().toLowerCase()
  if (!q) return true
  return (p?.name ?? '').toLowerCase().includes(q) || unitLabel(p).toLowerCase().includes(q)
}

// Tab counts stay the full bucket sizes (navigation); group badges below reflect
// what's currently shown after the search filter.
const problemCount = computed(() =>
  problemGroups.value.reduce((sum, grp) => sum + grp.items.length, 0),
)
const rawActive = computed(() => general.value?.activeProjectList ?? [])
const rawClosed = computed(() => general.value?.closedProjectList ?? [])

// Filtered views used by the template. Tiap item diperkaya `_rich` (due/progres/
// assignee dari getRangeProject) supaya baris bisa tampil lengkap seperti mockup.
const withRich = (arr) => arr.filter(matchProject).map((p) => ({ ...p, _rich: richOf(p) }))
const visibleProblemGroups = computed(() =>
  problemGroups.value
    .map((grp) => ({ ...grp, items: withRich(grp.items) }))
    .filter((grp) => grp.items.length),
)
const activeItems = computed(() => withRich(rawActive.value))
const closedItems = computed(() => withRich(rawClosed.value))

const listTabs = computed(() => [
  { key: 'problem', label: 'Perlu Tindakan', count: problemCount.value, icon: FireIcon },
  { key: 'active', label: 'Active', count: rawActive.value.length, icon: BoltIcon },
  { key: 'closed', label: 'Closed', count: rawClosed.value.length, icon: CheckBadgeIcon },
])
const listTab = ref('problem')

// ── Interactions: tile / gauge → open the right tab and flash its group ────────
const flashedGroup = ref(null)
let flashTimer = null
async function focusGroup(key) {
  listTab.value = 'problem'
  await nextTick()
  const el = document.getElementById(`ov-grp-${key}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  flashedGroup.value = key
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashedGroup.value = null), 1300)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Subscription error -->
    <div
      v-if="error"
      class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger"
    >
      <ExclamationTriangleIcon class="h-4 w-4 shrink-0" />
      Gagal memuat data dashboard. Koneksi akan dicoba ulang otomatis.
    </div>

    <!-- Loading (first payload not in yet) -->
    <div v-if="loading && !general" class="surface px-4 py-12 text-center text-sm text-slate-400">
      Menyambungkan data langsung…
    </div>

    <template v-else>
      <!-- 1 · Butuh Perhatian ─────────────────────────────────────────────── -->
      <div>
        <div class="mb-2 flex items-baseline gap-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">Butuh Perhatian</h2>
          <span class="text-xs text-slate-400">klik kartu untuk lompat ke daftarnya</span>
        </div>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button
            v-for="t in tiles"
            :key="t.key"
            type="button"
            class="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            @click="focusGroup(t.key)"
          >
            <span class="absolute inset-y-0 left-0 w-1" :style="{ backgroundColor: t.accent }" />
            <span class="flex h-9 w-9 items-center justify-center rounded-lg" :class="t.iconClass">
              <component :is="t.icon" class="h-5 w-5" />
            </span>
            <p class="mt-3 text-3xl font-extrabold leading-none tabular-nums text-slate-900">
              {{ t.value }}
            </p>
            <p class="mt-1.5 text-sm font-semibold text-slate-600">{{ t.label }}</p>
            <span
              class="mt-2 flex items-center gap-1 text-xs text-slate-400 transition group-hover:text-primary-600"
            >
              Lihat daftar <ArrowRightIcon class="h-3 w-3" />
            </span>
          </button>
        </div>
      </div>

      <!-- 2 · Kesehatan Portfolio ─────────────────────────────────────────── -->
      <div>
        <div class="mb-2 flex items-baseline gap-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">
            Kesehatan Portfolio
          </h2>
          <span class="text-xs text-slate-400">agregat seluruh unit Anda</span>
        </div>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <!-- Score gauges -->
          <BaseCard class="lg:col-span-7" title="Metrik Project">
            <template #actions>
              <span class="text-caption">Health &amp; Risk dapat diklik</span>
            </template>
            <div class="grid grid-cols-4 gap-1">
              <component
                :is="m.jump ? 'button' : 'div'"
                v-for="m in gauges"
                :key="m.label"
                type="button"
                class="rounded-lg py-1 transition"
                :class="m.jump ? 'cursor-pointer hover:bg-slate-50' : ''"
                :title="m.jump ? `Lihat project ${m.label}` : ''"
                @click="m.jump && focusGroup(m.jump)"
              >
                <GaugeChart :value="m.value" :label="m.label" :polarity="m.polarity" :size="96" />
              </component>
            </div>
          </BaseCard>

          <!-- Lifecycle project + KPI ringkas -->
          <BaseCard class="lg:col-span-5" title="Status Project">
            <DonutChart
              :segments="projectSegments"
              :size="150"
              :thickness="20"
              center-label="Projects"
            />
            <dl class="mt-4 flex border-t border-slate-100 pt-3">
              <div
                v-for="(k, i) in miniKpi"
                :key="k.label"
                class="flex-1 text-center"
                :class="i > 0 ? 'border-l border-slate-100' : ''"
              >
                <dd class="text-lg font-bold tabular-nums text-slate-900">{{ k.value }}</dd>
                <dt class="mt-0.5 text-xs text-slate-400">{{ k.label }}</dt>
              </div>
            </dl>
          </BaseCard>
        </div>
      </div>

      <!-- 3 · Daftar Project ──────────────────────────────────────────────── -->
      <div>
        <div class="mb-2 flex items-baseline gap-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Project</h2>
          <span class="text-xs text-slate-400">prioritas: yang bermasalah dulu</span>
        </div>

        <!-- List tabs + search -->
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="lt in listTabs"
              :key="lt.key"
              type="button"
              class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition"
              :class="
                listTab === lt.key
                  ? 'border-transparent bg-brand text-white shadow-glow'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              "
              @click="listTab = lt.key"
            >
              <component :is="lt.icon" class="h-4 w-4" />
              {{ lt.label }}
              <span
                class="rounded-full px-1.5 text-xs tabular-nums"
                :class="listTab === lt.key ? 'bg-white/25' : 'bg-slate-100 text-slate-500'"
              >
                {{ lt.count }}
              </span>
            </button>
          </div>
          <div class="w-full sm:w-64">
            <BaseInput v-model="listSearch" placeholder="Cari nama project / unit…">
              <template #prefix><MagnifyingGlassIcon class="h-4 w-4" /></template>
            </BaseInput>
          </div>
        </div>

        <!-- Perlu Tindakan: grouped, problem buckets only -->
        <div v-if="listTab === 'problem'" class="space-y-5">
          <div
            v-for="grp in visibleProblemGroups"
            :id="`ov-grp-${grp.key}`"
            :key="grp.key"
            :class="flashedGroup === grp.key ? 'ring-flash' : ''"
          >
            <div class="mb-2 flex items-center gap-2 px-1">
              <span
                class="flex h-5 w-5 items-center justify-center rounded"
                :style="{ backgroundColor: grp.sev }"
              >
                <component :is="grp.icon" class="h-3 w-3 text-white" />
              </span>
              <h3 class="text-xs font-bold uppercase tracking-wide text-slate-600">
                {{ grp.title }}
              </h3>
              <BaseBadge :color="grp.color" size="sm">{{ grp.items.length }}</BaseBadge>
            </div>
            <div class="surface max-h-80 divide-y divide-slate-100 overflow-y-auto">
              <RouterLink
                v-for="p in grp.items"
                :key="p.id"
                :to="{ name: 'project-detail', params: { id: p.id } }"
                class="flex items-center gap-4 px-4 py-2.5 transition hover:bg-slate-50"
              >
                <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: grp.sev }" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-slate-700">{{
                    p.name
                  }}</span>
                  <span v-if="unitLabel(p)" class="block truncate text-xs text-slate-400">{{
                    unitLabel(p)
                  }}</span>
                </span>
                <template v-if="p._rich">
                  <span
                    v-if="dueInfo(p._rich)"
                    class="hidden w-20 shrink-0 text-right text-xs font-semibold sm:block"
                    :class="DUE_TONE[dueInfo(p._rich).tone]"
                  >
                    {{ dueInfo(p._rich).text }}
                  </span>
                  <span class="hidden w-28 shrink-0 items-center gap-2 md:flex">
                    <span
                      class="w-8 shrink-0 text-[11px] font-semibold tabular-nums text-slate-500"
                    >
                      {{ p._rich.progress }}%
                    </span>
                    <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        class="block h-full rounded-full"
                        :class="progColor(p._rich.progress)"
                        :style="{ width: p._rich.progress + '%' }"
                      />
                    </span>
                  </span>
                  <span class="hidden w-20 shrink-0 justify-end lg:flex">
                    <span v-if="p._rich.assignees.length" class="flex -space-x-2">
                      <BaseAvatar
                        v-for="(n, i) in p._rich.assignees.slice(0, 3)"
                        :key="i"
                        :name="n"
                        size="sm"
                      />
                      <span
                        v-if="p._rich.assignees.length > 3"
                        class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-500 ring-2 ring-white"
                      >
                        +{{ p._rich.assignees.length - 3 }}
                      </span>
                    </span>
                    <span v-else class="text-xs text-slate-300">—</span>
                  </span>
                </template>
                <ArrowRightIcon v-else class="h-4 w-4 shrink-0 text-slate-300" />
              </RouterLink>
            </div>
          </div>

          <!-- Nothing to show (no data, or no search match) -->
          <BaseCard v-if="!visibleProblemGroups.length">
            <BaseEmpty
              v-if="listSearch.trim()"
              :icon="MagnifyingGlassIcon"
              title="Tidak ada hasil"
              :description="`Tidak ada project yang cocok dengan “${listSearch.trim()}”.`"
            />
            <BaseEmpty
              v-else
              :icon="CheckBadgeIcon"
              title="Tidak ada project yang perlu tindakan"
              description="Tidak ada project overdue, mendekati deadline, berisiko, atau idle saat ini."
            />
          </BaseCard>
        </div>

        <!-- Active / Closed: flat list -->
        <div v-else>
          <div
            v-if="(listTab === 'active' ? activeItems : closedItems).length"
            class="surface max-h-80 divide-y divide-slate-100 overflow-y-auto"
          >
            <RouterLink
              v-for="p in listTab === 'active' ? activeItems : closedItems"
              :key="p.id"
              :to="{ name: 'project-detail', params: { id: p.id } }"
              class="flex items-center gap-4 px-4 py-2.5 transition hover:bg-slate-50"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :style="{ backgroundColor: listTab === 'active' ? '#3b82f6' : '#10b981' }"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-slate-700">{{
                  p.name
                }}</span>
                <span v-if="unitLabel(p)" class="block truncate text-xs text-slate-400">{{
                  unitLabel(p)
                }}</span>
              </span>
              <template v-if="p._rich">
                <span
                  v-if="dueInfo(p._rich)"
                  class="hidden w-20 shrink-0 text-right text-xs font-semibold sm:block"
                  :class="DUE_TONE[dueInfo(p._rich).tone]"
                >
                  {{ dueInfo(p._rich).text }}
                </span>
                <span class="hidden w-28 shrink-0 items-center gap-2 md:flex">
                  <span class="w-8 shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
                    {{ p._rich.progress }}%
                  </span>
                  <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      class="block h-full rounded-full"
                      :class="progColor(p._rich.progress)"
                      :style="{ width: p._rich.progress + '%' }"
                    />
                  </span>
                </span>
                <span class="hidden w-20 shrink-0 justify-end lg:flex">
                  <span v-if="p._rich.assignees.length" class="flex -space-x-2">
                    <BaseAvatar
                      v-for="(n, i) in p._rich.assignees.slice(0, 3)"
                      :key="i"
                      :name="n"
                      size="sm"
                    />
                    <span
                      v-if="p._rich.assignees.length > 3"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-500 ring-2 ring-white"
                    >
                      +{{ p._rich.assignees.length - 3 }}
                    </span>
                  </span>
                  <span v-else class="text-xs text-slate-300">—</span>
                </span>
              </template>
              <ArrowRightIcon v-else class="h-4 w-4 shrink-0 text-slate-300" />
            </RouterLink>
          </div>
          <BaseCard v-else>
            <BaseEmpty
              v-if="listSearch.trim()"
              :icon="MagnifyingGlassIcon"
              title="Tidak ada hasil"
              :description="`Tidak ada project yang cocok dengan “${listSearch.trim()}”.`"
            />
            <BaseEmpty
              v-else
              :icon="FolderIcon"
              title="Belum ada project"
              :description="
                listTab === 'active'
                  ? 'Project aktif akan muncul di sini.'
                  : 'Project yang sudah selesai akan muncul di sini.'
              "
            />
          </BaseCard>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes ov-flash {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(101, 62, 241, 0);
  }
  25% {
    box-shadow: 0 0 0 3px rgba(101, 62, 241, 0.55);
  }
}
.ring-flash {
  animation: ov-flash 1.3s ease;
  border-radius: 0.875rem;
}
@media (prefers-reduced-motion: reduce) {
  .ring-flash {
    animation: none;
  }
}
</style>
