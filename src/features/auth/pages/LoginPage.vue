<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useToast } from '@/shared/composables/useToast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import AuthLayout from '@/app/layouts/AuthLayout.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { success, error } = useToast()

const form = ref({ username: '', password: '', platform: 'EMPLOYEE' })
const errors = ref({})
const showPassword = ref(false)
const loading = ref(false)

// Shared pill-input styling; error state swaps the border/ring to danger.
function fieldClass(hasError) {
  return [
    'h-12 w-full rounded-full border bg-slate-50 px-5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:bg-white focus:outline-none focus:ring-2',
    hasError
      ? 'border-danger focus:border-danger focus:ring-danger/25'
      : 'border-slate-200 focus:border-primary-400 focus:ring-primary-500/30',
  ]
}
const usernameClass = computed(() => fieldClass(!!errors.value.username))
const passwordClass = computed(() => fieldClass(!!errors.value.password))

function validate() {
  const e = {}
  if (!form.value.username.trim()) e.username = 'Username is required'
  if (!form.value.password) e.password = 'Password is required'
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    const profile = await auth.login({
      input: {
        username: form.value.username.trim(),
        password: form.value.password,
        platform: form.value.platform,
      },
    })
    success(`Welcome back, ${profile.name.split(' ')[0]}!`)
    router.push(route.query.redirect || { name: 'dashboard' })
  } catch (err) {
    error(err.message)
  } finally {
    loading.value = false
  }
}

// Visual-only actions from the template — this is a staff-only internal app with
// no self-signup or social sign-on, so these just inform the user.
function notAvailable() {
  error('Fitur ini belum tersedia. Silakan masuk dengan username & password.')
}
</script>

<template>
  <AuthLayout>
    <!-- Heading -->
    <div class="text-center">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
      <p class="mt-2 text-sm text-slate-500">Masuk untuk melanjutkan ke workspace Anda.</p>
    </div>

    <form class="mt-7 space-y-4" @submit.prevent="onSubmit">
      <!-- Username -->
      <div>
        <input
          v-model="form.username"
          type="text"
          placeholder="Username"
          autocomplete="username"
          :class="usernameClass"
        />
        <p v-if="errors.username" class="mt-1.5 px-3 text-xs text-danger">{{ errors.username }}</p>
      </div>

      <!-- Password -->
      <div>
        <div class="relative">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Password"
            autocomplete="current-password"
            :class="[passwordClass, 'pr-12']"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
            @click="showPassword = !showPassword"
          >
            <EyeSlashIcon v-if="showPassword" class="h-5 w-5" />
            <EyeIcon v-else class="h-5 w-5" />
          </button>
        </div>
        <p v-if="errors.password" class="mt-1.5 px-3 text-xs text-danger">{{ errors.password }}</p>
      </div>

      <!-- Forgot password -->
      <div class="flex justify-end">
        <a
          href="#"
          class="text-sm font-medium text-primary-600 hover:text-primary-700"
          @click.prevent="notAvailable"
        >
          Forgot Password?
        </a>
      </div>

      <!-- Login -->
      <button
        type="submit"
        :disabled="loading"
        class="bg-brand flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white shadow-glow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span
          v-if="loading"
          class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
        <span v-else>Login</span>
      </button>
    </form>

    <!-- Sign up -->
    <p class="mt-6 text-center text-sm text-slate-500">
      Don't have an account?
      <a
        href="#"
        class="font-semibold text-primary-600 hover:text-primary-700"
        @click.prevent="notAvailable"
      >
        Sign Up
      </a>
    </p>
  </AuthLayout>
</template>
