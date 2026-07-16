<script setup>
import { computed } from 'vue'
import {
  FolderIcon,
  RectangleStackIcon,
  ClockIcon,
  PlayCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import { formatDate, formatDuration } from '@/shared/utils/format'

/**
 * One employee's timesheet metrics (from `sheetDashboard.metrics[]`).
 * `self` renders a larger, highlighted "hero" variant for the signed-in user.
 */
const props = defineProps({
  metric: { type: Object, required: true },
  self: { type: Boolean, default: false },
})

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round = (v) => Math.round(num(v))

const employee = computed(() => props.metric.employee || {})

const stats = computed(() => [
  { label: 'Project Tasks', value: round(props.metric.projectCount), icon: FolderIcon },
  { label: 'Common Tasks', value: round(props.metric.commonCount), icon: RectangleStackIcon },
  { label: 'Total Waktu', value: formatDuration(props.metric.timeSpents), icon: ClockIcon },
])

const split = computed(() => {
  const project = num(props.metric.secondSpentOnProject)
  const common = num(props.metric.secondSpentOnCommon)
  const total = project + common
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0)
  return {
    total,
    rows: [
      { label: 'Project', seconds: project, pct: pct(project), bar: 'bg-brand' },
      { label: 'Common', seconds: common, pct: pct(common), bar: 'bg-blue-500' },
    ],
  }
})

const task = computed(() => props.metric.task || null)
// A full project Task carries a priority; a common DefaultTask only has a title.
const isProjectTask = computed(() => task.value?.priority != null)
const priorityColor = { low: 'slate', medium: 'info', high: 'warning', critical: 'danger' }
</script>

<template>
  <BaseCard :class="self ? 'ring-2 ring-primary-200' : ''">
    <!-- Identity -->
    <div class="flex items-center gap-3">
      <BaseAvatar
        :name="employee.fullName"
        :src="employee.image || ''"
        :size="self ? 'lg' : 'md'"
      />
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="truncate font-semibold text-slate-900" :class="self ? 'text-lg' : 'text-sm'">
            {{ employee.fullName || 'Tanpa nama' }}
          </h3>
          <BaseBadge v-if="self" color="primary" size="sm">Anda</BaseBadge>
        </div>
        <p class="text-xs text-slate-400">Employee #{{ employee.id }}</p>
      </div>
    </div>

    <!-- KPI row -->
    <div class="mt-4 grid grid-cols-3 gap-2">
      <div v-for="s in stats" :key="s.label" class="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
        <component :is="s.icon" class="mx-auto h-4 w-4 text-slate-400" />
        <p class="mt-1 font-bold tabular-nums text-slate-900" :class="self ? 'text-lg' : 'text-sm'">
          {{ s.value }}
        </p>
        <p class="text-[11px] leading-tight text-slate-400">{{ s.label }}</p>
      </div>
    </div>

    <!-- Time split -->
    <div class="mt-4">
      <p class="mb-2 text-xs font-medium text-slate-500">Distribusi Waktu</p>
      <template v-if="split.total">
        <div class="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            v-for="row in split.rows"
            :key="row.label"
            class="h-full first:rounded-l-full last:rounded-r-full"
            :class="row.bar"
            :style="{ width: row.pct + '%' }"
          />
        </div>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span v-for="row in split.rows" :key="row.label" class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full" :class="row.bar" />
            <span class="text-slate-500">{{ row.label }}</span>
            <span class="font-semibold tabular-nums text-slate-700">
              {{ formatDuration(row.seconds) }}
            </span>
            <span class="text-slate-400">({{ row.pct }}%)</span>
          </span>
        </div>
      </template>
      <p v-else class="text-xs text-slate-400">Belum ada waktu tercatat.</p>
    </div>

    <!-- Current / active task -->
    <div class="mt-4 border-t border-slate-100 pt-3">
      <div v-if="task" class="flex items-start gap-2">
        <span
          class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600"
        >
          <PlayCircleIcon class="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-1.5">
            <p class="truncate text-sm font-medium text-slate-800">{{ task.title }}</p>
            <BaseBadge
              v-if="isProjectTask"
              :color="priorityColor[task.priority] || 'slate'"
              size="sm"
            >
              {{ task.priority }}
            </BaseBadge>
            <BaseBadge :color="isProjectTask ? 'primary' : 'info'" size="sm" dot>
              {{ isProjectTask ? 'Project' : 'Common' }}
            </BaseBadge>
          </div>
          <p
            v-if="isProjectTask && task.dueDate"
            class="mt-0.5 flex items-center gap-1 text-xs text-slate-400"
          >
            <CalendarDaysIcon class="h-3.5 w-3.5" /> Due {{ formatDate(task.dueDate) }}
          </p>
        </div>
      </div>
      <p v-else class="flex items-center gap-1.5 text-xs text-slate-400">
        <PlayCircleIcon class="h-4 w-4" /> Tidak ada task aktif saat ini.
      </p>
    </div>
  </BaseCard>
</template>
