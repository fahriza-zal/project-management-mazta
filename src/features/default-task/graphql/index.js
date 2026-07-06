import { gql } from '@apollo/client/core'

/**
 * Default Task (master data) GraphQL operations — co-located with the feature.
 *
 * Response envelope across every operation: `data.<operation>.data`.
 * Paginated lists return `{ count, currentPage, hasNext, hasPrev, totalPages, results }`.
 */

/** Paginated list of default tasks. Variables: { params: DefaultTaskParams }. */
export const LIST_DEFAULT_TASK = gql`
  query ListDefaultTask($params: DefaultTaskParams) {
    listDefaultTask(params: $params) {
      data {
        count
        currentPage
        hasNext
        hasPrev
        totalPages
        results {
          id
          title
          units {
            id
            name
          }
        }
      }
    }
  }
`

/** Single default task by id. Variables: { getDefaultTaskId: Int! }. */
export const GET_DEFAULT_TASK = gql`
  query GetDefaultTask($getDefaultTaskId: Int!) {
    getDefaultTask(id: $getDefaultTaskId) {
      data {
        id
        title
        units {
          id
          name
        }
      }
    }
  }
`

/** Create a default task. Variables: { input: DefaultTaskInput! } where input = { title, unitIds }. */
export const CREATE_DEFAULT_TASK = gql`
  mutation CreateDefaultTask($input: DefaultTaskInput!) {
    createDefaultTask(input: $input) {
      data {
        id
        title
      }
    }
  }
`

/** Update a default task. Variables: { editDefaultTaskId: Int!, input: DefaultTaskInput! }. */
export const EDIT_DEFAULT_TASK = gql`
  mutation EditDefaultTask($editDefaultTaskId: Int!, $input: DefaultTaskInput!) {
    editDefaultTask(input: $input, id: $editDefaultTaskId) {
      data {
        id
        title
      }
    }
  }
`

/** Delete a default task. Variables: { deleteDefaultTaskId: Int!, hard: Boolean! } (hard is always false). */
export const DELETE_DEFAULT_TASK = gql`
  mutation DeleteDefaultTask($deleteDefaultTaskId: Int!, $hard: Boolean!) {
    deleteDefaultTask(id: $deleteDefaultTaskId, hard: $hard) {
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
