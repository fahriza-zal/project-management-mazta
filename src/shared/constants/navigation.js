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
 * Profile is intentionally not here — it lives in the navbar user dropdown instead.
 *
 * `permissions` lists the GraphQL operations that item's page uses. The Sidebar
 * shows the item when the user has ANY of them (i.e. hide only when the user
 * can run none of that feature's queries). Items without it are always shown.
 */
export const SIDEBAR_NAV = [
  {
    items: [{ name: 'Dashboard', to: { name: 'dashboard' }, icon: Squares2X2Icon }],
  },
  {
    title: 'Master',
    items: [
      {
        name: 'Default Task',
        to: { name: 'default-task' },
        icon: ClipboardDocumentListIcon,
        permissions: ['listDefaultTask', 'getDefaultTask'],
      },
      {
        name: 'Task Status',
        to: { name: 'task-status' },
        icon: ViewColumnsIcon,
        permissions: ['listTaskStatusDefinition', 'getTaskStatusDefinition'],
      },
      {
        name: 'Project Role',
        to: { name: 'project-role' },
        icon: UserGroupIcon,
        permissions: ['listProjectRole', 'getProjectRole'],
      },
      {
        name: 'Project Status',
        to: { name: 'project-status' },
        icon: FlagIcon,
        permissions: ['listProjectStatusDefinition', 'getProjectStatusDefinition'],
      },
    ],
  },
  {
    title: 'Transaction',
    items: [
      {
        name: 'Projects',
        to: { name: 'projects' },
        icon: FolderIcon,
        permissions: ['listProject', 'getProject'],
      },
      {
        name: 'Timesheet',
        to: { name: 'timesheet' },
        icon: ClockIcon,
        permissions: ['listTimeSheet', 'getTimeSheet'],
      },
    ],
  },
]
