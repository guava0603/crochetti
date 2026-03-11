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
        ref="step1Ref"
        :initial-data="basicInfo"
        :component-list="designData?.component_list"
        @next="handleNextStep"
        @update:component-list="(list) => {
          if (designData) designData.component_list = Array.isArray(list) ? list : []
        }"
        @dirty-change="setStep1Dirty"
      />
    </template>

    <template #step-2>
      <AddProjectDesign
        ref="step2Ref"
        :project-name="basicInfo.name"
        :initial-data="designData"
        :materials="basicInfo.materials"
        @back="handleBackStep"
        @submit="handleSubmit"
        @dirty-change="setStep2Dirty"
      />
    </template>
  </ProjectWizardLayout>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAchievementStore } from '@/stores/achievementStore'
import { v4 as uuidv4 } from '@lukeed/uuid'
import AddProjectInfo from './AddProjectInfo.vue'
import AddProjectDesign from './AddProjectDesign.vue'
import ProjectWizardLayout from '@/components/projects/ProjectWizardLayout.vue'
import { normalizeEmptyNotesForSaveInPlace } from '@/utils/normalizeEmptyNotesForSave'

import { auth, storage } from '@/firebaseConfig'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

import { openError } from '@/services/ui/notice'
import { useFooterContext } from '@/composables/footerContext'

defineOptions({ name: 'AddProjectViewMain' })

const emit = defineEmits(['api'])

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
const achievementStore = useAchievementStore()
const footer = useFooterContext()
const currentStep = ref(1)
const step1Dirty = ref(false)
const step2Dirty = ref(false)
const basicInfo = ref({
  name: '',
  description: '',
  image_files: [],
  materials: { hook: [], yarn: [] }
})
const designData = ref(null)

const step1Ref = ref(null)
const step2Ref = ref(null)

const step2CanSubmit = computed(() => {
  return Boolean(step2Ref.value?.canSubmit?.value ?? step2Ref.value?.canSubmit)
})

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
  const hookDirty = Array.isArray(basicInfo.value?.materials?.hook) && basicInfo.value.materials.hook.length > 0
  const yarnDirty = Array.isArray(basicInfo.value?.materials?.yarn) && basicInfo.value.materials.yarn.length > 0
  const hasBasic = nameDirty || descDirty || imagesDirty
  const hasMaterials = hookDirty || yarnDirty

  const hasDesign = designData.value != null
  return hasBasic || hasMaterials || hasDesign
})

watch(
  () => [currentStep.value, step1Dirty.value, step2Dirty.value, step2CanSubmit.value],
  () => {
    if (currentStep.value === 1) {
      footer.setActions({
        ariaLabel: t('addProject.info.submitBarAria'),
        justify: 'flex-end',
        primary: {
          label: t('addProject.common.next'),
          disabled: false,
          onClick: () => step1Ref.value?.submit?.()
        }
      })
      return
    }

    footer.setActions({
      ariaLabel: t('addProject.design.submitBarAria'),
      justify: 'space-between',
      secondary: {
        label: t('addProject.common.back'),
        disabled: false,
        onClick: () => step2Ref.value?.back?.()
      },
      primary: {
        label: t('addProject.design.createProject'),
        disabled: !step2CanSubmit.value,
        onClick: () => step2Ref.value?.submit?.()
      }
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => footer.clearActions())

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
    const user = auth?.currentUser
    if (!user) return

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
      materials: {
        hook: Array.isArray(basicInfo.value?.materials?.hook) ? basicInfo.value.materials.hook : [],
        yarn: Array.isArray(basicInfo.value?.materials?.yarn) ? basicInfo.value.materials.yarn : []
      },
      component_list: componentList,
      is_public: data.is_public,
      self_defined_stitches: Array.isArray(data?.self_defined_stitches) ? data.self_defined_stitches : [],
      authorId: user.uid,
      createdAt: new Date().toISOString()
    }

    const projectId = await callApi('createProject', projectData)
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

        await callApi('updateProject', projectId, { images: urls })
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
