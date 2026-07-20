import { gql } from '@apollo/client/core'

/**
 * Full employee profile for the account page. Variables: { getEmployeeId: Int! }.
 * Response shape: data.getEmployee.data.{…}. `availableTasks` is an array of
 * { task, category, priority } where `task` is a union: a `Task` (PROJECT — has
 * `milestone.project { id, name }`) or a `DefaultTask` (COMMON — just id/title).
 * The distinct project ids across PROJECT tasks give the employee's project count.
 */
export const GET_EMPLOYEE = gql`
  query GetEmployee($getEmployeeId: Int!) {
    getEmployee(id: $getEmployeeId) {
      data {
        id
        firstName
        middleName
        lastName
        fullName
        image
        level {
          name
        }
        nik
        units {
          id
          name
        }
        companies {
          id
          name
        }
        branch {
          id
          name
        }
        childrens {
          id
          fullName
        }
        availableTasks {
          task {
            ... on Task {
              id
              title
              milestone {
                project {
                  id
                  name
                }
              }
            }
            ... on DefaultTask {
              id
              title
            }
          }
          category
          priority
        }
      }
    }
  }
`
