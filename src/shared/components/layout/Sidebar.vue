<script setup>
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/shared/stores/ui'
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
</script>

<template>
  <aside
    class="flex h-full flex-col border-r border-white/50 bg-white/60 backdrop-blur-xl transition-[width] duration-200"
    :class="!mobile && sidebarCollapsed ? 'w-20' : 'w-64'"
  >
    <!-- Brand -->
    <div class="flex h-16 items-center gap-2.5 border-b border-white/50 px-5">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-glow">
        <CubeIcon class="h-5 w-5" />
      </div>
      <div v-if="mobile || !sidebarCollapsed" class="overflow-hidden">
        <p class="truncate text-sm font-bold text-gradient">MAZTA PM</p>
        <p class="truncate text-[11px] text-slate-400">Project Management</p>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto py-4">
      <div v-for="(group, gi) in SIDEBAR_NAV" :key="gi" class="space-y-1" :class="gi > 0 ? 'mt-6' : ''">
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
                (item.to.name === 'dashboard' ? isExactActive : isActive)
                  ? 'mx-2 rounded-xl bg-brand text-white shadow-glow'
                  : 'mx-2 rounded-xl text-slate-600 hover:bg-white/70 hover:text-slate-900',
                !mobile && sidebarCollapsed ? 'justify-center' : '',
              ]"
              @click="(e) => { navigate(e); emit('navigate') }"
            >
              <component :is="item.icon" class="h-5 w-5 shrink-0" />
              <span v-if="mobile || !sidebarCollapsed" class="truncate whitespace-nowrap">{{ item.name }}</span>
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
        <ChevronLeftIcon class="h-5 w-5 shrink-0 transition-transform" :class="sidebarCollapsed ? 'rotate-180' : ''" />
        <span v-if="!sidebarCollapsed">Collapse</span>
      </button>
    </div>
  </aside>
</template>
