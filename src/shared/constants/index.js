/**
 * Application-wide constants.
 * Enums here mirror the backend (PRD section 10-12) so the UI can be
 * wired to GraphQL later without changing component code.
 */

export const PROJECT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE',
}

export const PROJECT_STATUS_META = {
  [PROJECT_STATUS.DRAFT]: { label: 'Draft', color: 'slate' },
  [PROJECT_STATUS.ACTIVE]: { label: 'Active', color: 'info' },
  [PROJECT_STATUS.ON_HOLD]: { label: 'On Hold', color: 'warning' },
  [PROJECT_STATUS.COMPLETED]: { label: 'Completed', color: 'success' },
  [PROJECT_STATUS.CANCELLED]: { label: 'Cancelled', color: 'slate' },
  [PROJECT_STATUS.OVERDUE]: { label: 'Overdue', color: 'danger' },
}

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE',
}

export const TASK_STATUS_META = {
  [TASK_STATUS.TODO]: { label: 'Todo', color: 'slate' },
  [TASK_STATUS.IN_PROGRESS]: { label: 'In Progress', color: 'info' },
  [TASK_STATUS.REVIEW]: { label: 'Review', color: 'warning' },
  [TASK_STATUS.DONE]: { label: 'Done', color: 'success' },
}

/** Ordered columns for the Kanban board. */
export const BOARD_COLUMNS = [
  { key: TASK_STATUS.TODO, label: 'Todo' },
  { key: TASK_STATUS.IN_PROGRESS, label: 'In Progress' },
  { key: TASK_STATUS.REVIEW, label: 'Review' },
  { key: TASK_STATUS.DONE, label: 'Done' },
]

export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
}

export const TASK_PRIORITY_META = {
  [TASK_PRIORITY.LOW]: { label: 'Low', color: 'slate' },
  [TASK_PRIORITY.MEDIUM]: { label: 'Medium', color: 'info' },
  [TASK_PRIORITY.HIGH]: { label: 'High', color: 'warning' },
  [TASK_PRIORITY.CRITICAL]: { label: 'Critical', color: 'danger' },
}

/** Maps a semantic color name to Tailwind badge classes. */
export const BADGE_COLOR_CLASSES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  success: 'bg-green-50 text-green-700 ring-green-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
}

export const PAGE_SIZE = 8
