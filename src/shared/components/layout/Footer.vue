<script setup>
const year = new Date().getFullYear()
</script>

<template>
  <footer class="flex flex-col items-center justify-between gap-2 border-t border-white/40 px-6 py-4 text-xs text-slate-400 sm:flex-row">
    <p>© {{ year }} MAZTA Farma — Project Management System</p>
    <p>v1.0.0 · Starter Template</p>
  </footer>
</template>
