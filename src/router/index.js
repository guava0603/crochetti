import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { auth } from '@/firebaseConfig'
import { waitForAuthInit } from '@/services/auth/waitForAuthInit'
import { onAuthStateChanged } from 'firebase/auth'

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
      meta: { requiresAuth: true, footer: 'record-options' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { bannerTitleKey: 'auth.login', bannerShowBack: false, requiresAuth: false, footer: 'none' },
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
      meta: { footer: 'none' },
    },
    {
      path: '/user/:user_id',
      name: 'user',
      component: () => import('../views/UserView.vue'),
      meta: { requiresAuth: true, footer: 'record-options' },
    },
    {
      path: '/project/:project_id',
      name: 'project',
      component: () => import('../views/ProjectView.vue'),
      meta: { bannerOverlay: true, bannerTransparent: true, requiresAuth: true, footer: 'record-options' },
    },
    {
      path: '/project/:project_id/download-design',
      name: 'project-download-design',
      component: () => import('../views/DownloadDesignView.vue'),
      meta: { requiresAuth: true, footer: 'record-options' },
    },
    {
      path: '/project/:project_id/edit',
      name: 'project-edit',
      component: () => import('../views/EditProjectView.vue'),
      meta: { requiresAuth: true, footer: 'actions' },
    },
    {
      path: '/add-project',
      name: 'add-project',
      component: () => import('../views/AddProjectView.vue'),
      meta: { requiresAuth: true, footer: 'actions' },
    },
    {
      path: '/quick-start',
      name: 'quick-start',
      component: () => import('../views/QuickStartRecordView.vue'),
      meta: { requiresAuth: true, footer: 'actions' },
    },
    {
      path: '/record/:record_id',
      name: 'record',
      component: () => import('../views/RecordView.vue'),
      meta: { bannerTitleKey: 'record.record', requiresAuth: true, footer: 'record-options' },
    },
    {
      path: '/record/:record_id/time-slots',
      name: 'record-time-slots',
      redirect: (to) => ({
        name: 'record',
        params: to.params,
        query: { ...to.query, 'time-slots': '1' },
      }),
      meta: { requiresAuth: true },
    },

    {
      path: '/wish-pool',
      name: 'wish-pool',
      component: () => import('../views/WishPoolView.vue'),
      meta: { bannerTitleKey: 'wishPool.title', requiresAuth: true, footer: 'actions' },
    },

    // Debug utilities
    {
      path: '/debug/achievement-toast',
      name: 'debug-achievement-toast',
      component: () => import('../views/DebugAchievementToastView.vue'),
      meta: { bannerTitle: 'Debug: Achievement Toast', requiresAuth: true, footer: 'none' },
    },
  ],
})

router.beforeEach(async (to) => {
  const requiresAuth = Boolean(to.meta?.requiresAuth)
  const isLoginRoute = to.name === 'login'

  if (!requiresAuth && !isLoginRoute) return

  await waitForAuthInit()
  const isAuthed = Boolean(auth.currentUser?.uid)

  if (requiresAuth && !isAuthed) {
    const redirect = typeof to.fullPath === 'string' && to.fullPath ? to.fullPath : '/home'
    return {
      name: 'login',
      query: { redirect }
    }
  }

  if (isLoginRoute && isAuthed) {
    const raw = to.query?.redirect
    const redirect = Array.isArray(raw) ? raw[0] : raw
    if (typeof redirect === 'string' && redirect.startsWith('/')) {
      return redirect
    }
    return { name: 'home' }
  }
})

onAuthStateChanged(auth, (user) => {
  const route = router.currentRoute.value
  if (!route) return

  const isLoginRoute = route.name === 'login'
  const requiresAuth = Boolean(route.meta?.requiresAuth)
  const isAuthed = Boolean(user?.uid)

  if (requiresAuth && !isAuthed && !isLoginRoute) {
    const redirect = typeof route.fullPath === 'string' && route.fullPath ? route.fullPath : '/home'
    router.replace({ name: 'login', query: { redirect } })
  }
})

export default router
