import { gql } from '@apollo/client/core'

/**
 * Task Status Definition (master data) GraphQL operations — co-located with the feature.
 *
 * Response envelope across every operation: `data.<operation>.data`.
 * Paginated lists return `{ count, currentPage, hasNext, hasPrev, totalPages, results }`.
 */

/** Paginated list of task status definitions. Variables: { params: TaskStatusDefinitionParams }. */
export const LIST_TASK_STATUS = gql`
  query ListTaskStatusDefinition($params: TaskStatusDefinitionParams) {
    listTaskStatusDefinition(params: $params) {
      data {
        count
        currentPage
        hasNext
        hasPrev
        totalPages
        results {
          id
          name
          ordering
          isClosed
          isDefault
          units {
            id
            name
          }
          transitionTo {
            id
            toStatus {
              id
              name
            }
            approvalType
            requireApproval
          }
        }
      }
    }
  }
`

/**
 * Single task status definition by id. Variables: { getTaskStatusDefinitionId: Int! }.
 * `transitionTo` powers the transition manager — it lists the statuses this one may move to.
 */
export const GET_TASK_STATUS = gql`
  query GetTaskStatusDefinition($getTaskStatusDefinitionId: Int!) {
    getTaskStatusDefinition(id: $getTaskStatusDefinitionId) {
      data {
        id
        name
        ordering
        isClosed
        isDefault
        units {
          id
          name
        }
        transitionTo {
          id
          toStatus {
            id
            name
          }
          approvalType
          requireApproval
        }
      }
    }
  }
`

/**
 * Lightweight list of every task status (id + name only), used to populate the
 * candidate "move to" targets in the transition manager. Big pageSize = fetch all.
 * Variables: { params: TaskStatusDefinitionParams }.
 */
export const LIST_TASK_STATUS_OPTIONS = gql`
  query ListTaskStatusOptions($params: TaskStatusDefinitionParams) {
    listTaskStatusDefinition(params: $params) {
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
 * Create a task status definition.
 * Variables: { input: TaskStatusDefinitionInput! } where input =
 * { name, ordering, isClosed, isDefault, relatedCompanyIds, relatedUnitIds }.
 */
export const CREATE_TASK_STATUS = gql`
  mutation CreateTaskStatusDefinition($input: TaskStatusDefinitionInput!) {
    createTaskStatusDefinition(input: $input) {
      data {
        id
        name
      }
    }
  }
`

/** Update a task status definition. Variables: { editTaskStatusDefinitionId: Int!, input: TaskStatusDefinitionInput! }. */
export const EDIT_TASK_STATUS = gql`
  mutation EditTaskStatusDefinition(
    $input: TaskStatusDefinitionInput!
    $editTaskStatusDefinitionId: Int!
  ) {
    editTaskStatusDefinition(input: $input, id: $editTaskStatusDefinitionId) {
      data {
        id
        name
      }
    }
  }
`

/** Delete a task status definition. Variables: { deleteTaskStatusDefinitionId: Int!, hard: Boolean! } (hard is always false). */
export const DELETE_TASK_STATUS = gql`
  mutation DeleteTaskStatusDefinition($deleteTaskStatusDefinitionId: Int!, $hard: Boolean!) {
    deleteTaskStatusDefinition(id: $deleteTaskStatusDefinitionId, hard: $hard) {
      data
    }
  }
`

/* -------------------------------------------------------------------------- */
/* Task Status Transition — a directed (from → to) rule between two statuses.  */
/* These are their own mutations (NOT part of createTaskStatusDefinition), so  */
/* the transition manager applies each change live, per row.                   */
/* -------------------------------------------------------------------------- */

/**
 * Create a transition. Variables: { input: TaskStatusTransitionInput! } where input =
 * { fromStatusId, toStatusId, requireApproval, approvalType }.
 */
export const CREATE_TASK_STATUS_TRANSITION = gql`
  mutation CreateTaskStatusTransition($input: TaskStatusTransitionInput!) {
    createTaskStatusTransition(input: $input) {
      data {
        id
      }
    }
  }
`

/** Update a transition. Variables: { editTaskStatusTransitionId: Int!, input: TaskStatusTransitionInput! }. */
export const EDIT_TASK_STATUS_TRANSITION = gql`
  mutation EditTaskStatusTransition(
    $input: TaskStatusTransitionInput!
    $editTaskStatusTransitionId: Int!
  ) {
    editTaskStatusTransition(input: $input, id: $editTaskStatusTransitionId) {
      data {
        id
      }
    }
  }
`

/** Soft-delete a transition. Variables: { deleteTaskStatusTransitionId: Int!, hard: Boolean! } (hard is always false). */
export const DELETE_TASK_STATUS_TRANSITION = gql`
  mutation DeleteTaskStatusTransition($deleteTaskStatusTransitionId: Int!, $hard: Boolean!) {
    deleteTaskStatusTransition(id: $deleteTaskStatusTransitionId, hard: $hard) {
      data
    }
  }
`

/** Restore a soft-deleted transition. Variables: { restoreTaskStatusTransitionId: Int! }. */
export const RESTORE_TASK_STATUS_TRANSITION = gql`
  mutation RestoreTaskStatusTransition($restoreTaskStatusTransitionId: Int!) {
    restoreTaskStatusTransition(id: $restoreTaskStatusTransitionId) {
      data {
        id
      }
    }
  }
`

/**
 * Introspect a GraphQL enum's values — used for the transition `approvalType` select
 * (name: "ApprovalTypeChoices"). Variables: { name: String! }.
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
 * Searchable unit list, used by the unit picker in create/edit.
 * Variables: { params: UnitParams } — { page, pageSize, search }.
 */
export const LIST_UNIT = gql`
  query ListUnit($params: UnitParams) {
    listUnit(params: $params) {
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
 * Searchable company list, used by the company picker in create/edit.
 * Variables: { params: CompanyParams } — { page, pageSize, search }.
 */
export const LIST_COMPANY = gql`
  query ListCompany($params: CompanyParams) {
    listCompany(params: $params) {
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
