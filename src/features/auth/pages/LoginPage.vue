<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useToast } from '@/shared/composables/useToast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { CubeIcon } from '@heroicons/vue/24/solid'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { success, error } = useToast()

const form = ref({ username: '', password: '', platform: 'EMPLOYEE' })
const errors = ref({})
const showPassword = ref(false)
const loading = ref(false)

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

// Visual-only actions from the template — staff-only internal app, no self-signup
// or social sign-on, so these just inform the user.
function notAvailable() {
  error('Fitur ini belum tersedia. Silakan masuk dengan username & password.')
}
</script>

<template>
  <AuthLayout>
    <!-- Logo -->
    <div class="mb-6 flex items-center justify-center gap-2">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white shadow-glow">
        <CubeIcon class="h-5 w-5" />
      </div>
    </div>

    <h2 class="mb-5 text-center text-xl font-bold text-slate-800">Sign in to your account</h2>

    <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl sm:p-7">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <BaseInput
          v-model="form.username"
          label="Username"
          type="text"
          placeholder="your username"
          autocomplete="username"
          :error="errors.username"
        />

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-sm font-medium text-slate-700">Password</label>
          </div>
          <BaseInput
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            autocomplete="current-password"
            :error="errors.password"
          >
            <template #suffix>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600"
                @click="showPassword = !showPassword"
              >
                <EyeSlashIcon v-if="showPassword" class="h-4 w-4" />
                <EyeIcon v-else class="h-4 w-4" />
              </button>
            </template>
          </BaseInput>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="bg-brand flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-white shadow-glow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span
            v-if="loading"
            class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
          <span v-else>Sign in</span>
        </button>
      </form>
    </div>
  </AuthLayout>
</template>
