<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useToast } from '@/shared/composables/useToast'
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

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
      input : {
        username: form.value.username.trim(),
        password: form.value.password,
        platform : form.value.platform
      }
    })
    success(`Welcome back, ${profile.name.split(' ')[0]}!`)
    router.push(route.query.redirect || { name: 'dashboard' })
  } catch (err) {
    error(err.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
      <p class="mt-1.5 text-sm text-slate-500">Welcome back! Please enter your details.</p>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseInput
        v-model="form.username"
        label="Username"
        type="text"
        placeholder="your username"
        autocomplete="username"
        :error="errors.username"
        required
      >
        <template #prefix><UserIcon class="h-4 w-4" /></template>
      </BaseInput>

      <BaseInput
        v-model="form.password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        placeholder="••••••••"
        autocomplete="current-password"
        :error="errors.password"
        required
      >
        <template #prefix><LockClosedIcon class="h-4 w-4" /></template>
        <template #suffix>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="showPassword = !showPassword">
            <EyeSlashIcon v-if="showPassword" class="h-4 w-4" />
            <EyeIcon v-else class="h-4 w-4" />
          </button>
        </template>
      </BaseInput>

      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          Remember me
        </label>
        <a href="#" class="text-sm font-medium text-primary-600 hover:text-primary-700">Forgot password?</a>
      </div>

      <BaseButton type="submit" variant="primary" block :loading="loading">Sign in</BaseButton>
    </form>

    <p class="mt-6 text-center text-xs text-slate-400">
      Only active staff accounts can sign in.
    </p>
  </AuthLayout>
</template>
