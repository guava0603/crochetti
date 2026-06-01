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
        :key="`add-project-info-${prefillKey}`"
        ref="step1Ref"
        :initial-data="basicInfo"
        :component-list="designData?.component_list"
        :existing-images="existingImages"
        @remove-existing-image="(idx) => existingImages.splice(idx, 1)"
        @next="handleNextStep"
        @update:component-list="(list) => {
          if (designData) designData.component_list = Array.isArray(list) ? list : []
        }"
        @dirty-change="setStep1Dirty"
      />
    </template>

    <template #step-2>
      <AddProjectDesign
        :key="`add-project-design-${prefillKey}`"
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
import { useRoute, useRouter } from 'vue-router'
import { useAchievementStore } from '@/stores/achievementStore'
import { v4 as uuidv4 } from '@lukeed/uuid'
import AddProjectInfo from './AddProjectInfo.vue'
import AddProjectDesign from './AddProjectDesign.vue'
import ProjectWizardLayout from '@/components/features/project/ProjectWizardLayout.vue'
import { normalizeEmptyNotesForSaveInPlace } from '@/utils/normalizeEmptyNotesForSave'
import { DEFAULT_PROJECT_CRAFT_TYPES, normalizeProjectCraftTypes } from '@/constants/projectCraft'
import { toTrimmedText as toText, uniqueTrimmedStrings } from '@/utils/text'

import { auth, storage } from '@/firebaseConfig'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

import { openError } from '@/services/ui/notice'
import { useFooterContext } from '@/composables/footerContext'
import { fetchProject } from '@/services/firestore/projects'

defineOptions({ name: 'AddProjectViewMain' })

const emit = defineEmits(['api'])

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()
const achievementStore = useAchievementStore()
const footer = useFooterContext()
const currentStep = ref(1)
const step1Dirty = ref(false)
const step2Dirty = ref(false)
const existingImages = ref([])
const prefillKey = ref(0)
const basicInfo = ref({
  name: '',
  craft_types: [...DEFAULT_PROJECT_CRAFT_TYPES],
  description: '',
  image_files: [],
  materials: { hook: [], needle: [], yarn: [] }
})
const designData = ref(null)

function parseCopyFromIds(value) {
  const raw = typeof value === 'string' ? value : ''
  return raw
    .split(',')
    .map((x) => toText(x))
    .filter(Boolean)
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeExistingImageUrls(value) {
  const list = Array.isArray(value) ? value : []
  return list
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
}

function mergeCraftTypes() {
  return [...DEFAULT_PROJECT_CRAFT_TYPES]
}

function mergeMaterials(projects) {
  const hook = []
  const needle = []
  const yarn = []

  for (const p of projects) {
    const m = p?.materials
    if (!m || typeof m !== 'object') continue
    if (Array.isArray(m.hook)) hook.push(...m.hook)
    if (Array.isArray(m.needle)) needle.push(...m.needle)
    if (Array.isArray(m.yarn)) yarn.push(...m.yarn)
  }

  return {
    hook: uniqueTrimmedStrings(hook),
    needle: uniqueTrimmedStrings(needle),
    yarn: Array.isArray(yarn) ? yarn.filter(Boolean) : []
  }
}

function mergeSelfDefinedStitches(projects) {
  const out = []
  const seen = new Set()

  for (const p of projects) {
    const list = Array.isArray(p?.self_defined_stitches) ? p.self_defined_stitches : []
    for (const s of list) {
      const id = Number(s?.stitch_id)
      if (!Number.isFinite(id)) continue
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ ...s, stitch_id: id })
    }
  }

  return out
}

function mergeComponentLists(projects) {
  const out = []
  for (const p of projects) {
    const list = Array.isArray(p?.component_list) ? p.component_list : []
    for (const c of list) {
      if (!c || typeof c !== 'object') continue
      out.push({ ...c })
    }
  }
  return out
}

async function applyCopyFromQuery() {
  const ids = parseCopyFromIds(route.query?.copyFrom)
  if (!ids.length) return

  // Only apply once per entry to avoid overwriting user edits.
  if (designData.value != null) return

  if (ids.length === 1) {
    const project = await fetchProject(ids[0]).catch(() => null)
    if (!project) return

    existingImages.value = normalizeExistingImageUrls(project?.images).slice(0, 3)

    basicInfo.value = {
      ...basicInfo.value,
      name: toText(project?.name),
      craft_types: normalizeProjectCraftTypes(project?.craft_types),
      description: toText(project?.description),
      image_files: [],
      materials: {
        hook: uniqueTrimmedStrings(project?.materials?.hook),
        needle: uniqueTrimmedStrings(project?.materials?.needle),
        yarn: Array.isArray(project?.materials?.yarn) ? deepClone(project.materials.yarn).filter(Boolean) : []
      }
    }

    designData.value = {
      component_list: Array.isArray(project?.component_list) ? deepClone(project.component_list) : [],
      is_public: Boolean(project?.is_public),
      self_defined_stitches: Array.isArray(project?.self_defined_stitches) ? deepClone(project.self_defined_stitches) : []
    }

    prefillKey.value += 1

    return
  }

  const projects = (await Promise.all(ids.map((id) => fetchProject(id).catch(() => null))))
    .filter(Boolean)

  if (!projects.length) return

  existingImages.value = []

  basicInfo.value = {
    ...basicInfo.value,
    name: '',
    description: '',
    craft_types: mergeCraftTypes(),
    materials: mergeMaterials(projects),
    image_files: []
  }

  designData.value = {
    component_list: mergeComponentLists(projects),
    is_public: false,
    self_defined_stitches: mergeSelfDefinedStitches(projects)
  }

  prefillKey.value += 1
}

watch(
  () => route.query?.copyFrom,
  () => {
    applyCopyFromQuery().catch((e) => console.warn('applyCopyFromQuery failed:', e))
  },
  { immediate: true }
)

const step1Ref = ref(null)
const step2Ref = ref(null)

const step1CanSubmit = computed(() => {
  return Boolean(step1Ref.value?.canSubmit?.value ?? step1Ref.value?.canSubmit)
})

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
  () => [currentStep.value, step1Dirty.value, step2Dirty.value, step1CanSubmit.value, step2CanSubmit.value],
  () => {
    if (currentStep.value === 1) {
      footer.setActions({
        ariaLabel: t('addProject.info.submitBarAria'),
        justify: 'flex-end',
        primary: {
          label: t('addProject.common.next'),
          disabled: !step1CanSubmit.value,
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

    const existingImageUrls = normalizeExistingImageUrls(existingImages.value).slice(0, 3)

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
      craft_types: normalizeProjectCraftTypes(basicInfo.value?.craft_types),
      materials: {
        hook: Array.isArray(basicInfo.value?.materials?.hook) ? basicInfo.value.materials.hook : [],
        needle: [],
        yarn: Array.isArray(basicInfo.value?.materials?.yarn) ? basicInfo.value.materials.yarn : []
      },
      component_list: componentList,
      is_public: data.is_public,
      self_defined_stitches: Array.isArray(data?.self_defined_stitches) ? data.self_defined_stitches : [],
      images: existingImageUrls,
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

        const merged = [...existingImageUrls, ...urls].filter(Boolean).slice(0, 3)
        await callApi('updateProject', projectId, { images: merged })
      } catch (error) {
        console.warn('Failed to upload project images:', error)
        // Project is created; continue navigation.
      }
    }

    // Replace so back does not return to add-project
    router.replace({ name: 'project', params: { project_id: projectId } })
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
