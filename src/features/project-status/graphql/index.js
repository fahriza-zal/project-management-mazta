import { gql } from '@apollo/client/core'

/**
 * Project Status Definition (master data) GraphQL operations — co-located with the feature.
 *
 * Response envelope across every operation: `data.<operation>.data`.
 * Paginated lists return `{ count, currentPage, hasNext, hasPrev, totalPages, results }`.
 */

/** Paginated list of project status definitions. Variables: { params: ProjectStatusDefinitionParams }. */
export const LIST_PROJECT_STATUS = gql`
  query ListProjectStatusDefinition($params: ProjectStatusDefinitionParams) {
    listProjectStatusDefinition(params: $params) {
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
 * Single project status definition by id. Variables: { getProjectStatusDefinitionId: Int! }.
 * `transitionTo` powers the transition manager — it lists the statuses this one may move to.
 */
export const GET_PROJECT_STATUS = gql`
  query GetProjectStatusDefinition($getProjectStatusDefinitionId: Int!) {
    getProjectStatusDefinition(id: $getProjectStatusDefinitionId) {
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
 * Lightweight list of every project status (id + name only), used to populate the
 * candidate "move to" targets in the transition manager. Big pageSize = fetch all.
 * Variables: { params: ProjectStatusDefinitionParams }.
 */
export const LIST_PROJECT_STATUS_OPTIONS = gql`
  query ListProjectStatusOptions($params: ProjectStatusDefinitionParams) {
    listProjectStatusDefinition(params: $params) {
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
 * Create a project status definition.
 * Variables: { input: ProjectStatusDefinitionInput! } where input =
 * { name, ordering, isClosed, isDefault, relatedCompanyIds, relatedUnitIds }.
 */
export const CREATE_PROJECT_STATUS = gql`
  mutation CreateProjectStatusDefinition($input: ProjectStatusDefinitionInput!) {
    createProjectStatusDefinition(input: $input) {
      data {
        id
        name
      }
    }
  }
`

/** Update a project status definition. Variables: { editProjectStatusDefinitionId: Int!, input: ProjectStatusDefinitionInput! }. */
export const EDIT_PROJECT_STATUS = gql`
  mutation EditProjectStatusDefinition(
    $input: ProjectStatusDefinitionInput!
    $editProjectStatusDefinitionId: Int!
  ) {
    editProjectStatusDefinition(input: $input, id: $editProjectStatusDefinitionId) {
      data {
        id
        name
      }
    }
  }
`

/** Delete a project status definition. Variables: { deleteProjectStatusDefinitionId: Int!, hard: Boolean! } (hard is always false). */
export const DELETE_PROJECT_STATUS = gql`
  mutation DeleteProjectStatusDefinition($deleteProjectStatusDefinitionId: Int!, $hard: Boolean!) {
    deleteProjectStatusDefinition(id: $deleteProjectStatusDefinitionId, hard: $hard) {
      data
    }
  }
`

/* -------------------------------------------------------------------------- */
/* Project Status Transition — a directed (from → to) rule between two statuses. */
/* Their own mutations (NOT part of createProjectStatusDefinition), applied      */
/* live per row by the transition manager. Mirrors the task-status feature.      */
/* -------------------------------------------------------------------------- */

/**
 * Create a transition. Variables: { input: ProjectStatusTransitionInput! } where input =
 * { fromStatusId, toStatusId, requireApproval, approvalType }.
 */
export const CREATE_PROJECT_STATUS_TRANSITION = gql`
  mutation CreateProjectStatusTransition($input: ProjectStatusTransitionInput!) {
    createProjectStatusTransition(input: $input) {
      data {
        id
      }
    }
  }
`

/** Update a transition. Variables: { editProjectStatusTransitionId: Int!, input: ProjectStatusTransitionInput! }. */
export const EDIT_PROJECT_STATUS_TRANSITION = gql`
  mutation EditProjectStatusTransition(
    $input: ProjectStatusTransitionInput!
    $editProjectStatusTransitionId: Int!
  ) {
    editProjectStatusTransition(input: $input, id: $editProjectStatusTransitionId) {
      data {
        id
      }
    }
  }
`

/** Soft-delete a transition. Variables: { deleteProjectStatusTransitionId: Int!, hard: Boolean! } (hard is always false). */
export const DELETE_PROJECT_STATUS_TRANSITION = gql`
  mutation DeleteProjectStatusTransition($deleteProjectStatusTransitionId: Int!, $hard: Boolean!) {
    deleteProjectStatusTransition(id: $deleteProjectStatusTransitionId, hard: $hard) {
      data
    }
  }
`

/**
 * Restore a soft-deleted transition. Variables: { restoreProjectStatusTransitionId: Int! }.
 * NOTE: unused in the UI (mirrors task-status — no isDeleted signal on the read),
 * kept for parity with the backend operation set.
 */
export const RESTORE_PROJECT_STATUS_TRANSITION = gql`
  mutation RestoreProjectStatusTransition($restoreProjectStatusTransitionId: Int!) {
    restoreProjectStatusTransition(id: $restoreProjectStatusTransitionId) {
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
