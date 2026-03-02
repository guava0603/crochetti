import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/user/:user_id',
      name: 'user',
      component: () => import('../views/UserView.vue'),
    },
    {
      path: '/project/:project_id',
      name: 'project',
      component: () => import('../views/ProjectView.vue'),
    },
    {
      path: '/project/:project_id/download-design',
      name: 'project-download-design',
      component: () => import('../views/DownloadDesignView.vue'),
    },
    {
      path: '/project/:project_id/edit',
      name: 'project-edit',
      component: () => import('../views/EditProjectView.vue'),
    },
    {
      path: '/add-project',
      name: 'add-project',
      component: () => import('../views/AddProjectView.vue'),
    },
    {
      path: '/record/:record_id',
      name: 'record',
      component: () => import('../views/RecordView.vue'),
    },
    {
      path: '/record/:record_id/time-slots',
      name: 'record-time-slots',
      redirect: (to) => ({
        name: 'record',
        params: to.params,
        query: { ...to.query, 'time-slots': '1' },
      }),
    },

    // Debug utilities
    {
      path: '/debug/achievement-toast',
      name: 'debug-achievement-toast',
      component: () => import('../views/DebugAchievementToastView.vue'),
    },
  ],
})

export default router
