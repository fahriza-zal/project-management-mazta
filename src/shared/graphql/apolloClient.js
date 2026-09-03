/**
 * Apollo Client setup (scaffold).
 *
 * Endpoint comes from `API_GATEWAY` in `.env`. The auth feature already uses
 * real GraphQL; other features still run on mock data and migrate by importing
 * operations from their own `graphql/` folder (e.g. `@/features/projects/graphql`).
 */
import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useToast } from '@/shared/composables/useToast'
import router from '@/app/router'

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

// Detect an authentication error (expired / invalid session) from the gateway's
// error shape: a GraphQL error message or code, or a 401/403 network status.
function isAuthError(graphQLErrors, networkError) {
  const expiredPattern =
    /expired|unauthenticated|unauthorized|signature|invalid token|not authenticated|token/i
  const hasGqlAuthError = (graphQLErrors || []).some((err) => {
    const code = err?.extensions?.code
    return (
      code === 'UNAUTHENTICATED' ||
      code === 'FORBIDDEN' ||
      code === 'TOKEN_EXPIRED' ||
      expiredPattern.test(err?.message || '')
    )
  })
  const status = networkError?.statusCode || networkError?.response?.status
  return hasGqlAuthError || status === 401 || status === 403
}

// When the session expires: wipe it, tell the user, and route to /login. We use
// `clearSession()` (not `logout()`) because the token is already invalid — there's
// nothing to invalidate server-side, and `logout()` would keep storage on a failed
// server call, leaving us stuck as "authenticated". `router.push` keeps the SPA
// intact (no full reload). Imports are used lazily inside this function, so the
// router → auth store → apolloClient import cycle resolves fine at call time.
let handlingExpiry = false
function handleSessionExpired() {
  if (handlingExpiry) return // one failed batch can fire onError several times
  handlingExpiry = true

  const auth = useAuthStore()
  // Skip when we're not signed in anyway (e.g. a failed login on the login page).
  if (auth.isAuthenticated) {
    auth.clearSession()
    useToast().error('Sesi Anda telah berakhir. Silakan masuk kembali.')
    const current = router.currentRoute.value
    if (current.name !== 'login') {
      router.push({
        name: 'login',
        query: current.path !== '/' ? { redirect: current.fullPath } : {},
      })
    }
  }

  // Reset so a later expiry (after signing back in) is handled again.
  setTimeout(() => {
    handlingExpiry = false
  }, 1000)
}

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (isAuthError(graphQLErrors, networkError)) handleSessionExpired()
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
  from([errorLink, authLink, httpLink]),
)

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
