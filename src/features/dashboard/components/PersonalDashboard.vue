<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useSheetDashboard } from '@/features/dashboard/composables/useDashboard'
import { ExclamationTriangleIcon, UsersIcon, ClockIcon } from '@heroicons/vue/24/outline'
import EmployeeMetricCard from '@/features/dashboard/components/EmployeeMetricCard.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'

const auth = useAuthStore()
auth.hydrate()

// The subscription is keyed on the signed-in employee (id from the persisted profile);
// it returns metrics for that employee plus their team (per the `tree` hierarchy).
const employeeId = computed(() => auth.employee?.id ?? null)

const { metrics, tree, loading, error } = useSheetDashboard(employeeId)

/** Depth-first list of employee ids from the `tree` hierarchy (root → leaves). */
function flattenTree(node, depth = 0, acc = []) {
  if (!node || node.id == null) return acc
  acc.push({ id: node.id, depth })
  for (const child of node.childrens || []) flattenTree(child, depth + 1, acc)
  return acc
}

// Metrics ordered by the tree (so the hierarchy reads top-down); any employee not
// present in the tree is appended so nothing is silently dropped.
const ordered = computed(() => {
  const byId = new Map((metrics.value || []).map((m) => [m.employee?.id, m]))
  const seen = new Set()
  const out = []
  for (const { id } of flattenTree(tree.value)) {
    const m = byId.get(id)
    if (m && !seen.has(id)) {
      out.push(m)
      seen.add(id)
    }
  }
  for (const m of metrics.value || []) {
    const id = m.employee?.id
    if (!seen.has(id)) {
      out.push(m)
      seen.add(id)
    }
  }
  return out
})

// The signed-in employee's own metrics (fall back to the first entry / tree root).
const selfMetric = computed(
  () => ordered.value.find((m) => m.employee?.id === employeeId.value) || ordered.value[0] || null,
)
const team = computed(() => ordered.value.filter((m) => m !== selfMetric.value))
</script>

<template>
  <div class="space-y-6">
    <!-- No employee profile -->
    <div
      v-if="employeeId == null"
      class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning"
    >
      <ExclamationTriangleIcon class="h-5 w-5 shrink-0" />
      Profil employee tidak ditemukan. Silakan login ulang.
    </div>

    <template v-else>
      <!-- Subscription error -->
      <div
        v-if="error"
        class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
      >
        <ExclamationTriangleIcon class="h-5 w-5 shrink-0" />
        Gagal memuat dashboard secara langsung. Koneksi akan dicoba ulang otomatis.
      </div>

      <!-- Loading (first payload not in yet) -->
      <div
        v-if="loading && !selfMetric"
        class="surface px-4 py-16 text-center text-sm text-slate-400"
      >
        Menyambungkan data langsung…
      </div>

      <!-- No data yet -->
      <BaseCard v-else-if="!selfMetric">
        <BaseEmpty
          :icon="ClockIcon"
          title="Belum ada aktivitas"
          description="Metrik timesheet Anda akan muncul di sini begitu ada aktivitas."
        />
      </BaseCard>

      <template v-else>
        <!-- Signed-in employee -->
        <EmployeeMetricCard :metric="selfMetric" self />

        <!-- Team members -->
        <div v-if="team.length">
          <div class="mb-3 flex items-center gap-2">
            <UsersIcon class="h-5 w-5 text-slate-400" />
            <h2 class="text-subheading">Tim</h2>
            <span class="text-sm text-slate-400">({{ team.length }})</span>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <EmployeeMetricCard v-for="m in team" :key="m.employee?.id" :metric="m" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
