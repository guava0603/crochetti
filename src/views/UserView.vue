<template>
  <div class="user-view">
    <div v-if="loading" class="loading-container">
      <p>Loading user data...</p>
    </div>

    <div v-else-if="!userData" class="error-container">
      <h2>User not found</h2>
      <p>The user you're looking for doesn't exist.</p>
    </div>

    <div v-else>
      <!-- User bar - hidden if viewing own page -->
      <div v-if="!isMyPage" class="user-bar">
        <div class="user-info">
          <img v-if="userData.avatar" :src="userData.avatar" alt="User avatar" class="user-avatar" />
          <div v-else class="user-avatar-placeholder">
            {{ userData.name ? userData.name.charAt(0).toUpperCase() : 'U' }}
          </div>
          <span class="user-name">{{ userData.name || 'Anonymous User' }}</span>
        </div>
      </div>

      <!-- User profile content -->
      <div class="profile-content">
        <div class="profile-header">
          <img v-if="userData.avatar" :src="userData.avatar" alt="User avatar" class="profile-avatar" />
          <div v-else class="profile-avatar-placeholder">
            {{ userData.name ? userData.name.charAt(0).toUpperCase() : 'U' }}
          </div>
          <h1>{{ userData.name || 'Anonymous User' }}</h1>
          <p v-if="isMyPage" class="my-page-badge">This is your page</p>
          <button
            v-if="isMyPage"
            class="btn-logout"
            type="button"
            @click="handleLogout"
          >
            {{ $t('auth.logout') }}
          </button>
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
    </div>
  </div>
</template>

<script setup>
 import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { db, auth } from '../firebaseConfig'
import { doc, onSnapshot, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import ProjectList from '@/components/projects/ProjectList.vue'
import RecordList from '@/components/records/RecordList.vue'
import Tab from '@/components/tools/Tab.vue'
import { createProject, deleteProject as deleteProjectDoc } from '@/services/firestore/projects'
import { listUserRecords } from '@/services/firestore/records'
import { openConfirmation } from '@/services/ui/confirmation'

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

const activeTab = ref('design')
const profileTabs = computed(() => [
  { key: 'design', label: t('project.project') },
  { key: 'record', label: t('record.record') }
])

let unsubscribeSnapshot = null

// Check if viewing own page
const isMyPage = computed(() => {
  return currentUser.value && currentUser.value.uid === userId.value
})

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

    if (navigator.share) {
      await navigator.share({ title: project?.name || 'Project', url })
      return
    }

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(url)
      alert(t('project.linkCopiedNotice'))
      return
    }

    window.prompt(t('project.copyLinkPrompt'), url)
  } catch (error) {
    console.error('Error sharing project link:', error)
    alert('Failed to share link')
  }
}

const handleCopyProject = async (project) => {
  if (!project) return
  if (copyingProjectId.value) return

  copyingProjectId.value = project.id
  try {
    const uid = auth.currentUser?.uid
    if (!uid) {
      alert('Please login to copy project')
      return
    }

    const cloned = JSON.parse(JSON.stringify(project))
    delete cloned.id
    const baseName = String(project.name || '').trim() || 'Project'
    cloned.name = `${baseName} (Copy)`
    cloned.authorId = uid
    cloned.createdAt = new Date().toISOString()

    const newId = await createProject(cloned)
    await router.push({ path: `/project/${newId}`, query: { copied: '1' } })
  } catch (error) {
    console.error('Error copying project:', error)
    alert('Failed to copy project. Please try again.')
  } finally {
    copyingProjectId.value = null
  }
}

const handleDeleteProject = async (project) => {
  if (!project?.id) return

  await openConfirmation({
    title: t('project.deleteTitle'),
    message: t('project.deleteMessage', { name: project?.name || '' }),
    confirmText: t('common.delete'),
    cancelText: t('common.cancel'),
    confirmClass: 'btn-confirm-delete',
    loadingText: t('project.deleting'),
    onConfirm: async () => {
      await deleteProjectDoc(project.id)
      userProjects.value = userProjects.value.filter((p) => p.id !== project.id)
    }
  })
}

const handleLogout = async () => {
  try {
    await openConfirmation({
      title: t('auth.logoutTitle'),
      message: t('auth.logoutMessage'),
      confirmText: t('auth.logout'),
      cancelText: t('common.cancel'),
      loadingText: t('auth.loggingOut'),
      onConfirm: async () => {
        await signOut(auth)
        await router.push('/')
      }
    })
  } catch (error) {
    console.error('Error signing out:', error)
    alert('Failed to logout. Please try again.')
  }
}

// Function to fetch user's projects
const fetchUserProjects = async () => {
  try {
    const projectsRef = collection(db, 'projects')
    const q = isMyPage.value
      ? query(projectsRef, where('authorId', '==', userId.value))
      : query(projectsRef, where('authorId', '==', userId.value), where('is_public', '==', true))
    const querySnapshot = await getDocs(q)

    userProjects.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    console.log('Fetched user projects:', userProjects.value)
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
    userRecords.value = await listUserRecords(currentUser.value.uid)
  } catch (error) {
    console.error('Error fetching user records:', error)
    userRecords.value = []
  } finally {
    recordsLoading.value = false
  }
}

// Function to update user profile
const updateUserProfile = async (profileData) => {
  try {
    const profileDocRef = doc(db, 'artifacts', appId.value, 'users', userId.value, 'profile', 'info')
    await setDoc(profileDocRef, profileData, { merge: true })
    console.log('User profile updated successfully')
    return true
  } catch (error) {
    console.error('Error updating user profile:', error)
    return false
  }
}

onMounted(async () => {
  // Listen for current user
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user

    // Set up real-time listener for user data using onSnapshot
    try {
      const profileDocRef = doc(db, 'artifacts', appId.value, 'users', userId.value, 'profile', 'info')

      // Subscribe to real-time updates
      unsubscribeSnapshot = onSnapshot(
        profileDocRef,
        async (docSnapshot) => {
          console.log('User profile snapshot:', docSnapshot.data())
          if (docSnapshot.exists()) {
            userData.value = docSnapshot.data()
          } else {
            // Document doesn't exist yet, set default data
            userData.value = {
              name: user?.displayName || 'Anonymous User',
              avatar: user?.photoURL || null
            }
          }
          // Fetch user's projects
          await fetchUserProjects()
          await fetchUserRecords()
          loading.value = false
        },
        (error) => {
          console.error('Error listening to user profile:', error)
          userData.value = null
          loading.value = false
        }
      )
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

// Expose updateUserProfile for use in template or child components
defineExpose({
  updateUserProfile
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
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  object-fit: cover;
  margin: 0;
}

.profile-avatar-placeholder {
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
  margin: 0;
}

.profile-header h1 {
  margin: 0;
  color: #111827;
  font-size: 1.25rem;
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

</style>
