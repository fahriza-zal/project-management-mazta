<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useToast } from '@/shared/composables/useToast'
import { UserCircleIcon, LockClosedIcon, AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'

const auth = useAuthStore()
const { success } = useToast()

const tabs = [
  { key: 'profile', label: 'Profile', icon: UserCircleIcon },
  { key: 'password', label: 'Change Password', icon: LockClosedIcon },
  { key: 'preferences', label: 'Preferences', icon: AdjustmentsHorizontalIcon },
]
const active = ref('profile')

const profile = ref({
  name: auth.profile?.name || '',
  username: auth.profile?.username || '',
  role: auth.profile?.role || '',
})

const password = ref({ current: '', next: '', confirm: '' })

const prefs = ref({
  emailNotifications: true,
  desktopNotifications: false,
  weeklyDigest: true,
  compactMode: false,
})

function save(label) {
  success(`${label} saved`)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-heading">Settings</h1>
      <p class="text-body mt-1">Manage your account settings and preferences.</p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <!-- Tabs -->
      <nav class="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition"
          :class="
            active === t.key
              ? 'bg-primary-50 text-primary-700'
              : 'text-slate-600 hover:bg-slate-100'
          "
          @click="active = t.key"
        >
          <component :is="t.icon" class="h-5 w-5" />
          {{ t.label }}
        </button>
      </nav>

      <!-- Panels -->
      <div class="lg:col-span-3">
        <!-- Profile -->
        <BaseCard v-if="active === 'profile'" title="Profile" subtitle="Update your personal information">
          <div class="mb-6 flex items-center gap-4">
            <BaseAvatar :name="profile.name" size="lg" />
            <div>
              <BaseButton variant="outline" size="sm">Change Photo</BaseButton>
              <p class="mt-1.5 text-xs text-slate-400">JPG or PNG. Max 1MB.</p>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput v-model="profile.name" label="Full Name" />
            <BaseInput v-model="profile.username" label="Username" disabled hint="Username cannot be changed" />
            <BaseInput v-model="profile.role" label="Role" disabled hint="Role is managed by your admin" />
          </div>
          <template #footer>
            <div class="flex justify-end">
              <BaseButton variant="primary" @click="save('Profile')">Save Changes</BaseButton>
            </div>
          </template>
        </BaseCard>

        <!-- Password -->
        <BaseCard v-else-if="active === 'password'" title="Change Password" subtitle="Use a strong, unique password">
          <div class="grid max-w-md grid-cols-1 gap-4">
            <BaseInput v-model="password.current" label="Current Password" type="password" />
            <BaseInput v-model="password.next" label="New Password" type="password" hint="At least 8 characters" />
            <BaseInput v-model="password.confirm" label="Confirm New Password" type="password" />
          </div>
          <template #footer>
            <div class="flex justify-end">
              <BaseButton variant="primary" @click="save('Password')">Update Password</BaseButton>
            </div>
          </template>
        </BaseCard>

        <!-- Preferences -->
        <BaseCard v-else title="Preferences" subtitle="Control how the app behaves">
          <ul class="divide-y divide-slate-100">
            <li
              v-for="(item, key) in {
                emailNotifications: 'Email notifications',
                desktopNotifications: 'Desktop notifications',
                weeklyDigest: 'Weekly summary email',
                compactMode: 'Compact interface',
              }"
              :key="key"
              class="flex items-center justify-between py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p class="text-sm font-medium text-slate-800">{{ item }}</p>
                <p class="text-xs text-slate-400">Toggle this preference on or off.</p>
              </div>
              <button
                class="relative h-6 w-11 rounded-full transition"
                :class="prefs[key] ? 'bg-primary-600' : 'bg-slate-200'"
                @click="prefs[key] = !prefs[key]"
              >
                <span
                  class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                  :class="prefs[key] ? 'left-[22px]' : 'left-0.5'"
                />
              </button>
            </li>
          </ul>
          <template #footer>
            <div class="flex justify-end">
              <BaseButton variant="primary" @click="save('Preferences')">Save Preferences</BaseButton>
            </div>
          </template>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
