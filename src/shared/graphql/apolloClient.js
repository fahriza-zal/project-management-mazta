/**
 * Apollo Client setup (scaffold).
 *
 * Endpoint comes from `API_GATEWAY` in `.env`. The auth feature already uses
 * real GraphQL; other features still run on mock data and migrate by importing
 * operations from their own `graphql/` folder (e.g. `@/features/projects/graphql`).
 */
import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'

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

// WebSocket link for GraphQL subscriptions (Strawberry gateway, graphql-transport-ws).
// WS isn't subject to the same CORS restriction as XHR, so we connect straight to the
// gateway — even in dev — deriving `wss://…`/`ws://…` from the http endpoint.
const gatewayUrl = import.meta.env.API_GATEWAY || 'https://pm.bangsat.online/graphql'
const wsUri = gatewayUrl.replace(/^http/i, 'ws')

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUri,
    lazy: true, // open the socket on the first subscription, not on load
    // A function so the current token is read on every (re)connect — this is how
    // subscriptions carry auth: the gateway reads it from the connection init payload.
    connectionParams: () => {
      const token = localStorage.getItem('pm_token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    },
  }),
)

// Route subscription operations over the WebSocket link; everything else over HTTP.
const link = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  wsLink,
  authLink.concat(httpLink),
)

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
