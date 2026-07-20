import { gql } from '@apollo/client/core'

/**
 * Project date ranges for the dashboard Gantt timeline. Scoped by `unitIds`
 * (the signed-in user's units). Variables: { params: ProjectParams }.
 *
 * NOTE: unlike the paginated list operations, `getRangeProject` returns the
 * array **directly** under `data.getRangeProject` — there is no `.data` envelope.
 */
export const GET_RANGE_PROJECT = gql`
  query GetRangeProject($params: ProjectParams) {
    getRangeProject(params: $params) {
      startDate
      endDate
      expectedEndDate
      project {
        id
        name
        description
        projectCategory
        projectMode
        prefix
        fullCode
        expectedEndDate
        startDate
        endDate
        isClosed
        isLocked
        milestones {
          id
          name
          status
          tasks {
            id
            title
            assignments {
              employee {
                id
                fullName
              }
            }
            startedAt
            dueDate
            doneAt
          }
        }
      }
    }
  }
`

/**
 * Dashboard GraphQL subscriptions (live data over WebSocket).
 * Auth is carried on the socket connection (see `apolloClient` `connectionParams`),
 * not per-operation, so these take no token argument.
 */

/** Aggregate, org-wide dashboard metrics. Response: data.generalDashboard.{…}. */
export const GENERAL_DASHBOARD_SUBSCRIPTION = gql`
  subscription GeneralDashboard {
    generalDashboard {
      activeProjectList {
        id
        name
      }
      activeProjects
      closedProjectList {
        id
        name
      }
      closedProjects
      completedLate
      completedTasks
      completionRate
      healthScoreProject
      highRiskProjectList {
        id
        name
      }
      highRiskProjects
      idleProjectList {
        id
        name
      }
      nearDeadlineProjectList {
        id
        name
      }
      onTimeProjects
      overdueProjectList {
        id
        name
      }
      overdueTasks
      progressProject
      projectOverdue
      riskScoreProject
      totalProjects
      totalTasks
    }
  }
`

/** Time-series history of dashboard metrics. Response: data.historyDashboard.histories[]. */
export const HISTORY_DASHBOARD_SUBSCRIPTION = gql`
  subscription HistoryDashboard {
    historyDashboard {
      histories {
        activeMembers
        actualSeconds
        averageCycleTime
        averageLeadTime
        averageTaskPerMember
        completedLate
        completedMilestones
        completedOnTime
        completedTasks
        completionRate
        efficiency
        estimatedSeconds
        healthScore
        id
        overdueTasks
        progress
        projectAgeDays
        riskScore
        scheduleVariance
        throughput
        totalAttachments
        totalComments
        totalMilestones
        totalStatusChanges
        totalTasks
        utilization
        velocity
        workDate
      }
    }
  }
`

/**
 * Personal (per-employee) timesheet dashboard.
 * Response: data.sheetDashboard.{ metrics[], tree }.
 *
 * `metrics` is an array of the queried employee **plus their team** (per the
 * `tree` employee hierarchy). `metrics[].task` is a union: full `Task` (project
 * work) or a lightweight `DefaultTask` (common work) — via inline fragments.
 */
export const SHEET_DASHBOARD_SUBSCRIPTION = gql`
  subscription SheetDashboard($employeeId: Int!) {
    sheetDashboard(employeeId: $employeeId) {
      metrics {
        commonCount
        timeSpents
        projectCount
        secondSpentOnProject
        secondSpentOnCommon
        currentTask
        employee {
          id
          fullName
          image
        }
        task {
          ... on Task {
            createdAt
            updatedAt
            deletedAt
            id
            title
            description
            priority
            order
            taskType
            dueDate
            isClosed
            isLocked
            estimatedSeconds
            actualSeconds
            startedAt
            doneAt
          }
          ... on DefaultTask {
            createdAt
            updatedAt
            deletedAt
            id
            title
          }
        }
      }
      tree
    }
  }
`
