/** Lightweight formatting helpers used across the UI. */

/** Format an ISO date string into a readable label, e.g. "12 Jun 2026". */
export function formatDate(value, options = {}) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

/** Short date without year, e.g. "12 Jun". */
export function formatDateShort(value) {
  return formatDate(value, { year: undefined })
}

/** Returns a relative label like "in 3 days" or "2 days ago". */
export function fromNow(value) {
  if (!value) return ''
  const date = new Date(value)
  const diff = date.getTime() - Date.now()
  const days = Math.round(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}

/** True when a due date is in the past. */
export function isOverdue(value) {
  if (!value) return false
  return new Date(value).getTime() < Date.now()
}

/** Build initials from a full name, e.g. "Andi Wijaya" -> "AW". */
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Clamp a number into the 0-100 range. */
export function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value || 0)))
}
