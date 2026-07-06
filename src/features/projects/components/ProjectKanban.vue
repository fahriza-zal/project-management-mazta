<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import { formatDateShort } from '@/shared/utils/format'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'

/**
 * Kanban of projects, grouped by an enum field (`groupKey`) into `columns`.
 * `columns` are `{ value, label }` (usually derived from the enum). Projects
 * whose value isn't in `columns` fall into a trailing "Others" column.
 */
const props = defineProps({
  projects: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  groupKey: { type: String, required: true },
})

const grouped = computed(() => {
  const known = new Set(props.columns.map((c) => c.value))
  const cols = props.columns.map((c) => ({
    ...c,
    items: props.projects.filter((p) => p[props.groupKey] === c.value),
  }))
  const others = props.projects.filter((p) => !known.has(p[props.groupKey]))
  if (others.length) cols.push({ value: '__others__', label: 'Others', items: others })
  return cols
})

function unitNames(project) {
  return (project.projectUnits ?? []).map((pu) => pu.unit?.name).filter(Boolean)
}
</script>

<template>
  <div class="flex gap-4 overflow-x-auto pb-2">
    <div v-for="col in grouped" :key="col.value" class="flex w-80 shrink-0 flex-col">
      <!-- Column header -->
      <div class="mb-3 flex items-center justify-between px-1">
        <h3 class="text-sm font-semibold text-slate-700">{{ col.label }}</h3>
        <span
          class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-xs font-medium text-slate-500"
        >
          {{ col.items.length }}
        </span>
      </div>

      <!-- Column body -->
      <div class="flex flex-1 flex-col gap-3 rounded-2xl bg-slate-50/70 p-3">
        <RouterLink
          v-for="project in col.items"
          :key="project.id"
          :to="{ name: 'project-detail', params: { id: project.id } }"
          class="surface group block p-4 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <p class="text-caption font-medium">{{ project.fullCode || project.prefix }}</p>
          <h4 class="mt-0.5 truncate text-sm font-semibold text-slate-900 group-hover:text-primary-700">
            {{ project.name }}
          </h4>
          <p v-if="project.description" class="mt-1 line-clamp-2 text-xs text-slate-500">
            {{ project.description }}
          </p>

          <div v-if="unitNames(project).length" class="mt-3 flex flex-wrap gap-1">
            <BaseBadge v-for="name in unitNames(project)" :key="name" color="info" size="sm">
              {{ name }}
            </BaseBadge>
          </div>

          <div class="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarDaysIcon class="h-4 w-4" />
            <span>{{ formatDateShort(project.expectedEndDate) }}</span>
          </div>
        </RouterLink>

        <p v-if="!col.items.length" class="px-1 py-6 text-center text-xs text-slate-400">
          No projects
        </p>
      </div>
    </div>
  </div>
</template>
