<script setup>
import { computed } from 'vue'
import { useHistoryDashboard } from '@/features/dashboard/composables/useDashboard'
import { ExclamationTriangleIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import TrendTile from '@/features/dashboard/components/TrendTile.vue'
import LineChart from '@/features/dashboard/components/charts/LineChart.vue'

const { histories, loading, error } = useHistoryDashboard()

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round = (v) => Math.round(num(v))
// Compact decimal: 0.3889 → "0.39", 2 → "2".
const dec = (v) => String(Math.round(num(v) * 100) / 100)

// Warna tetap, tidak diputar-putar agar mudah dikenali.
const C = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
}

/** Urutkan menurut tanggal naik (urutan dari API tidak dijamin). */
const rows = computed(() =>
  [...(histories.value ?? [])].sort((a, b) => String(a.workDate).localeCompare(String(b.workDate))),
)
const hasData = computed(() => rows.value.length > 0)

function shortDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d).slice(5)
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}
const labels = computed(() => rows.value.map((r) => shortDate(r.workDate)))

/** Ambil satu metrik sepanjang waktu (mentah). */
const col = (key) => rows.value.map((r) => num(r[key]))
/** Metrik pecahan 0–1 → persen 0–100 (mis. completionRate "0.2222"). */
const colPct = (key) => rows.value.map((r) => num(r[key]) * 100)

// ── Kartu ringkasan (tren metrik kunci) ───────────────────────────────────────
const heroTiles = computed(() => [
  { label: 'Kemajuan Proyek', points: col('progress'), unit: '%', color: C.blue },
  { label: 'Tingkat Penyelesaian', points: colPct('completionRate'), unit: '%', color: C.emerald },
  { label: 'Anggota Aktif', points: col('activeMembers'), color: C.violet },
  { label: 'Skor Risiko', points: col('riskScore'), color: C.rose, invert: true },
])

// ── Grafik 1: kemajuan & tingkat penyelesaian (persen, 0–100) ─────────────────
const progressSeries = computed(() => [
  { name: 'Kemajuan', color: C.blue, values: col('progress') },
  { name: 'Tingkat Penyelesaian', color: C.emerald, values: colPct('completionRate') },
])

// ── Grafik 2: penyelesaian tugas (tepat waktu vs terlambat vs lewat tenggat) ───
const deliverySeries = computed(() => [
  { name: 'Tepat Waktu', color: C.emerald, values: col('completedOnTime') },
  { name: 'Terlambat', color: C.amber, values: col('completedLate') },
  { name: 'Lewat Tenggat', color: C.rose, values: col('overdueTasks') },
])

// ── Grafik 3: volume kerja (milestone & tugas) ────────────────────────────────
const volumeSeries = computed(() => [
  { name: 'Total Tugas', color: C.blue, values: col('totalTasks') },
  { name: 'Tugas Selesai', color: C.emerald, values: col('completedTasks') },
  { name: 'Total Milestone', color: C.violet, values: col('totalMilestones') },
  { name: 'Milestone Selesai', color: C.cyan, values: col('completedMilestones') },
])

// ── Grafik 4: aliran kerja (velocity & throughput) ────────────────────────────
const flowSeries = computed(() => [
  { name: 'Velocity', color: C.violet, values: col('velocity') },
  { name: 'Throughput', color: C.cyan, values: col('throughput') },
])

const pct = (v) => `${round(v)}%`

// ── Tabel rincian harian — setiap field, dikelompokkan menurut fungsinya ──────
// fmt: 'pct' (0–100), 'frac' (0–1 → %), 'dec' (desimal ringkas), default = bulat.
const metricGroups = [
  {
    group: 'Milestone',
    rows: [
      { label: 'Total Milestone', key: 'totalMilestones' },
      { label: 'Milestone Selesai', key: 'completedMilestones' },
    ],
  },
  {
    group: 'Tugas',
    rows: [
      { label: 'Total Tugas', key: 'totalTasks' },
      { label: 'Tugas Selesai', key: 'completedTasks' },
      { label: 'Tepat Waktu', key: 'completedOnTime' },
      { label: 'Terlambat', key: 'completedLate' },
      { label: 'Lewat Tenggat', key: 'overdueTasks' },
    ],
  },
  {
    group: 'Kualitas & Skor',
    rows: [
      { label: 'Kemajuan', key: 'progress', fmt: 'pct' },
      { label: 'Tingkat Penyelesaian', key: 'completionRate', fmt: 'frac' },
      { label: 'Skor Kesehatan', key: 'healthScore', fmt: 'dec' },
      { label: 'Skor Risiko', key: 'riskScore', fmt: 'dec' },
      { label: 'Efisiensi', key: 'efficiency', fmt: 'frac' },
      { label: 'Utilisasi', key: 'utilization', fmt: 'frac' },
      { label: 'Varian Jadwal', key: 'scheduleVariance', fmt: 'dec' },
    ],
  },
  {
    group: 'Aliran Kerja',
    rows: [
      { label: 'Velocity', key: 'velocity', fmt: 'dec' },
      { label: 'Throughput', key: 'throughput', fmt: 'dec' },
      { label: 'Rata-rata Cycle Time', key: 'averageCycleTime', fmt: 'dec' },
      { label: 'Rata-rata Lead Time', key: 'averageLeadTime', fmt: 'dec' },
    ],
  },
  {
    group: 'Tim',
    rows: [
      { label: 'Anggota Aktif', key: 'activeMembers' },
      { label: 'Tugas / Anggota', key: 'averageTaskPerMember', fmt: 'dec' },
    ],
  },
  {
    group: 'Aktivitas',
    rows: [
      { label: 'Komentar', key: 'totalComments' },
      { label: 'Lampiran', key: 'totalAttachments' },
      { label: 'Perubahan Status', key: 'totalStatusChanges' },
    ],
  },
  {
    group: 'Waktu',
    rows: [
      { label: 'Estimasi (detik)', key: 'estimatedSeconds' },
      { label: 'Aktual (detik)', key: 'actualSeconds' },
      { label: 'Umur Proyek (hari)', key: 'projectAgeDays' },
    ],
  },
]

function cellVal(metric, r) {
  const v = num(r[metric.key])
  if (metric.fmt === 'pct') return `${round(v)}%`
  if (metric.fmt === 'frac') return `${round(v * 100)}%`
  if (metric.fmt === 'dec') return dec(v)
  return String(round(v))
}
const lastIdx = computed(() => rows.value.length - 1)
</script>

<template>
  <div class="space-y-6">
    <!-- Error -->
    <div
      v-if="error"
      class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
    >
      <ExclamationTriangleIcon class="h-5 w-5 shrink-0" />
      Gagal memuat data historis secara langsung. Koneksi akan dicoba ulang otomatis.
    </div>

    <!-- Loading -->
    <div v-if="loading && !hasData" class="surface px-4 py-16 text-center text-sm text-slate-400">
      Menyambungkan data historis…
    </div>

    <!-- Empty -->
    <BaseCard v-else-if="!hasData">
      <BaseEmpty
        :icon="ChartBarIcon"
        title="Belum ada data historis"
        description="Tren metrik harian akan muncul di sini seiring data terkumpul."
      />
    </BaseCard>

    <template v-else>
      <!-- Kartu ringkasan -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TrendTile
          v-for="t in heroTiles"
          :key="t.label"
          :label="t.label"
          :points="t.points"
          :color="t.color"
          :unit="t.unit || ''"
          :invert="t.invert || false"
        />
      </div>

      <!-- Grafik tren -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BaseCard title="Kemajuan Proyek" subtitle="Kemajuan & tingkat penyelesaian (%)">
          <LineChart
            :labels="labels"
            :series="progressSeries"
            :height="240"
            :y-min="0"
            :y-max="100"
            unit="%"
            :format="pct"
          />
        </BaseCard>

        <BaseCard title="Penyelesaian Tugas" subtitle="Tepat waktu, terlambat, dan lewat tenggat">
          <LineChart :labels="labels" :series="deliverySeries" :height="240" />
        </BaseCard>

        <BaseCard title="Volume Kerja" subtitle="Jumlah milestone & tugas dari waktu ke waktu">
          <LineChart :labels="labels" :series="volumeSeries" :height="240" />
        </BaseCard>

        <BaseCard title="Aliran Kerja" subtitle="Velocity & throughput harian">
          <LineChart :labels="labels" :series="flowSeries" :height="240" :format="dec" />
        </BaseCard>
      </div>

      <!-- Tabel rincian harian (semua metrik) -->
      <BaseCard title="Rincian Harian" subtitle="Semua metrik per tanggal" :padded="false">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200">
                <th
                  class="sticky left-0 z-10 bg-white px-4 py-2.5 text-left text-xs font-semibold text-slate-500"
                >
                  Metrik
                </th>
                <th
                  v-for="(r, i) in rows"
                  :key="r.id"
                  class="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold"
                  :class="i === lastIdx ? 'text-primary-700' : 'text-slate-500'"
                >
                  {{ shortDate(r.workDate) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="g in metricGroups" :key="g.group">
                <tr class="bg-slate-50">
                  <td
                    class="sticky left-0 z-10 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                    :colspan="rows.length + 1"
                  >
                    {{ g.group }}
                  </td>
                </tr>
                <tr
                  v-for="m in g.rows"
                  :key="m.key"
                  class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  <td
                    class="sticky left-0 z-10 bg-white px-4 py-2 text-left text-slate-600 hover:bg-slate-50/60"
                  >
                    {{ m.label }}
                  </td>
                  <td
                    v-for="(r, i) in rows"
                    :key="r.id"
                    class="whitespace-nowrap px-3 py-2 text-right tabular-nums"
                    :class="i === lastIdx ? 'font-semibold text-slate-900' : 'text-slate-600'"
                  >
                    {{ cellVal(m, r) }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </BaseCard>
    </template>
  </div>
</template>
