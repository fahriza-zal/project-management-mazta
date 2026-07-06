/**
 * Apollo Client setup (scaffold).
 *
 * Endpoint comes from `API_GATEWAY` in `.env`. The auth feature already uses
 * real GraphQL; other features still run on mock data and migrate by importing
 * operations from their own `graphql/` folder (e.g. `@/features/projects/graphql`).
 */
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'

// In dev we hit a same-origin path that Vite proxies to API_GATEWAY (avoids CORS,
// since the gateway sends no CORS headers). In production we call the gateway directly.
const uri = import.meta.env.DEV ? '/api-gateway' : import.meta.env.API_GATEWAY || '/graphql'

const httpLink = createHttpLink({ uri })

// Attach the bearer token saved by the auth store (key shared with auth/stores/auth.js).
// Read from storage per-request so login/logout take effect without rebuilding the client.
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('pm_token')
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
})

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
