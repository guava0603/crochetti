<template>
  <ButtonAddIcon
    class="user-fab"
    :aria-label="activeTab === 'design' ? $t('user.fab.addProject') : $t('user.fab.addRecord')"
    @click="handleFabClick"
  />

  <AddRecordFromUserModal
    :show="showAddRecordModal"
    :projects="projects"
    :loading="addRecordLoading"
    @cancel="showAddRecordModal = false"
    @add-project="handleGoAddProject"
    @select-project="handleStartRecordFromProject"
    @quick-add="handleQuickAddProjectAndStartRecord"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ButtonAddIcon from '@/components/buttons/svg/ButtonAdd.vue'
import AddRecordFromUserModal from '@/components/modals/AddRecordFromUserModal.vue'

import { auth } from '@/firebaseConfig'
import { createProject, fetchProject } from '@/services/firestore/projects'
import { createPattern, createRow, updateRowStats } from '@/constants/crochetData'
import { openError } from '@/services/ui/notice'
import { useAchievementStore } from '@/stores/achievementStore'
import { startRecordForProject } from '@/services/records/startRecordForProject'

const props = defineProps({
  activeTab: {
    type: String,
    required: true
  },
  projects: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['project-created'])

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const achievementStore = useAchievementStore()

const showAddRecordModal = ref(false)
const addRecordLoading = ref(false)

watch(
  () => props.activeTab,
  () => {
    // Avoid leaving the modal open when switching tabs.
    showAddRecordModal.value = false
  }
)

const handleFabClick = async () => {
  if (props.activeTab === 'design') {
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

const startRecordAndNavigate = async (projectId, projectName, componentList) => {
  const user = auth.currentUser
  if (!user) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }

  const { recordId } = await startRecordForProject({
    uid: user.uid,
    projectId,
    projectName,
    componentList
  })

  // Grant achievements immediately when the user fulfills goals (e.g. starting a
  // record with many ongoing records).
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
    await startRecordAndNavigate(projectId, project?.name || '', project.component_list)
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
    await achievementStore.scanAndAwardNow(user.uid)

    // Ensure the new project appears immediately in the modal list.
    emit('project-created', {
      id: projectId,
      name: projectData.name,
      description: projectData.description,
      authorId: projectData.authorId,
      is_public: projectData.is_public,
      createdAt: projectData.createdAt
    })

    showAddRecordModal.value = false
    await startRecordAndNavigate(projectId, safeName, component_list)
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
</script>
