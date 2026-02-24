<template>
  <div class="user-view">
    <div v-if="loading" class="loading-container">
      <p>Loading user data...</p>
    </div>

    <div v-else-if="!userData" class="error-container">
      <h2>User not found</h2>
      <p>The user you're looking for doesn't exist.</p>
    </div>

    <template v-else>
      <!-- User profile content -->
      <div class="profile-content">
        <div class="profile-header">
          <img v-if="userData.avatar" :src="userData.avatar" alt="User avatar" class="profile-avatar" />
          <div v-else class="profile-avatar-placeholder">
            {{ userData.name ? userData.name.charAt(0).toUpperCase() : 'U' }}
          </div>
          <span class="profile-name">{{ userData.name || 'Anonymous User' }}</span>

          <div class="profile-header__actions">
            <MoreMenu
              :label="$t('user.settings.label')"
              :items="settingsMenuItems"
              @select="handleSettingsMenuSelect"
            >
              <template #icon>
                <ButtonSettingIcon />
              </template>
            </MoreMenu>
          </div>
        </div>

        <Tab :tabs="profileTabs" v-model="activeTab">
          <template #design>
            <ProjectList
              :projects="userProjects"
              :is-my-page="isMyPage"
              :copying-project-id="copyingProjectId"
              @open="(p) => navigateToProject(p.id)"
              @copy="handleCopyProject"
              @share="handleShareProject"
              @delete="handleDeleteProject"
            />
          </template>

          <template #record>
            <RecordList
              :records="userRecords"
              :loading="recordsLoading"
              :is-my-page="isMyPage"
              @open="(r) => navigateToRecord(r.id)"
              @deleted="(r) => { userRecords.value = userRecords.value.filter((x) => x.id !== r.id) }"
            />
          </template>
        </Tab>
      </div>
    </template>
  </div>

  <ProfileSettingsModal
    :show="showProfileSettings"
    :profile="userData"
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

  <ButtonAddIcon
    v-if="!loading && userData && isMyPage"
    class="user-fab"
    :aria-label="activeTab === 'design' ? $t('user.fab.addProject') : $t('user.fab.addRecord')"
    @click="handleFabClick"
  />

  <AddRecordFromUserModal
    :show="showAddRecordModal"
    :projects="userProjects"
    :loading="addRecordLoading"
    @cancel="showAddRecordModal = false"
    @add-project="handleGoAddProject"
    @select-project="handleStartRecordFromProject"
    @quick-add="handleQuickAddProjectAndStartRecord"
  />
</template>

<script setup>
 import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { v4 as uuidv4 } from '@lukeed/uuid'
import MoreMenu from '@/components/buttons/MoreMenu.vue'
import ButtonSettingIcon from '@/components/buttons/svg/ButtonSetting.vue'
import ButtonAddIcon from '@/components/buttons/svg/ButtonAdd.vue'
import ProfileSettingsModal from '@/components/modals/ProfileSettingsModal.vue'
import AddRecordFromUserModal from '@/components/modals/AddRecordFromUserModal.vue'
import ProjectList from '@/components/projects/ProjectList.vue'
import RecordList from '@/components/records/RecordList.vue'
import Tab from '@/components/tools/Tab.vue'
import { createProject, deleteProject as deleteProjectDoc, fetchProject } from '@/services/firestore/projects'
import { listUserRecordSummaries, setUserRecord } from '@/services/firestore/records'
import {
  fetchUserProjectSummaries,
  subscribeUserProfile,
  updateUserProfile as updateUserProfileDoc
} from '@/services/firestore/user'
import { createPattern, createRow, updateRowStats } from '@/constants/crochetData'
import { normalizeComponentListForRecord } from '@/utils/componentInstances'
import { openConfirmation } from '@/services/ui/confirmation'
import { openToast } from '@/services/ui/toast'
import { openError, openNotice } from '@/services/ui/notice'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()
const userId = ref(route.params.user_id)
const userData = ref(null)
const loading = ref(true)
const currentUser = ref(null)
const appId = ref('corchetti-ec876') // Your Firebase project ID
const userProjects = ref([])
const copyingProjectId = ref(null)
const userRecords = ref([])
const recordsLoading = ref(false)

const showProfileSettings = ref(false)
const savingProfile = ref(false)

const activeTab = ref('design')

const showAddRecordModal = ref(false)
const addRecordLoading = ref(false)

const profileTabs = computed(() => [
  { key: 'design', label: t('project.project') },
  { key: 'record', label: t('record.record') }
])

let unsubscribeSnapshot = null

// Check if viewing own page
const isMyPage = computed(() => {
  return currentUser.value && currentUser.value.uid === userId.value
})

const settingsMenuItems = computed(() => {
  if (isMyPage.value) {
    return [
      {
        action: 'edit-profile',
        label: t('user.settings.editProfile')
      },
      {
        action: 'logout',
        label: t('auth.logout'),
        danger: true
      }
    ]
  }

  if (currentUser.value) {
    return [
      {
        action: 'follow',
        label: t('user.settings.follow')
      }
    ]
  }

  return [
    {
      action: 'login',
      label: t('auth.login')
    }
  ]
})

const handleSettingsMenuSelect = async (action) => {
  if (action === 'edit-profile') {
    showProfileSettings.value = true
    return
  }
  if (action === 'logout') {
    await handleLogout()
    return
  }
  if (action === 'follow') {
    openNotice({
      title: t('common.notice'),
      message: t('user.settings.followNotImplemented'),
      confirmText: t('common.ok')
    })
    return
  }
  if (action === 'login') {
    await router.push('/')
  }
}

const handleFabClick = async () => {
  if (activeTab.value === 'design') {
    await router.push('/add-project')
    return
  }

  // record tab
  if (!auth.currentUser) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }

  showAddRecordModal.value = true
}

const handleGoAddProject = async () => {
  showAddRecordModal.value = false
  await router.push('/add-project')
}

const startRecordForProject = async (projectId, projectName, componentList) => {
  const user = auth.currentUser
  if (!user) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }

  const record_id = uuidv4()
  const newRecord = {
    project_id: String(projectId),
    project_name: String(projectName || ''),
    component_list: normalizeComponentListForRecord(componentList),
    time_slots: [],
    self_defined_status: []
  }

  await setUserRecord(user.uid, record_id, newRecord)
  await router.push(`/record/${record_id}`)
}

const handleStartRecordFromProject = async (projectId) => {
  if (!projectId) return

  addRecordLoading.value = true
  try {
    const local = userProjects.value.find((p) => String(p.id) === String(projectId))
    const project = local?.component_list ? local : ({
      id: projectId,
      ...(await fetchProject(projectId))
    })

    if (!project?.component_list || !Array.isArray(project.component_list)) {
      openError({
        title: t('common.error'),
        message: t('user.addRecord.errors.projectMissingDesign'),
        confirmText: t('common.ok')
      })
      return
    }

    showAddRecordModal.value = false
    await startRecordForProject(projectId, project?.name || '', project.component_list)
  } catch (error) {
    console.error('Error starting record:', error)
    openError({
      title: t('common.error'),
      message: t('user.addRecord.errors.startRecordFailed'),
      confirmText: t('common.ok')
    })
  } finally {
    addRecordLoading.value = false
  }
}

const buildQuickProjectComponentList = (projectName, rowCount, crochetCount) => {
  const rows = []
  for (let i = 1; i <= rowCount; i++) {
    const row = createRow(i, [createPattern(crochetCount, [{ type: 'stitch', stitch_id: 4 }])])
    updateRowStats(row)
    rows.push(row)
  }

  return [
    {
      name: `${projectName} 1`,
      type: 'component',
      count: 1,
      yarn: [''],
      hook: [''],
      metadata: {
        yarn: [],
        hook: []
      },
      content: {
        type: 0,
        row_list: rows,
        row_groups: [],
        consume: 0,
        generate: 0
      }
    }
  ]
}

const handleQuickAddProjectAndStartRecord = async ({ name, description, rowCount, crochetCount }) => {
  const user = auth.currentUser
  if (!user) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }

  addRecordLoading.value = true
  try {
    const safeName = String(name || '').trim()
    const safeDescription = String(description || '').trim()
    const safeRowCount = Math.max(1, Math.floor(Number(rowCount)))
    const safeCrochetCount = Math.max(1, Math.floor(Number(crochetCount)))

    const component_list = buildQuickProjectComponentList(safeName, safeRowCount, safeCrochetCount)
    const projectData = {
      name: safeName,
      description: safeDescription,
      component_list,
      is_public: false,
      authorId: user.uid,
      createdAt: new Date().toISOString()
    }

    const projectId = await createProject(projectData)
    userProjects.value = [
      {
        id: projectId,
        name: projectData.name,
        description: projectData.description,
        authorId: projectData.authorId,
        is_public: projectData.is_public,
        createdAt: projectData.createdAt
      },
      ...userProjects.value
    ]

    showAddRecordModal.value = false
    await startRecordForProject(projectId, safeName, component_list)
  } catch (error) {
    console.error('Error quick-adding project and starting record:', error)
    openError({
      title: t('common.error'),
      message: t('user.addRecord.errors.quickAddFailed'),
      confirmText: t('common.ok')
    })
  } finally {
    addRecordLoading.value = false
  }
}

const saveProfileSettings = async (next) => {
  if (!isMyPage.value) return

  const profileData = {
    ...userData.value,
    name: String(next?.name || '').trim() || (userData.value?.name || ''),
    avatar: next?.avatar || null
  }

  savingProfile.value = true
  try {
    const ok = await updateUserProfileDoc({
      appId: appId.value,
      userId: userId.value,
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

const navigateToRecord = (recordId) => {
  router.push(`/record/${recordId}`)
}

const handleShareProject = async (project) => {
  try {
    const href = router.resolve({ path: `/project/${project.id}` }).href
    const url = new URL(href, window.location.origin).toString()

    const title = String(project?.name || '').trim() || 'Project'
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
      message: 'Failed to share link',
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
          message: 'Project not found',
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
    await router.push({ path: `/project/${newId}`, query: { copied: '1' } })
  } catch (error) {
    console.error('Error copying project:', error)
    openError({
      title: t('common.error'),
      message: 'Failed to copy project. Please try again.',
      confirmText: t('common.ok')
    })
  } finally {
    copyingProjectId.value = null
  }
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
        await router.push('/')
      }
    })
  } catch (error) {
    console.error('Error signing out:', error)
    openError({
      title: t('common.error'),
      message: 'Failed to logout. Please try again.',
      confirmText: t('common.ok')
    })
  }
}

// Function to fetch user's projects
const fetchUserProjects = async () => {
  try {
    userProjects.value = await fetchUserProjectSummaries({
      userId: userId.value,
      includePrivate: Boolean(isMyPage.value)
    })
  } catch (error) {
    console.error('Error fetching user projects:', error)
    userProjects.value = []
  }
}

const fetchUserRecords = async () => {
  if (!isMyPage.value || !currentUser.value?.uid) {
    userRecords.value = []
    return
  }

  recordsLoading.value = true
  try {
    userRecords.value = await listUserRecordSummaries(currentUser.value.uid)
  } catch (error) {
    console.error('Error fetching user records:', error)
    userRecords.value = []
  } finally {
    recordsLoading.value = false
  }
}

onMounted(async () => {
  // Listen for current user
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user

    try {
      unsubscribeSnapshot = subscribeUserProfile({
        appId: appId.value,
        userId: userId.value,
        fallbackProfile: {
          name: user?.displayName || 'Anonymous User',
          avatar: user?.photoURL || null
        },
        onData: async (profile) => {
          userData.value = profile
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
  })
})

watch(
  () => isMyPage.value,
  async () => {
    await fetchUserRecords()
  }
)

onUnmounted(() => {
  // Cleanup: Unsubscribe from snapshot listener
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot()
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

/* User bar (shown when viewing others' pages) */
.user-bar {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 2rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  object-fit: cover;
}

.user-avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #42b983;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
}

.user-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

/* Profile content */
.profile-content {
  max-width: 100%;
  margin: 0;
  padding: 0;
  padding-top: 2.5rem;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.profile-header {
  position: relative;
  height: 3.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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

.btn-logout {
  background: white;
  color: #111827;
  border: 1px solid #d1d5db;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.05s;
}

.btn-logout:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-logout:active {
  transform: translateY(1px);
}

.profile-avatar {
  position: absolute;
  top: -2rem;
  left: 0.5rem;
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  border: 0.4rem solid white;
  object-fit: cover;
  margin: 0;
}

.profile-avatar-placeholder {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: #42b983;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.profile-name {
  position: absolute;
  bottom: 1rem;
  left: 6.5rem;
  margin: 0;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
}

.my-page-badge {
  display: inline-block;
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.user-fab {
  position: fixed;
  right: 36px;
  bottom: calc(36px + env(safe-area-inset-bottom));
  z-index: 1100;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.user-fab:active {
  transform: translateY(1px);
}

</style>
