<script setup>
import { CubeIcon } from '@heroicons/vue/24/solid'
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-brand">
    <!-- Decorative glow blobs over the gradient field -->
    <div class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
    <div class="pointer-events-none absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl" />
    <div class="pointer-events-none absolute bottom-0 left-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

    <div
      class="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center gap-8 px-5 py-6 lg:items-stretch lg:justify-between lg:gap-12 lg:px-10 lg:pb-0"
    >
      <!-- Promo copy (desktop only) -->
      <div class="hidden max-w-md flex-1 flex-col justify-center text-white lg:flex">
        <div class="flex items-center gap-2.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <CubeIcon class="h-6 w-6" />
          </div>
          <span class="text-2xl font-bold tracking-tight">MAZTA</span>
        </div>

        <h1 class="mt-12 text-5xl font-extrabold leading-tight">Hey, Hello!</h1>
        <p class="mt-4 text-lg font-semibold text-white/90">
          Selamat datang di MAZTA Project Management System.
        </p>
        <p class="mt-3 text-sm leading-relaxed text-white/70">
          Rencanakan proyek, lacak task di papan Kanban, dan pantau progres tim — semua dalam satu
          workspace yang cepat dan rapi.
        </p>
      </div>

      <!-- White card: phone-like, floating on mobile; on desktop its bottom is
           flush to the screen edge while the top keeps a gap. -->
      <div class="w-full max-w-md lg:flex lg:w-[420px] lg:shrink-0 lg:items-end">
        <div
          class="flex w-full flex-col justify-center rounded-[2.5rem] bg-white p-8 shadow-2xl sm:p-10 lg:min-h-[90vh] lg:rounded-b-none"
        >
          <div class="mx-auto w-full max-w-sm">
            <!-- Mobile brand mark (the promo panel is hidden below lg) -->
            <div class="mb-8 flex items-center gap-3 lg:hidden">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
                <CubeIcon class="h-6 w-6" />
              </div>
              <span class="text-lg font-bold tracking-tight text-slate-900">MAZTA PMS</span>
            </div>

            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
