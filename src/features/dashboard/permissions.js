/**
 * Permission keys for the dashboard feature — each value is the GraphQL
 * subscription (operation) name that the backend gates on (matches
 * `user.userPermissions`). Use with `auth.can(PERM.PERSONAL)` to hide the
 * dashboard tabs the user can't access.
 */
export const PERM = {
  PERSONAL: 'sheetDashboard',
  OVERVIEW: 'generalDashboard',
  HISTORY: 'historyDashboard',
  // Project timeline (Gantt) — its own operation, shown to any user who has it
  // regardless of which dashboard tab they can open.
  RANGE_PROJECT: 'getRangeProject',
}
