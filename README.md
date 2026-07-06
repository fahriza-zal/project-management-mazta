# Project Management System — UI Starter

A modern, clean Project Management System **UI starter template** built with Vue 3 + Vite + Tailwind CSS. This stage delivers the **UI only** — every page runs on local mock data and is structured so GraphQL (Apollo Client) can be wired in later without rewriting components.

## Tech Stack

- **Vue 3** (Composition API, `<script setup>`, JavaScript — no TypeScript)
- **Vite** build tooling
- **Tailwind CSS** design system
- **Pinia** state management
- **Vue Router** with route-based layouts and a mock auth guard
- **Apollo Client** (configured but idle — no queries run yet)
- **Heroicons**

## Getting Started

```sh
npm install
npm run dev
```

Then open the printed URL. The login screen is pre-filled with demo credentials — just click **Sign in** (authentication is mocked).

```sh
npm run build     # production build
npm run preview   # preview the build
npm run format    # prettier
```

## Project Structure (Feature-Based)

Code is organized **by feature/domain**, not by file type. Each feature owns its
components, pages, stores, services, and GraphQL operations. Cross-cutting code
lives in `shared/`, and app wiring lives in `app/`.

```
src/
  app/                    entry + shell: main.js, App.vue, router/, layouts/
  features/
    auth/                 pages/ stores/ graphql/        (login, auth)
    dashboard/            components/ pages/ services/    (dashboard widgets)
    projects/             components/ pages/ stores/ services/ graphql/
    tasks/                components/ stores/ services/ graphql/  (Kanban board)
    account/              pages/                          (profile, settings)
  shared/
    components/base/       reusable UI primitives (Button, Input, Modal, Table…)
    components/layout/      Sidebar, Navbar, Breadcrumb, Footer
    components/common/      shared widgets (ToastHost)
    composables/  utils/  constants/  styles/
    stores/                global UI store
    services/              cross-feature mock data (users)
    graphql/               Apollo client + subscriptions
    pages/                 NotFoundPage
```

**Conventions:** features don't deep-import each other (share via `shared/`);
`base/` components stay domain-agnostic; GraphQL operations are co-located in each
feature's `graphql/` folder. The `@` alias points to `src/`.

## Design System

- **Colors:** Primary `#4F46E5`, Secondary `#6366F1`, Success `#22C55E`, Warning `#F59E0B`, Danger `#EF4444`, Info `#3B82F6`, Gray = Tailwind Slate
- **Font:** Inter
- **Style:** rounded-xl cards, soft shadows, thin borders, generous whitespace — desktop-first, responsive to mobile.

## From Mock Data to GraphQL

1. Set `VITE_GRAPHQL_URL` in a `.env` file.
2. Define operations in `src/graphql/queries|mutations|subscriptions`.
3. Replace the mock seeding inside the Pinia stores (`src/stores/*`) and the
   `src/services/*` helpers with Apollo composables. Components stay unchanged.

> No business logic or GraphQL operations are implemented yet — this is intentionally a clean UI foundation.
