/**
 * Permission keys for the project-status feature — each value is the GraphQL
 * operation name the backend gates on (matches `user.userPermissions`). Covers
 * both the status definitions and their transition rules.
 * Use with `auth.can(PERM.CREATE)` to hide actions the user can't perform.
 */
export const PERM = {
  LIST: 'listProjectStatusDefinition',
  GET: 'getProjectStatusDefinition',
  CREATE: 'createProjectStatusDefinition',
  EDIT: 'editProjectStatusDefinition',
  DELETE: 'deleteProjectStatusDefinition',
  // Transition rules (from → to)
  CREATE_TRANSITION: 'createProjectStatusTransition',
  EDIT_TRANSITION: 'editProjectStatusTransition',
  DELETE_TRANSITION: 'deleteProjectStatusTransition',
}
