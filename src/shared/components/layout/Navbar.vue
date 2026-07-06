<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useUiStore } from '@/shared/stores/ui'
import {
  MagnifyingGlassIcon,
  BellIcon,
  Bars3Icon,
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/vue/24/outline'
import Breadcrumb from './Breadcrumb.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import BaseDropdown from '@/shared/components/base/BaseDropdown.vue'
import BaseDropdownItem from '@/shared/components/base/BaseDropdownItem.vue'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const search = ref('')

// Dummy notifications.
const notifications = [
  { id: 1, text: 'Citra completed “Setup database schema”', time: '2h ago' },
  { id: 2, text: 'New task assigned in Procurement Automation', time: '5h ago' },
  { id: 3, text: 'Website Revamp deadline is approaching', time: '1d ago' },
]

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/50 bg-white/55 px-4 backdrop-blur-xl lg:px-6">
    <!-- Mobile sidebar toggle -->
    <button
      class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      @click="ui.openMobileSidebar()"
    >
      <Bars3Icon class="h-5 w-5" />
    </button>

    <div class="hidden lg:block">
      <Breadcrumb />
    </div>

    <!-- Search -->
    <div class="relative ml-auto w-full max-w-xs">
      <MagnifyingGlassIcon class="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
      <input
        v-model="search"
        type="text"
        placeholder="Search project…"
        class="h-9 w-full rounded-xl border border-white/60 bg-white/60 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 backdrop-blur focus-ring"
      />
    </div>

    <!-- Notifications -->
    <BaseDropdown width="w-80">
      <template #trigger>
        <button class="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100">
          <BellIcon class="h-5 w-5" />
          <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
        </button>
      </template>

      <div class="px-2 py-1.5">
        <p class="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Notifications</p>
        <div class="space-y-0.5">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="rounded-lg px-2 py-2 hover:bg-slate-50"
          >
            <p class="text-sm text-slate-700">{{ n.text }}</p>
            <p class="text-[11px] text-slate-400">{{ n.time }}</p>
          </div>
        </div>
      </div>
    </BaseDropdown>

    <!-- User dropdown -->
    <BaseDropdown width="w-56">
      <template #trigger>
        <button class="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100">
          <BaseAvatar :name="auth.profile?.name || 'Guest'" size="sm" />
          <span class="hidden text-sm font-medium text-slate-700 sm:block">{{ auth.profile?.name || 'Guest' }}</span>
          <ChevronDownIcon class="hidden h-4 w-4 text-slate-400 sm:block" />
        </button>
      </template>

      <div class="border-b border-slate-100 px-3 py-2.5">
        <p class="truncate text-sm font-semibold text-slate-900">{{ auth.profile?.name }}</p>
        <p class="truncate text-xs text-slate-400">{{ auth.profile?.role }}</p>
      </div>
      <div class="py-1">
        <RouterLink :to="{ name: 'profile' }">
          <BaseDropdownItem :icon="UserCircleIcon">Profile</BaseDropdownItem>
        </RouterLink>
        <RouterLink :to="{ name: 'settings' }">
          <BaseDropdownItem :icon="Cog6ToothIcon">Settings</BaseDropdownItem>
        </RouterLink>
        <BaseDropdownItem :icon="ArrowRightOnRectangleIcon" danger @click="logout">
          Logout
        </BaseDropdownItem>
      </div>
    </BaseDropdown>
  </header>
</template>
