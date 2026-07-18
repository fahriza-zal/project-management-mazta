<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth'
import { PERM } from '@/features/dashboard/permissions'
import { useRangeProjects } from '@/features/dashboard/composables/useDashboard'
import { UserIcon, Squares2X2Icon, ChartBarIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import PersonalDashboard from '@/features/dashboard/components/PersonalDashboard.vue'
import OverviewDashboard from '@/features/dashboard/components/OverviewDashboard.vue'
import HistoryDashboard from '@/features/dashboard/components/HistoryDashboard.vue'
import ProjectGanttChart from '@/features/dashboard/components/ProjectGanttChart.vue'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'

const auth = useAuthStore()
auth.hydrate()

// Project timeline (Gantt) — shown to any user permitted for `getRangeProject`,
// independent of the dashboard tabs. `unitIds` (the signed-in user's units)
// scopes which projects appear, so each user sees their own units' projects.
const canGantt = computed(() => auth.can(PERM.RANGE_PROJECT))
const unitIds = computed(() => (auth.employee?.units ?? []).map((u) => Number(u.id)).filter(Boolean))
const { ranges: projectRanges, loading: ganttLoading, reload: reloadGantt } = useRangeProjects(unitIds)
onMounted(() => {
  if (canGantt.value) reloadGantt()
})

// Only the tabs the user is permitted to open are shown; each `perm` is the
// subscription operation the backend gates on.
const ALL_TABS = [
  {
    key: 'personal',
    label: 'Personal',
    icon: UserIcon,
    perm: PERM.PERSONAL,
    subtitle: 'Ringkasan aktivitas timesheet Anda dan tim secara langsung.',
  },
  {
    key: 'overview',
    label: 'Overview',
    icon: Squares2X2Icon,
    perm: PERM.OVERVIEW,
    subtitle: 'Ringkasan langsung seluruh project & task Anda.',
  },
  {
    key: 'history',
    label: 'History',
    icon: ChartBarIcon,
    perm: PERM.HISTORY,
    subtitle: 'Tren metrik harian dari waktu ke waktu.',
  },
]

const tabs = computed(() =>
  ALL_TABS.filter((t) => {
    if (!auth.can(t.perm)) return false
    // Personal is per-employee; hide it for accounts without an employee record
    // (e.g. a superadmin whose `employee` is null), since it has no data for them.
    if (t.key === 'personal' && auth.employee?.id == null) return false
    return true
  }),
)

// Which dashboard is shown. Each view owns its own subscription, so only the
// active one stays connected (the others unsubscribe when they unmount).
const tab = ref(tabs.value[0]?.key ?? null)

// Keep the selection valid: if permissions change and hide the active tab,
// fall back to the first tab the user can still see.
watch(tabs, (list) => {
  if (!list.some((t) => t.key === tab.value)) tab.value = list[0]?.key ?? null
})

const activeSubtitle = computed(() => tabs.value.find((t) => t.key === tab.value)?.subtitle ?? '')
</script>

<template>
  <div class="space-y-6">
    <!-- Header + view toggle -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-heading">
          Welcome back, {{ auth.profile?.name?.split(' ')[0] || 'there' }}
        </h1>
        <p class="text-body mt-1">{{ activeSubtitle }}</p>
      </div>

      <div
        v-if="tabs.length > 1"
        class="inline-flex rounded-xl border border-slate-200 bg-white p-1"
      >
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
          :class="
            tab === t.key
              ? 'bg-brand text-white shadow-glow'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          "
          @click="tab = t.key"
        >
          <component :is="t.icon" class="h-4 w-4" />
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Project timeline — at the top so every permitted user sees their unit's
         project timeline right after login, regardless of tab. -->
    <ProjectGanttChart v-if="canGantt" :ranges="projectRanges" :loading="ganttLoading" />

    <!-- Active view -->
    <PersonalDashboard v-if="tab === 'personal'" />
    <OverviewDashboard v-else-if="tab === 'overview'" />
    <HistoryDashboard v-else-if="tab === 'history'" />

    <!-- No dashboard permitted (and no timeline either) -->
    <BaseCard v-else-if="!canGantt">
      <BaseEmpty
        :icon="LockClosedIcon"
        title="Tidak ada dashboard yang tersedia"
        description="Anda belum memiliki izin untuk melihat dashboard apa pun."
      />
    </BaseCard>
  </div>
</template>
