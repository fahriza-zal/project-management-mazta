<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth'
import { Squares2X2Icon, ChartBarIcon } from '@heroicons/vue/24/outline'
import OverviewDashboard from '@/features/dashboard/components/OverviewDashboard.vue'
import HistoryDashboard from '@/features/dashboard/components/HistoryDashboard.vue'

const auth = useAuthStore()

// Which dashboard is shown. Each view owns its own subscription, so only the
// active one stays connected (the other unsubscribes when it unmounts).
const tab = ref('overview') // 'overview' | 'history'
const tabs = [
  { key: 'overview', label: 'Overview', icon: Squares2X2Icon },
  { key: 'history', label: 'History', icon: ChartBarIcon },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Header + view toggle -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-heading">
          Welcome back, {{ auth.profile?.name?.split(' ')[0] || 'there' }}
        </h1>
        <p class="text-body mt-1">
          {{
            tab === 'overview'
              ? 'Ringkasan langsung seluruh project & task Anda.'
              : 'Tren metrik harian dari waktu ke waktu.'
          }}
        </p>
      </div>

      <div class="inline-flex rounded-xl border border-slate-200 bg-white p-1">
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

    <!-- Active view -->
    <OverviewDashboard v-if="tab === 'overview'" />
    <HistoryDashboard v-else />
  </div>
</template>
