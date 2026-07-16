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

// Warna tetap, tidak diputar-putar agar mudah dikenali.
const C = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
}

/** Urutkan menurut tanggal (urutan dari API tidak dijamin). */
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

/** Ambil satu metrik sepanjang waktu. */
const col = (key) => rows.value.map((r) => num(r[key]))

// ── Kartu ringkasan (4 metrik paling penting) ─────────────────────────────────
const heroTiles = computed(() => [
  { label: 'Kemajuan Proyek', points: col('progress'), unit: '%', color: C.blue },
  { label: 'Tugas Selesai', points: col('completionRate'), unit: '%', color: C.emerald },
  { label: 'Skor Kesehatan', points: col('healthScore'), color: C.cyan },
  { label: 'Skor Risiko', points: col('riskScore'), color: C.rose, invert: true },
])

// ── Grafik 1: kemajuan & tugas selesai (persen) ───────────────────────────────
const progressSeries = computed(() => [
  { name: 'Kemajuan', color: C.blue, values: col('progress') },
  { name: 'Tugas Selesai', color: C.emerald, values: col('completionRate') },
])

// ── Grafik 2: penyelesaian tugas (tepat waktu vs terlambat vs lewat tenggat) ───
const deliverySeries = computed(() => [
  { name: 'Tepat Waktu', color: C.emerald, values: col('completedOnTime') },
  { name: 'Terlambat', color: C.amber, values: col('completedLate') },
  { name: 'Lewat Tenggat', color: C.rose, values: col('overdueTasks') },
])

const pct = (v) => `${round(v)}%`
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

      <!-- Dua grafik utama -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BaseCard title="Kemajuan Proyek" subtitle="Persentase kemajuan & tugas yang selesai">
          <LineChart
            :labels="labels"
            :series="progressSeries"
            :height="260"
            :y-min="0"
            :y-max="100"
            unit="%"
            :format="pct"
          />
        </BaseCard>
        <BaseCard
          title="Penyelesaian Tugas"
          subtitle="Jumlah tugas tepat waktu, terlambat, dan lewat tenggat"
        >
          <LineChart :labels="labels" :series="deliverySeries" :height="260" />
        </BaseCard>
      </div>
    </template>
  </div>
</template>
