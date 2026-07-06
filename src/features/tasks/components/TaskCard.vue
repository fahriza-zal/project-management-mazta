<script setup>
import { computed } from 'vue'
import { formatDate, isOverdue } from '@/shared/utils/format'
import { TASK_STATUS } from '@/shared/constants'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import TaskPriorityBadge from './TaskPriorityBadge.vue'
import TaskAssignee from './TaskAssignee.vue'

const props = defineProps({
  task: { type: Object, required: true },
  draggable: { type: Boolean, default: true },
})
const emit = defineEmits(['click', 'dragstart', 'dragend'])

const dueSoon = computed(
  () => isOverdue(props.task.dueDate) && props.task.status !== TASK_STATUS.DONE,
)
</script>

<template>
  <article
    :draggable="draggable"
    class="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-soft transition hover:border-primary-200 hover:shadow-card-hover active:cursor-grabbing"
    @click="emit('click', task)"
    @dragstart="emit('dragstart', task, $event)"
    @dragend="emit('dragend', task, $event)"
  >
    <div class="mb-2 flex items-start justify-between gap-2">
      <h4 class="text-sm font-semibold leading-snug text-slate-800 group-hover:text-primary-700">
        {{ task.title }}
      </h4>
      <TaskPriorityBadge :priority="task.priority" icon-only />
    </div>

    <p v-if="task.description" class="mb-3 line-clamp-2 text-xs text-slate-500">
      {{ task.description }}
    </p>

    <div class="flex items-center justify-between">
      <span
        class="inline-flex items-center gap-1 text-[11px]"
        :class="dueSoon ? 'font-medium text-danger' : 'text-slate-400'"
      >
        <CalendarDaysIcon class="h-3.5 w-3.5" />
        {{ formatDate(task.dueDate, { year: undefined }) }}
      </span>
      <TaskAssignee :user-id="task.assignedTo" size="xs" />
    </div>
  </article>
</template>
