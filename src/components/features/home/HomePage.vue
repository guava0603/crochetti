<template>
  <Teleport to=".top-banner__side--right">
    <div v-if="currentUser && profile" class="home-banner-actions" @click.stop>
      <MoreMenu
        :label="$t('user.settings.label')"
        :sections="settingsMenuSections"
      />
    </div>
  </Teleport>

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
            <div class="profile-content-top">
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
            </div>

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
              :user-is-privacy="Boolean(profile?.is_privacy)"
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

      <div v-else class="loading-container">
        <p>{{ $t('user.loading') }}</p>
      </div>

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

      <SystemSettingsModal
        :show="showSystemSettings"
        @close="showSystemSettings = false"
      />
    </template>
  </main>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import MoreMenu from '@/components/shared/buttons/MoreMenu.vue'
import ProfileSettingsModal from '@/components/modals/user/ProfileSettingsModal.vue'
import SystemSettingsModal from '@/components/modals/global/SystemSettingsModal.vue'
import UserTabPage from '@/components/features/user/UserView/TabPage.vue'
import UserDataDisplay from '@/components/features/user/UserView/UserDataDisplay.vue'
import AchievementCabinet from '@/components/features/achievements/AchievementCabinet.vue'
import { useAppBanner } from '@/composables/appBanner'

import { auth } from '@/firebaseConfig'
import { signOut } from 'firebase/auth'

import { openConfirmation } from '@/services/ui/confirmation'
import { openError, openNotice } from '@/services/ui/notice'
import { openToast } from '@/services/ui/toast'
import { friendCodeUtils, getOrCreateCurrentUserFriendCode } from '@/services/firestore/friendCode'

import { useAchievementStore } from '@/stores/achievementStore'
import { AVATAR_IDS, avatarIdFromValue } from '@/constants/avatarPresets'

defineOptions({ name: 'HomeViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

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

const currentUser = computed(() => props.currentUser)
const profile = computed(() => props.profile ?? null)
const loading = computed(() => Boolean(props.loading))

const userProjects = ref([])
const savedProjects = ref([])
const copyingProjectId = ref(null)
const userRecords = ref([])
const recordsLoading = ref(false)

const achievementStore = useAchievementStore()

const activeTab = ref('design')

function normalizeUserTab(raw) {
  const v = String(raw || '').trim().toLowerCase()
  if (v === 'record' || v === 'records') return 'record'
  if (v === 'following' || v === 'follow') return 'following'
  if (v === 'saved' || v === 'save') return 'saved'
  return 'design'
}

// Route-driven tab control: `?tab=design|saved|record|following`
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

const showProfileSettings = ref(false)
const showSystemSettings = ref(false)
const savingProfile = ref(false)

const followingUsers = ref([])
const followingLoading = ref(false)
let followingFetchToken = 0

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

const bannerTitle = computed(() => {
  const profileName = profile.value?.name != null ? String(profile.value.name).trim() : ''
  if (profileName) return profileName

  const authName = currentUser.value?.displayName != null ? String(currentUser.value.displayName).trim() : ''
  if (authName) return authName

  const email = currentUser.value?.email != null ? String(currentUser.value.email).trim() : ''
  if (email && email.includes('@')) return email.split('@')[0]

  return t('user.anonymous')
})

watch(
  () => [route.fullPath, loading.value, Boolean(currentUser.value), Boolean(profile.value), bannerTitle.value],
  () => {
    if (loading.value) {
      appBanner?.setBanner({ visible: true, title: t('common.loading'), onBack: null })
      return
    }

    if (!currentUser.value) {
      appBanner?.setBanner({ visible: true, title: '', onBack: null })
      return
    }

    appBanner?.setBanner({ visible: true, title: bannerTitle.value, onBack: null })
  },
  { immediate: true }
)

function openProfileSettings() {
  showProfileSettings.value = true
}

function openSystemSettings() {
  showSystemSettings.value = true
}

const myFriendCode = computed(() => {
  const raw = profile.value?.friend_code ?? profile.value?.friendCode ?? ''
  return friendCodeUtils.normalizeCode(raw)
})

async function resolveFriendCodeForCopy() {
  let code = myFriendCode.value
  if (friendCodeUtils.isLikelyFriendCode(code)) return code

  try {
    const created = await getOrCreateCurrentUserFriendCode(profile.value || {})
    code = friendCodeUtils.normalizeCode(created)
  } catch (error) {
    console.error('Error creating friend code:', error)
  }

  return friendCodeUtils.isLikelyFriendCode(code) ? code : ''
}

const handleCopyFriendCode = async () => {
  if (!currentUser.value?.uid) return

  const code = await resolveFriendCodeForCopy()
  if (!code) {
    openError({
      title: t('common.error'),
      message: t('user.moreMenu.friendCodeUnavailable'),
      confirmText: t('common.ok')
    })
    return
  }

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(code)
      openToast({ message: t('user.moreMenu.friendCodeCopied') })
      return
    }

    window.prompt(t('user.moreMenu.copyFriendCodePrompt'), code)
  } catch (error) {
    console.error('Error copying friend code:', error)
    openError({
      title: t('common.error'),
      message: t('user.moreMenu.copyFriendCodeFailed'),
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
      const users = await callApi('fetchUsersPublicProfiles', { userIds: ids })
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

const saveProfileSettings = async (next) => {
  if (!currentUser.value?.uid) return
  if (!profile.value) return

  const allowedAvatarIdSet = new Set(AVATAR_IDS)
  const nextAvatarId = avatarIdFromValue(next?.avatar)
  const shouldTrackAvatar = nextAvatarId && allowedAvatarIdSet.has(nextAvatarId)

  const prevUsed = Array.isArray(profile.value?.avatar_used_ids)
    ? profile.value.avatar_used_ids
    : []

  const nextUsed = (() => {
    const out = []
    const seen = new Set()

    for (const raw of prevUsed) {
      const v = String(raw ?? '').trim()
      if (!v) continue
      if (!allowedAvatarIdSet.has(v)) continue
      if (seen.has(v)) continue
      seen.add(v)
      out.push(v)
    }

    if (shouldTrackAvatar && !seen.has(nextAvatarId)) {
      out.push(nextAvatarId)
    }

    return out
  })()

  const profileData = {
    ...profile.value,
    name: String(next?.name || '').trim() || (profile.value?.name || ''),
    is_privacy: Boolean(next?.is_privacy ?? profile.value?.is_privacy ?? false),
    avatar: next?.avatar || null,
    avatar_used_ids: nextUsed
  }

  savingProfile.value = true
  try {
    const ok = await callApi('updateUserProfileDoc', {
      userId: String(currentUser.value.uid),
      profileData
    })
    if (ok) {
      // Award any avatar-related achievements immediately after saving.
      achievementStore.scanAndAwardNow(String(currentUser.value.uid)).catch(() => {})
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
    query: isCompleted ? { 'result-sharing': '1' } : {}
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
    const uid = auth?.currentUser?.uid
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

    const baseName = String(full?.name || project?.name || '').trim() || 'Project'
    const cloned = {
      ...JSON.parse(JSON.stringify(full)),
      name: `${baseName} (Copy)`,
      authorId: uid,
      createdAt: new Date().toISOString()
    }

    const newId = await callApi('createProject', cloned)
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
      await callApi('deleteProjectDoc', project.id)
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

const settingsMenuSections = computed(() => [
  {
    key: 'profile',
    items: [
      {
        action: 'edit-profile',
        label: t('user.settings.editProfile'),
        iconSrc: '083__setting_edit',
        onSelect: openProfileSettings
      },
      {
        action: 'system-settings',
        label: t('user.moreMenu.systemSettings'),
        iconSrc: '082__setting_cog',
        onSelect: openSystemSettings
      },
      {
        action: 'copy-friend-code',
        label: t('user.moreMenu.copyFriendCode'),
        iconSrc: '069__hyperlink',
        onSelect: handleCopyFriendCode
      }
    ]
  },
  {
    key: 'account',
    items: [
      {
        action: 'logout',
        label: t('auth.logout'),
        iconSrc: '017__circle_close',
        danger: true,
        onSelect: handleLogout
      }
    ]
  }
])

const fetchUserProjects = async () => {
  try {
    userProjects.value = await callApi('fetchUserProjectSummaries', {
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

    savedProjects.value = await callApi('fetchProjectSummariesByIds', ids)
  } catch (error) {
    console.error('Error fetching saved projects:', error)
    savedProjects.value = []
  }
}

const fetchUserRecords = async () => {
  if (!currentUser.value?.uid) {
    userRecords.value = []
    return
  }

  recordsLoading.value = true
  try {
    userRecords.value = await callApi('listUserRecordSummaries', currentUser.value.uid)
  } catch (error) {
    console.error('Error fetching user records:', error)
    userRecords.value = []
  } finally {
    recordsLoading.value = false
  }
}

watch(
  () => (currentUser.value?.uid ? String(currentUser.value.uid) : ''),
  async (uid) => {
    if (!uid) {
      userProjects.value = []
      userRecords.value = []
      return
    }

    // Fetch in parallel; latest record is fetched globally via useCurrentUserProfile.
    await Promise.all([fetchUserProjects(), fetchUserRecords()])
  },
  { immediate: true }
)

watch(
  () => profile.value?.save_project_list,
  async () => {
    if (!currentUser.value?.uid || !profile.value) {
      savedProjects.value = []
      return
    }
    await fetchSavedProjects()
  },
  { immediate: true }
)
</script>

<style scoped>
.home-banner-actions {
  display: flex;
  align-items: center;
}

</style>
