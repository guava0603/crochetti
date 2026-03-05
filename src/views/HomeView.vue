<template>
  <main class="home-view">
    <div v-if="loading" class="loading-container">
      <p>{{ $t('user.loading') }}</p>
    </div>

    <template v-else>
      <div v-if="currentUser" class="user-view">
        <div v-if="!profile" class="error-container">
          <h2>{{ $t('user.notFoundTitle') }}</h2>
          <p>{{ $t('user.notFoundMessage') }}</p>
        </div>

        <template v-else>
          <div class="profile-content">
            <div class="profile-header">
              <span class="profile-name">{{ profile.name || $t('user.anonymous') }}</span>

              <div class="profile-header__actions">
                <MoreMenu
                  :label="$t('user.settings.label')"
                  :items="settingsMenuItems"
                  @select="handleSettingsMenuSelect"
                />
              </div>
            </div>

            <UserDataDisplay
              :name="profile.name"
              :avatar="profile.avatar"
              :fan-list="profile?.fan_list"
              :is-my-page="true"
              :badge-text="$t('user.myPageBadge')"
            />

            <AchievementCabinet
              v-if="currentUser?.uid"
              :user-id="String(currentUser.uid)"
              :is-my-page="true"
              :title="$t('achievement.sectionTitle')"
            />

            <UserTabPage
              v-model="activeTab"
              :tabs="profileTabs"
              :user-projects="userProjects"
              :saved-projects="savedProjects"
              :user-records="userRecords"
              :records-loading="recordsLoading"
              :following-users="followingUsers"
              :following-loading="followingLoading"
              :is-my-page="true"
              :copying-project-id="copyingProjectId"
              @open-project="(p) => navigateToProject(p.id)"
              @copy-project="handleCopyProject"
              @share-project="handleShareProject"
              @delete-project="handleDeleteProject"
              @open-record="(r) => navigateToRecord(r)"
              @project-created="handleProjectCreated"
              @open-user="handleOpenUser"
            />
          </div>
        </template>
      </div>

      <!-- Latest record: docked next to WishFab -->
      <Teleport to="#bottom-left-dock-before">
        <div v-if="latestRecordData" class="home-latest-record-dock">
          <div
            class="home-latest-record-panel"
            :class="{ 'is-hidden': latestRecordCollapsed }"
          >
            <RecordOptions
              :context="latestRecordOptionsContext"
              :actions="latestRecordOptionsActions"
              docked
              overlay-clickable
              @overlay-click="openLatestRecord"
            />
          </div>

          <!-- Crochetting button: always visible, toggles RecordOptions -->
          <div class="home-latest-record-mini-outer">
            <button
              type="button"
              class="home-latest-record-mini"
              :aria-label="latestRecordCollapsed ? 'Show record options' : 'Hide record options'"
              :title="latestRecordCollapsed ? 'Show record options' : 'Hide record options'"
              @click="latestRecordCollapsed = !latestRecordCollapsed"
            >
              <img
                class="home-latest-record-mini__icon"
                :src="crochetIconUrl"
                alt=""
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </Teleport>

      <ProfileSettingsModal
        :show="showProfileSettings"
        :profile="profile"
        :auth-user="currentUser"
        :saving="savingProfile"
        :title="$t('user.settings.editProfile')"
        :name-label="$t('user.profile.name')"
        :avatar-label="$t('user.profile.avatarUrl')"
        :cancel-text="$t('common.cancel')"
        :save-text="$t('common.save')"
        :saving-text="$t('common.saving')"
        @close="showProfileSettings = false"
        @save="saveProfileSettings"
      />

      <LoginModal
        :show="showLoginModal"
        @close="closeLoginModal"
        @login-success="handleLoginSuccess"
      />
    </template>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import LoginModal from '../components/LoginModal.vue'

import MoreMenu from '@/components/buttons/MoreMenu.vue'
import ProfileSettingsModal from '@/components/modals/ProfileSettingsModal.vue'
import UserTabPage from '@/components/User/UserView/TabPage.vue'
import UserDataDisplay from '@/components/User/UserView/UserDataDisplay.vue'
import AchievementCabinet from '@/components/achievements/AchievementCabinet.vue'
import RecordOptions from '@/components/FloatingTransparentBox/RecordOptions.vue'

import { useAchievementStore } from '@/stores/achievementStore'

import {
  createProject,
  deleteProject as deleteProjectDoc,
  fetchProject,
  fetchProjectSummariesByIds
} from '@/services/firestore/projects'
import { listUserRecordSummaries, fetchUserRecord, mergeUserRecord } from '@/services/firestore/records'
import {
  fetchUserProjectSummaries,
  fetchUsers,
  subscribeUserProfile,
  updateUserProfile as updateUserProfileDoc
} from '@/services/firestore/user'
import { openConfirmation } from '@/services/ui/confirmation'
import { openToast } from '@/services/ui/toast'
import { openError, openNotice } from '@/services/ui/notice'
import { storage } from '@/firebaseConfig'
import { originalStatuses } from '@/constants/status'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()

const currentUser = ref(null)
const profile = ref(null)
const loading = ref(true)
const authResolved = ref(false)

const userProjects = ref([])
const savedProjects = ref([])
const copyingProjectId = ref(null)
const userRecords = ref([])
const recordsLoading = ref(false)

const latestRecordData = ref(null)
const latestRecordToggling = ref(false)
let latestRecordFetchToken = 0

const latestRecordCollapsed = ref(false)
const HOME_LATEST_RECORD_COLLAPSED_KEY = 'home_latest_record_collapsed'

const crochetIconUrl = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/achievement/noun-crochet-5351977-FFFFFF.svg`
})

const latestRecordSummary = computed(() => {
  const list = userRecords.value
  return Array.isArray(list) && list.length ? list[0] : null
})

onMounted(() => {
  try {
    latestRecordCollapsed.value = window.localStorage?.getItem(HOME_LATEST_RECORD_COLLAPSED_KEY) === '1'
  } catch {
    console.warn('HomeView: failed to read latest record collapsed state from localStorage')
  }
})

watch(latestRecordCollapsed, (val) => {
  try {
    window.localStorage?.setItem(HOME_LATEST_RECORD_COLLAPSED_KEY, val ? '1' : '0')
  } catch {
    console.warn('HomeView: failed to save latest record collapsed state to localStorage')
  }
})

const openLatestRecord = () => {
  const id = latestRecordSummary.value?.id
  if (!id) return
  router.push({ name: 'record', params: { record_id: String(id) } })
}

const toggleErrorToast = (message) => {
  openToast({ message: String(message || '').trim() || t('common.saveFailed') })
}

const pauseLatestRecord = async () => {
  const uid = currentUser.value?.uid
  const id = latestRecordSummary.value?.id
  const record = latestRecordData.value
  if (!uid || !id || !record || latestRecordToggling.value) return

  const slots = Array.isArray(record?.time_slots) ? [...record.time_slots] : []
  if (!slots.length) return

  const last = slots[slots.length - 1]
  if (!last || last.end != null) return

  latestRecordToggling.value = true
  try {
    slots[slots.length - 1] = { ...last, end: new Date().toISOString() }
    await mergeUserRecord(String(uid), String(id), { time_slots: slots })
    latestRecordData.value = { ...record, time_slots: slots }
  } catch (e) {
    console.error('HomeView: pauseLatestRecord failed', e)
    toggleErrorToast(t('common.saveFailed'))
  } finally {
    latestRecordToggling.value = false
  }
}

const startLatestRecord = async () => {
  const uid = currentUser.value?.uid
  const id = latestRecordSummary.value?.id
  const record = latestRecordData.value
  if (!uid || !id || !record || latestRecordToggling.value) return

  const slots = Array.isArray(record?.time_slots) ? [...record.time_slots] : []
  const last = slots.length ? slots[slots.length - 1] : null
  if (last && last.end == null) return

  const list = Array.isArray(record?.component_list) ? record.component_list : []

  latestRecordToggling.value = true
  try {
    slots.push({
      start: new Date().toISOString(),
      end: null,
      status_id: Number(last?.status_id ?? 0),
      status_note: String(last?.status_note || ''),
      end_at_list: list.map((comp) => (comp?.end_at ? { ...comp.end_at } : null))
    })
    await mergeUserRecord(String(uid), String(id), { time_slots: slots })
    latestRecordData.value = { ...record, time_slots: slots }
  } catch (e) {
    console.error('HomeView: startLatestRecord failed', e)
    toggleErrorToast(t('common.saveFailed'))
  } finally {
    latestRecordToggling.value = false
  }
}

const latestRecordOptionsActions = {
  startRecording: () => startLatestRecord(),
  pauseRecording: () => pauseLatestRecord(),
  openStatusModal: () => openLatestRecord(),
  finishComponent: () => openLatestRecord()
}

const latestRecordOptionsContext = computed(() => {
  const record = latestRecordData.value
  const slots = Array.isArray(record?.time_slots) ? record.time_slots : []
  const lastSlot = slots.length ? slots[slots.length - 1] : null
  const isRecording = Boolean(lastSlot && lastSlot.end === null)

  const list = Array.isArray(record?.component_list) ? record.component_list : []
  const idx = Number(record?.last_selected_component_index ?? 0)
  const safeIdx = Number.isFinite(idx) ? Math.max(0, Math.min(list.length - 1, idx)) : 0
  const selected = list[safeIdx] || null

  return {
    recording: {
      isRecording,
      timeSlot: lastSlot
    },
    status: {
      id: Number(lastSlot?.status_id ?? 0),
      note: String(lastSlot?.status_note || ''),
      originalStatuses,
      selfDefinedStatuses: Array.isArray(record?.self_defined_status) ? record.self_defined_status : []
    },
    selected: {
      name: String(selected?.name || record?.project_name || record?.projectName || ''),
      endAt: selected?.end_at ?? null
    }
  }
})

const followingUsers = ref([])
const followingLoading = ref(false)
let followingFetchToken = 0

const showProfileSettings = ref(false)
const savingProfile = ref(false)

const activeTab = ref('design')

const showLoginModal = ref(false)

const achievementStore = useAchievementStore()

let unsubscribeAuth = null
let unsubscribeSnapshot = null
let showLoginTimer = null

onMounted(() => {
  // Listen for auth state changes
  unsubscribeAuth = onAuthStateChanged(auth, (u) => {
    authResolved.value = true
    currentUser.value = u
    if (showLoginTimer) {
      clearTimeout(showLoginTimer)
      showLoginTimer = null
    }

    if (!u) {
      profile.value = null
      loading.value = false
      showLoginModal.value = false
      // Delay a bit to avoid flashing the modal during auth hydration.
      showLoginTimer = setTimeout(() => {
        if (!currentUser.value) {
          showLoginModal.value = true
        }
      }, 200)
      return
    }

    // Logged in: wait for profile snapshot to resolve.
    loading.value = true
    showLoginModal.value = false
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
  if (unsubscribeSnapshot) unsubscribeSnapshot()
  if (showLoginTimer) {
    clearTimeout(showLoginTimer)
    showLoginTimer = null
  }
})

const handleLoginSuccess = (loggedInUser) => {
  currentUser.value = loggedInUser
  loading.value = true
  showLoginModal.value = false
}

const closeLoginModal = () => {
  // Home is a self page. If user is not logged in, keep login modal open.
  if (!currentUser.value) {
    showLoginModal.value = true
    return
  }
  showLoginModal.value = false
}

function normalizeUserTab(raw) {
  const v = String(raw || '').trim().toLowerCase()
  if (v === 'design') return 'design'
  if (v === 'record' || v === 'records') return 'record'
  if (v === 'saved' || v === 'save-project' || v === 'save_project' || v === 'saved-project') return 'saved'
  if (v === 'following' || v === 'follow' || v === 'follows') return 'following'
  return 'design'
}

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
  { key: 'record', label: t('record.record') },
  { key: 'following', label: t('user.followingListTitle') },
  { key: 'saved', label: t('user.tabs.savedDesigns') }
])

const settingsMenuItems = computed(() => [
  {
    action: 'edit-profile',
    label: t('user.settings.editProfile')
  },
  {
    action: 'copy-user-id',
    label: t('user.moreMenu.copyUserId')
  },
  {
    action: 'logout',
    label: t('auth.logout'),
    danger: true
  }
])

const handleSettingsMenuSelect = async (action) => {
  if (action === 'edit-profile') {
    showProfileSettings.value = true
    return
  }
  if (action === 'following') {
    activeTab.value = 'following'
    return
  }
  if (action === 'copy-user-id') {
    await handleCopyMyUserId()
    return
  }
  if (action === 'logout') {
    await handleLogout()
    return
  }
}

const handleCopyMyUserId = async () => {
  const uid = currentUser.value?.uid
  const id = uid != null ? String(uid).trim() : ''
  if (!id) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(id)
      openToast({ message: t('user.moreMenu.userIdCopied') })
      return
    }

    window.prompt(t('user.moreMenu.copyUserIdPrompt'), id)
  } catch (error) {
    console.error('Error copying user id:', error)
    openError({
      title: t('common.error'),
      message: t('user.moreMenu.copyUserIdFailed'),
      confirmText: t('common.ok')
    })
  }
}

const handleOpenUser = async (id) => {
  const userId = id != null ? String(id).trim() : ''
  if (!userId) return
  await router.push(`/user/${userId}`)
}

const followingIds = computed(() => {
  const list = profile.value?.following_list
  return Array.isArray(list) ? list.map(String).filter(Boolean) : []
})

watch(
  () => followingIds.value,
  async (ids) => {
    const token = ++followingFetchToken

    if (!currentUser.value?.uid) {
      followingUsers.value = []
      followingLoading.value = false
      return
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      followingUsers.value = []
      followingLoading.value = false
      return
    }

    followingLoading.value = true
    try {
      const users = await fetchUsers({ userIds: ids })
      if (token !== followingFetchToken) return

      const map = new Map(users.map((u) => [String(u.id), u]))
      followingUsers.value = ids.map((id) => map.get(String(id))).filter(Boolean)
    } catch (e) {
      console.error('HomeView: fetch following users failed', e)
      if (token !== followingFetchToken) return
      followingUsers.value = []
    } finally {
      if (token === followingFetchToken) followingLoading.value = false
    }
  },
  { immediate: true }
)

function safeFileName(name) {
  const raw = String(name || 'image')
  return raw.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'image'
}

async function uploadAvatarFile(file) {
  const uid = String(currentUser.value?.uid || '').trim() || 'unknown'
  const path = `users/${uid}/avatar/${Date.now()}-${safeFileName(file?.name)}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, file, { contentType: file?.type || undefined })
  return getDownloadURL(fileRef)
}

const saveProfileSettings = async (next) => {
  if (!currentUser.value?.uid) return
  if (!profile.value) return

  const profileData = {
    ...profile.value,
    name: String(next?.name || '').trim() || (profile.value?.name || ''),
    avatar: profile.value?.avatar || null
  }

  const avatarFile = Array.isArray(next?.avatar_files) ? next.avatar_files[0] : null
  if (avatarFile instanceof File) {
    try {
      profileData.avatar = await uploadAvatarFile(avatarFile)
    } catch (error) {
      console.error('avatar upload failed', error)
      openError({
        title: t('common.error'),
        message: t('user.profileSettingsModal.avatarUploadFailed'),
        confirmText: t('common.ok')
      })
      return
    }
  }

  savingProfile.value = true
  try {
    const ok = await updateUserProfileDoc({
      userId: String(currentUser.value.uid),
      profileData
    })
    if (ok) {
      showProfileSettings.value = false
      openNotice({
        title: t('common.notice'),
        message: t('user.settings.profileSaved'),
        confirmText: t('common.ok')
      })
    } else {
      openError({
        title: t('common.error'),
        message: t('user.settings.profileSaveFailed'),
        confirmText: t('common.ok')
      })
    }
  } finally {
    savingProfile.value = false
  }
}

const navigateToProject = (projectId) => {
  router.push(`/project/${projectId}`)
}

const navigateToRecord = (record) => {
  const id = String(record?.id || record || '').trim()
  if (!id) return
  const isCompleted = Boolean(record?.is_completed)
  router.push({
    name: 'record',
    params: { record_id: id },
    query: isCompleted ? { 'completed-result': '1' } : {}
  })
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

    const baseName = String(full?.name || project?.name || '').trim() || 'Project'
    const cloned = {
      ...JSON.parse(JSON.stringify(full)),
      name: `${baseName} (Copy)`,
      authorId: uid,
      createdAt: new Date().toISOString()
    }

    const newId = await createProject(cloned)
    // If this project creation satisfies an achievement (e.g., total_projects), notify immediately.
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

const handleProjectCreated = async (project) => {
  if (!project) return
  userProjects.value = [project, ...userProjects.value]

  const uid = currentUser.value?.uid
  if (!uid) return
  await achievementStore.scanAndAwardNow(uid)
}

const handleDeleteProject = async (project) => {
  if (!project?.id) return

  await openConfirmation({
    type: { id: 'deleteProject', params: { name: project?.name || '' } },
    onConfirm: async () => {
      await deleteProjectDoc(project.id)
      userProjects.value = userProjects.value.filter((p) => p.id !== project.id)
    }
  })
}

const handleLogout = async () => {
  try {
    await openConfirmation({
      type: 'logout',
      onConfirm: async () => {
        await signOut(auth)
        await router.push('/home')
      }
    })
  } catch (error) {
    console.error('Error signing out:', error)
    openError({
      title: t('common.error'),
      message: t('auth.logoutFailed'),
      confirmText: t('common.ok')
    })
  }
}

const fetchUserProjects = async () => {
  try {
    userProjects.value = await fetchUserProjectSummaries({
      userId: String(currentUser.value?.uid || ''),
      includePrivate: true
    })
  } catch (error) {
    console.error('Error fetching user projects:', error)
    userProjects.value = []
  }
}

const fetchSavedProjects = async () => {
  try {
    const ids = Array.isArray(profile.value?.save_project_list)
      ? profile.value.save_project_list
      : []

    if (!ids.length) {
      savedProjects.value = []
      return
    }

    savedProjects.value = await fetchProjectSummariesByIds(ids)
  } catch (error) {
    console.error('Error fetching saved projects:', error)
    savedProjects.value = []
  }
}

const fetchUserRecords = async () => {
  if (!currentUser.value?.uid) {
    userRecords.value = []
    latestRecordData.value = null
    return
  }

  recordsLoading.value = true
  try {
    userRecords.value = await listUserRecordSummaries(currentUser.value.uid)

    const top = Array.isArray(userRecords.value) && userRecords.value.length ? userRecords.value[0] : null
    const topId = top?.id
    if (!topId) {
      latestRecordData.value = null
      return
    }

    const token = ++latestRecordFetchToken
    try {
      const full = await fetchUserRecord(currentUser.value.uid, String(topId))
      if (token !== latestRecordFetchToken) return
      latestRecordData.value = full
    } catch {
      if (token !== latestRecordFetchToken) return
      latestRecordData.value = null
    }
  } catch (error) {
    console.error('Error fetching user records:', error)
    userRecords.value = []
    latestRecordData.value = null
  } finally {
    recordsLoading.value = false
  }
}

function getAuthFallbackProfile(authUser) {
  const provider = Array.isArray(authUser?.providerData)
    ? authUser.providerData.find(Boolean)
    : null

  const name =
    authUser?.displayName ||
    provider?.displayName ||
    authUser?.email ||
    provider?.email ||
    t('user.anonymous')

  const avatar = authUser?.photoURL || provider?.photoURL || null

  return {
    name: String(name || t('user.anonymous')),
    avatar: avatar ? String(avatar) : null
  }
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

watch(
  () => [authResolved.value, currentUser.value?.uid],
  async () => {
    if (!authResolved.value) {
      // Keep initial loading screen until Firebase resolves auth state.
      return
    }

    if (unsubscribeSnapshot) {
      unsubscribeSnapshot()
      unsubscribeSnapshot = null
    }

    if (!currentUser.value?.uid) {
      profile.value = null
      loading.value = false
      // onAuthStateChanged handles when to show the modal.
      return
    }

    loading.value = true
    const fallbackProfile = getAuthFallbackProfile(currentUser.value)

    try {
      unsubscribeSnapshot = subscribeUserProfile({
        userId: String(currentUser.value.uid),
        fallbackProfile,
        onData: async (profileData) => {
          profile.value = normalizeProfileWithFallback(profileData, fallbackProfile)
          await fetchUserProjects()
          await fetchSavedProjects()
          await fetchUserRecords()
          loading.value = false
        },
        onError: (error) => {
          console.error('Error listening to user profile:', error)
          profile.value = null
          loading.value = false
        }
      })
    } catch (error) {
      console.error('Error setting up user data listener:', error)
      profile.value = null
      loading.value = false
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.home-view {
  min-height: 100vh;
}

.user-view {
  min-height: 100vh;
  background: #f9fafb;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #6b7280;
}

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

.profile-name {
  margin: 0;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 600;
}

/* Bottom-left dock: latest record overlay + crochetting toggle button */
.home-latest-record-dock {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.home-latest-record-panel {
  position: absolute;
  left: 0;
  bottom: calc(64px + 10px);
  width: 100%;
  z-index: 1;
}

.home-latest-record-panel.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.home-latest-record-mini {
  width: 64px;
  height: 64px;
  border-radius: 9999px;
  border: none;
  background: var(--color-icon-add);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}

.home-latest-record-mini__icon {
  width: 30px;
  height: 30px;
  display: block;
}

.home-latest-record-mini:active {
  transform: translateY(1px);
}

</style>
