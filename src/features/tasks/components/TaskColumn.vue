<script setup>
import { ref, computed } from 'vue'
import TaskCard from './TaskCard.vue'

const props = defineProps({
  column: { type: Object, required: true }, // { id, name, accent }
  tasks: { type: Array, default: () => [] },
})
const emit = defineEmits(['task-click', 'task-dragstart', 'drop'])

const isOver = ref(false)
const accent = computed(() => props.column.accent ?? 'slate')

const dotColor = {
  slate: 'bg-slate-400',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  success: 'bg-green-500',
  danger: 'bg-red-500',
}

function onDrop(e) {
  isOver.value = false
  emit('drop', props.column.id, e)
}
</script>

<template>
  <div class="flex w-80 shrink-0 flex-col">
    <!-- Column header -->
    <div class="mb-3 flex items-center justify-between px-1">
      <div class="flex items-center gap-2">
        <span class="h-2.5 w-2.5 rounded-full" :class="dotColor[accent]" />
        <h3 class="text-sm font-semibold text-slate-700">{{ column.name }}</h3>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {{ tasks.length }}
        </span>
      </div>
    </div>

    <!-- Drop zone -->
    <div
      class="flex-1 space-y-2.5 rounded-xl border border-dashed p-2.5 transition-colors"
      :class="isOver ? 'border-primary-400 bg-primary-50/50' : 'border-slate-200 bg-slate-50/60'"
      @dragover.prevent="isOver = true"
      @dragleave="isOver = false"
      @drop.prevent="onDrop"
    >
      <TaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @click="emit('task-click', $event)"
        @dragstart="(t, e) => emit('task-dragstart', t, e)"
      />

      <p v-if="!tasks.length" class="py-8 text-center text-xs text-slate-400">Drop tasks here</p>
    </div>
  </div>
</template>
