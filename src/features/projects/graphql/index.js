import { gql } from '@apollo/client/core'

/**
 * Project GraphQL operations — co-located with the feature.
 * Response envelope across every operation: `data.<operation>.data`.
 */

/**
 * Create a project.
 * Variables: { input: ProjectInput! } where input =
 * { name, prefix, description, startDate, expectedEndDate, parentId, projectCategory,
 *   projectMode, units: [{ unitId, roleId }], attachments: [{ files, projectId, taskId }] }.
 *
 * `units[].unitId` comes from `listUnit` (LIST_UNIT); `units[].roleId` comes
 * from `listProjectRole` (LIST_PROJECT_ROLE).
 */
export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectInput!) {
    createProject(input: $input) {
      data {
        id
        name
        prefix
      }
    }
  }
`

/**
 * Edit a project. Same `input` shape as CREATE_PROJECT, plus the target id.
 * Variables: { input: ProjectInput!, editProjectId: Int! }.
 */
export const EDIT_PROJECT = gql`
  mutation EditProject($input: ProjectInput!, $editProjectId: Int!) {
    editProject(input: $input, id: $editProjectId) {
      data {
        id
        name
        prefix
      }
    }
  }
`

/**
 * Delete a project. Variables: { deleteProjectId: Int!, hard: Boolean! }
 * (hard is always false — soft delete).
 */
export const DELETE_PROJECT = gql`
  mutation DeleteProject($deleteProjectId: Int!, $hard: Boolean!) {
    deleteProject(id: $deleteProjectId, hard: $hard) {
      data
    }
  }
`

/**
 * Single project by id — source for prefilling the Edit Project form (project,
 * its units, milestones, and each milestone's tasks). Variables: { getProjectId: Int! }.
 *
 * The heavy, full-shape query — used by the Edit page and the post-create fill,
 * which need every milestone/task field for the builders. The Detail and Board
 * pages use the lighter GET_PROJECT_DETAIL / GET_PROJECT_BOARD instead so their
 * requests stay fast.
 *
 * NOTE: `tasks.id` and `tasks.dueDate` are requested because editing an existing
 * task needs its id, and the form edits the due date.
 */
export const GET_PROJECT = gql`
  query GetProject($getProjectId: Int!) {
    getProject(id: $getProjectId) {
      data {
        id
        fullCode
        prefix
        name
        description
        projectCategory
        projectMode
        startDate
        expectedEndDate
        projectUnits {
          id
          unit {
            id
            name
          }
          role {
            id
            name
          }
        }
        milestones {
          id
          name
          description
          expectedStartDate
          expectedEndDate
          isCounted
          status
          tasks {
            id
            title
            description
            priority
            taskType
            doneAt
            dueDate
            estimatedHours
            milestone {
              id
              name
            }
            currentStatus {
              id
              name
            }
          }
        }
        currentStatus {
          id
          name
        }
        activities {
          id
          status
        }
        endDate
        isClosed
      }
    }
  }
`

/**
 * Rich project fetch for the Detail page — everything the redesigned detail view
 * renders: the header/summary cards (task & milestone progress, tracked timesheet
 * hours, team size), the milestone → task breakdown (with status, priority,
 * assignees, comment counts, estimate/tracked hours, lock state), the assigned
 * units, the creator, and the activity feed. Heavier than the old "light" detail
 * query on purpose — the new layout needs these fields. Variables: { getProjectId: Int! }.
 */
export const GET_PROJECT_DETAIL = gql`
  query GetProjectDetail($getProjectId: Int!) {
    getProject(id: $getProjectId) {
      data {
        id
        fullCode
        prefix
        name
        description
        projectCategory
        projectMode
        startDate
        expectedEndDate
        endDate
        isClosed
        isLocked
        createdAt
        createdBy {
          id
          username
          firstName
          lastName
          dateJoined
        }
        currentStatus {
          id
          name
          isClosed
        }
        projectUnits {
          id
          unit {
            id
            name
            unitType
          }
          role {
            id
            name
          }
        }
        sheets {
          id
          seconds
        }
        attachments {
          id
          files
        }
        milestones {
          id
          name
          description
          order
          expectedStartDate
          expectedEndDate
          isCounted
          status
          progress
          tasks {
            id
            title
            description
            priority
            taskType
            dueDate
            isClosed
            isLocked
            estimatedSeconds
            actualSeconds
            doneAt
            currentStatus {
              id
              name
              isClosed
            }
            assignments {
              id
              employee {
                id
                fullName
              }
            }
            comments {
              id
              comment
              createdAt
              employee {
                fullName
                user {
                  email
                }
              }
            }
            sheets {
              id
              seconds
            }
            attachments {
              id
              files
            }
          }
        }
        activities {
          id
          status
          action
          oldValue
          newValue
          description
          createdAt
        }
      }
    }
  }
`

/**
 * Board fetch for the Kanban — a light project header plus tasks with their
 * `currentStatus` (the column) and the fields shown on a card. Variables: { getProjectId: Int! }.
 */
export const GET_PROJECT_BOARD = gql`
  query GetProjectBoard($getProjectId: Int!) {
    getProject(id: $getProjectId) {
      data {
        id
        fullCode
        prefix
        name
        milestones {
          id
          name
          tasks {
            id
            title
            description
            priority
            dueDate
            milestone {
              id
              name
            }
            currentStatus {
              id
              name
            }
            assignments {
              id
              employee {
                id
                fullName
              }
            }
            comments {
              id
              comment
              createdAt
              employee {
                fullName
                user {
                  email
                }
              }
            }
          }
        }
      }
    }
  }
`

/**
 * Minimal project list — source for the parent-project picker (id + name only).
 * Variables: { params: ProjectParams } — { page, pageSize, search }.
 */
export const LIST_PROJECT = gql`
  query ListProject($params: ProjectParams) {
    listProject(params: $params) {
      data {
        count
        currentPage
        hasNext
        hasPrev
        totalPages
        results {
          id
          name
        }
      }
    }
  }
`

/**
 * Detailed project list for the Projects page (table + kanban).
 * Variables: { params: ProjectParams } — { page, pageSize, search }.
 */
export const LIST_PROJECTS = gql`
  query ListProjects($params: ProjectParams) {
    listProject(params: $params) {
      data {
        count
        currentPage
        hasNext
        hasPrev
        totalPages
        results {
          id
          fullCode
          prefix
          name
          description
          expectedEndDate
          startDate
          endDate
          projectMode
          projectCategory
          isLocked
          projectUnits {
            id
            unit {
              id
              name
            }
          }
          activities {
            id
            description
            newValue
            oldValue
            status
          }
        }
      }
    }
  }
`

/**
 * Introspect a GraphQL enum's values. Used to populate the Project Category,
 * Project Mode, and Task Priority selects. Variables: { name: String! } —
 * e.g. "ProjectCategoryChoices", "ProjectModeChoices", "PriorityChoices".
 */
export const ENUM_VALUES = gql`
  query EnumValues($name: String!) {
    __type(name: $name) {
      enumValues {
        name
      }
    }
  }
`

/**
 * Create a milestone under a project.
 * Variables: { input: ProjectMileStoneInput! } where input =
 * { projectId, name, description, expectedStartDate, expectedEndDate, isCounted, order }.
 */
export const CREATE_MILESTONE = gql`
  mutation CreateProjectMilestone($input: ProjectMileStoneInput!) {
    createProjectMilestone(input: $input) {
      data {
        id
        name
      }
    }
  }
`

/**
 * Edit a milestone. Same input shape as CREATE_MILESTONE, plus the target id.
 * Variables: { input: ProjectMileStoneInput!, editProjectMilestoneId: Int! }.
 */
export const EDIT_MILESTONE = gql`
  mutation EditProjectMilestone($input: ProjectMileStoneInput!, $editProjectMilestoneId: Int!) {
    editProjectMilestone(input: $input, id: $editProjectMilestoneId) {
      data {
        id
        name
      }
    }
  }
`

/**
 * Delete a milestone. Variables: { deleteProjectMilestoneId: Int!, hard: Boolean! }
 * (hard is always false — soft delete).
 */
export const DELETE_MILESTONE = gql`
  mutation DeleteProjectMilestone($deleteProjectMilestoneId: Int!, $hard: Boolean!) {
    deleteProjectMilestone(id: $deleteProjectMilestoneId, hard: $hard) {
      data
    }
  }
`

/**
 * Create a task. Note: TaskInput carries no projectId — a task is associated
 * through its milestone (or parent). Variables: { input: TaskInput! } where
 * input = { title, description, priority, dueDate, milestoneId, parentId, taskType, order }.
 */
export const CREATE_TASK = gql`
  mutation CreateTask($input: TaskInput!) {
    createTask(input: $input) {
      data {
        id
        title
      }
    }
  }
`

/**
 * Edit a task. Same input shape as CREATE_TASK, plus the target id.
 * Variables: { input: TaskInput!, editTaskId: Int! }.
 */
export const EDIT_TASK = gql`
  mutation EditTask($input: TaskInput!, $editTaskId: Int!) {
    editTask(input: $input, id: $editTaskId) {
      data {
        id
        title
      }
    }
  }
`

/**
 * Move a task to another status (used by the Kanban drag & drop). This is a distinct
 * operation from EDIT_TASK: it takes an UpdateTaskInput of the status change, not TaskInput.
 * Variables: { updateTaskId: Int!, input: UpdateTaskInput! } where input =
 * { employeeId, newStatusId, oldStatusId }.
 */
export const UPDATE_TASK_STATUS = gql`
  mutation UpdateTask($updateTaskId: Int!, $input: UpdateTaskInput!) {
    updateTask(id: $updateTaskId, input: $input) {
      data {
        id
        currentStatus {
          id
          name
        }
      }
    }
  }
`

/**
 * Delete a task. Variables: { deleteTaskId: Int!, hard: Boolean! }
 * (hard is always false — soft delete).
 */
export const DELETE_TASK = gql`
  mutation DeleteTask($deleteTaskId: Int!, $hard: Boolean!) {
    deleteTask(id: $deleteTaskId, hard: $hard) {
      data
    }
  }
`

/* -------------------------------------------------------------------------- */
/* Lock / unlock. Locking a project cascades to all its tasks on the backend;   */
/* locking a task affects only that task. Each returns { id, isLocked }.         */
/* -------------------------------------------------------------------------- */

/** Lock a project (cascades to its tasks). Variables: { lockProjectId: Int! }. */
export const LOCK_PROJECT = gql`
  mutation LockProject($lockProjectId: Int!) {
    lockProject(id: $lockProjectId) {
      data {
        id
        isLocked
      }
    }
  }
`

/** Unlock a project (cascades to its tasks). Variables: { unlockProjectId: Int! }. */
export const UNLOCK_PROJECT = gql`
  mutation UnlockProject($unlockProjectId: Int!) {
    unlockProject(id: $unlockProjectId) {
      data {
        id
        isLocked
      }
    }
  }
`

/** Lock a single task. Variables: { lockTaskId: Int! }. */
export const LOCK_TASK = gql`
  mutation LockTask($lockTaskId: Int!) {
    lockTask(id: $lockTaskId) {
      data {
        id
        isLocked
      }
    }
  }
`

/** Unlock a single task. Variables: { unlockTaskId: Int! }. */
export const UNLOCK_TASK = gql`
  mutation UnlockTask($unlockTaskId: Int!) {
    unlockTask(id: $unlockTaskId) {
      data {
        id
        isLocked
      }
    }
  }
`

/**
 * Searchable unit list — source for the `units[].unitId` picker on Create Project.
 * Variables: { params: UnitParams } — { page, pageSize, search }. Returns { id, name }.
 */
export const LIST_UNIT = gql`
  query ListUnit($params: UnitParams) {
    listUnit(params: $params) {
      data {
        results {
          id
          name
        }
      }
    }
  }
`

/**
 * Project-role list — source for the `units[].roleId` select on Create Project.
 * Variables: { params: ProjectRoleParams } — { page, pageSize, search }. Returns { id, name }.
 */
export const LIST_PROJECT_ROLE = gql`
  query ListProjectRole($params: ProjectRoleParams) {
    listProjectRole(params: $params) {
      data {
        results {
          id
          name
        }
      }
    }
  }
`

/**
 * Searchable employee list — source for the assignee picker on a task.
 * Variables: { params: EmployeeParams } — { page, pageSize, search }. Returns { id, fullName }.
 */
export const LIST_EMPLOYEE = gql`
  query ListEmployee($params: EmployeeParams) {
    listEmployee(params: $params) {
      data {
        results {
          id
          fullName
        }
      }
    }
  }
`

/**
 * Assign an employee to a task (one assignment per employee/task pair — assigning
 * several employees means calling this once per employee).
 * Variables: { input: TaskAssignmentInput! } where input = { employeeId, taskId }.
 */
export const CREATE_TASK_ASSIGNMENT = gql`
  mutation CreateTaskAssignment($input: TaskAssignmentInput!) {
    createTaskAssignment(input: $input) {
      data {
        id
        employee {
          id
          fullName
        }
        task {
          id
          title
        }
      }
    }
  }
`

/**
 * Remove an assignment (unassign) by its id. Follows the repo's delete convention
 * `deleteX(id: Int!, hard: Boolean!)` (hard always false — soft delete).
 * NOTE: mutation/arg names assumed from the pattern — adjust if the backend differs.
 * Variables: { deleteTaskAssignmentId: Int!, hard: Boolean! }.
 */
export const DELETE_TASK_ASSIGNMENT = gql`
  mutation DeleteTaskAssignment($deleteTaskAssignmentId: Int!, $hard: Boolean!) {
    deleteTaskAssignment(id: $deleteTaskAssignmentId, hard: $hard) {
      data
    }
  }
`

/**
 * Add a comment to a task. The author (`employeeId`) is the signed-in employee
 * (auth store / `pm_profile`), not a picked value.
 * Variables: { input: TaskCommentInput! } where input = { comment, employeeId, taskId }.
 */
export const CREATE_TASK_COMMENT = gql`
  mutation CreateTaskComment($input: TaskCommentInput!) {
    createTaskComment(input: $input) {
      data {
        id
        comment
      }
    }
  }
`
