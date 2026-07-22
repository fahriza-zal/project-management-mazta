<script setup>
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useUiStore } from '@/shared/stores/ui'
import {
  Bars3Icon,
  ChevronDownIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/vue/24/outline'
import Breadcrumb from './Breadcrumb.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import BaseDropdown from '@/shared/components/base/BaseDropdown.vue'
import BaseDropdownItem from '@/shared/components/base/BaseDropdownItem.vue'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/50 bg-white/55 px-4 backdrop-blur-xl lg:px-6"
  >
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

    <!-- User dropdown -->
    <BaseDropdown width="w-56" class="ml-auto">
      <template #trigger>
        <button class="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100">
          <BaseAvatar
            :name="auth.profile?.name || 'Guest'"
            :src="auth.profile?.image || ''"
            size="sm"
          />
          <span class="hidden text-sm font-medium text-slate-700 sm:block">{{
            auth.profile?.name || 'Guest'
          }}</span>
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
        <BaseDropdownItem :icon="ArrowRightOnRectangleIcon" danger @click="logout">
          Logout
        </BaseDropdownItem>
      </div>
    </BaseDropdown>
  </header>
</template>
