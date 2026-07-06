<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
    <p class="text-7xl font-extrabold text-primary-600">404</p>
    <h1 class="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
    <p class="mt-2 max-w-sm text-sm text-slate-500">
      The page you are looking for doesn’t exist or has been moved.
    </p>
    <BaseButton class="mt-6" variant="primary" @click="router.push({ name: 'dashboard' })">
      Back to Dashboard
    </BaseButton>
  </div>
</template>
