<script setup>
import { ref, computed } from 'vue'
import { formatDate } from '@/shared/utils/format'
import { CalendarDaysIcon, FlagIcon, PlusIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'

/**
 * Real-data Kanban for a project. Columns are the task-status definitions
 * (`listTaskStatus`); tasks come from the project (milestones → tasks), grouped
 * by each task's `currentStatus`. Dragging a card between columns emits
 * `status-change`; the per-column add button emits `add` (opens the create modal).
 */
const props = defineProps({
  columns: { type: Array, default: () => [] }, // [{ id, name, accent }]
  tasks: { type: Array, default: () => [] }, // flattened project tasks
})
const emit = defineEmits(['status-change', 'add'])

const dotColor = {
  slate: 'bg-slate-400',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  success: 'bg-green-500',
  danger: 'bg-red-500',
}
const PRIORITY_COLORS = { low: 'slate', medium: 'info', high: 'warning', critical: 'danger' }
const priorityColor = (p) => PRIORITY_COLORS[String(p).toLowerCase()] ?? 'slate'
const humanize = (v) =>
  v
    ? String(v)
        .toLowerCase()
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : ''

const grouped = computed(() => {
  const map = {}
  for (const col of props.columns) map[col.id] = []
  for (const task of props.tasks) {
    const key = task.currentStatus?.id
    if (map[key]) map[key].push(task)
  }
  return map
})

// ── Drag & drop ──────────────────────────────────────────────────────────────
const draggingId = ref(null)
const overColumn = ref(null)

function onDragStart(task, event) {
  draggingId.value = task.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(task.id))
}

function onDrop(statusId) {
  const id = draggingId.value
  draggingId.value = null
  overColumn.value = null
  if (id == null) return
  const task = props.tasks.find((t) => t.id === id)
  if (task && task.currentStatus?.id !== statusId) emit('status-change', id, statusId)
}
</script>

<template>
  <div class="flex gap-4 overflow-x-auto pb-4">
    <div v-for="col in columns" :key="col.id" class="flex w-80 shrink-0 flex-col">
      <!-- Column header -->
      <div class="mb-3 flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full" :class="dotColor[col.accent] || dotColor.slate" />
          <h3 class="text-sm font-semibold text-slate-700">{{ col.name }}</h3>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {{ grouped[col.id]?.length || 0 }}
          </span>
        </div>
        <button
          class="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
          title="Add task"
          @click="emit('add', col.id)"
        >
          <PlusIcon class="h-4 w-4" />
        </button>
      </div>

      <!-- Drop zone -->
      <div
        class="flex-1 space-y-2.5 rounded-xl border border-dashed p-2.5 transition-colors"
        :class="
          overColumn === col.id
            ? 'border-primary-400 bg-primary-50/50'
            : 'border-slate-200 bg-slate-50/60'
        "
        @dragover.prevent="overColumn = col.id"
        @dragleave="overColumn = null"
        @drop.prevent="onDrop(col.id)"
      >
        <!-- Task cards -->
        <article
          v-for="task in grouped[col.id] || []"
          :key="task.id"
          draggable="true"
          class="cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-soft transition hover:border-primary-200 hover:shadow-card-hover active:cursor-grabbing"
          @dragstart="onDragStart(task, $event)"
        >
          <div class="mb-2 flex items-start justify-between gap-2">
            <h4 class="text-sm font-semibold leading-snug text-slate-800">{{ task.title }}</h4>
            <BaseBadge v-if="task.priority" :color="priorityColor(task.priority)" size="sm">
              {{ humanize(task.priority) }}
            </BaseBadge>
          </div>

          <p v-if="task.description" class="mb-2 line-clamp-2 text-xs text-slate-500">
            {{ task.description }}
          </p>

          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span v-if="task.milestone?.name" class="inline-flex items-center gap-1">
              <FlagIcon class="h-3.5 w-3.5" />
              {{ task.milestone.name }}
            </span>
            <span v-if="task.dueDate" class="inline-flex items-center gap-1">
              <CalendarDaysIcon class="h-3.5 w-3.5" />
              {{ formatDate(task.dueDate, { year: undefined }) }}
            </span>
          </div>

          <!-- Assignees -->
          <div v-if="task.assignments?.length" class="mt-2.5 flex items-center -space-x-1.5">
            <BaseAvatar
              v-for="a in task.assignments"
              :key="a.id"
              :name="a.employee?.fullName || '?'"
              size="xs"
            />
          </div>
        </article>

        <p v-if="!(grouped[col.id]?.length || 0)" class="py-8 text-center text-xs text-slate-400">
          Drop tasks here
        </p>
      </div>
    </div>

    <p v-if="!columns.length" class="py-16 text-sm text-slate-400">No task statuses defined.</p>
  </div>
</template>
