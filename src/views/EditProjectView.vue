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
        :initial-data="basicInfo"
        @next="handleNextStep"
        @dirty-change="setStep1Dirty"
      />

      <div
        v-if="existingImages.length"
        class="existing-images"
        :aria-label="t('image.existingImages')"
      >
        <div class="existing-images__label">{{ t('image.uploadedImages') }}</div>
        <div class="existing-images__grid">
          <ImageBox
            v-for="(url, idx) in existingImages"
            :key="`${idx}-${url}`"
            class="existing-images__item"
            :image-url="url"
            alt=""
            :aria-label="t('image.openImage')"
            :openable="true"
            :show-delete="true"
            :delete-aria-label="t('common.delete')"
            :stop-propagation="true"
            @delete="removeExistingImageAt(idx)"
          />
        </div>
      </div>
    </template>

    <template #step-2>
      <AddProjectDesign
        :project-name="basicInfo.name"
        :initial-data="designData"
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

import ProjectWizardLayout from '@/components/projects/ProjectWizardLayout.vue'
import AddProjectInfo from '@/components/AddProject/AddProjectInfo.vue'
import AddProjectDesign from '@/components/AddProject/AddProjectDesign.vue'
import ImageBox from '@/components/Image/ImageBox.vue'

import { auth, storage } from '@/firebaseConfig'
import { fetchProject, updateProject } from '@/services/firestore/projects'
import { isCurrentUser } from '@/services/firestore/user'
import { normalizeEmptyNotesForSaveInPlace } from '@/utils/normalizeEmptyNotesForSave'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()

const projectId = computed(() => String(route.params.project_id || ''))

const loading = ref(true)
const permissionDenied = ref(false)
const projectData = ref(null)

const currentStep = ref(1)

const basicInfo = ref({
  name: '',
  description: '',
  image_files: []
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

  const designBase = initialDesignData.value
  const designDirty = designBase ? (safeSerialize(designData.value) !== safeSerialize(designBase)) : false
  return nameDirty || descDirty || hasNewUploads || designDirty || imagesTouched.value
})

const isDirty = computed(() => step1Dirty.value || step2Dirty.value || committedDirty.value)

const setStep1Dirty = (v) => {
  step1Dirty.value = Boolean(v)
}

const setStep2Dirty = (v) => {
  step2Dirty.value = Boolean(v)
}

const isProjectOwner = computed(() => {
  const authorId = projectData.value?.authorId
  return isCurrentUser(authorId)
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

    const data = await fetchProject(id)
    projectData.value = data

    if (!data) {
      loading.value = false
      return
    }

    if (!isCurrentUser(data.authorId)) {
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

    basicInfo.value = {
      name: String(data.name || ''),
      description: String(data.description || ''),
      // File picker only; if user doesn't pick, keep existing project images.
      image_files: []
    }

    designData.value = {
      component_list: Array.isArray(data.component_list) ? data.component_list : [],
      is_public: Boolean(data.is_public),
      self_defined_stitches: Array.isArray(data.self_defined_stitches) ? data.self_defined_stitches : []
    }

    initialBasicInfo.value = {
      name: String(data.name || ''),
      description: String(data.description || '')
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
  const user = auth.currentUser
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

  await updateProject(id, {
    name: basicInfo.value.name,
    description: basicInfo.value.description,
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
        await updateProject(id, { images: finalUrls })
      }
    } catch (e) {
      console.warn('EditProjectView: failed to upload images', e)
    }
  }

  router.push(`/project/${id}`)
}
</script>

<style scoped>
.existing-images {
  width: min(600px, 100%);
  margin: 0 auto 1rem;
}

.existing-images__label {
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;
}

.existing-images__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.existing-images__item {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  border: 1px solid var(--color-border-warm);
  background: var(--color-surface-page);
}
</style>
