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

/** Seconds → compact human duration, e.g. "1j 3m", "7m 26s", "12s", "0s". */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}j ${m}m`
  if (m) return `${m}m ${sec}s`
  return `${sec}s`
}

/** Seconds → compact hours/minutes, e.g. "8h 12m", "3h", "0m". */
export function secondsToHm(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

/**
 * Seconds → duration that can span days, e.g. "2d 4h", "4h 30m", "12m", or "—"
 * when zero. Use for cycle/lead times; `secondsToHm` for straight time tracked.
 */
export function secondsToDuration(seconds) {
  const s = Math.round(Number(seconds) || 0)
  if (!s) return '—'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return h ? `${d}d ${h}h` : `${d}d`
  if (h) return m ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

/**
 * Ratio-style metrics (throughput, efficiency, avg/member…) → up to `digits`
 * decimals with trailing zeros trimmed; "—" when not a finite number.
 */
export function formatMetricNumber(value, digits = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return String(Number(n.toFixed(digits)))
}

/** Whole percent from a 0–1 fraction, e.g. "0.6667" → "67%". */
export function fractionToPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}
