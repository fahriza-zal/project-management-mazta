import { createApp, provide, h } from 'vue'
import { createPinia } from 'pinia'
import { DefaultApolloClient } from '@vue/apollo-composable'

import App from './App.vue'
import router from './router'
import { apolloClient } from '@/shared/graphql/apolloClient'
import '@/shared/styles/main.css'

const app = createApp({
  // Provide the Apollo client app-wide so composables can use it once
  // GraphQL operations are introduced. No queries run until then.
  setup() {
    provide(DefaultApolloClient, apolloClient)
  },
  render: () => h(App),
})

app.use(createPinia())
app.use(router)

app.mount('#app')
