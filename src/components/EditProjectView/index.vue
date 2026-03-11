<template>
  <ProjectWizardLayout
    :title="t('project.actions.editProject')"
    :show-banner="ready"
    :show-steps="!loading && !permissionDenied && !!projectData"
    :steps="[$t('addProject.steps.basicInfo'), $t('addProject.steps.design')]"
    :current-step="currentStep"
    :is-dirty="isDirty"
    @last-page="$router.back()"
  >
    <template #status>
      <div v-if="loading" class="loading" role="status" aria-live="polite">
        {{ $t('project.loading') }}
      </div>

      <div v-else-if="permissionDenied" class="no-permission" role="status" aria-live="polite">
        {{ $t('project.noPermission') }}
      </div>

      <div v-else-if="!projectData" class="not-found" role="status" aria-live="polite">
        {{ $t('project.notFound') }}
      </div>
    </template>

    <template #step-1>
      <AddProjectInfo
        ref="step1Ref"
        :initial-data="basicInfo"
        :component-list="designData.component_list"
        :existing-images="existingImages"
        :max-images="3"
        @remove-existing-image="removeExistingImageAt"
        @update:component-list="(list) => (designData.component_list = Array.isArray(list) ? list : [])"
        @next="handleNextStep"
        @dirty-change="setStep1Dirty"
      />
    </template>

    <template #step-2>
      <AddProjectDesign
        ref="step2Ref"
        :project-name="basicInfo.name"
        :initial-data="designData"
        :materials="basicInfo.materials"
        :submit-text="t('common.save')"
        :submitting-text="t('project.saving')"
        @back="handleBackStep"
        @submit="handleSubmit"
        @dirty-change="setStep2Dirty"
      />
    </template>
  </ProjectWizardLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { v4 as uuidv4 } from '@lukeed/uuid'

import ProjectWizardLayout from '@/components/projects/ProjectWizardLayout.vue'
import AddProjectInfo from '@/components/AddProjectView/AddProjectInfo.vue'
import AddProjectDesign from '@/components/AddProjectView/AddProjectDesign.vue'
import { normalizeEmptyNotesForSaveInPlace } from '@/utils/normalizeEmptyNotesForSave'

import { auth, storage } from '@/firebaseConfig'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { normalizeYarnMetaList } from '@/utils/yarnMeta'
import { useFooterContext } from '@/composables/footerContext'

defineOptions({ name: 'EditProjectViewMain' })

const emit = defineEmits(['api'])

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()
const footer = useFooterContext()

const projectId = computed(() => String(route.params.project_id || ''))

const loading = ref(true)
const permissionDenied = ref(false)
const projectData = ref(null)

const currentStep = ref(1)

const step1Ref = ref(null)
const step2Ref = ref(null)

const step2CanSubmit = computed(() => {
  return Boolean(step2Ref.value?.canSubmit?.value ?? step2Ref.value?.canSubmit)
})

const basicInfo = ref({
  name: '',
  description: '',
  image_files: [],
  materials: { hook: [], yarn: [] }
})

const existingImages = ref([])
const initialImages = ref([])
const imagesTouched = ref(false)

const step1Dirty = ref(false)
const step2Dirty = ref(false)
const initialBasicInfo = ref({ name: '', description: '' })
const initialDesignData = ref(null)

const designData = ref({
  component_list: [],
  is_public: false,
  self_defined_stitches: []
})

const ready = computed(() => !loading.value)

function safeSerialize(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

const committedDirty = computed(() => {
  const base = initialBasicInfo.value || { name: '', description: '' }
  const nameDirty = String(basicInfo.value?.name || '') !== String(base.name || '')
  const descDirty = String(basicInfo.value?.description || '') !== String(base.description || '')
  const hasNewUploads = Array.isArray(basicInfo.value?.image_files) && basicInfo.value.image_files.length > 0

  const baseHook = Array.isArray(base?.materials?.hook) ? base.materials.hook : []
  const baseYarn = Array.isArray(base?.materials?.yarn) ? base.materials.yarn : []
  const nextHook = Array.isArray(basicInfo.value?.materials?.hook) ? basicInfo.value.materials.hook : []
  const nextYarn = Array.isArray(basicInfo.value?.materials?.yarn) ? basicInfo.value.materials.yarn : []
  const hookDirty = safeSerialize(nextHook) !== safeSerialize(baseHook)
  const yarnDirty = safeSerialize(nextYarn) !== safeSerialize(baseYarn)

  const designBase = initialDesignData.value
  const designDirty = designBase ? (safeSerialize(designData.value) !== safeSerialize(designBase)) : false
  return nameDirty || descDirty || hasNewUploads || hookDirty || yarnDirty || designDirty || imagesTouched.value
})

const isDirty = computed(() => step1Dirty.value || step2Dirty.value || committedDirty.value)

watch(
  () => [currentStep.value, step1Dirty.value, step2Dirty.value, step2CanSubmit.value, loading.value, permissionDenied.value],
  () => {
    if (loading.value || permissionDenied.value || !projectData.value) {
      footer.clearActions()
      return
    }

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
        label: t('common.save'),
        disabled: !step2CanSubmit.value,
        onClick: () => step2Ref.value?.submit?.()
      }
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => footer.clearActions())

const setStep1Dirty = (v) => {
  step1Dirty.value = Boolean(v)
}

const setStep2Dirty = (v) => {
  step2Dirty.value = Boolean(v)
}

const isProjectOwner = computed(() => {
  const authorId = projectData.value?.authorId
  const uid = auth?.currentUser?.uid
  if (!uid || !authorId) return false
  return String(uid) === String(authorId)
})

onMounted(async () => {
  loading.value = true
  permissionDenied.value = false
  projectData.value = null

  try {
    const id = projectId.value
    if (!id) {
      loading.value = false
      return
    }

    const data = await callApi('fetchProject', id)
    projectData.value = data

    if (!data) {
      loading.value = false
      return
    }

    if (!isProjectOwner.value) {
      permissionDenied.value = true
      loading.value = false
      return
    }

    const urls = Array.isArray(data.images) ? data.images : []
    existingImages.value = urls
      .filter((x) => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 3)
    initialImages.value = [...existingImages.value]
    imagesTouched.value = false

    const extractedMaterials = extractMaterials(data)
    let extractedMaterialsSnapshot = extractedMaterials
    try {
      extractedMaterialsSnapshot = JSON.parse(JSON.stringify(extractedMaterials))
    } catch {
      extractedMaterialsSnapshot = extractedMaterials
    }

    basicInfo.value = {
      name: String(data.name || ''),
      description: String(data.description || ''),
      // File picker only; if user doesn't pick, keep existing project images.
      image_files: [],
      materials: extractedMaterials
    }

    designData.value = {
      component_list: Array.isArray(data.component_list) ? data.component_list : [],
      is_public: Boolean(data.is_public),
      self_defined_stitches: Array.isArray(data.self_defined_stitches) ? data.self_defined_stitches : []
    }

    initialBasicInfo.value = {
      name: String(data.name || ''),
      description: String(data.description || ''),
      materials: extractedMaterialsSnapshot
    }

    // Snapshot after load so committedDirty reflects changes relative to the server state.
    try {
      initialDesignData.value = JSON.parse(JSON.stringify(designData.value))
    } catch {
      initialDesignData.value = designData.value
    }
  } catch (e) {
    console.error('EditProjectView: failed to load project', e)
  } finally {
    loading.value = false
  }
})

function normalizeStringList(value) {
  const list = Array.isArray(value) ? value : []
  return list
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
}

function uniqueList(list) {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(list) ? list : []) {
    const v = String(raw ?? '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

function extractMaterialsFromComponents(componentList) {
  const list = Array.isArray(componentList) ? componentList : []
  const hookOut = []
  const yarnOut = []

  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    const hook = c?.metadata?.hook ?? c?.hook
    const yarn = c?.metadata?.yarn ?? c?.yarn
    hookOut.push(...normalizeStringList(hook))
    yarnOut.push(...normalizeStringList(yarn))
  }

  return {
    hook: uniqueList(hookOut),
    yarn: normalizeYarnMetaList(uniqueList(yarnOut))
  }
}

function extractMaterials(project) {
  const fromProject = project?.materials
  const hook = uniqueList(normalizeStringList(fromProject?.hook))
  const yarn = normalizeYarnMetaList(fromProject?.yarn)
  if (hook.length > 0 || yarn.length > 0) return { hook, yarn }
  return extractMaterialsFromComponents(project?.component_list)
}

function removeExistingImageAt(idx) {
  const list = Array.isArray(existingImages.value) ? [...existingImages.value] : []
  list.splice(idx, 1)
  existingImages.value = list
  imagesTouched.value = true
}

const handleNextStep = (data) => {
  basicInfo.value = data
  step1Dirty.value = false
  currentStep.value = 2
}

const handleBackStep = (data) => {
  designData.value = data
  step2Dirty.value = false
  currentStep.value = 1
}

const handleSubmit = async (data) => {
  const user = auth?.currentUser
  if (!user) return

  if (!projectData.value) return
  if (!isProjectOwner.value) {
    permissionDenied.value = true
    return
  }

  const id = projectId.value
  const keptExisting = Array.isArray(existingImages.value)
    ? existingImages.value.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim())
    : []

  const remainingSlots = Math.max(0, 3 - keptExisting.length)

  const imageFiles = Array.isArray(basicInfo.value?.image_files)
    ? basicInfo.value.image_files
        .filter((f) => f instanceof File)
        .slice(0, remainingSlots)
    : []

  const componentList = Array.isArray(data.component_list)
    ? data.component_list.map((c) => (c && typeof c === 'object' ? { ...c } : c))
    : []

  normalizeEmptyNotesForSaveInPlace(componentList)

  await callApi('updateProject', id, {
    name: basicInfo.value.name,
    description: basicInfo.value.description,
    materials: {
      hook: Array.isArray(basicInfo.value?.materials?.hook) ? basicInfo.value.materials.hook : [],
      yarn: Array.isArray(basicInfo.value?.materials?.yarn) ? basicInfo.value.materials.yarn : []
    },
    component_list: componentList,
    is_public: Boolean(data.is_public),
    self_defined_stitches: Array.isArray(data?.self_defined_stitches) ? data.self_defined_stitches : []
  })

  // Update images when user removed existing ones and/or added new uploads.
  if (imagesTouched.value || imageFiles.length) {
    try {
      const newUrls = []
      for (const file of imageFiles) {
        const contentType = file.type || 'image/jpeg'
        const ext = String(contentType).split('/')[1] || 'jpg'
        const path = `projects/${id}/images/${uuidv4()}.${ext}`
        const objRef = storageRef(storage, path)
        await uploadBytes(objRef, file, { contentType })
        newUrls.push(await getDownloadURL(objRef))
      }

      const finalUrls = [...keptExisting, ...newUrls].slice(0, 3)
      const sameAsInitial =
        finalUrls.length === initialImages.value.length &&
        finalUrls.every((u, i) => u === initialImages.value[i])

      if (!sameAsInitial) {
        await callApi('updateProject', id, { images: finalUrls })
      }
    } catch (e) {
      console.warn('EditProjectView: failed to upload images', e)
    }
  }

  router.push(`/project/${id}`)
}
</script>
