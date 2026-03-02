<template>
  <div class="add-project-view">
    <TopBanner
      v-if="ready"
      :title="t('project.actions.editProject')"
      @last-page="$router.back()"
    />

    <div v-if="loading" class="loading" role="status" aria-live="polite">
      {{ $t('project.loading') }}
    </div>

    <div v-else-if="permissionDenied" class="no-permission" role="status" aria-live="polite">
      {{ $t('project.noPermission') }}
    </div>

    <div v-else-if="!projectData" class="not-found" role="status" aria-live="polite">
      {{ $t('project.notFound') }}
    </div>

    <template v-else>
      <!-- Progress indicator -->
      <div class="progress-steps">
        <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
          <div class="step-number">1</div>
          <div class="step-label">{{ $t('addProject.steps.basicInfo') }}</div>
        </div>
        <div class="step-divider"></div>
        <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
          <div class="step-number">2</div>
          <div class="step-label">{{ $t('addProject.steps.design') }}</div>
        </div>
      </div>

      <AddProjectInfo
        v-if="currentStep === 1"
        :initial-data="basicInfo"
        @next="handleNextStep"
      />

      <div
        v-if="currentStep === 1 && existingImages.length"
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

      <AddProjectDesign
        v-if="currentStep === 2"
        :project-name="basicInfo.name"
        :initial-data="designData"
        :submit-text="t('common.save')"
        :submitting-text="t('project.saving')"
        @back="handleBackStep"
        @submit="handleSubmit"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

import TopBanner from '@/components/layout/TopBanner.vue'
import AddProjectInfo from '@/components/AddProject/AddProjectInfo.vue'
import AddProjectDesign from '@/components/AddProject/AddProjectDesign.vue'
import ImageBox from '@/components/Image/ImageBox.vue'

import { auth, storage } from '@/firebaseConfig'
import { fetchProject, updateProject } from '@/services/firestore/projects'
import { isCurrentUser } from '@/services/firestore/user'

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

const designData = ref({
  component_list: [],
  is_public: false
})

const ready = computed(() => !loading.value)

const SCROLLBAR_HIDDEN_CLASS = 'hide-scrollbar'

if (typeof document !== 'undefined') {
  document.documentElement.classList.add(SCROLLBAR_HIDDEN_CLASS)
  document.body?.classList?.add?.(SCROLLBAR_HIDDEN_CLASS)
}

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove(SCROLLBAR_HIDDEN_CLASS)
  document.body?.classList?.remove?.(SCROLLBAR_HIDDEN_CLASS)
})

function normalizeEmptyNotesForSaveInPlace(componentList) {
  const list = Array.isArray(componentList) ? componentList : []
  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    if (!('notes' in c)) continue

    const notes = c.notes

    if (Array.isArray(notes)) {
      const hasObjectNotes = notes.some((n) => n && typeof n === 'object' && 'description' in n)

      if (hasObjectNotes) {
        const cleaned = notes
          .map((n) => {
            if (typeof n === 'string') return { description: n }
            return n
          })
          .map((n) => ({
            ...n,
            description: String(n?.description ?? '').trim()
          }))
          .filter((n) => n.description)

        if (cleaned.length) c.notes = cleaned
        else delete c.notes
      } else {
        const cleaned = notes.map((n) => String(n ?? '').trim()).filter(Boolean)
        if (cleaned.length) c.notes = cleaned
        else delete c.notes
      }
    } else if (typeof notes === 'string') {
      const cleaned = notes.trim()
      if (cleaned) c.notes = [cleaned]
      else delete c.notes
    } else {
      delete c.notes
    }
  }
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
      is_public: Boolean(data.is_public)
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
  currentStep.value = 2
}

const handleBackStep = (data) => {
  designData.value = data
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
    is_public: Boolean(data.is_public)
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
.add-project-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  position: relative;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #111827;
}

.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s;
}

.step.active .step-number,
.step.completed .step-number {
  background: #42b983;
  color: white;
}

.step-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.step.active .step-label {
  color: #111827;
  font-weight: 600;
}

.step-divider {
  width: 60px;
  height: 2px;
  background: #e5e7eb;
}

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
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
}

/* Common form styles for child components (match AddProjectView) */
:deep(h2) {
  margin-bottom: 2rem;
  color: #111827;
}

:deep(.step-form) {
  background: white;
  border-radius: 8px;
}

:deep(.form-group) {
  margin-bottom: 1.5rem;
}

:deep(label) {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
}

:deep(input[type="text"]),
:deep(input[type="number"]),
:deep(select),
:deep(textarea) {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

:deep(input[type="checkbox"]) {
  margin-right: 0.5rem;
}

:deep(input:focus),
:deep(textarea:focus),
:deep(select:focus) {
  outline: none;
  border-color: #42b983;
}

:deep(.button-group) {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

:deep(.btn-primary) {
  background: #42b983;
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

:deep(.btn-primary:hover:not(:disabled)) {
  background: #3aa876;
}

:deep(.btn-primary:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

:deep(.btn-secondary) {
  background: white;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

:deep(.btn-secondary:hover) {
  background: #f3f4f6;
}

:deep(.error) {
  color: #dc3545;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8d7da;
  border-radius: 4px;
}
</style>
