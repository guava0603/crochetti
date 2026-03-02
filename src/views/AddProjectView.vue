<template>
  <div class="add-project-view">
    <TopBanner
      :title="$t('addProject.title')"
      @last-page="$router.back()"
    />

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

    <!-- Step 1: Basic Info -->
    <AddProjectInfo
      v-if="currentStep === 1"
      :initial-data="basicInfo"
      @next="handleNextStep"
    />

    <!-- Step 2: Project Design -->
    <AddProjectDesign
      v-if="currentStep === 2"
      :project-name="basicInfo.name"
      :initial-data="designData"
      @back="handleBackStep"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { onUnmounted, ref } from 'vue'
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
import TopBanner from '@/components/layout/TopBanner.vue'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
const achievementStore = useAchievementStore()
const currentStep = ref(1)
const basicInfo = ref({
  name: '',
  description: '',
  image_files: []
})
const designData = ref(null)

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

const handleNextStep = (data) => {
  basicInfo.value = data
  currentStep.value = 2
}

const handleBackStep = (data) => {
  designData.value = data
  currentStep.value = 1
}

function normalizeEmptyNotesForSaveInPlace(componentList) {
  const list = Array.isArray(componentList) ? componentList : []
  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    if (!('notes' in c)) continue

    const notes = c.notes

    if (Array.isArray(notes)) {
      const hasObjectNotes = notes.some(
        (n) => n && typeof n === 'object' && 'description' in n
      )

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
        const cleaned = notes
          .map((n) => String(n ?? '').trim())
          .filter(Boolean)

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

.step.active .step-number {
  background: #42b983;
  color: white;
}

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

/* Common form styles for child components */
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
