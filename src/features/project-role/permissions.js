/**
 * Permission keys for the project-role feature — each value is the GraphQL
 * operation name the backend gates on (matches `user.userPermissions`).
 * Use with `auth.can(PERM.CREATE)` to hide actions the user can't perform.
 */
export const PERM = {
  LIST: 'listProjectRole',
  GET: 'getProjectRole',
  CREATE: 'createProjectRole',
  EDIT: 'editProjectRole',
  DELETE: 'deleteProjectRole',
}
