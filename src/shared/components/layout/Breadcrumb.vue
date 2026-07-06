<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { HomeIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const route = useRoute()

// Breadcrumb labels come from route meta; the first crumb links home.
const crumbs = computed(() => route.meta.breadcrumb || [])
</script>

<template>
  <nav class="flex items-center gap-1.5 text-sm text-slate-500">
    <RouterLink :to="{ name: 'dashboard' }" class="flex items-center gap-1.5 hover:text-slate-700">
      <HomeIcon class="h-4 w-4" />
    </RouterLink>
    <template v-for="(crumb, i) in crumbs" :key="i">
      <ChevronRightIcon class="h-4 w-4 text-slate-300" />
      <span :class="i === crumbs.length - 1 ? 'font-medium text-slate-700' : ''">{{ crumb }}</span>
    </template>
  </nav>
</template>
