<template>
  <ProjectWizardLayout
    :title="$t('addProject.title')"
    :steps="[$t('addProject.steps.basicInfo'), $t('addProject.steps.design')]"
    :current-step="currentStep"
    :is-dirty="isDirty"
    @last-page="$router.back()"
  >
    <template #step-1>
      <AddProjectInfo
        :initial-data="basicInfo"
        @next="handleNextStep"
        @dirty-change="setStep1Dirty"
      />
    </template>

    <template #step-2>
      <AddProjectDesign
        :project-name="basicInfo.name"
        :initial-data="designData"
        @back="handleBackStep"
        @submit="handleSubmit"
        @dirty-change="setStep2Dirty"
      />
    </template>
  </ProjectWizardLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { auth, storage } from '../firebaseConfig'
import { createProject, updateProject } from '@/services/firestore/projects'
import { openError } from '@/services/ui/notice'
import { useAchievementStore } from '@/stores/achievementStore'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import AddProjectInfo from '../components/AddProject/AddProjectInfo.vue'
import AddProjectDesign from '../components/AddProject/AddProjectDesign.vue'
import ProjectWizardLayout from '@/components/projects/ProjectWizardLayout.vue'
import { normalizeEmptyNotesForSaveInPlace } from '@/utils/normalizeEmptyNotesForSave'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
const achievementStore = useAchievementStore()
const currentStep = ref(1)
const step1Dirty = ref(false)
const step2Dirty = ref(false)
const basicInfo = ref({
  name: '',
  description: '',
  image_files: []
})
const designData = ref(null)

const setStep1Dirty = (v) => {
  step1Dirty.value = Boolean(v)
}

const setStep2Dirty = (v) => {
  step2Dirty.value = Boolean(v)
}

const isDirty = computed(() => {
  if (step1Dirty.value || step2Dirty.value) return true
  const nameDirty = Boolean(String(basicInfo.value?.name || '').trim())
  const descDirty = Boolean(String(basicInfo.value?.description || '').trim())
  const imagesDirty = Array.isArray(basicInfo.value?.image_files) && basicInfo.value.image_files.length > 0
  const hasBasic = nameDirty || descDirty || imagesDirty

  const hasDesign = designData.value != null
  return hasBasic || hasDesign
})

const handleNextStep = (data) => {
  basicInfo.value = data
  currentStep.value = 2
}

const handleBackStep = (data) => {
  designData.value = data
  currentStep.value = 1
}

const handleSubmit = async (data) => {
  try {
    const user = auth.currentUser
    if (!user) {
      await openError({
        title: t('common.error'),
        message: t('addProject.errors.loginRequired'),
        confirmText: t('common.ok')
      })
      return
    }

    const imageFiles = Array.isArray(basicInfo.value?.image_files)
      ? basicInfo.value.image_files.filter((f) => f instanceof File).slice(0, 3)
      : []

    const componentList = Array.isArray(data.component_list)
      ? data.component_list.map((c) => (c && typeof c === 'object' ? { ...c } : c))
      : []

    normalizeEmptyNotesForSaveInPlace(componentList)

    const projectData = {
      name: basicInfo.value.name,
      description: basicInfo.value.description,
      component_list: componentList,
      is_public: data.is_public,
      self_defined_stitches: Array.isArray(data?.self_defined_stitches) ? data.self_defined_stitches : [],
      authorId: user.uid,
      createdAt: new Date().toISOString()
    }

    const projectId = await createProject(projectData)
    await achievementStore.scanAndAwardNow(user.uid)

    if (imageFiles.length) {
      try {
        const urls = []
        for (const file of imageFiles) {
          const contentType = file.type || 'image/jpeg'
          const ext = String(contentType).split('/')[1] || 'jpg'
          const path = `projects/${projectId}/images/${uuidv4()}.${ext}`
          const objRef = storageRef(storage, path)
          await uploadBytes(objRef, file, { contentType })
          urls.push(await getDownloadURL(objRef))
        }

        await updateProject(projectId, { images: urls })
      } catch (error) {
        console.warn('Failed to upload project images:', error)
        // Project is created; continue navigation.
      }
    }

    // Navigate to project page
    router.push(`/project/${projectId}`)
  } catch (err) {
    console.error('Error creating project:', err)
    await openError({
      title: t('common.error'),
      message: t('addProject.errors.createFailed', { message: String(err?.message || '') }),
      confirmText: t('common.ok')
    })
  }
}
</script>
