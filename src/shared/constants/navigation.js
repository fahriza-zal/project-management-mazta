import {
  Squares2X2Icon,
  FolderIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  FlagIcon,
  ViewColumnsIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'

/**
 * Primary sidebar navigation, grouped by section.
 * A group without a `title` renders its items without a header.
 * Profile & Settings are intentionally not here — they live in the navbar
 * user dropdown instead.
 */
export const SIDEBAR_NAV = [
  {
    items: [{ name: 'Dashboard', to: { name: 'dashboard' }, icon: Squares2X2Icon }],
  },
  {
    title: 'Master',
    items: [
      { name: 'Default Task', to: { name: 'default-task' }, icon: ClipboardDocumentListIcon },
      { name: 'Task Status', to: { name: 'task-status' }, icon: ViewColumnsIcon },
      { name: 'Project Role', to: { name: 'project-role' }, icon: UserGroupIcon },
      { name: 'Project Status', to: { name: 'project-status' }, icon: FlagIcon },
    ],
  },
  {
    title: 'Transaction',
    items: [
      { name: 'Projects', to: { name: 'projects' }, icon: FolderIcon },
      { name: 'Timesheet', to: { name: 'timesheet' }, icon: ClockIcon },
    ],
  },
]
