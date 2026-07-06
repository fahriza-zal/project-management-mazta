import { gql } from '@apollo/client/core'

/**
 * Project Role (master data) GraphQL operations — co-located with the feature.
 *
 * Response envelope across every operation: `data.<operation>.data`.
 * Paginated lists return `{ count, currentPage, hasNext, hasPrev, totalPages, results }`.
 */

/** Paginated list of project roles. Variables: { params: ProjectRoleParams }. */
export const LIST_PROJECT_ROLE = gql`
  query ListProjectRole($params: ProjectRoleParams) {
    listProjectRole(params: $params) {
      data {
        count
        currentPage
        hasNext
        hasPrev
        totalPages
        results {
          id
          name
          isWatcher
        }
      }
    }
  }
`

/** Single project role by id. Variables: { getProjectRoleId: Int! }. */
export const GET_PROJECT_ROLE = gql`
  query GetProjectRole($getProjectRoleId: Int!) {
    getProjectRole(id: $getProjectRoleId) {
      data {
        id
        name
        isWatcher
      }
    }
  }
`

/** Create a project role. Variables: { input: ProjectRoleInput! } where input = { name, isWatcher }. */
export const CREATE_PROJECT_ROLE = gql`
  mutation CreateProjectRole($input: ProjectRoleInput!) {
    createProjectRole(input: $input) {
      data {
        id
        name
        isWatcher
      }
    }
  }
`

/** Update a project role. Variables: { editProjectRoleId: Int!, input: ProjectRoleInput! }. */
export const EDIT_PROJECT_ROLE = gql`
  mutation EditProjectRole($input: ProjectRoleInput!, $editProjectRoleId: Int!) {
    editProjectRole(input: $input, id: $editProjectRoleId) {
      data {
        id
        name
      }
    }
  }
`

/** Delete a project role. Variables: { deleteProjectRoleId: Int!, hard: Boolean! } (hard is always false). */
export const DELETE_PROJECT_ROLE = gql`
  mutation DeleteProjectRole($deleteProjectRoleId: Int!, $hard: Boolean!) {
    deleteProjectRole(id: $deleteProjectRoleId, hard: $hard) {
      data
    }
  }
`
