<script setup>
import {
  Squares2X2Icon,
  ViewColumnsIcon,
  ChartBarSquareIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/vue/24/outline'

const features = [
  'Kelola project & milestone',
  'Papan Kanban drag & drop',
  'Dashboard & timeline real-time',
  'Timesheet & approval bertingkat',
  'Akses terkontrol per-unit',
]

const chips = [Squares2X2Icon, ViewColumnsIcon, ChartBarSquareIcon, ClockIcon, ShieldCheckIcon]
</script>

<template>
  <div class="relative min-h-screen w-full overflow-hidden bg-slate-50">
    <!-- Desktop: diagonal brand panel -->
    <div
      class="absolute inset-y-0 left-0 hidden bg-brand lg:block lg:w-[55%]"
      style="clip-path: polygon(0 0, 100% 0, 76% 100%, 0 100%)"
    >
      <!-- soft glow accents -->
      <div class="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div class="pointer-events-none absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-accent-400/20 blur-3xl" />
    </div>

    <!-- Promo copy (over the diagonal panel) -->
    <div
      class="absolute inset-y-0 left-0 hidden w-[42%] flex-col justify-center px-12 text-white lg:flex xl:px-16"
    >
      <p class="text-xs font-semibold tracking-[0.35em] text-white/70">MAZTA PM</p>
      <h1 class="mt-2 text-4xl font-extrabold leading-tight xl:text-5xl">
        PROJECT<br />MANAGEMENT
      </h1>

      <span
        class="mt-7 inline-block self-start rounded-md bg-white/15 px-4 py-2 text-xs font-bold tracking-[0.3em] ring-1 ring-white/20"
      >
        KEY FEATURES
      </span>

      <ul class="mt-6 space-y-2.5 text-sm font-medium text-white/90">
        <li v-for="f in features" :key="f" class="flex items-center gap-2">
          <span class="text-white/60">—</span>{{ f }}
        </li>
      </ul>

      <div class="mt-9 flex gap-3">
        <div
          v-for="(icon, i) in chips"
          :key="i"
          class="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary-600 shadow-md"
        >
          <component :is="icon" class="h-5 w-5" />
        </div>
      </div>
    </div>

    <!-- Form area (right) -->
    <div
      class="relative flex min-h-screen w-full items-center justify-center p-6 lg:ml-auto lg:w-[45%] lg:p-10"
    >
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </div>
  </div>
</template>
