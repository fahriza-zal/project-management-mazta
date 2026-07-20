<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useAccountStore } from '@/features/account/stores/account'
import {
  IdentificationIcon,
  BuildingOffice2Icon,
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  RectangleStackIcon,
  KeyIcon,
  FolderIcon,
} from '@heroicons/vue/24/outline'
import BaseCard from '@/shared/components/base/BaseCard.vue'
import BaseAvatar from '@/shared/components/base/BaseAvatar.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseEmpty from '@/shared/components/base/BaseEmpty.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import ChangePasswordModal from '@/features/account/components/ChangePasswordModal.vue'
import { useToast } from '@/shared/composables/useToast'

const auth = useAuthStore()
const accountStore = useAccountStore()
const { employee, loading, error } = storeToRefs(accountStore)
const { success } = useToast()

const showChangePassword = ref(false)

const employeeId = computed(() => auth.employee?.id ?? auth.profile?.id)

onMounted(() => {
  if (employeeId.value != null) accountStore.fetchEmployee(employeeId.value)
})

// Priority (lowercase from the API) → badge color, case-insensitive.
const PRIORITY_COLOR = { low: 'slate', medium: 'info', high: 'warning', critical: 'danger' }
function priorityColor(p) {
  return PRIORITY_COLOR[String(p || '').toLowerCase()] ?? 'slate'
}

// Flatten availableTasks into a friendly shape. `task` is a union: a Task
// (PROJECT — carries milestone.project) or a DefaultTask (COMMON — id/title only).
const tasks = computed(() =>
  (employee.value?.availableTasks ?? []).map((a) => {
    const project = a.task?.milestone?.project ?? null
    return {
      id: a.task?.id,
      title: a.task?.title ?? '—',
      priority: a.priority,
      category: a.category,
      projectId: project?.id ?? null,
      projectName: project?.name ?? '',
    }
  }),
)

// Distinct projects the employee is involved in (from PROJECT tasks).
const projectCount = computed(() => {
  const ids = new Set()
  for (const t of tasks.value) if (t.projectId != null) ids.add(t.projectId)
  return ids.size
})

const children = computed(() => employee.value?.childrens ?? [])
const units = computed(() => employee.value?.units ?? [])
const companies = computed(() => employee.value?.companies ?? [])

// Identity rows for the details card — only render those with a value.
const details = computed(() => {
  const e = employee.value
  if (!e) return []
  return [
    { label: 'NIK', value: e.nik, icon: IdentificationIcon },
    { label: 'Level', value: e.level?.name, icon: RectangleStackIcon },
    {
      label: 'Perusahaan',
      value: companies.value.map((c) => c.name).join(', '),
      icon: BuildingOfficeIcon,
    },
    { label: 'Cabang', value: e.branch?.name, icon: MapPinIcon },
    { label: 'Unit', value: units.value.map((u) => u.name).join(', '), icon: BuildingOffice2Icon },
  ].filter((d) => d.value)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <BaseCard v-if="loading && !employee">
      <div class="animate-pulse space-y-4">
        <div class="flex items-center gap-4">
          <div class="h-20 w-20 rounded-full bg-slate-200" />
          <div class="flex-1 space-y-2">
            <div class="h-5 w-40 rounded bg-slate-200" />
            <div class="h-4 w-24 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Error -->
    <BaseCard v-else-if="error && !employee">
      <p class="py-6 text-center text-sm text-red-500">{{ error }}</p>
    </BaseCard>

    <template v-else-if="employee">
      <!-- Profile header -->
      <BaseCard>
        <div class="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <BaseAvatar
            :name="employee.fullName || 'Employee'"
            :src="employee.image || ''"
            size="lg"
            class="!h-20 !w-20 !text-2xl"
          />
          <div class="min-w-0 flex-1">
            <h1 class="text-xl font-bold text-slate-900">{{ employee.fullName }}</h1>
            <div class="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <BaseBadge v-if="employee.level?.name" color="primary" dot>
                {{ employee.level.name }}
              </BaseBadge>
              <BaseBadge v-if="employee.nik" color="slate">NIK {{ employee.nik }}</BaseBadge>
              <BaseBadge v-if="employee.branch?.name" color="info">
                {{ employee.branch.name }}
              </BaseBadge>
            </div>
            <p v-if="units.length" class="mt-2 text-sm text-slate-500">
              {{ units.map((u) => u.name).join(' · ') }}
            </p>
          </div>
          <div class="shrink-0 sm:self-start">
            <BaseButton variant="outline" @click="showChangePassword = true">
              <KeyIcon class="h-4 w-4" />
              Ubah Password
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <!-- Quick stats -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <BaseCard>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
            >
              <FolderIcon class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xl font-bold text-slate-900">{{ projectCount }}</p>
              <p class="text-xs text-slate-500">Projek</p>
            </div>
          </div>
        </BaseCard>
        <BaseCard>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600"
            >
              <ClipboardDocumentListIcon class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xl font-bold text-slate-900">{{ tasks.length }}</p>
              <p class="text-xs text-slate-500">Task Tersedia</p>
            </div>
          </div>
        </BaseCard>
        <BaseCard>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
            >
              <UsersIcon class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xl font-bold text-slate-900">{{ children.length }}</p>
              <p class="text-xs text-slate-500">Anggota Tim</p>
            </div>
          </div>
        </BaseCard>
        <BaseCard>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
            >
              <BuildingOffice2Icon class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xl font-bold text-slate-900">{{ units.length }}</p>
              <p class="text-xs text-slate-500">Unit</p>
            </div>
          </div>
        </BaseCard>
        <BaseCard>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600"
            >
              <BuildingOfficeIcon class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xl font-bold text-slate-900">{{ companies.length }}</p>
              <p class="text-xs text-slate-500">Perusahaan</p>
            </div>
          </div>
        </BaseCard>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Identity details -->
        <BaseCard class="lg:col-span-1">
          <h2 class="text-subheading mb-4">Informasi</h2>
          <dl class="space-y-4">
            <div v-for="d in details" :key="d.label" class="flex items-start gap-3">
              <component :is="d.icon" class="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div class="min-w-0">
                <dt class="text-xs text-slate-400">{{ d.label }}</dt>
                <dd class="text-sm font-medium text-slate-700">{{ d.value }}</dd>
              </div>
            </div>
          </dl>
        </BaseCard>

        <!-- Available tasks -->
        <BaseCard class="lg:col-span-2">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-subheading">Task Tersedia</h2>
            <BaseBadge color="slate" size="sm">{{ tasks.length }}</BaseBadge>
          </div>
          <ul v-if="tasks.length" class="divide-y divide-slate-100">
            <li
              v-for="t in tasks"
              :key="t.category + '-' + t.id"
              class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"
              >
                <ClipboardDocumentListIcon class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-700" :title="t.title">
                  {{ t.title }}
                </p>
                <p
                  v-if="t.projectName"
                  class="flex items-center gap-1 truncate text-xs text-slate-400"
                  :title="t.projectName"
                >
                  <FolderIcon class="h-3 w-3 shrink-0" />
                  {{ t.projectName }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <BaseBadge v-if="t.priority" :color="priorityColor(t.priority)" size="sm" dot>
                  {{ t.priority }}
                </BaseBadge>
                <BaseBadge v-if="t.category" color="slate" size="sm">{{ t.category }}</BaseBadge>
              </div>
            </li>
          </ul>
          <BaseEmpty
            v-else
            :icon="ClipboardDocumentListIcon"
            title="Belum ada task"
            description="Tidak ada task yang tersedia untuk Anda saat ini."
          />
        </BaseCard>
      </div>

      <!-- Team (direct reports) -->
      <BaseCard>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-subheading">Anggota Tim</h2>
          <BaseBadge color="slate" size="sm">{{ children.length }}</BaseBadge>
        </div>
        <div v-if="children.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="c in children"
            :key="c.id"
            class="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
          >
            <BaseAvatar :name="c.fullName" size="sm" />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-700">{{ c.fullName }}</p>
            </div>
          </div>
        </div>
        <BaseEmpty
          v-else
          :icon="UsersIcon"
          title="Belum ada anggota tim"
          description="Anda belum membawahi karyawan lain."
        />
      </BaseCard>
    </template>

    <ChangePasswordModal
      v-model="showChangePassword"
      @success="success('Password berhasil diubah.')"
    />
  </div>
</template>
