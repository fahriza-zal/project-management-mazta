<script setup>
/**
 * Lightweight table. Pass `columns` ([{ key, label, align, width }]) and `rows`.
 * Use the `cell-<key>` slot to customize a column, or `row-actions` for a trailing actions cell.
 */
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  hoverable: { type: Boolean, default: true },
  // `fixed` lays the table out with `table-fixed` so all columns share the
  // available width and never overflow into a horizontal scroll. Give columns
  // `width` hints and let cell content truncate/compact itself.
  fixed: { type: Boolean, default: false },
  // Width of the trailing actions column (only meaningful with `fixed`).
  actionsWidth: { type: String, default: null },
  // Minimum table width (e.g. "900px"). When set, the table keeps this width and
  // the wrapper scrolls horizontally on narrow screens instead of crushing the
  // columns — the mobile-friendly escape hatch for wide `fixed` tables.
  minWidth: { type: String, default: null },
  // Like `minWidth`, but only applies below the `sm` breakpoint (< 640px). On
  // desktop the `table-fixed` layout fills the container with no horizontal
  // scroll; on mobile the min-width kicks in so wide tables scroll instead of
  // crushing their columns. Pair with `fixed`.
  mobileMinWidth: { type: String, default: null },
})
defineEmits(['row-click'])
</script>

<template>
  <div
    :class="
      mobileMinWidth
        ? 'overflow-x-auto sm:overflow-x-visible'
        : fixed && !minWidth
          ? ''
          : 'overflow-x-auto'
    "
  >
    <table
      class="w-full border-collapse text-left text-sm"
      :class="[fixed ? 'table-fixed' : '', mobileMinWidth ? 'mobile-min-w' : '']"
      :style="[minWidth ? { minWidth } : null, mobileMinWidth ? { '--mobile-min-w': mobileMinWidth } : null]"
    >
      <thead>
        <tr class="border-b border-slate-200">
          <th
            v-for="col in columns"
            :key="col.key"
            class="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400"
            :class="[
              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
            ]"
            :style="col.width ? { width: col.width } : null"
          >
            {{ col.label }}
          </th>
          <th
            v-if="$slots['row-actions']"
            class="px-4 py-3"
            :style="actionsWidth ? { width: actionsWidth } : null"
          />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row[rowKey]"
          class="border-b border-slate-100 last:border-0"
          :class="hoverable ? 'cursor-pointer hover:bg-slate-50' : ''"
          @click="$emit('row-click', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 align-middle text-slate-700"
            :class="[
              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
            ]"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
          <td v-if="$slots['row-actions']" class="px-4 py-3 text-right" @click.stop>
            <slot name="row-actions" :row="row" />
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="!rows.length" class="px-4">
      <slot name="empty">
        <p class="py-10 text-center text-sm text-slate-400">No data available.</p>
      </slot>
    </div>
  </div>
</template>

<style scoped>
/* `mobileMinWidth`: keep a minimum width (→ horizontal scroll) only on mobile;
   at the `sm` breakpoint (640px) the table goes back to filling its container. */
@media (max-width: 639px) {
  .mobile-min-w {
    min-width: var(--mobile-min-w);
  }
}
</style>
