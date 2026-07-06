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
        }
      }
    }
  }
`

/** Single task status definition by id. Variables: { getTaskStatusDefinitionId: Int! }. */
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
  mutation EditTaskStatusDefinition($input: TaskStatusDefinitionInput!, $editTaskStatusDefinitionId: Int!) {
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
