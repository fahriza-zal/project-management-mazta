<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  padded: { type: Boolean, default: true },
  hoverable: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="surface"
    :class="hoverable ? 'transition hover:shadow-card-hover hover:-translate-y-0.5' : ''"
  >
    <div
      v-if="title || subtitle || $slots.header || $slots.actions"
      class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"
    >
      <div v-if="$slots.header"><slot name="header" /></div>
      <div v-else>
        <h3 class="text-subheading">{{ title }}</h3>
        <p v-if="subtitle" class="text-caption mt-0.5">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="shrink-0"><slot name="actions" /></div>
    </div>

    <div :class="padded ? 'p-5' : ''">
      <slot />
    </div>

    <div v-if="$slots.footer" class="border-t border-slate-100 px-5 py-4">
      <slot name="footer" />
    </div>
  </div>
</template>
