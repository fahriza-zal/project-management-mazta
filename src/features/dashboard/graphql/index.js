import { gql } from '@apollo/client/core'

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
