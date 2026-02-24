<template>
  <div ref="recordViewRef" class="record-view">
    <div class="page-content">
      <div class="header-with-time">
        <span class="start-time" v-if="formattedStartTime">Start at: {{ formattedStartTime }}</span>
      </div>

      <div class="record-panel">
        <CarouselSelection
          v-model="selectedComponentIndex"
          :items="componentList"
          aria-label="Components"
          :get-progress="getComponentProgress"
          :get-item-label="getComponentLabel"
          @settle="handleCarouselSettle"
        />

        <!-- Project Display (Record mode) -->
        <div class="project-display">
          <div
            v-if="activeComponent"
            class="component-section"
            :ref="(el) => setComponentSectionRef(selectedComponentIndex, el)"
          >
            <span class="component-progress-tag">{{ getComponentProgress(selectedComponentIndex) }}%</span>
            <h4>{{ getComponentLabel(activeComponent, selectedComponentIndex) }}</h4>
            <RecordingTable
              :ref="(el) => setComponentTableRef(selectedComponentIndex, el)"
              :model-value="activeComponent.content.row_list"
              :row-groups="activeComponent.content.row_groups"
              :component-id="selectedComponentIndex"
              :component-name="getComponentLabel(activeComponent, selectedComponentIndex)"
              @update-end-at="(row_index, crochet_count) => handleUpdateEndAt(selectedComponentIndex, row_index, crochet_count)"
              @revert-selection="applySelectionForComponent(selectedComponentIndex)"
            />
          </div>
        </div>
        <div class="btn-wrapper">
          <button
            class="btn-sync-project"
            type="button"
            :disabled="syncingProject || !currentRecord"
            @click="handleSyncProject"
          >
            {{ syncingProject ? $t('record.syncing') : $t('record.syncProject') }}
          </button>
          <ButtonDelete
            :text="$t('record.deleteRecord')"
            type="deleteRecord"
            @click="deleteRecord"
          />
        </div>
      </div>

      <!-- Status select modal -->
      <UpdateStatus
        v-if="modalState.isStatusSelect && modalState.show"
        :title="modalState.title"
        :modalStatusId="modalStatusId"
        :modalStatusNote="modalStatusNote"
        :originalStatuses="originalStatuses"
        :selfDefinedStatuses="selfDefinedStatuses"
        :statusNotes="statusNotes"
        :addStatusNote="addStatusNote"
        :customStatusInput="customStatusInput"
        :onCancel="modalState.onCancel"
        :onConfirm="modalState.onConfirm"
        :handleModalStatusChange="handleModalStatusChange"
        :cancelAddCustomStatus="cancelAddCustomStatus"
        :confirmAddCustomStatus="confirmAddCustomStatus"
      />
    </div>

    <RecordOptions
      :isRecording="isRecording"
      :current-time-slot="lastTimeSlot"
      :currentStatusId="currentStatusId"
      :currentStatusNote="currentStatusNote"
      :originalStatuses="originalStatuses"
      :selfDefinedStatuses="selfDefinedStatuses"
      :handleStatusChange="handleStatusChange"
      :startRecording="startRecording"
      :pauseRecording="pauseRecording"
      :openModal="() => openModal('update-status')"
      :centered-component-end-at="centeredComponentEndAt"
      :centered-component-name="centeredComponentName"
    />
  </div>
</template>

<script setup>
import UpdateStatus from '@/components/modals/UpdateStatus.vue'
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { fetchProject } from '@/services/firestore/projects'
import { deleteUserRecord, fetchUserRecord, mergeUserRecord, setUserRecord } from '@/services/firestore/records'
import { openConfirmation } from '@/services/ui/confirmation'
import { openError, openNotice } from '@/services/ui/notice'
import { useRecordContext } from '@/composables/recordContext'

import { endAtToSelectionList } from '@/utils/crochetPosition.js'
import { expandComponentListByCount } from '@/utils/componentInstances'
import {
  clampCrochetCount,
  findRowWithRepeated,
  getComponentProgressPercent
} from '@/utils/recordProgressGenerate.js'
import RecordingTable from '@/components/CrochetTable/RecordingTable.vue'
import ButtonDelete from '@/components/buttons/ButtonDelete.vue'
import RecordOptions from '@/components/FloatingTransparentBox/RecordOptions.vue'
import CarouselSelection from '@/components/Input/CarouselSelection.vue'
import { originalStatuses } from '@/constants/status.js'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const recordCtx = useRecordContext()

const recordId = recordCtx?.recordId || ref(route.params.record_id)
const currentRecord = recordCtx?.recordData || ref(null)
const isRecording = ref(false)
const currentTime = ref(Date.now())
const currentUser = ref(null)

const recordViewRef = ref(null)

const componentList = computed(() => {
  const list = currentRecord.value?.component_list
  return Array.isArray(list) ? list : []
})

const getComponentLabel = (component, cIndex) => {
  const name = component?.name || `Component ${cIndex + 1}`
  const total = Number(component?._instance?.total)
  const idx = Number(component?._instance?.index)
  if (Number.isFinite(total) && total > 1 && Number.isFinite(idx) && idx > 0) {
    return `${name} (${idx}/${total})`
  }
  return name
}

const clampComponentIndex = (idx) => {
  const len = componentList.value.length
  if (len <= 0) return 0
  const n = Number(idx)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(len - 1, n)
}

const selectedComponentIndex = ref(0)
const activeComponent = computed(() => componentList.value?.[selectedComponentIndex.value] || null)

watch(
  () => [currentRecord.value?.last_selected_component_index, componentList.value.length],
  () => {
    const next = clampComponentIndex(currentRecord.value?.last_selected_component_index ?? 0)
    selectedComponentIndex.value = next
  },
  { immediate: true }
)

watch(
  () => selectedComponentIndex.value,
  (idx) => {
    if (currentRecord.value) currentRecord.value.last_selected_component_index = clampComponentIndex(idx)
  }
)

// Debug helper: log a stable snapshot whenever end_at values change.
// watch(
//   () => (currentRecord.value?.component_list || [])
//     .map((c) => (c?.end_at ? `${c.end_at.row_index}:${c.end_at.crochet_count}` : 'null'))
//     .join('|'),
//   () => {
//     // Keep logs deterministic (devtools sometimes shows proxies out-of-date).
//     console.log('[record] end_at changed:', snapshot((currentRecord.value?.component_list || []).map(c => c?.end_at ?? null)))
//   }
// )

const handleCarouselSettle = async (idx) => {
  await nextTick()
  applySelectionForComponent(clampComponentIndex(idx))
  setTimeout(updateCenteredComponent, 0)
}

// Delete the whole record
const deleteRecord = async () => {
  try {
    await deleteUserRecord(currentUser.value.uid, recordId.value)
    currentRecord.value = null
    listEndAt.value = []
    isRecording.value = false
    isComponentEditing.value = false
    await openNotice({
      title: t('common.notice'),
      message: t('record.deleteSuccessNotice'),
      confirmText: t('common.ok')
    })
    router.back()
  } catch (error) {
    console.error('Error deleting record:', error)
  }
}

// NOTE: generate/progress helpers are shared in `src/utils/*`.

const componentTableRefs = new Map()
const componentSectionRefs = new Map()

const setComponentSectionRef = (componentId, el) => {
  console.log('[setComponentSectionRef]', componentId, el)
  if (el) {
    componentSectionRefs.set(componentId, el)
  } else {
    componentSectionRefs.delete(componentId)
  }
}

const setComponentTableRef = (componentId, el) => {
  console.log('[setComponentTableRef]', componentId, el)
  if (el) {
    componentTableRefs.set(componentId, el)
  } else {
    componentTableRefs.delete(componentId)
  }
}

const centeredComponentIndex = ref(null)

function getElementCenterY(el) {
  const rect = el.getBoundingClientRect()
  return rect.top + rect.height / 2
}

function updateCenteredComponent() {
  if (!componentSectionRefs.size) return
  const entries = Array.from(componentSectionRefs.entries())
  const viewportCenter = window.innerHeight / 2
  let minDist = Infinity
  let minIdx = null
  for (const [idx, el] of entries) {
    if (!el) continue
    const centerY = getElementCenterY(el)
    const dist = Math.abs(centerY - viewportCenter)
    if (dist < minDist) {
      minDist = dist
      minIdx = idx
    }
  }
  centeredComponentIndex.value = minIdx
}

onMounted(() => {
  window.addEventListener('scroll', updateCenteredComponent, { passive: true })
  window.addEventListener('resize', updateCenteredComponent)
  nextTick(() => setTimeout(updateCenteredComponent, 300))
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateCenteredComponent)
  window.removeEventListener('resize', updateCenteredComponent)
})

watch(() => currentRecord.value?.component_list?.length, () => {
  nextTick(() => setTimeout(updateCenteredComponent, 300))
})

const centeredComponentEndAt = computed(() => {
  if (centeredComponentIndex.value == null) return null
  return currentRecord.value?.component_list?.[centeredComponentIndex.value]?.end_at || null
})

const centeredComponentName = computed(() => {
  if (centeredComponentIndex.value == null) return ''
  return currentRecord.value?.component_list?.[centeredComponentIndex.value]?.name || `Component ${centeredComponentIndex.value + 1}`
})

const listEndAt = ref([])
const isComponentEditing = ref(false)

// Shared modal state
const modalState = ref({
  show: false,
  title: '',
  message: '',
  confirmText: '',
  confirmClass: '',
  onConfirm: () => {},
  onCancel: () => {},
})

function openModal(type) {
  if (type === 'update-status') {
    // Show a modal to select the current status
    modalState.value = {
      show: true,
      title: '編輯當前狀態',
      message: '',
      confirmText: '確認',
      confirmClass: 'btn-confirm',
      onConfirm: (payload) => {
        currentStatusId.value = modalStatusId.value
        if (payload && typeof payload === 'object' && 'status_note' in payload) {
          currentStatusNote.value = String(payload.status_note || '').trim()
        }
        modalState.value.show = false
      },
      onCancel: () => {
        modalState.value.show = false
      },
      isStatusSelect: true
    }
  }
}

const currentStatusId = ref(0)
const currentStatusNote = ref('')
const modalStatusId = ref(currentStatusId.value)
const modalStatusNote = ref(currentStatusNote.value)

// Handler for status select in modal
function handleModalStatusChange(event) {
  const value = event.target.value
  if (value === '__add_custom__') {
    modalStatusId.value = value
    customStatusInput.value = ''
  } else {
    modalStatusId.value = Number(value)
  }
}

watch(() => modalState.value.isStatusSelect && modalState.value.show, (showing) => {
  if (showing) {
    modalStatusId.value = currentStatusId.value
    modalStatusNote.value = currentStatusNote.value
  }
})

const selfDefinedStatuses = computed(() => {
  return currentRecord.value?.self_defined_status || []
})

const statusNotes = computed(() => {
  return currentRecord.value?.self_defined_status_notes || []
})

const addStatusNote = ({ status_id, description }) => {
  if (!currentRecord.value) return
  const safeStatusId = Number(status_id)
  const safeDescription = String(description || '').trim()
  if (!safeDescription) return

  if (!Array.isArray(currentRecord.value.self_defined_status_notes)) {
    currentRecord.value.self_defined_status_notes = []
  }

  const exists = currentRecord.value.self_defined_status_notes.some(
    n => Number(n?.status_id) === safeStatusId && String(n?.description || '').trim() === safeDescription
  )
  if (exists) return

  currentRecord.value.self_defined_status_notes.push({
    status_id: safeStatusId,
    description: safeDescription
  })

  saveRecord()
}

const customStatusInput = ref('')

function cancelAddCustomStatus() {
  modalStatusId.value = currentStatusId.value
  customStatusInput.value = ''
}

const confirmAddCustomStatus = async (nameArg) => {
  const name = String(nameArg ?? customStatusInput.value).trim()
  if (!name) return null

  const existing = (selfDefinedStatuses.value || [])
    .map(s => String(s?.name || '').trim())
    .filter(Boolean)
  if (existing.includes(name)) {
    const found = (selfDefinedStatuses.value || []).find(s => String(s?.name || '').trim() === name)
    if (found?.id != null) {
      modalStatusId.value = found.id
      customStatusInput.value = ''
      return found.id
    }
  }

  const ids = (selfDefinedStatuses.value || [])
    .map(s => Number(s?.id))
    .filter(n => Number.isFinite(n))
  const maxId = ids.length > 0 ? Math.max(...ids) : 99
  const newStatus = { id: maxId + 1, name }

  if (!currentRecord.value) return null
  if (!Array.isArray(currentRecord.value.self_defined_status)) currentRecord.value.self_defined_status = []
  currentRecord.value.self_defined_status.push(newStatus)

  modalStatusId.value = newStatus.id
  customStatusInput.value = ''
  await saveRecord()
  return newStatus.id
}

// Set selection for each CrochetTable at mount
const applySelectionForComponent = (cIdx) => {
  if (!currentRecord.value?.component_list?.[cIdx]) return
  const component = currentRecord.value.component_list[cIdx]
  const endAt = component?.end_at
  if (!endAt) return

  const tableRef = componentTableRefs.get(cIdx)
  if (!tableRef) return

  const base_row = findRowWithRepeated(component.content.row_list, component.content.row_groups, endAt.row_index)
  if (!base_row) return

  const baseGenerate = Number(base_row?.content?.generate ?? base_row?.generate ?? 0)
  const nextCrochetCount = clampCrochetCount(endAt?.crochet_count, baseGenerate)
  if (nextCrochetCount !== Number(endAt?.crochet_count)) {
    endAt.crochet_count = nextCrochetCount
    currentRecord.value.component_list[cIdx].end_at.crochet_count = nextCrochetCount
  }

  const selectionList = endAtToSelectionList(base_row, endAt)
  tableRef.applySelection({ row_index: endAt.row_index, selectionList })
}

const syncingProject = ref(false)

const handleSyncProject = async () => {
  if (syncingProject.value) return
  if (!currentRecord.value) return

  await openConfirmation({
    type: 'syncProject',
    onConfirm: async () => {
      await syncProject()
    }
  })
}

const syncProject = async () => {
  if (syncingProject.value) return
  if (!currentUser.value) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }
  if (!currentRecord.value?.project_id) {
    openError({
      title: t('common.error'),
      message: t('record.noProjectId'),
      confirmText: t('common.ok')
    })
    return
  }

  try {
    syncingProject.value = true

    const projectId = String(currentRecord.value.project_id)
    const projectData = await fetchProject(projectId)
    if (!projectData) {
      openError({
        title: t('common.error'),
        message: t('project.notFound'),
        confirmText: t('common.ok')
      })
      return
    }
    const projectComponents = expandComponentListByCount(projectData.component_list, { resetEndAt: false })
    const recordComponents = Array.isArray(currentRecord.value.component_list) ? currentRecord.value.component_list : []

    const endAtByIndex = recordComponents.map((c) => c?.end_at ?? null)

    const nextComponentList = projectComponents.map((component, idx) => {
      const clone = JSON.parse(JSON.stringify(component))
      clone.end_at = idx < endAtByIndex.length ? endAtByIndex[idx] : null
      return clone
    })

    currentRecord.value.component_list = nextComponentList
    if (projectData.name) {
      currentRecord.value.project_name = projectData.name
    }

    await saveRecord()
    await nextTick()
        applySelectionForComponent(clampComponentIndex(currentRecord.value?.last_selected_component_index ?? selectedComponentIndex.value))
    setTimeout(updateCenteredComponent, 300)
    openNotice({
      title: t('common.notice'),
      message: t('record.syncSuccessNotice'),
      confirmText: t('common.ok')
    })
  } catch (error) {
    console.error('Error syncing project:', error)
    openError({
      title: t('common.error'),
      message: t('record.syncFailedNotice'),
      confirmText: t('common.ok')
    })
  } finally {
    syncingProject.value = false
  }
}

const formattedStartTime = computed(() => {
  if (!currentRecord.value?.time_slots?.[0]?.start) return ''

  const startDate = new Date(currentRecord.value.time_slots[0].start)
  const now = new Date(currentTime.value)

  const isSameDay = startDate.getFullYear() === now.getFullYear() &&
    startDate.getMonth() === now.getMonth() &&
    startDate.getDate() === now.getDate()

  const isSameYear = startDate.getFullYear() === now.getFullYear()

  if (isSameDay) {
    const hours = String(startDate.getHours()).padStart(2, '0')
    const minutes = String(startDate.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } else if (isSameYear) {
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const date = String(startDate.getDate()).padStart(2, '0')
    return `${month}/${date}`
  } else {
    const year = startDate.getFullYear()
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const date = String(startDate.getDate()).padStart(2, '0')
    const hours = String(startDate.getHours()).padStart(2, '0')
    const minutes = String(startDate.getMinutes()).padStart(2, '0')
    return `${year}/${month}/${date} ${hours}:${minutes}`
  }
})

const lastTimeSlot = computed(() => {
  if (currentRecord.value?.time_slots) {
    const time_slots = currentRecord.value.time_slots
    if (time_slots.length > 0) {
      return time_slots[time_slots.length - 1]
    }
  }
  return null
})

const currentTimeSlot = computed(() => {
  return lastTimeSlot.value && lastTimeSlot.value.end === null ? lastTimeSlot.value : null
})

const startRecording = () => {
  currentRecord.value.time_slots.push({
    start: new Date().toISOString(),
    end: null,
    status_id: currentStatusId.value,
    status_note: currentStatusNote.value,
    end_at_list: (currentRecord.value?.component_list || []).map((comp) => (comp?.end_at ? { ...comp.end_at } : null))
  })
  isRecording.value = true
  saveRecord()
}

const pauseRecording = () => {
  if (!currentTimeSlot.value) {
    console.warn('No active time slot to pause')
    return
  }

  currentRecord.value.time_slots[currentRecord.value.time_slots.length - 1].end = new Date().toISOString()
  currentRecord.value.time_slots[currentRecord.value.time_slots.length - 1].status_id = currentStatusId.value
  currentRecord.value.time_slots[currentRecord.value.time_slots.length - 1].status_note = currentStatusNote.value
  saveRecord()
  isRecording.value = false
}

const handleStatusChange = (event) => {
  const value = event.target.value
  if (value === '__add_custom__') {
    openModal('add_custom_status')
  }
}

const saveRecord = async () => {
  try {
    if (!currentUser.value) return

    await setUserRecord(currentUser.value.uid, recordId.value, currentRecord.value)
  } catch (error) {
    console.error('Error saving record:', error)
  }
}

const handleUpdateEndAt = async (componentId, rowIndex, crochetCount) => {
  if (componentId < 0 || rowIndex < 0 || crochetCount < 0) {
    console.warn('[handleUpdateEndAt] Invalid parameters:', componentId, rowIndex, crochetCount)
    isComponentEditing.value = false
    return
  }

  const component = currentRecord.value?.component_list?.[componentId]
  if (!component) {
    isComponentEditing.value = false
    return
  }

  const baseRow = findRowWithRepeated(component.content.row_list, component.content.row_groups, rowIndex)
  const baseGenerate = Number(baseRow?.content?.generate ?? baseRow?.generate ?? 0)
  const safeCrochetCount = clampCrochetCount(crochetCount, baseGenerate)

  currentRecord.value.component_list[componentId].end_at = {
    row_index: rowIndex,
    crochet_count: safeCrochetCount
  }

  // Persist current carousel selection along with record updates.
  currentRecord.value.last_selected_component_index = clampComponentIndex(selectedComponentIndex.value)

  try {
    if (!currentUser.value) return
    await mergeUserRecord(currentUser.value.uid, recordId.value, {
      ...currentRecord.value
    })
  } catch (error) {
    console.error('[handleUpdateEndAt] Error updating Firestore:', error)
  }
}

const getComponentProgress = (cIndex) => {
  if (!currentRecord.value?.component_list) return 0

  const component = currentRecord.value.component_list[cIndex]
  return getComponentProgressPercent(component)
}


let timerInterval = null
onMounted(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser.value = user
      await loadRecord()
      timerInterval = setInterval(() => {
        currentTime.value = Date.now()
      }, 1000)

      nextTick(() => {
        applySelectionForComponent(clampComponentIndex(currentRecord.value?.last_selected_component_index ?? 0))
      })
      unsubscribe()
    }
  })
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const loadRecord = async () => {
  try {
    if (!currentUser.value) return

    if (!recordId.value) {
      router.push(-1)
      return
    }

    if (recordCtx) {
      await recordCtx.loadRecord()
    } else {
      const recordData = await fetchUserRecord(currentUser.value.uid, recordId.value)
      if (recordData) {
        currentRecord.value = recordData
      } else {
        router.push(-1)
        return
      }
    }

    if (lastTimeSlot.value) {
      currentStatusId.value = lastTimeSlot.value.status_id
      currentStatusNote.value = String(lastTimeSlot.value?.status_note || '').trim()
      if (currentTimeSlot.value) {
        isRecording.value = true
      }
    }
  } catch (error) {
    console.error('Error loading record:', error)
  }
}

watch(isComponentEditing, async (isEditing) => {
  if (isEditing) {
    await nextTick()
    const toolbar = document.querySelector('.crochet-scrollbar')
    if (toolbar && recordViewRef.value) {
      const toolbarHeight = toolbar.offsetHeight
      recordViewRef.value.style.paddingBottom = `${toolbarHeight}px`
    }
  } else {
    if (recordViewRef.value) {
      recordViewRef.value.style.paddingBottom = '0'
    }
  }
})
</script>

<style scoped>
.header-with-time.small {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 0.5rem;
}
.header-with-time.small h1 {
  font-size: 1.25rem;
  margin: 0;
  color: #111827;
}
.header-with-time.small .start-time {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  text-align: center;
}
.record-view {
  max-width: 1200px;
  margin: 0 auto;
}

.top-fixed-banner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 5rem;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  z-index: 101;
}

.top-fixed-banner h1 {
  flex: 1;
  margin: 0;
  min-width: 0;
}

.top-banner-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-left: auto;
}

.btn-sync-project {
  border: 1px solid rgba(66, 185, 131, 0.35);
  background: rgba(66, 185, 131, 0.12);
  color: #0f5132;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s, opacity 0.15s;
  white-space: nowrap;
}

.btn-sync-project:hover {
  background: rgba(66, 185, 131, 0.18);
}

.btn-sync-project:active {
  transform: translateY(1px);
}

.btn-sync-project:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-view-report {
  border: 1px solid rgba(139, 92, 246, 0.35);
  background: rgba(139, 92, 246, 0.12);
  color: #4c1d95;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s, opacity 0.15s;
  white-space: nowrap;
}

.btn-view-report:hover {
  background: rgba(139, 92, 246, 0.18);
}

.btn-view-report:active {
  transform: translateY(1px);
}

.btn-view-report:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;
}

.top-fixed-banner > .last-page-btn {
  background: #42b983;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(66,185,131,0.12);
  transition: background 0.2s, color 0.2s;
}
.top-fixed-banner > .last-page-btn:hover {
  background: #3aa876;
  color: #fff;
}

.project-name {
  font-size: 1.5rem;
  font-weight: 700;
  min-width: 0;
  flex: 1;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-content {
  padding-bottom: 12em;
}

.header-with-time {
  display: flex;
  flex-direction: column;
}

.header-with-time h1 {
  margin: 0;
  color: #111827;
}

.start-time {
  width: 100%;
  text-align: right;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  padding: 0.4rem 0;
}

.record-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.time-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.time-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  text-align: center;
}

.time-card h3 {
  margin: 0 0 1rem 0;
  color: #6b7280;
  font-size: 0.875rem;
  text-transform: uppercase;
  font-weight: 600;
}

.time-display {
  font-size: 2.5rem;
  font-weight: 700;
  color: #42b983;
  font-family: 'Courier New', monospace;
}

.time-display.progress {
  color: #8b5cf6;
}

.status-select-section {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.time-description {
  margin: 0;
  color: #9ca3af;
  font-size: 0.875rem;
}

.status-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.status-section label {
  display: block;
  margin-bottom: 0.75rem;
  color: #374151;
  font-weight: 600;
}

.status-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.status-select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}

.btn-add-status {
  background: white;
  color: #42b983;
  border: 1px solid #42b983;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-status:hover {
  background: #42b983;
  color: white;
}

.position-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.position-section h3 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.position-info p {
  margin: 0.5rem 0;
  color: #6b7280;
}

.project-display {
  margin-top: 2rem;
}

.sync-project-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.project-display h3 {
  margin-bottom: 1rem;
  color: #374151;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #111827;
}

.modal-content p {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
}

.position-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
}

.position-select,
.position-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.position-select:focus,
.position-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}

.status-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

.status-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
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

.btn-confirm {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-confirm:hover {
  background: #3aa876;
}

.component-section {
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  position: relative;
}

.component-progress-tag {
  position: absolute;
  right: 2em;
  top: -1em;
  background: #42b983;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.5em 1.2em;
  border-radius: 2em;
  box-shadow: 0 2px 8px rgba(66,185,131,0.12);
  z-index: 10;
}
</style>
