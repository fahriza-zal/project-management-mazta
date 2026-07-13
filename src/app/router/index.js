import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue'),
    meta: { layout: 'auth', public: true, title: 'Login' },
  },
  {
    path: '/',
    component: () => import('@/app/layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Dashboard', breadcrumb: ['Dashboard'] },
      },
      {
        path: 'transaction/project',
        name: 'projects',
        component: () => import('@/features/projects/pages/ProjectListPage.vue'),
        meta: {
          title: 'Projects',
          breadcrumb: ['Transaction', 'Projects'],
          permission: ['listProject', 'getProject'],
        },
      },
      {
        path: 'transaction/project/create',
        name: 'project-create',
        component: () => import('@/features/projects/pages/ProjectCreatePage.vue'),
        meta: {
          title: 'Create Project',
          breadcrumb: ['Transaction', 'Projects', 'Create'],
          permission: 'createProject',
        },
      },
      {
        path: 'transaction/project/:id/edit',
        name: 'project-edit',
        component: () => import('@/features/projects/pages/ProjectEditPage.vue'),
        meta: {
          title: 'Edit Project',
          breadcrumb: ['Transaction', 'Projects', 'Edit'],
          permission: 'editProject',
        },
      },
      {
        path: 'transaction/project/:id',
        name: 'project-detail',
        component: () => import('@/features/projects/pages/ProjectDetailPage.vue'),
        meta: {
          title: 'Project Detail',
          breadcrumb: ['Transaction', 'Projects', 'Detail'],
          permission: 'getProject',
        },
      },
      {
        path: 'transaction/project/:id/board',
        name: 'project-board',
        component: () => import('@/features/projects/pages/ProjectBoardPage.vue'),
        meta: {
          title: 'Board',
          breadcrumb: ['Transaction', 'Projects', 'Board'],
          permission: 'getProject',
        },
      },
      {
        path: 'transaction/timesheet',
        name: 'timesheet',
        component: () => import('@/features/timesheet/pages/TimesheetListPage.vue'),
        meta: {
          title: 'Timesheet',
          breadcrumb: ['Transaction', 'Timesheet'],
          permission: ['listTimeSheet', 'getTimeSheet'],
        },
      },
      {
        path: 'master/default-task',
        name: 'default-task',
        component: () => import('@/features/default-task/pages/DefaultTaskListPage.vue'),
        meta: {
          title: 'Default Task',
          breadcrumb: ['Master', 'Default Task'],
          permission: ['listDefaultTask', 'getDefaultTask'],
        },
      },
      {
        path: 'master/project-role',
        name: 'project-role',
        component: () => import('@/features/project-role/pages/ProjectRoleListPage.vue'),
        meta: {
          title: 'Project Role',
          breadcrumb: ['Master', 'Project Role'],
          permission: ['listProjectRole', 'getProjectRole'],
        },
      },
      {
        path: 'master/project-status',
        name: 'project-status',
        component: () => import('@/features/project-status/pages/ProjectStatusListPage.vue'),
        meta: {
          title: 'Project Status',
          breadcrumb: ['Master', 'Project Status'],
          permission: ['listProjectStatusDefinition', 'getProjectStatusDefinition'],
        },
      },
      {
        path: 'master/task-status',
        name: 'task-status',
        component: () => import('@/features/task-status/pages/TaskStatusListPage.vue'),
        meta: {
          title: 'Task Status',
          breadcrumb: ['Master', 'Task Status'],
          permission: ['listTaskStatusDefinition', 'getTaskStatusDefinition'],
        },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/features/account/pages/ProfilePage.vue'),
        meta: { title: 'Profile', breadcrumb: ['Profile'] },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/shared/pages/ForbiddenPage.vue'),
    meta: { layout: 'blank', title: 'Forbidden' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/shared/pages/NotFoundPage.vue'),
    meta: { layout: 'blank', public: true, title: 'Not Found' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.hydrate()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  // Permission gate: routes tagged with `meta.permission` require that operation.
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'forbidden' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Project Management` : 'Project Management'
})

export default router
