import { gql } from '@apollo/client/core'

/**
 * Timesheet GraphQL operations — co-located with the feature.
 *
 * Response envelope across every operation: `data.<operation>.data`.
 * Paginated lists return `{ count, currentPage, hasNext, hasPrev, totalPages, results }`.
 *
 * A timesheet records that an employee (the signed-in user) works on a task.
 * The task lands in one of two fields depending on its category:
 * PROJECT → `taskId`, COMMON → `defaultTaskId`. `sheetType` is derived from that
 * same category, so it is not chosen separately.
 */

/**
 * Signed-in employee with the tasks assignable to them. Variables: { getEmployeeId: Int! }.
 * `availableTasks` is a JSON scalar — an array of { id, category, title, priority };
 * `category` decides whether a chosen task is sent as `taskId` (PROJECT) or
 * `defaultTaskId` (COMMON) on create, and also drives `sheetType`.
 */
export const GET_EMPLOYEE = gql`
  query GetEmployee($getEmployeeId: Int!) {
    getEmployee(id: $getEmployeeId) {
      data {
        id
        fullName
        availableTasks
      }
    }
  }
`

/**
 * Create a timesheet.
 * Variables: { input: TimeSheetInput! } where input =
 * { employeeId, sheetType, taskId, defaultTaskId, description }.
 * `status` is intentionally omitted — the backend defaults it.
 * NOTE: mutation name / input type still need backend confirmation.
 */
export const CREATE_TIMESHEET = gql`
  mutation CreateTimeSheet($input: TimeSheetInput!) {
    createTimeSheet(input: $input) {
      data {
        id
      }
    }
  }
`

/**
 * Paginated list of timesheets. Variables: { params: TimeSheetParams } — { page, pageSize, search }.
 * `task` is a union — either a project `Task` or a `DefaultTask`, both exposing { id, title }.
 * `activities` carries the per-timesheet status + description entries.
 */
export const LIST_TIMESHEET = gql`
  query ListTimeSheet($params: TimeSheetParams) {
    listTimeSheet(params: $params) {
      data {
        count
        totalPages
        currentPage
        hasNext
        hasPrev
        results {
          id
          status
          seconds
          startTime
          endTime
          project {
            id
            name
          }
          task {
            ... on Task {
              id
              title
            }
            ... on DefaultTask {
              id
              title
            }
          }
          activities {
            id
            status
            description
          }
        }
      }
    }
  }
`

/* -------------------------------------------------------------------------- */
/* Lifecycle transitions — each appends an activity and returns the new status. */
/* All take an optional `description` note.                                     */
/* -------------------------------------------------------------------------- */

/** Start (or resume) a timesheet. Variables: { startSheetId: Int!, description: String }. */
export const START_SHEET = gql`
  mutation StartSheet($startSheetId: Int!, $description: String) {
    startSheet(id: $startSheetId, description: $description) {
      data {
        id
        status
      }
    }
  }
`

/** Put a timesheet on hold. Variables: { holdSheetId: Int!, description: String }. */
export const HOLD_SHEET = gql`
  mutation HoldSheet($holdSheetId: Int!, $description: String) {
    holdSheet(id: $holdSheetId, description: $description) {
      data {
        id
        status
      }
    }
  }
`

/** Close a timesheet. Variables: { closeSheetId: Int!, description: String }. */
export const CLOSE_SHEET = gql`
  mutation CloseSheet($closeSheetId: Int!, $description: String) {
    closeSheet(id: $closeSheetId, description: $description) {
      data {
        id
        status
      }
    }
  }
`
