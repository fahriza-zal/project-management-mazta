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
        }
      }
    }
  }
`

/** Single project status definition by id. Variables: { getProjectStatusDefinitionId: Int! }. */
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
  mutation EditProjectStatusDefinition($input: ProjectStatusDefinitionInput!, $editProjectStatusDefinitionId: Int!) {
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
