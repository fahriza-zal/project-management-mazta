<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/shared/stores/ui'
import { useAuthStore } from '@/features/auth/stores/auth'
import { SIDEBAR_NAV } from '@/shared/constants/navigation'
import { ArrowRightOnRectangleIcon, ChevronLeftIcon, CubeIcon } from '@heroicons/vue/24/outline'
import BaseTooltip from '@/shared/components/base/BaseTooltip.vue'

defineProps({
  // When true the sidebar renders in its mobile (always-expanded) form.
  mobile: { type: Boolean, default: false },
})
const emit = defineEmits(['logout', 'navigate'])

const ui = useUiStore()
const { sidebarCollapsed } = storeToRefs(ui)
const auth = useAuthStore()
const route = useRoute()

/**
 * Nav filtered by permission: keep an item when it has no `permissions` or the
 * user can run ANY of them (hide only when none of the feature's queries are
 * allowed), then drop any group left with no items so its header doesn't render.
 */
const navGroups = computed(() =>
  SIDEBAR_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permissions || auth.can(item.permissions)),
  })).filter((group) => group.items.length > 0),
)

/**
 * Whether a nav item should render as active.
 * Detail/edit/board routes (e.g. /transaction/project/:id) are siblings of the
 * list route in the router — not nested — so RouterLink's `isActive` is false on
 * them and the parent menu de-highlights. Treat any path *under* the item's path
 * as active too. Dashboard ('/') stays exact-match so it doesn't win everywhere.
 */
function itemActive(item, href, isActive, isExactActive) {
  if (item.to.name === 'dashboard') return isExactActive
  return isActive || route.path === href || route.path.startsWith(href + '/')
}
</script>

<template>
  <aside
    class="flex h-full flex-col border-r border-white/50 bg-white/60 backdrop-blur-xl transition-[width] duration-200"
    :class="!mobile && sidebarCollapsed ? 'w-20' : 'w-64'"
  >
    <!-- Brand -->
    <div class="flex h-16 items-center gap-2.5 border-b border-white/50 px-5">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-glow"
      >
        <CubeIcon class="h-5 w-5" />
      </div>
      <div v-if="mobile || !sidebarCollapsed" class="overflow-hidden">
        <p class="truncate text-sm font-bold text-gradient">MAZTA PM</p>
        <p class="truncate text-[11px] text-slate-400">Project Management</p>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto py-4">
      <div
        v-for="(group, gi) in navGroups"
        :key="gi"
        class="space-y-1"
        :class="gi > 0 ? 'mt-6' : ''"
      >
        <!-- Group header (hidden when collapsed; falls back to a divider) -->
        <p
          v-if="group.title && (mobile || !sidebarCollapsed)"
          class="px-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
        >
          {{ group.title }}
        </p>
        <div v-else-if="group.title" class="mx-5 mb-1 border-t border-slate-100" />

        <BaseTooltip
          v-for="item in group.items"
          :key="item.name"
          :text="!mobile && sidebarCollapsed ? item.name : ''"
          position="right"
          class="w-full"
        >
          <!--
            Use a custom RouterLink so the index route ('/') matches exactly,
            while nested routes (e.g. /projects/:id) keep their parent active.
          -->
          <RouterLink :to="item.to" custom v-slot="{ href, navigate, isActive, isExactActive }">
            <a
              :href="href"
              class="group flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
              :class="[
                itemActive(item, href, isActive, isExactActive)
                  ? 'mx-2 rounded-xl bg-brand text-white shadow-glow'
                  : 'mx-2 rounded-xl text-slate-600 hover:bg-white/70 hover:text-slate-900',
                !mobile && sidebarCollapsed ? 'justify-center' : '',
              ]"
              @click="
                (e) => {
                  navigate(e)
                  emit('navigate')
                }
              "
            >
              <component :is="item.icon" class="h-5 w-5 shrink-0" />
              <span v-if="mobile || !sidebarCollapsed" class="truncate whitespace-nowrap">{{
                item.name
              }}</span>
            </a>
          </RouterLink>
        </BaseTooltip>
      </div>
    </nav>

    <!-- Footer actions -->
    <div class="border-t border-slate-100 p-3">
      <button
        v-if="!mobile"
        class="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-100"
        :class="sidebarCollapsed ? 'justify-center' : ''"
        @click="ui.toggleSidebar()"
      >
        <ChevronLeftIcon
          class="h-5 w-5 shrink-0 transition-transform"
          :class="sidebarCollapsed ? 'rotate-180' : ''"
        />
        <span v-if="!sidebarCollapsed">Collapse</span>
      </button>
    </div>
  </aside>
</template>
