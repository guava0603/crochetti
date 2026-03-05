<template>
  <div class="user-view">
    <div v-if="loading" class="loading-container">
      <p>{{ $t('user.loading') }}</p>
    </div>

    <div v-else-if="!userData" class="error-container">
      <h2>{{ $t('user.notFoundTitle') }}</h2>
      <p>{{ $t('user.notFoundMessage') }}</p>
    </div>

    <template v-else>
      <!-- User profile content -->
      <div class="profile-content">
        <div class="profile-header">
          <div class="profile-header__nav">
            <LastPage @click="handleBack" />
          </div>

          <span class="profile-name">{{ userData.name || $t('user.anonymous') }}</span>

          <div class="profile-header__actions">
            <ButtonStarIcon
              v-if="currentUser"
              :is-selected="isFollowing"
              @save="handleFollow"
              @unsave="handleUnfollow"
            />
            <ButtonLoginIcon
              v-else
              @click="handleLoginClick"
            />
          </div>
        </div>

        <UserDataDisplay
          :name="userData.name"
          :avatar="userData.avatar"
          :fan-list="userData?.fan_list"
          :is-my-page="false"
          :badge-text="$t('user.myPageBadge')"
        />

        <AchievementCabinet
          v-if="userId"
          :user-id="String(userId)"
          :is-my-page="false"
          :earned-only="true"
          :title="$t('achievement.cabinet.title')"
        />

        <UserTabPage
          v-model="activeTab"
          :tabs="profileTabs"
          :user-projects="userProjects"
          :user-records="userRecords"
          :records-loading="recordsLoading"
          :is-my-page="false"
          :copying-project-id="copyingProjectId"
          @open-project="(p) => navigateToProject(p.id)"
          @open-record="(r) => navigateToRecord(r)"
          @copy-project="handleCopyProject"
          @share-project="handleShareProject"
          @project-created="(p) => { userProjects.value = [p, ...userProjects.value] }"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import ButtonStarIcon from '@/components/buttons/svg/ButtonStar.vue'
import ButtonLoginIcon from '@/components/buttons/svg/ButtonLogin.vue'
import LastPage from '@/components/buttons/LastPage.vue'
import UserTabPage from '@/components/User/UserView/TabPage.vue'
import UserDataDisplay from '@/components/User/UserView/UserDataDisplay.vue'
import AchievementCabinet from '@/components/achievements/AchievementCabinet.vue'
import {
  createProject,
  fetchProject,
} from '@/services/firestore/projects'
import { listPublicUserRecordSummaries, listUserRecordSummaries } from '@/services/firestore/records'
import {
  fetchUserProjectSummaries,
  followUser,
  subscribeUserProfile,
  unfollowUser
} from '@/services/firestore/user'
import { openToast } from '@/services/ui/toast'
import { openError } from '@/services/ui/notice'
import { useAchievementStore } from '@/stores/achievementStore'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()
function getViewedUserIdFromRoute(r) {
  const raw = r?.params?.user_id
  const id = raw != null ? String(raw).trim() : ''
  return id || null
}

const userId = ref(getViewedUserIdFromRoute(route))
const userData = ref(null)
const loading = ref(true)
const currentUser = ref(null)
const userProjects = ref([])
const copyingProjectId = ref(null)
const currentUserProfile = ref(null)

const userRecords = ref([])
const recordsLoading = ref(false)

const achievementStore = useAchievementStore()

const activeTab = ref('design')

watch(
  () => route.params?.user_id,
  () => {
    userId.value = getViewedUserIdFromRoute(route)
  }
)

function normalizeUserTab(raw) {
  const v = String(raw || '').trim().toLowerCase()
  if (v === 'record' || v === 'records') return 'record'
  return 'design'
}

watch(
  () => [userId.value, currentUser.value?.uid, route.query?.tab],
  async ([viewedId, uid, tab]) => {
    const viewed = viewedId != null ? String(viewedId) : ''
    const current = uid != null ? String(uid) : ''
    if (!viewed || !current) return
    if (viewed !== current) return

    const nextQuery = {}
    if (tab != null) {
      nextQuery.tab = normalizeUserTab(tab)
    }

    await router.replace({
      path: '/home',
      query: nextQuery
    })
  },
  { immediate: true }
)

// Route-driven tab control: `?tab=design|saved|record`
activeTab.value = normalizeUserTab(route.query?.tab || route.params?.tab)

watch(
  () => route.query?.tab,
  (next) => {
    const normalized = normalizeUserTab(next)
    if (normalized !== activeTab.value) {
      activeTab.value = normalized
    }
  }
)

watch(
  () => activeTab.value,
  async (next) => {
    const normalizedQueryTab = normalizeUserTab(route.query?.tab)
    if (next === normalizedQueryTab) return
    await router.replace({
      query: {
        ...route.query,
        tab: next
      }
    })
  }
)

const profileTabs = computed(() => [
  { key: 'design', label: t('project.project') },
  { key: 'record', label: t('record.record') }
])

const navigateToRecord = (record) => {
  const currentUid = currentUser.value?.uid != null ? String(currentUser.value.uid).trim() : ''
  const viewedUid = userId.value != null ? String(userId.value).trim() : ''

  // Viewing another user: always route to the project page.
  if (!currentUid || !viewedUid || currentUid !== viewedUid) {
    const projectId = String(record?.project_id || '').trim()
    if (!projectId) return
    router.push({ name: 'project', params: { project_id: projectId } })
    return
  }

  // Viewing self: route to record page.
  const id = String(record?.id || record || '').trim()
  if (!id) return
  const isCompleted = Boolean(record?.is_completed)
  router.push({
    name: 'record',
    params: { record_id: id },
    query: isCompleted ? { 'completed-result': '1' } : {}
  })
}

const isFollowing = computed(() => {
  const viewed = userId.value != null ? String(userId.value) : ''
  if (!viewed) return false
  const list = currentUserProfile.value?.following_list
  return Array.isArray(list) && list.map(String).includes(viewed)
})

let unsubscribeSnapshot = null
let unsubscribeCurrentUserSnapshot = null
let unsubscribeAuth = null

function optimisticUpdateFollowing(next) {
  const base = (currentUserProfile.value && typeof currentUserProfile.value === 'object')
    ? currentUserProfile.value
    : {}
  currentUserProfile.value = { ...base, following_list: next }
}

const handleFollow = async () => {
  const uid = currentUser.value?.uid
  const targetId = userId.value
  if (!uid) {
    openError({ title: t('common.error'), message: t('auth.loginRequired'), confirmText: t('common.ok') })
    return
  }
  if (!targetId) return

  const prevFollowing = Array.isArray(currentUserProfile.value?.following_list)
    ? currentUserProfile.value.following_list.map(String)
    : []

  try {
    if (!prevFollowing.includes(String(targetId))) {
      optimisticUpdateFollowing([...prevFollowing, String(targetId)])
    }
    await followUser({ currentUserId: uid, targetUserId: targetId })
    openToast({ message: t('user.followed') })
  } catch (error) {
    console.error('follow failed', error)
    optimisticUpdateFollowing(prevFollowing)
    openError({ title: t('common.error'), message: t('user.followFailed'), confirmText: t('common.ok') })
  }
}

const handleUnfollow = async () => {
  const uid = currentUser.value?.uid
  const targetId = userId.value
  if (!uid) {
    openError({ title: t('common.error'), message: t('auth.loginRequired'), confirmText: t('common.ok') })
    return
  }
  if (!targetId) return

  const prevFollowing = Array.isArray(currentUserProfile.value?.following_list)
    ? currentUserProfile.value.following_list.map(String)
    : []

  try {
    optimisticUpdateFollowing(prevFollowing.filter((x) => x !== String(targetId)))
    await unfollowUser({ currentUserId: uid, targetUserId: targetId })
    openToast({ message: t('user.unfollowed') })
  } catch (error) {
    console.error('unfollow failed', error)
    optimisticUpdateFollowing(prevFollowing)
    openError({ title: t('common.error'), message: t('user.unfollowFailed'), confirmText: t('common.ok') })
  }
}

const handleLoginClick = async () => {
  await router.push('/home')
}

const handleBack = async () => {
  // Prefer browser history when possible.
  if (window.history.length > 1) {
    router.back()
    return
  }
  await router.push('/home')
}

const navigateToProject = (projectId) => {
  router.push(`/project/${projectId}`)
}

async function fetchUserRecords() {
  const uid = userId.value != null ? String(userId.value).trim() : ''
  if (!uid) {
    userRecords.value = []
    recordsLoading.value = false
    return
  }

  // For other users, read from the public summaries collection.
  // For self, read private record summaries.
  const currentUid = currentUser.value?.uid != null ? String(currentUser.value.uid).trim() : ''

  recordsLoading.value = true
  try {
    userRecords.value = currentUid && currentUid === uid
      ? await listUserRecordSummaries(uid)
      : await listPublicUserRecordSummaries(uid)
  } catch (error) {
    console.error('Error fetching user records:', error)
    userRecords.value = []
  } finally {
    recordsLoading.value = false
  }
}

const handleShareProject = async (project) => {
  try {
    const href = router.resolve({ path: `/project/${project.id}` }).href
    const url = new URL(href, window.location.origin).toString()

    const title = String(project?.name || '').trim() || t('project.project')
    const text = `[${title}]\n${url}`

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      openToast({ message: t('project.linkCopiedNotice') })
      return
    }

    window.prompt(t('project.copyLinkPrompt'), text)
  } catch (error) {
    console.error('Error sharing project link:', error)
    openError({
      title: t('common.error'),
      message: t('project.errors.shareLinkFailed'),
      confirmText: t('common.ok')
    })
  }
}

const handleCopyProject = async (project) => {
  if (!project) return
  if (copyingProjectId.value) return

  copyingProjectId.value = project.id
  try {
    const uid = auth.currentUser?.uid
    if (!uid) {
      openError({
        title: t('common.error'),
        message: t('auth.loginRequired'),
        confirmText: t('common.ok')
      })
      return
    }

    const full = await fetchProject(project.id)
    if (!full) {
        openError({
          title: t('common.error'),
          message: t('project.notFound'),
          confirmText: t('common.ok')
        })
      return
    }
    userProjects.value = [
      {
        id: project.id,
        name: project.name,
        description: project.description,
        authorId: project.authorId,
        is_public: project.is_public,
        createdAt: project.createdAt
      },
      ...userProjects.value
    ]

    const baseName = String(full?.name || project?.name || '').trim() || 'Project'
    const cloned = {
      ...JSON.parse(JSON.stringify(full)),
      name: `${baseName} (Copy)`,
      authorId: uid,
      createdAt: new Date().toISOString()
    }

    const newId = await createProject(cloned)
    await achievementStore.scanAndAwardNow(uid)
    await router.push({ path: `/project/${newId}`, query: { copied: '1' } })
  } catch (error) {
    console.error('Error copying project:', error)
    openError({
      title: t('common.error'),
      message: t('project.errors.copyProjectFailed'),
      confirmText: t('common.ok')
    })
  } finally {
    copyingProjectId.value = null
  }
}

// Function to fetch user's projects
const fetchUserProjects = async () => {
  try {
    userProjects.value = await fetchUserProjectSummaries({
      userId: userId.value,
      includePrivate: false
    })
  } catch (error) {
    console.error('Error fetching user projects:', error)
    userProjects.value = []
  }
}

function getAuthFallbackProfile() {
  return { name: t('user.anonymous'), avatar: null }
}

function normalizeProfileWithFallback(profile, fallbackProfile) {
  const base = (profile && typeof profile === 'object') ? profile : {}
  const nameRaw = base?.name != null ? String(base.name).trim() : ''
  const avatarRaw = base?.avatar != null ? String(base.avatar).trim() : ''

  return {
    ...base,
    name: nameRaw || fallbackProfile?.name || t('user.anonymous'),
    avatar: avatarRaw || fallbackProfile?.avatar || null
  }
}


onMounted(async () => {
  // Track auth state, but fetch the viewed profile based on `userId`.
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
  })
})

watch(
  () => currentUser.value?.uid,
  (uid) => {
    if (unsubscribeCurrentUserSnapshot) {
      unsubscribeCurrentUserSnapshot()
      unsubscribeCurrentUserSnapshot = null
    }

    if (!uid) {
      currentUserProfile.value = null
      return
    }

    try {
      unsubscribeCurrentUserSnapshot = subscribeUserProfile({
        userId: uid,
        fallbackProfile: {},
        onData: (profile) => {
          currentUserProfile.value = (profile && typeof profile === 'object') ? profile : {}
        },
        onError: (error) => {
          console.error('Error listening to current user profile:', error)
          currentUserProfile.value = {}
        }
      })
    } catch (error) {
      console.error('Error setting up current user profile listener:', error)
      currentUserProfile.value = {}
    }
  },
  { immediate: true }
)

watch(
  () => userId.value,
  async () => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot()
      unsubscribeSnapshot = null
    }

    if (!userId.value) {
      userData.value = null
      loading.value = false
      return
    }

    loading.value = true
    const fallbackProfile = getAuthFallbackProfile()

    try {
      unsubscribeSnapshot = subscribeUserProfile({
        userId: userId.value,
        fallbackProfile,
        onData: async (profile) => {
          userData.value = normalizeProfileWithFallback(profile, fallbackProfile)
          await fetchUserProjects()
          await fetchUserRecords()
          loading.value = false
        },
        onError: (error) => {
          console.error('Error listening to user profile:', error)
          userData.value = null
          loading.value = false
        }
      })
    } catch (error) {
      console.error('Error setting up user data listener:', error)
      userData.value = null
      loading.value = false
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  // Cleanup: Unsubscribe from snapshot listener
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot()
  }

  if (unsubscribeCurrentUserSnapshot) {
    unsubscribeCurrentUserSnapshot()
  }

  if (unsubscribeAuth) {
    unsubscribeAuth()
  }
})
</script>

<style scoped>
.user-view {
  min-height: 100vh;
  background: #f9fafb;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #6b7280;
}

.error-container h2 {
  color: #374151;
  margin-bottom: 0.5rem;
}

/* Profile content */
.profile-content {
  max-width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.profile-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 2rem;
  z-index: 100;
}

.profile-header__actions {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.profile-header__nav {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.profile-name {
  margin: 0;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 600;
}

</style>
