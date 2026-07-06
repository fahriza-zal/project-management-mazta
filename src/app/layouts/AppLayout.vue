<script setup>
import { useRouter, RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useUiStore } from '@/shared/stores/ui'
import Sidebar from '@/shared/components/layout/Sidebar.vue'
import Navbar from '@/shared/components/layout/Navbar.vue'
import Footer from '@/shared/components/layout/Footer.vue'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const { mobileSidebarOpen } = storeToRefs(ui)

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="relative flex h-screen overflow-hidden">
    <!-- Decorative blurred blobs for gradient depth (non-interactive) -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary-400/30 blur-3xl" />
      <div class="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
      <div class="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
    </div>

    <!-- Desktop sidebar -->
    <div class="hidden lg:block">
      <Sidebar @logout="logout" />
    </div>

    <!-- Mobile sidebar drawer -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="mobileSidebarOpen" class="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" @click="ui.closeMobileSidebar()" />
    </Transition>
    <Transition
      enter-active-class="transition-transform duration-200"
      enter-from-class="-translate-x-full"
      leave-active-class="transition-transform duration-150"
      leave-to-class="-translate-x-full"
    >
      <div v-if="mobileSidebarOpen" class="fixed inset-y-0 left-0 z-50 lg:hidden">
        <Sidebar mobile @logout="logout" @navigate="ui.closeMobileSidebar()" />
      </div>
    </Transition>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <Navbar />
      <main class="flex-1 overflow-y-auto bg-transparent">
        <div class="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <RouterView v-slot="{ Component }">
            <Transition
              mode="out-in"
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 translate-y-1"
              leave-active-class="transition duration-100 ease-in"
              leave-to-class="opacity-0"
            >
              <component :is="Component" />
            </Transition>
          </RouterView>
        </div>
        <Footer />
      </main>
    </div>
  </div>
</template>
