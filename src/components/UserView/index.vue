<template>
  <Teleport to=".top-banner__side--right">
    <div class="user-banner-actions" @click.stop>
      <ButtonStarIcon
        v-if="currentUser"
        :is-selected="isFollowing"
        @save="handleFollow"
        @unsave="handleUnfollow"
      />
    </div>
  </Teleport>

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
          :user-is-privacy="Boolean(userData?.is_privacy)"
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
import ButtonStarIcon from '@/components/buttons/svg/ButtonStar.vue'
import UserTabPage from '@/components/User/UserView/TabPage.vue'
import UserDataDisplay from '@/components/User/UserView/UserDataDisplay.vue'
import AchievementCabinet from '@/components/achievements/AchievementCabinet.vue'
import { useAchievementStore } from '@/stores/achievementStore'

import { openError } from '@/services/ui/notice'
import { openToast } from '@/services/ui/toast'
import { useAppBanner } from '@/composables/appBanner'

defineOptions({ name: 'UserViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null }
})

const currentUser = computed(() => props.currentUser)
const profile = computed(() => props.profile ?? null)

const emit = defineEmits(['api'])

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const { t } = useI18n({ useScope: 'global' })

const appBanner = useAppBanner()

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
const userProjects = ref([])
const copyingProjectId = ref(null)
const optimisticFollowingList = ref(null)

const userRecords = ref([])
const recordsLoading = ref(false)

const isViewingSelf = computed(() => {
  const currentUid = currentUser.value?.uid != null ? String(currentUser.value.uid).trim() : ''
  const viewedUid = userId.value != null ? String(userId.value).trim() : ''
  return Boolean(currentUid && viewedUid && currentUid === viewedUid)
})

const isPrivacyBlocked = computed(() => Boolean(userData.value?.is_privacy) && !isViewingSelf.value)

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
  const list = optimisticFollowingList.value ?? (Array.isArray(profile.value?.following_list)
    ? profile.value.following_list.map(String)
    : [])
  return Array.isArray(list) && list.includes(viewed)
})

let unsubscribeSnapshot = null

function arraysEqualAsStrings(a, b) {
  const aa = Array.isArray(a) ? a.map(String) : []
  const bb = Array.isArray(b) ? b.map(String) : []
  if (aa.length !== bb.length) return false
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false
  }
  return true
}

watch(
  () => (Array.isArray(profile.value?.following_list) ? profile.value.following_list.map(String) : []),
  (next) => {
    if (optimisticFollowingList.value && arraysEqualAsStrings(optimisticFollowingList.value, next)) {
      optimisticFollowingList.value = null
    }
  },
  { immediate: true }
)

const handleFollow = async () => {
  const uid = currentUser.value?.uid
  const targetId = userId.value
  if (!uid) return
  if (!targetId) return

  const prevFollowing = Array.isArray(optimisticFollowingList.value)
    ? optimisticFollowingList.value.map(String)
    : (Array.isArray(profile.value?.following_list)
      ? profile.value.following_list.map(String)
      : [])

  try {
    if (!prevFollowing.includes(String(targetId))) {
      optimisticFollowingList.value = [...prevFollowing, String(targetId)]
    }
    await callApi('followUser', { currentUserId: uid, targetUserId: targetId })
    openToast({ message: t('user.followed') })
  } catch (error) {
    console.error('follow failed', error)
    optimisticFollowingList.value = prevFollowing
    openError({ title: t('common.error'), message: t('user.followFailed'), confirmText: t('common.ok') })
  }
}

const handleUnfollow = async () => {
  const uid = currentUser.value?.uid
  const targetId = userId.value
  if (!uid) return
  if (!targetId) return

  const prevFollowing = Array.isArray(optimisticFollowingList.value)
    ? optimisticFollowingList.value.map(String)
    : (Array.isArray(profile.value?.following_list)
      ? profile.value.following_list.map(String)
      : [])

  try {
    optimisticFollowingList.value = prevFollowing.filter((x) => x !== String(targetId))
    await callApi('unfollowUser', { currentUserId: uid, targetUserId: targetId })
    openToast({ message: t('user.unfollowed') })
  } catch (error) {
    console.error('unfollow failed', error)
    optimisticFollowingList.value = prevFollowing
    openError({ title: t('common.error'), message: t('user.unfollowFailed'), confirmText: t('common.ok') })
  }
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/home')
}

const bannerTitle = computed(() => {
  const name = String(userData.value?.name || '').trim()
  return name || t('user.anonymous')
})

watch(
  () => [route.fullPath, bannerTitle.value],
  () => {
    if (!appBanner) return
    appBanner.setBanner({
      visible: true,
      title: bannerTitle.value,
      showBack: true,
      overlay: false,
      transparent: false,
      onBack: handleBack
    })
  },
  { immediate: true }
)

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

  if (isPrivacyBlocked.value) {
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
      ? await callApi('listUserRecordSummaries', uid)
      : await callApi('listPublicUserRecordSummaries', uid)
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
    const uid = currentUser.value?.uid
    if (!uid) return

    const full = await callApi('fetchProject', project.id)
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

    const newId = await callApi('createProject', cloned)
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
    if (isPrivacyBlocked.value) {
      userProjects.value = []
      return
    }
    userProjects.value = await callApi('fetchUserProjectSummaries', {
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

onMounted(() => {
  appBanner?.setBanner({ visible: true, showBack: true, onBack: handleBack })
})

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
      unsubscribeSnapshot = await callApi('subscribeUserProfile', {
        userId: userId.value,
        fallbackProfile,
        onData: async (profile) => {
          userData.value = normalizeProfileWithFallback(profile, fallbackProfile)

          if (isPrivacyBlocked.value) {
            userProjects.value = []
            userRecords.value = []
            recordsLoading.value = false
          } else {
            await fetchUserProjects()
            await fetchUserRecords()
          }
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

  appBanner?.setBanner({ onBack: null })
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

.user-banner-actions {
  display: inline-flex;
  align-items: center;
}
</style>
