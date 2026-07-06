<script setup>
import { CubeIcon } from '@heroicons/vue/24/solid'
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Brand panel (desktop) -->
    <div class="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex">
      <div class="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-2xl" />
      <div class="absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-accent-400/30 blur-3xl" />
      <div class="absolute right-10 bottom-1/3 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div class="relative flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
          <CubeIcon class="h-6 w-6" />
        </div>
        <span class="text-lg font-bold">MAZTA PROJECT MANAGEMENT SYSTEM</span>
      </div>

      <div class="relative max-w-md">
        <h2 class="text-3xl font-bold leading-tight">Manage projects with clarity.</h2>
        <p class="mt-4 text-primary-100">
          Plan projects, track tasks on a Kanban board, and monitor progress — all in one clean,
          fast workspace built for your team.
        </p>
      </div>

      <p class="relative text-sm text-primary-200">© {{ new Date().getFullYear() }} MAZTA Farma</p>
    </div>

    <!-- Form panel -->
    <div class="flex w-full items-center justify-center bg-white p-6 lg:w-1/2">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>
