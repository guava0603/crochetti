<template>
  <Teleport to="#bottom-floating-right-slot">
    <FloatDockedButton
      v-if="shouldShowFab"
      image-src="assets/image/settings/015__circle_plus.svg"
      :invert-icon="true"
      :aria-label="ariaLabel"
      :title="ariaLabel"
      @click="handleFabClick"
    />
  </Teleport>

  <AddRecordFromUserModal
    :show="showAddRecordModal"
    :projects="projects"
    :loading="addRecordLoading"
    @cancel="showAddRecordModal = false"
    @add-project="handleGoAddProject"
    @select-project="handleStartRecordFromProject"
    @quick-start="handleQuickStart"
  />

  <SearchUserByIdModal
    :show="showSearchUserModal"
    @cancel="showSearchUserModal = false"
    @confirm="handleSearchUserConfirm"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import FloatDockedButton from '@/components/buttons/FloatDockedButton.vue'
import AddRecordFromUserModal from '@/components/modals/AddRecordFromUserModal.vue'
import SearchUserByIdModal from '@/components/modals/SearchUserByIdModal.vue'

import { auth } from '@/firebaseConfig'
import { fetchProject } from '@/services/firestore/projects'
import { openError } from '@/services/ui/notice'
import { useAchievementStore } from '@/stores/achievementStore'
import { startRecordForProject } from '@/services/records/startRecordForProject'

defineOptions({
  name: 'UserFabLauncher'
})

const props = defineProps({
  isMyPage: {
    type: Boolean,
    default: false
  },
  projects: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['project-created', 'open-user'])

const route = useRoute()
const router = useRouter()
const achievementStore = useAchievementStore()

const { t } = useI18n({ useScope: 'global' })

const showAddRecordModal = ref(false)
const addRecordLoading = ref(false)
const showSearchUserModal = ref(false)

function normalizeUserTab(raw) {
  const v = String(raw || '').trim().toLowerCase()
  if (v === 'design') return 'design'
  if (v === 'record' || v === 'records') return 'record'
  if (v === 'saved' || v === 'save-project' || v === 'save_project' || v === 'saved-project') return 'saved'
  if (v === 'following' || v === 'follow' || v === 'follows') return 'following'
  return 'design'
}

const activeTab = computed(() => normalizeUserTab(route.query?.tab || route.params?.tab))

const shouldShowFab = computed(() => {
  if (!props.isMyPage) return false
  return activeTab.value === 'design' || activeTab.value === 'record' || activeTab.value === 'following'
})

const ariaLabel = computed(() => {
  if (activeTab.value === 'design') return t('user.fab.addProject')
  if (activeTab.value === 'record') return t('user.fab.addRecord')
  if (activeTab.value === 'following') return t('user.fab.searchUser')
  return ''
})

watch(
  () => activeTab.value,
  () => {
    // Avoid leaving modals open when switching tabs.
    showAddRecordModal.value = false
    showSearchUserModal.value = false
  }
)

const handleFabClick = async () => {
  if (activeTab.value === 'design') {
    await router.push('/add-project')
    return
  }

  if (activeTab.value === 'record') {
    if (!auth.currentUser) return
    showAddRecordModal.value = true
    return
  }

  if (activeTab.value === 'following') {
    showSearchUserModal.value = true
  }
}

const handleGoAddProject = async () => {
  showAddRecordModal.value = false
  await router.push('/add-project')
}

const handleQuickStart = async () => {
  showAddRecordModal.value = false
  await router.push('/quick-start')
}

const startRecordAndNavigate = async (projectId, projectName, componentList, projectImage) => {
  const user = auth.currentUser
  if (!user) return

  const { recordId } = await startRecordForProject({
    uid: user.uid,
    projectId,
    projectName,
    projectImage,
    componentList
  })

  achievementStore.scanAndAwardNow(user.uid).catch((e) => {
    console.warn('[achievements] scan after start record failed:', e)
  })

  await router.push(`/record/${recordId}`)
}

const handleStartRecordFromProject = async (projectId) => {
  if (!projectId) return

  addRecordLoading.value = true
  try {
    const local = props.projects.find((p) => String(p.id) === String(projectId))
    const project = local?.component_list
      ? local
      : ({
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
    await startRecordAndNavigate(projectId, project?.name || '', project.component_list, project?.images?.[0] || '')
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

// Quick-start is now a full page flow at /quick-start.

const handleSearchUserConfirm = (id) => {
  const userId = id != null ? String(id).trim() : ''
  if (!userId) return

  showSearchUserModal.value = false
  emit('open-user', userId)
}
</script>
