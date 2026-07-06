/** Mock data for dashboard widgets (chart, activity feed). */

/** Weekly task completion trend for the dummy progress chart. */
export const taskTrend = [
  { label: 'Mon', value: 4 },
  { label: 'Tue', value: 7 },
  { label: 'Wed', value: 5 },
  { label: 'Thu', value: 9 },
  { label: 'Fri', value: 6 },
  { label: 'Sat', value: 3 },
  { label: 'Sun', value: 8 },
]

/** Recent activity feed (dummy). */
export const activities = [
  {
    id: 'a1',
    userId: 'u3',
    action: 'completed task',
    target: 'Setup database schema',
    project: 'ERP Implementation',
    time: '2026-06-26T07:30:00Z',
  },
  {
    id: 'a2',
    userId: 'u6',
    action: 'moved task to Review',
    target: 'Develop landing page',
    project: 'Website Revamp',
    time: '2026-06-25T14:10:00Z',
  },
  {
    id: 'a3',
    userId: 'u1',
    action: 'created project',
    target: 'Quality Control Dashboard',
    project: 'Quality Control Dashboard',
    time: '2026-06-25T09:00:00Z',
  },
  {
    id: 'a4',
    userId: 'u4',
    action: 'updated due date',
    target: 'Build PO generator',
    project: 'Procurement Automation',
    time: '2026-06-24T16:45:00Z',
  },
  {
    id: 'a5',
    userId: 'u2',
    action: 'assigned task',
    target: 'Finance reports',
    project: 'ERP Implementation',
    time: '2026-06-24T11:20:00Z',
  },
]
