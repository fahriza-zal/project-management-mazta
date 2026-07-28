<script setup>
import { computed } from 'vue'
import { BuildingOffice2Icon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'

/**
 * Ringkasan "unit mana punya berapa project" — dihitung dari baris `getRangeProject`
 * yang sama dengan Gantt (`project.projectUnits[].unit`). Sebuah project bisa
 * melibatkan banyak unit (many-to-many), jadi tiap unit dihitung project unik-nya
 * (pakai Set project id agar tidak dobel bila satu project punya beberapa baris
 * projectUnits ke unit yang sama). Bar horizontal proporsional ke jumlah terbanyak.
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

const units = computed(() => {
  const map = new Map() // unitId → { id, name, ids: Set<projectId> }
  for (const r of props.ranges ?? []) {
    const p = r?.project
    if (!p?.id) continue
    for (const pu of p.projectUnits ?? []) {
      const u = pu?.unit
      if (!u?.id) continue
      let entry = map.get(u.id)
      if (!entry) {
        entry = { id: u.id, name: u.name || 'Tanpa nama', ids: new Set() }
        map.set(u.id, entry)
      }
      entry.ids.add(p.id)
    }
  }
  return [...map.values()]
    .map((e) => ({ id: e.id, name: e.name, count: e.ids.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

// Total project unik lintas semua unit (project bisa masuk lebih dari satu unit).
const totalProjects = computed(() => {
  const ids = new Set()
  for (const r of props.ranges ?? []) if (r?.project?.id) ids.add(r.project.id)
  return ids.size
})

const maxCount = computed(() => units.value.reduce((m, u) => Math.max(m, u.count), 0))
function barWidth(count) {
  return maxCount.value ? Math.max(4, Math.round((count / maxCount.value) * 100)) + '%' : '0%'
}
</script>

<template>
  <section class="surface p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-start gap-2">
        <BuildingOffice2Icon class="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div class="min-w-0">
          <h2 class="text-subheading">Project per Unit</h2>
          <p class="text-caption mt-0.5">Jumlah project yang melibatkan tiap unit.</p>
        </div>
      </div>
      <span
        v-if="units.length"
        class="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
      >
        {{ units.length }} unit · {{ totalProjects }} project
      </span>
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

    <!-- Bars — tiap unit bisa diklik untuk menampilkan timeline-nya. -->
    <ul v-else class="space-y-1">
      <li v-for="u in units" :key="u.id">
        <button
          type="button"
          class="w-full rounded-xl px-3 py-2 text-left transition"
          :class="
            String(selectedId) === String(u.id)
              ? 'bg-primary-50 ring-1 ring-primary-200'
              : 'hover:bg-slate-50'
          "
          :aria-pressed="String(selectedId) === String(u.id)"
          @click="pick(u.id)"
        >
          <div class="mb-1 flex items-center justify-between gap-2 text-sm">
            <span class="flex min-w-0 items-center gap-1.5">
              <ChevronRightIcon
                class="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform"
                :class="String(selectedId) === String(u.id) ? 'rotate-90 text-primary-500' : ''"
              />
              <span class="truncate font-medium text-slate-700" :title="u.name">{{ u.name }}</span>
            </span>
            <span class="shrink-0 font-semibold tabular-nums text-slate-900">
              {{ u.count }}
              <span class="font-normal text-slate-400">project</span>
            </span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full transition-all"
              :class="String(selectedId) === String(u.id) ? 'bg-primary-500' : 'bg-brand'"
              :style="{ width: barWidth(u.count) }"
            />
          </div>
        </button>

        <!-- Panel accordion: timeline unit ini, menyatu di bawah barisnya. -->
        <div v-if="String(selectedId) === String(u.id)" class="mt-1 pl-2">
          <slot name="detail" :unit="u" />
        </div>
      </li>
    </ul>
  </section>
</template>
