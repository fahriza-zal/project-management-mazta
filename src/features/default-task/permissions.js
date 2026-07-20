/**
 * Permission keys for the default-task feature — each value is the GraphQL
 * operation name the backend gates on (matches `user.userPermissions`).
 * Use with `auth.can(PERM.CREATE)` to hide actions the user can't perform.
 */
export const PERM = {
  LIST: 'listDefaultTask',
  GET: 'getDefaultTask',
  CREATE: 'createDefaultTask',
  EDIT: 'editDefaultTask',
  DELETE: 'deleteDefaultTask',
}
