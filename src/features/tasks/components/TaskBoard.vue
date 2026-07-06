<script setup>
import { ref, computed } from 'vue'
import TaskColumn from './TaskColumn.vue'

/**
 * Kanban board. Columns are the task-status definitions (from `listTaskStatus`),
 * so they're dynamic master data. A task belongs to the column whose id matches
 * its status; dragging a card to another column emits `status-change`.
 */
const props = defineProps({
  tasks: { type: Array, default: () => [] },
  // Status columns: [{ id, name, accent }]. Ordered by the parent.
  columns: { type: Array, default: () => [] },
})
const emit = defineEmits(['task-click', 'status-change'])

const draggingId = ref(null)

/** A task's current status id, tolerant of a few shapes. */
function statusIdOf(task) {
  return task.statusId ?? task.status?.id ?? task.status ?? null
}

const grouped = computed(() => {
  const map = {}
  for (const col of props.columns) map[col.id] = []
  for (const task of props.tasks) {
    const key = statusIdOf(task)
    if (map[key]) map[key].push(task)
  }
  return map
})

function onDragStart(task, event) {
  draggingId.value = task.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(task.id))
}

function onDrop(statusId) {
  const id = draggingId.value
  draggingId.value = null
  if (id == null) return
  const task = props.tasks.find((t) => t.id === id)
  if (task && statusIdOf(task) !== statusId) {
    emit('status-change', id, statusId)
  }
}
</script>

<template>
  <div class="flex gap-4 overflow-x-auto pb-4">
    <TaskColumn
      v-for="col in columns"
      :key="col.id"
      :column="col"
      :tasks="grouped[col.id] || []"
      @task-click="emit('task-click', $event)"
      @task-dragstart="onDragStart"
      @drop="onDrop"
    />

    <p v-if="!columns.length" class="py-16 text-sm text-slate-400">No task statuses defined.</p>
  </div>
</template>
