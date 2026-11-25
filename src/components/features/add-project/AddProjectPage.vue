<template>
  <Teleport to=".top-banner__side--right">
    <ThinIconButton
      src="039__file_choose"
      size="l"
      background="transparent"
      :disabled="savingDraft"
      :aria-label="savingDraft ? $t('addProject.savingDraft') : $t('addProject.saveToDraft')"
      :title="savingDraft ? $t('addProject.savingDraft') : $t('addProject.saveToDraft')"
      @click.stop="handleSaveDraft"
    />
  </Teleport>

  <ProjectWizardLayout
    :title="$t('addProject.title')"
    :steps="[$t('addProject.steps.basicInfo'), $t('addProject.steps.design')]"
    :current-step="currentStep"
    :is-dirty="isDirty"
    leave-confirm-mode="saveDraft"
    @last-page="$router.back()"
    @save-draft-and-leave="handleSaveDraftAndLeave"
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
import { ref, computed, watch, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAchievementStore } from '@/stores/achievementStore'
import { v4 as uuidv4 } from '@lukeed/uuid'
import AddProjectInfo from './AddProjectInfo.vue'
import AddProjectDesign from './AddProjectDesign.vue'
import ProjectWizardLayout from '@/components/features/project/ProjectWizardLayout.vue'
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'
import { normalizeEmptyNotesForSaveInPlace } from '@/utils/normalizeEmptyNotesForSave'
import { DEFAULT_PROJECT_CRAFT_TYPES, normalizeProjectCraftTypes } from '@/constants/projectCraft'
import { isProjectDraft } from '@/utils/projectDraft'
import { toTrimmedText as toText, uniqueTrimmedStrings } from '@/utils/text'
import { normalizeYarnMetaList } from '@/utils/yarnMeta'

import { auth, storage } from '@/firebaseConfig'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

import { openError } from '@/services/ui/notice'
import { openToast } from '@/services/ui/toast'
import { useFooterContext } from '@/composables/footerContext'
import { fetchProject } from '@/services/firestore/projects'
import { buildProjectSourceFromCopyFrom } from '@/utils/projectSource'

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
const savingDraft = ref(false)
const draftProjectId = ref('')
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
const savedBaseline = ref(null)

function normalizeImageList(value) {
  const list = Array.isArray(value) ? value : []
  return list
    .filter(Boolean)
    .map((x) => {
      if (typeof File !== 'undefined' && x instanceof File) return `file:${x.name}:${x.size}`
      return String(x)
    })
}

function snapshotBasicInfo(info) {
  const b = info && typeof info === 'object' ? info : {}
  return {
    name: toText(b.name),
    description: toText(b.description),
    image_files: normalizeImageList(b.image_files),
    materials: {
      hook: uniqueTrimmedStrings(b.materials?.hook),
      yarn: normalizeYarnMetaList(b.materials?.yarn)
        .map((m) => ({ type: toText(m?.type), amount: toText(m?.amount) }))
        .filter((m) => m.type)
    }
  }
}

function capturePageSnapshot() {
  return {
    basicInfo: snapshotBasicInfo(basicInfo.value),
    designData: designData.value ? deepClone(designData.value) : null,
    existingImages: normalizeExistingImageUrls(existingImages.value)
  }
}

function serializePageSnapshot(snap) {
  try {
    return JSON.stringify(snap)
  } catch {
    return ''
  }
}

function syncSavedBaseline() {
  savedBaseline.value = capturePageSnapshot()
  step1Dirty.value = false
  step2Dirty.value = false
}

function parseCopyFromIds(value) {
  const raw = typeof value === 'string' ? value : ''
  return raw
    .split(',')
    .map((x) => toText(x))
    .filter(Boolean)
}

function resolveDraftId() {
  return toText(draftProjectId.value) || toText(route.query?.draft)
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

function applyProjectPrefill(project, { fromDraft = false } = {}) {
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

  if (fromDraft) {
    draftProjectId.value = toText(project?.id)
  }

  prefillKey.value += 1
  nextTick(() => syncSavedBaseline())
}

async function applyCopyFromQuery() {
  const draftId = toText(route.query?.draft)
  if (draftId) {
    if (designData.value != null && draftProjectId.value === draftId) return

    const user = auth?.currentUser
    const project = await fetchProject(draftId).catch(() => null)
    if (!project || !isProjectDraft(project)) return
    if (user && String(project?.authorId || '') !== String(user.uid)) return

    applyProjectPrefill({ ...project, id: draftId }, { fromDraft: true })
    return
  }

  const ids = parseCopyFromIds(route.query?.copyFrom)
  if (!ids.length) return

  // Only apply once per entry to avoid overwriting user edits.
  if (designData.value != null) return

  if (ids.length === 1) {
    const project = await fetchProject(ids[0]).catch(() => null)
    if (!project || isProjectDraft(project)) return
    applyProjectPrefill(project)
    return
  }

  const projects = (await Promise.all(ids.map((id) => fetchProject(id).catch(() => null))))
    .filter(Boolean)
    .filter((p) => !isProjectDraft(p))

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
  () => [route.query?.copyFrom, route.query?.draft],
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
  if (!savedBaseline.value) return false
  return serializePageSnapshot(capturePageSnapshot()) !== serializePageSnapshot(savedBaseline.value)
})

onMounted(() => {
  nextTick(() => {
    if (!savedBaseline.value) syncSavedBaseline()
  })
})

function collectBasicInfo() {
  if (currentStep.value === 1 && typeof step1Ref.value?.getFormData === 'function') {
    return step1Ref.value.getFormData()
  }
  return {
    ...basicInfo.value,
    craft_types: normalizeProjectCraftTypes(basicInfo.value?.craft_types),
    materials: {
      hook: Array.isArray(basicInfo.value?.materials?.hook) ? basicInfo.value.materials.hook : [],
      needle: [],
      yarn: Array.isArray(basicInfo.value?.materials?.yarn) ? basicInfo.value.materials.yarn : []
    }
  }
}

function collectDesignData() {
  if (currentStep.value === 2 && typeof step2Ref.value?.getProjectData === 'function') {
    return step2Ref.value.getProjectData()
  }
  if (designData.value && typeof designData.value === 'object') {
    return deepClone(designData.value)
  }
  return {
    component_list: [],
    is_public: false,
    self_defined_stitches: []
  }
}

function buildPersistPayload({ isDraft }) {
  const user = auth?.currentUser
  if (!user) return null

  const info = collectBasicInfo()
  const design = collectDesignData()
  const componentList = Array.isArray(design.component_list)
    ? design.component_list.map((c) => (c && typeof c === 'object' ? { ...c } : c))
    : []

  normalizeEmptyNotesForSaveInPlace(componentList)

  const name = toText(info.name) || (isDraft ? t('addProject.draft.defaultName') : '')

  return {
    name,
    description: toText(info.description),
    craft_types: normalizeProjectCraftTypes(info?.craft_types),
    materials: {
      hook: Array.isArray(info?.materials?.hook) ? info.materials.hook : [],
      needle: [],
      yarn: Array.isArray(info?.materials?.yarn) ? info.materials.yarn : []
    },
    component_list: componentList,
    is_public: Boolean(design.is_public),
    is_draft: Boolean(isDraft),
    self_defined_stitches: Array.isArray(design?.self_defined_stitches) ? design.self_defined_stitches : [],
    images: normalizeExistingImageUrls(existingImages.value).slice(0, 3),
    authorId: user.uid,
    source: buildProjectSourceFromCopyFrom(route.query?.copyFrom)
  }
}

async function uploadPendingImages(projectId, existingImageUrls) {
  const imageFiles = Array.isArray(basicInfo.value?.image_files)
    ? basicInfo.value.image_files.filter((f) => f instanceof File).slice(0, 3)
    : []

  if (!imageFiles.length) return existingImageUrls

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
  existingImages.value = merged
  basicInfo.value.image_files = []
  return merged
}

function markSavedClean() {
  syncSavedBaseline()
}

async function persistDraft({ showSuccessToast = false } = {}) {
  if (savingDraft.value) return false

  const user = auth?.currentUser
  if (!user) {
    await openError({
      title: t('common.error'),
      message: t('addProject.errors.loginRequired'),
      confirmText: t('common.ok')
    })
    return false
  }

  const payload = buildPersistPayload({ isDraft: true })
  if (!payload) return false

  savingDraft.value = true
  try {
    let projectId = resolveDraftId()

    if (projectId) {
      await callApi('updateProject', projectId, payload)
    } else {
      projectId = await callApi('createProject', payload)
      draftProjectId.value = projectId
      await router.replace({ name: 'add-project', query: { draft: projectId } })
    }

    await uploadPendingImages(projectId, payload.images)
    markSavedClean()

    if (showSuccessToast) {
      openToast({ message: t('addProject.draft.savedToast') })
    }
    return true
  } catch (err) {
    console.error('Error saving draft:', err)
    await openError({
      title: t('common.error'),
      message: t('addProject.errors.draftSaveFailed', { message: String(err?.message || '') }),
      confirmText: t('common.ok')
    })
    return false
  } finally {
    savingDraft.value = false
  }
}

async function handleSaveDraft() {
  await persistDraft({ showSuccessToast: true })
}

async function handleSaveDraftAndLeave() {
  const ok = await persistDraft({ showSuccessToast: true })
  if (ok) router.back()
}

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
  if (!designData.value) {
    designData.value = {
      component_list: [],
      is_public: false,
      self_defined_stitches: []
    }
  }
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
      is_draft: false,
      self_defined_stitches: Array.isArray(data?.self_defined_stitches) ? data.self_defined_stitches : [],
      images: existingImageUrls,
      authorId: user.uid,
      source: buildProjectSourceFromCopyFrom(route.query?.copyFrom)
    }

    const existingDraftId = resolveDraftId()
    let finalProjectId = existingDraftId

    if (existingDraftId) {
      await callApi('updateProject', existingDraftId, projectData)
    } else {
      finalProjectId = await callApi('createProject', projectData)
    }

    await achievementStore.scanAndAwardNow(user.uid)

    if (imageFiles.length) {
      try {
        await uploadPendingImages(finalProjectId, existingImageUrls)
      } catch (error) {
        console.warn('Failed to upload project images:', error)
      }
    }

    router.replace({ name: 'project', params: { project_id: finalProjectId } })
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
