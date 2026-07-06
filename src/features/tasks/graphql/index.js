/**
 * Task GraphQL operations (placeholder, co-located with the feature).
 *
 * Example:
 *   import { gql } from '@apollo/client/core'
 *
 *   export const GET_TASKS = gql`
 *     query GetTasks($projectId: ID!) { tasks(projectId: $projectId) { id title status priority } }
 *   `
 *   export const UPDATE_TASK_STATUS = gql`
 *     mutation UpdateTaskStatus($id: ID!, $status: TaskStatus!) { updateTaskStatus(id: $id, status: $status) { id status } }
 *   `
 *
 * Realtime updates (v2) belong in `@/shared/graphql/subscriptions.js`.
 */
export {}
