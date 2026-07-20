<script setup>
import { ref, reactive, watch } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/features/auth/stores/auth'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'success'])

const auth = useAuthStore()

const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const show = reactive({ old: false, next: false, confirm: false })
const errors = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const submitError = ref('')
const saving = ref(false)

// Reset everything whenever the modal is (re)opened.
watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  },
)

function reset() {
  form.oldPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  show.old = show.next = show.confirm = false
  errors.oldPassword = errors.newPassword = errors.confirmPassword = ''
  submitError.value = ''
  saving.value = false
}

function close() {
  emit('update:modelValue', false)
}

function validate() {
  errors.oldPassword = form.oldPassword ? '' : 'Password lama wajib diisi.'
  errors.newPassword = !form.newPassword
    ? 'Password baru wajib diisi.'
    : form.newPassword.length < 8
      ? 'Password baru minimal 8 karakter.'
      : form.newPassword === form.oldPassword
        ? 'Password baru harus berbeda dari password lama.'
        : ''
  errors.confirmPassword =
    form.confirmPassword !== form.newPassword ? 'Konfirmasi password tidak cocok.' : ''
  return !errors.oldPassword && !errors.newPassword && !errors.confirmPassword
}

async function submit() {
  submitError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    // On success the store re-seats the session with the fresh token — the user
    // stays signed in, so we just close and notify the parent.
    await auth.changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    })
    emit('success')
    close()
  } catch (err) {
    submitError.value = err?.message || 'Gagal mengubah password. Coba lagi.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Ubah Password"
    subtitle="Masukkan password lama dan password baru Anda."
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <BaseInput
        v-model="form.oldPassword"
        label="Password Lama"
        :type="show.old ? 'text' : 'password'"
        placeholder="Masukkan password lama"
        required
        :error="errors.oldPassword"
        autocomplete="current-password"
      >
        <template #suffix>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600"
            @click="show.old = !show.old"
          >
            <EyeSlashIcon v-if="show.old" class="h-5 w-5" />
            <EyeIcon v-else class="h-5 w-5" />
          </button>
        </template>
      </BaseInput>

      <BaseInput
        v-model="form.newPassword"
        label="Password Baru"
        :type="show.next ? 'text' : 'password'"
        placeholder="Minimal 8 karakter"
        required
        :error="errors.newPassword"
        hint="Gunakan minimal 8 karakter."
        autocomplete="new-password"
      >
        <template #suffix>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600"
            @click="show.next = !show.next"
          >
            <EyeSlashIcon v-if="show.next" class="h-5 w-5" />
            <EyeIcon v-else class="h-5 w-5" />
          </button>
        </template>
      </BaseInput>

      <BaseInput
        v-model="form.confirmPassword"
        label="Konfirmasi Password Baru"
        :type="show.confirm ? 'text' : 'password'"
        placeholder="Ulangi password baru"
        required
        :error="errors.confirmPassword"
        autocomplete="new-password"
      >
        <template #suffix>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600"
            @click="show.confirm = !show.confirm"
          >
            <EyeSlashIcon v-if="show.confirm" class="h-5 w-5" />
            <EyeIcon v-else class="h-5 w-5" />
          </button>
        </template>
      </BaseInput>

      <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ submitError }}
      </p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" :disabled="saving" @click="close">Batal</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="submit">Ubah Password</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
