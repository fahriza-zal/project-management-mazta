<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { BellIcon, XMarkIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { BellAlertIcon } from '@heroicons/vue/24/solid'
import { useNotificationStore } from '@/shared/stores/notifications'
import { timeAgo } from '@/shared/utils/format'

const router = useRouter()
const store = useNotificationStore()
const { items, unreadCount } = storeToRefs(store)

const open = ref(false)
const root = ref(null)

function toggle() {
  open.value = !open.value
  // Clear the badge only once the panel closes, so the list still shows which
  // items were unread while it's open.
  if (!open.value) store.markAllRead()
}
function close() {
  if (!open.value) return
  open.value = false
  store.markAllRead()
}
function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) close()
}

/**
 * Resolve the in-app destination for a notification from its `data` payload.
 * Everything carries `project_id`; task-level items open the board (where tasks
 * live, with the task id as a deep-link query), the rest open project detail.
 * Returns null when there's no project to go to.
 */
function targetRoute({ data = {} }) {
  const projectId = data.project_id
  if (!projectId) return null
  if (data.task_id || data.category === 'task') {
    return {
      name: 'project-board',
      params: { id: Number(projectId) },
      query: data.task_id ? { task: String(data.task_id) } : {},
    }
  }
  return { name: 'project-detail', params: { id: Number(projectId) } }
}

/** Click a notification: navigate to its target, then remove it and close. */
function onItemClick(n) {
  const to = targetRoute(n)
  store.remove(n.id)
  close()
  if (to) router.push(to)
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative">
    <!-- Bell trigger -->
    <button
      class="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      :aria-label="`Notifikasi${items.length ? `, ${items.length} item` : ''}`"
      @click.stop="toggle"
    >
      <component :is="unreadCount ? BellAlertIcon : BellIcon" class="h-5 w-5" />
      <span
        v-if="items.length"
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white"
      >
        {{ items.length > 99 ? '99+' : items.length }}
      </span>
    </button>

    <!-- Dropdown panel -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 z-40 mt-2 w-80 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-dropdown sm:w-96"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p class="text-sm font-semibold text-slate-900">Notifikasi</p>
          <button
            v-if="items.length"
            class="flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-rose-500"
            @click="store.clear()"
          >
            <TrashIcon class="h-3.5 w-3.5" />
            Bersihkan
          </button>
        </div>

        <!-- List -->
        <div class="max-h-96 overflow-y-auto">
          <div
            v-if="!items.length"
            class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center"
          >
            <BellIcon class="h-8 w-8 text-slate-300" />
            <p class="text-sm text-slate-400">Belum ada notifikasi</p>
          </div>

          <ul v-else class="divide-y divide-slate-50">
            <li
              v-for="n in items"
              :key="n.id"
              class="group relative flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-slate-50"
              :class="{ 'bg-primary-50/40': !n.read }"
              @click="onItemClick(n)"
            >
              <span
                class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                :class="n.read ? 'bg-transparent' : 'bg-primary-500'"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-800">{{ n.title }}</p>
                <p v-if="n.body" class="mt-0.5 line-clamp-2 text-xs text-slate-500">{{ n.body }}</p>
                <p class="mt-1 text-[11px] text-slate-400">{{ timeAgo(n.receivedAt) }}</p>
              </div>
              <button
                class="absolute right-2 top-2 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100"
                aria-label="Hapus notifikasi"
                @click.stop="store.remove(n.id)"
              >
                <XMarkIcon class="h-3.5 w-3.5" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>
