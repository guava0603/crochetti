<template>
  <div class="project-view">
    <div v-if="noticeMessage" class="notice" role="status" aria-live="polite">
      {{ noticeMessage }}
    </div>

    <div v-if="loading">
      {{ $t('project.loading') }}
    </div>

    <div v-else-if="permissionDenied" class="no-permission" role="status" aria-live="polite">
      {{ $t('project.noPermission') }}
    </div>

    <div v-else-if="projectData">
      <div class="header-section">
        <LastPage />
        <div class="header-actions">
          <div
            v-if="isProjectOwner"
            class="mode-switch"
            :title="isProjectEditing ? $t('project.editMode') : $t('project.viewMode')"
          >
            <span class="mode-switch__label">{{ isProjectEditing ? $t('project.editMode') : $t('project.viewMode') }}</span>
            <label class="switch" aria-label="Toggle edit mode">
              <input
                type="checkbox"
                :checked="isProjectEditing"
                :disabled="savingProject"
                @change="onModeToggle"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="header-title">
        <h1 v-if="!isProjectEditing">{{ projectData.name }}</h1>
        <input
          v-else
          v-model="draftProject.name"
          class="project-name-input"
          type="text"
          autocomplete="off"
          :placeholder="$t('project.namePlaceholder')"
          @keydown.enter.prevent="confirmProjectEdit"
        />
      </div>

      <div
        v-if="isProjectOwner && isProjectEditing && draftProject"
        class="visibility-switch"
        :title="$t('project.visibility')"
      >
        <span class="visibility-switch__label">{{ $t('project.visibility') }}</span>
        <label class="switch" :aria-label="$t('project.visibility')">
          <input
            v-model="draftProject.is_public"
            type="checkbox"
            :disabled="savingProject"
          />
          <span class="slider"></span>
        </label>
        <span class="visibility-switch__state">
          {{ draftProject.is_public ? $t('project.public') : $t('project.private') }}
        </span>
      </div>

      <!-- Display each component -->
      <ComponentCard
        v-for="(component, cIndex) in activeProject.component_list"
        :key="cIndex"
        :component="component"
        :is-editing="isProjectEditing"
        @remove="removeComponent(cIndex)"
      >
      </ComponentCard>

      <!-- Add Component Buttons (only show when in project edit mode) -->
      <div v-if="isProjectEditing" class="add-component-section">
        <button type="button" @click="addComponentOfType('component')" class="btn-add-type">
          + Component
        </button>
        <button type="button" @click="addComponentOfType('stitch')" class="btn-add-type">
          + Stitch
        </button>
      </div>

      <div v-if="isProjectEditing" class="bottom-actions" role="region" :aria-label="$t('project.confirmUpdate')">
        <button
          class="btn-save"
          type="button"
          :disabled="savingProject || !isProjectDirty"
          @click="confirmProjectEdit"
        >
          {{ savingProject ? $t('project.saving') : $t('common.save') }}
        </button>
      </div>
    </div>

    <div v-if="projectData && !isProjectEditing" class="floating-play">
      <PlayButton @click="handlePlayClick" />
    </div>

    <div v-else>
      <p>{{ $t('project.notFound') }}</p>
    </div>

    <RecordSelectionModal
      v-bind="recordModal"
      @cancel="showRecordModal = false"
      @resume="handleResumeRecord"
      @start-new="handleStartNewRecord"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import ComponentCard from '../components/cards/ComponentCard.vue'
import LastPage from '../components/buttons/LastPage.vue'
import PlayButton from '../components/buttons/PlayButton.vue'
import RecordSelectionModal from '../components/modals/RecordSelectionModal.vue'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { fetchProject, updateProject } from '@/services/firestore/projects'
import { listUserRecordsByProjectId, setUserRecord } from '@/services/firestore/records'
import { isCurrentUser } from '@/services/firestore/user'
import { openConfirmation } from '@/services/ui/confirmation'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()
const projectId = ref(route.params.project_id)
const projectData = ref(null)
const draftProject = ref(null)
const loading = ref(true)
const permissionDenied = ref(false)
const isProjectEditing = ref(false)
const showRecordModal = ref(false)
const existingRecords = ref([])

const noticeMessage = ref('')
let noticeTimer = null
const savingProject = ref(false)

const isProjectOwner = computed(() => {
  const authorId = projectData.value?.authorId
  return isCurrentUser(authorId)
})

const activeProject = computed(() => {
  return isProjectEditing.value ? (draftProject.value || { name: '', component_list: [] }) : (projectData.value || { name: '', component_list: [] })
})

const isProjectDirty = computed(() => {
  if (!isProjectEditing.value) return false
  if (!draftProject.value || !projectData.value) return false
  const a = JSON.stringify({
    name: draftProject.value.name,
    is_public: Boolean(draftProject.value.is_public),
    component_list: draftProject.value.component_list
  })
  const b = JSON.stringify({
    name: projectData.value.name,
    is_public: Boolean(projectData.value.is_public),
    component_list: projectData.value.component_list
  })
  return a !== b
})

function showNotice(message) {
  noticeMessage.value = String(message || '')
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    noticeMessage.value = ''
  }, 2200)
}

// Modal configurations
const recordModal = computed(() => {
  const hasRecords = existingRecords.value.length > 0
  return {
    show: showRecordModal.value,
    title: hasRecords ? t('recordSelection.titleResumeOrStart') : t('recordSelection.titleStartRecording'),
    message: hasRecords ? t('recordSelection.messageHasExisting') : t('recordSelection.messageStartPrompt'),
    existingRecords: existingRecords.value,
    showResumeButton: hasRecords,
    showStartButton: true,
    startNewText: hasRecords ? t('project.startNew') : t('project.startRecording')
  }
})

onMounted(async () => {
  loading.value = true
  permissionDenied.value = false
  projectData.value = null

  const waitForAuthReady = () =>
    new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })

  try {
    await waitForAuthReady()

    projectData.value = await fetchProject(projectId.value)

    if (!projectData.value) {
      console.error('Project not found')
    }

    draftProject.value = null

    if (route.query?.copied === '1') {
      showNotice(t('project.copiedNotice'))
      const nextQuery = { ...route.query }
      delete nextQuery.copied
      router.replace({ query: nextQuery })
    }
  } catch (error) {
    console.error('Error entering project:', error)
    permissionDenied.value = String(error?.code || '') === 'permission-denied'
  } finally {
    loading.value = false
  }
})
// Project-level edit mode
const startProjectEdit = () => {
  isProjectEditing.value = true
  draftProject.value = projectData.value ? JSON.parse(JSON.stringify(projectData.value)) : { name: '', component_list: [] }
}

const cancelProjectEdit = () => {
  isProjectEditing.value = false
  draftProject.value = null
}

const confirmProjectEdit = async () => {
  if (!draftProject.value) return
  const nextName = String(draftProject.value?.name || '').trim()
  if (!nextName) return

  savingProject.value = true
  try {
    draftProject.value.name = nextName
    await updateProject(projectId.value, { ...draftProject.value })
    projectData.value = JSON.parse(JSON.stringify(draftProject.value))
    isProjectEditing.value = false
    draftProject.value = null
    showNotice(t('project.savedNotice'))
  } catch (error) {
    console.error('Error updating project:', error)
    alert('Failed to update project')
  } finally {
    savingProject.value = false
  }
}


function onModeToggle(e) {
  const next = Boolean(e?.target?.checked)

  if (next && !isProjectOwner.value) {
    if (e?.target) e.target.checked = false
    return
  }

  if (next) {
    startProjectEdit()
    return
  }

  if (isProjectDirty.value) {
    const ok = window.confirm(t('project.discardConfirm'))
    if (!ok) {
      if (e?.target) e.target.checked = true
      return
    }
  }

  cancelProjectEdit()
}


// Component creation helpers
const createPart = () => ({
  type: 0,
  row_list: [],
  consume: 0,
  generate: 0
})

const createComponent = (index, type = 'component') => {
  const component = {
    name: `${(draftProject.value?.name || projectData.value?.name || 'Project')} ${index + 1}`,
    type: type
  }

  if (type === 'component') {
    component.content = createPart()
    component.decorations = []
    component.notes = []
  } else {
    component.content = { text: '' }
  }

  return component
}

const addComponentOfType = async (type) => {
  if (!isProjectEditing.value || !draftProject.value) return

  const index = draftProject.value.component_list.length
  const newComponent = createComponent(index, type)

  // Add to draft only; saved by top-level confirm
  draftProject.value.component_list.push(newComponent)
}

const removeComponent = async (cIndex) => {
  if (!isProjectEditing.value || !draftProject.value) return
  if (!Array.isArray(draftProject.value.component_list)) return

  const component = draftProject.value.component_list?.[cIndex]
  const name = String(component?.name || '').trim()

  const ok = await openConfirmation({
    title: t('project.removeComponentTitle'),
    message: t('project.removeComponentMessage', { name: name || `#${cIndex + 1}` }),
    confirmText: t('common.delete'),
    cancelText: t('common.cancel'),
    confirmClass: 'btn-confirm-delete'
  })

  if (!ok) return
  draftProject.value.component_list.splice(cIndex, 1)
}


// Record tracking functions
const handlePlayClick = async () => {
  try {
    const user = auth.currentUser
    if (!user) {
      alert('Please login to start recording')
      return
    }

    const records = await listUserRecordsByProjectId(user.uid, projectId.value)
    existingRecords.value = records
    showRecordModal.value = true
  } catch (error) {
    console.error('Error checking records:', error)
    alert('Failed to check existing records')
  }
}

const handleResumeRecord = (recordIndex) => {
  showRecordModal.value = false
  const selected = existingRecords.value?.[recordIndex]
  if (!selected?.id) {
    alert('Record not found. Please try again.')
    return
  }
  router.push(`/record/${selected.id}`)
}

const handleStartNewRecord = async () => {
  showRecordModal.value = false
  const user = auth.currentUser
  if (!user) {
    alert('Please login to start recording')
    return
  }

  const cList = projectData.value.component_list
  cList.forEach(c => c.end_at = null);
  // Generate a new record_id
  const record_id = uuidv4()
  // Prepare new record data
  const newRecord = {
    project_id: projectId.value,
    project_name: projectData.value.name,
    component_list: JSON.parse(JSON.stringify(cList)),
    time_slots: [],
    self_defined_status: []
  }
  console.log('Starting new record with data:', newRecord)
  // Save to Firestore
  try {
    await setUserRecord(user.uid, record_id, newRecord)
    router.push(`/record/${record_id}`)
  } catch (error) {
    console.error('Error creating new record:', error)
    alert('Failed to create new record. Please try again.')
  }
}
</script>

<style scoped>
.project-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
}

.bottom-actions {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.notice {
  position: sticky;
  top: 0.75rem;
  z-index: 50;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(66, 185, 131, 0.35);
  background: rgba(66, 185, 131, 0.12);
  color: #0f5132;
  font-weight: 700;
}

.no-permission {
  padding: 2.5rem 1rem;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 800;
  color: #374151;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.header-title {
  display: flex;
  justify-content: center;
  margin: -1rem 0 2rem;
}

.header-title h1 {
  margin: 0;
  text-align: center;
}

.project-name-input {
  width: min(680px, 100%);
  font-size: 1.75rem;
  font-weight: 700;
  padding: 0.4rem 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  text-align: center;
}

.project-name-input:focus {
  outline: none;
  border-color: rgba(66, 185, 131, 0.9);
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.18);
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
}

.floating-play {
  position: fixed;
  right: calc(1.25rem + env(safe-area-inset-right));
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  z-index: 60;
}

.visibility-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.visibility-switch__label {
  font-size: 0.85rem;
  font-weight: 800;
  color: #374151;
  white-space: nowrap;
}

.visibility-switch__state {
  font-size: 0.85rem;
  font-weight: 800;
  color: #111827;
  white-space: nowrap;
}

.mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin-left: 0.25rem;
}

.mode-switch__label {
  font-size: 0.85rem;
  font-weight: 800;
  color: #374151;
  white-space: nowrap;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #d1d5db;
  transition: 0.18s;
  border-radius: 999px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 3px;
  top: 3px;
  background-color: white;
  transition: 0.18s;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}

.switch input:checked + .slider {
  background-color: #42b983;
}

.switch input:checked + .slider:before {
  transform: translateX(18px);
}

.switch input:disabled + .slider {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-copy {
  border: 1px solid rgba(66, 185, 131, 0.35);
  background: rgba(66, 185, 131, 0.12);
  color: #0f5132;
  border-radius: 10px;
  padding: 0.55rem 0.95rem;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s, opacity 0.15s;
  white-space: nowrap;
}

.btn-copy:hover {
  background: rgba(66, 185, 131, 0.18);
}

.btn-copy:active {
  transform: translateY(1px);
}

.btn-copy:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-save {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.btn-save:hover {
  background: #3aa876;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-delete {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-delete:hover {
  background: #b91c1c;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

:deep(.row-list-vertical) {
  /* background: white; */
  /* padding: 1rem; */
  border-radius: 6px;
}

.add-component-section {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  justify-content: center;
}

.btn-add-type {
  background: white;
  color: #42b983;
  padding: 0.75rem 1.5rem;
  border: 2px solid #42b983;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-type:hover {
  background: #42b983;
  color: white;
}
</style>
