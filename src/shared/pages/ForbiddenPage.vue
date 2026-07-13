<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
    <p class="text-7xl font-extrabold text-primary-600">403</p>
    <h1 class="mt-4 text-2xl font-bold text-slate-900">Anda tidak punya akses</h1>
    <p class="mt-2 max-w-sm text-sm text-slate-500">
      Anda tidak memiliki izin untuk membuka halaman ini. Hubungi administrator jika ini keliru.
    </p>
    <BaseButton class="mt-6" variant="primary" @click="router.push({ name: 'dashboard' })">
      Kembali ke Dashboard
    </BaseButton>
  </div>
</template>
