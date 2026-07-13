/**
 * Permission keys for the timesheet feature — each value is the GraphQL
 * operation name that the backend gates on (matches `user.userPermissions`).
 * Use with `auth.can(PERM.CREATE)` to hide actions the user can't perform.
 */
export const PERM = {
  LIST: 'listTimeSheet',
  GET: 'getTimeSheet',
  CREATE: 'createTimeSheet',
  START: 'startSheet',
  HOLD: 'holdSheet',
  CLOSE: 'closeSheet',
}
