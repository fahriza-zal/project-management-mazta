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
          image
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

/**
 * Change the signed-in user's password. Variables: { input: ChangePasswordInput! }
 * ({ oldPassword, newPassword }). Returns a fresh session (token + user + employee)
 * just like login — the caller re-seats the store so the user stays signed in
 * (the old token is invalidated on change).
 * Response shape: data.changePassword.data.{ token, user, employee }.
 */
export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
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
          image
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
