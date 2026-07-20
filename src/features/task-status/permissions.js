/**
 * Permission keys for the task-status feature — each value is the GraphQL
 * operation name the backend gates on (matches `user.userPermissions`). Covers
 * both the status definitions and their transition rules.
 * Use with `auth.can(PERM.CREATE)` to hide actions the user can't perform.
 */
export const PERM = {
  LIST: 'listTaskStatusDefinition',
  GET: 'getTaskStatusDefinition',
  CREATE: 'createTaskStatusDefinition',
  EDIT: 'editTaskStatusDefinition',
  DELETE: 'deleteTaskStatusDefinition',
  // Transition rules (from → to)
  CREATE_TRANSITION: 'createTaskStatusTransition',
  EDIT_TRANSITION: 'editTaskStatusTransition',
  DELETE_TRANSITION: 'deleteTaskStatusTransition',
}
