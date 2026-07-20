/**
 * Permission keys for the projects feature — each value is the GraphQL
 * operation name that the backend gates on (matches `user.userPermissions`).
 * Use with `auth.can(PERM.CREATE)` to hide actions the user can't perform.
 */
export const PERM = {
  // Project
  LIST: 'listProject',
  GET: 'getProject',
  CREATE: 'createProject',
  EDIT: 'editProject',
  UPDATE_STATUS: 'updateProject',
  DELETE: 'deleteProject',
  LOCK: 'lockProject',
  UNLOCK: 'unlockProject',
  // Task
  CREATE_TASK: 'createTask',
  EDIT_TASK: 'editTask',
  UPDATE_TASK: 'updateTask',
  DELETE_TASK: 'deleteTask',
  LOCK_TASK: 'lockTask',
  UNLOCK_TASK: 'unlockTask',
  ASSIGN_TASK: 'createTaskAssignment',
  COMMENT: 'createTaskComment',
  // Attachment (project & task share one mutation)
  CREATE_ATTACHMENT: 'createProjectAttachment',
}
