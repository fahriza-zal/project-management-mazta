<script setup>
import { computed, ref } from 'vue'
import {
  BuildingOffice2Icon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

/**
 * Ringkasan "unit mana punya berapa project" — dihitung dari baris `getRangeProject`
 * yang sama dengan Gantt (`project.projectUnits[].unit`). Sebuah project bisa
 * melibatkan banyak unit (many-to-many), jadi tiap unit dihitung project unik-nya
 * (pakai Set project id agar tidak dobel bila satu project punya beberapa baris
 * projectUnits ke unit yang sama).
 *
 * Tiap unit menampilkan **komposisi status** project-nya (terlambat/berjalan/
 * belum mulai/selesai) sebagai bar bertumpuk — warnanya selaras dengan Gantt.
 * Lebar bar relatif ke unit dengan project terbanyak.
 *
 * Tiap unit bisa diklik: emit `select` dengan unit id (atau null bila unit yang
 * sama diklik lagi) — pemanggil memakainya untuk memfilter timeline Gantt.
 */
const props = defineProps({
  ranges: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  // Unit yang sedang aktif (dari pemanggil) untuk highlight baris.
  selectedId: { type: [Number, String], default: null },
})

const emit = defineEmits(['select'])

function pick(id) {
  emit('select', String(props.selectedId) === String(id) ? null : id)
}

const isSel = (id) => String(props.selectedId) === String(id)

// ── Status per project (ringan, selaras dengan `phase()` di Gantt) ────────────
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
function projState(r) {
  const p = r?.project ?? {}
  const closed = p.isClosed || parseDay(r.endDate) != null || parseDay(p.endDate) != null
  if (closed) return 'done'
  const start = parseDay(r.startDate) ?? parseDay(p.startDate)
  const exp = parseDay(r.expectedEndDate) ?? parseDay(p.expectedEndDate)
  if (exp != null && today > exp) return 'overdue'
  if (start != null && today < start) return 'pending'
  return 'active'
}

// Segments in display order (terlambat dulu — paling perlu perhatian).
const SEG = [
  { key: 'overdue', label: 'Terlambat', color: '#ef4444' },
  { key: 'active', label: 'Berjalan', color: '#3b82f6' },
  { key: 'pending', label: 'Belum mulai', color: '#94a3b8' },
  { key: 'done', label: 'Selesai', color: '#22c55e' },
]

const units = computed(() => {
  const map = new Map() // unitId → { id, name, states: Map<projectId, state>, pnames: [] }
  for (const r of props.ranges ?? []) {
    const p = r?.project
    if (!p?.id) continue
    const st = projState(r)
    for (const pu of p.projectUnits ?? []) {
      const u = pu?.unit
      if (!u?.id) continue
      let entry = map.get(u.id)
      if (!entry) {
        entry = { id: u.id, name: u.name || 'Tanpa nama', states: new Map(), pnames: [] }
        map.set(u.id, entry)
      }
      if (!entry.states.has(p.id)) entry.pnames.push(p.name || '') // dedupe by project id
      entry.states.set(p.id, st)
    }
  }
  return [...map.values()]
    .map((e) => {
      const counts = { overdue: 0, active: 0, pending: 0, done: 0 }
      for (const s of e.states.values()) counts[s] = (counts[s] ?? 0) + 1
      const count = e.states.size
      return {
        id: e.id,
        name: e.name,
        count,
        counts,
        segs: SEG.map((s) => ({ ...s, value: counts[s.key] })).filter((s) => s.value > 0),
        // Haystack pencarian: nama unit + semua nama project di dalamnya.
        haystack: `${e.name} ${e.pnames.join(' ')}`.toLowerCase(),
      }
    })
    .sort(
      (a, b) =>
        b.counts.overdue - a.counts.overdue || b.count - a.count || a.name.localeCompare(b.name),
    )
})

// Client-side search over unit name + nama project di dalam unit.
const unitSearch = ref('')
const filteredUnits = computed(() => {
  const q = unitSearch.value.trim().toLowerCase()
  if (!q) return units.value
  return units.value.filter((u) => u.haystack.includes(q))
})

// Total project unik lintas semua unit (project bisa masuk lebih dari satu unit).
const totals = computed(() => {
  const ids = new Set()
  const overdue = new Set()
  for (const r of props.ranges ?? []) {
    const p = r?.project
    if (!p?.id) continue
    ids.add(p.id)
    if (projState(r) === 'overdue') overdue.add(p.id)
  }
  return { projects: ids.size, overdue: overdue.size }
})

const maxCount = computed(() => units.value.reduce((m, u) => Math.max(m, u.count), 0))
function barWidth(count) {
  return maxCount.value ? Math.max(6, Math.round((count / maxCount.value) * 100)) + '%' : '0%'
}
</script>

<template>
  <section class="surface p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-start gap-2.5">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <BuildingOffice2Icon class="h-5 w-5 text-primary-600" />
        </span>
        <div class="min-w-0">
          <h2 class="text-subheading">Project per Unit</h2>
          <p class="text-caption mt-0.5">Klik unit untuk membuka timeline-nya.</p>
        </div>
      </div>
      <div v-if="units.length" class="flex shrink-0 items-center gap-1.5">
        <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          {{ units.length }} unit · {{ totals.projects }} project
        </span>
        <span
          v-if="totals.overdue"
          class="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-danger"
        >
          <ExclamationTriangleIcon class="h-3.5 w-3.5" />
          {{ totals.overdue }} terlambat
        </span>
      </div>
    </div>

    <!-- Search unit / project -->
    <div v-if="!loading && units.length" class="mb-3">
      <BaseInput v-model="unitSearch" placeholder="Cari unit / nama project…">
        <template #prefix><MagnifyingGlassIcon class="h-4 w-4" /></template>
      </BaseInput>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-10 text-center text-sm text-slate-400">Memuat data unit…</div>

    <!-- Empty -->
    <BaseEmpty
      v-else-if="!units.length"
      :icon="BuildingOffice2Icon"
      title="Belum ada data unit"
      description="Ringkasan jumlah project per unit akan muncul di sini."
    />

    <!-- No search match -->
    <BaseEmpty
      v-else-if="!filteredUnits.length"
      :icon="MagnifyingGlassIcon"
      title="Tidak ada hasil"
      :description="`Tidak ada unit atau project yang cocok dengan “${unitSearch.trim()}”.`"
    />

    <!-- Units — tiap unit bisa diklik untuk menampilkan timeline-nya. Daftar
         di-scroll saat banyak; batasan dilepas ketika sebuah unit dibuka agar
         timeline-nya tampil penuh. -->
    <ul
      v-else
      class="space-y-2"
      :class="selectedId == null ? 'max-h-[30rem] overflow-y-auto pr-1' : ''"
    >
      <li
        v-for="u in filteredUnits"
        :key="u.id"
        class="overflow-hidden rounded-xl border transition"
        :class="
          isSel(u.id)
            ? 'border-primary-200 bg-primary-50/40 shadow-sm'
            : 'border-slate-200 bg-white hover:border-slate-300'
        "
      >
        <button
          type="button"
          class="w-full px-3.5 py-3 text-left"
          :aria-pressed="isSel(u.id)"
          :aria-expanded="isSel(u.id)"
          @click="pick(u.id)"
        >
          <div class="flex items-center gap-2">
            <ChevronRightIcon
              class="h-4 w-4 shrink-0 text-slate-400 transition-transform"
              :class="isSel(u.id) ? 'rotate-90 text-primary-500' : ''"
            />
            <span class="truncate text-sm font-semibold text-slate-800" :title="u.name">
              {{ u.name }}
            </span>
            <span
              v-if="u.counts.overdue"
              class="ml-1 shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-danger"
            >
              {{ u.counts.overdue }} terlambat
            </span>
            <span class="ml-auto shrink-0 text-sm">
              <b class="font-bold tabular-nums text-slate-900">{{ u.count }}</b>
              <span class="text-slate-400"> project</span>
            </span>
          </div>

          <!-- Stacked status bar: lebar = jumlah relatif, segmen = komposisi status -->
          <div class="mt-2 flex items-center gap-2 pl-6">
            <span class="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span
                class="flex h-full overflow-hidden rounded-full"
                :style="{ width: barWidth(u.count) }"
              >
                <span
                  v-for="s in u.segs"
                  :key="s.key"
                  class="h-full first:rounded-l-full last:rounded-r-full"
                  :style="{ flexGrow: s.value, backgroundColor: s.color }"
                  :title="`${s.label}: ${s.value}`"
                />
              </span>
            </span>
          </div>
        </button>

        <!-- Panel accordion: timeline unit ini, menyatu di bawah barisnya. -->
        <div v-if="isSel(u.id)" class="border-t border-primary-100 bg-white px-3.5 pb-3.5 pt-2">
          <slot name="detail" :unit="u" />
        </div>
      </li>
    </ul>
  </section>
</template>
