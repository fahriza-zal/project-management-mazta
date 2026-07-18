import { gql } from '@apollo/client/core'

/**
 * Auth GraphQL operations (co-located with the feature).
 *
 * Response shape: data.login.data.{ token, user, employee }
 */
export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      data {
        token
        user {
          username
          id
          isActive
          isSuperuser
          isStaff
          userPermissions
        }
        employee {
          id
          fullName
          units {
            id
            name
          }
          level {
            id
            name
          }
          childrens {
            id
            fullName
          }
          companies {
            id
            name
          }
        }
      }
    }
  }
`

export const LOGOUT = gql`
  mutation Logout {
    logout {
      data {
        success
      }
    }
  }
`
