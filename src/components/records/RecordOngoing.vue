<template>
  <div ref="recordViewRef" class="record-view">
    <div class="page-content">
      <div class="header-with-time">
        <span class="start-time" v-if="formattedStartTime">{{ $t('record.startAt') }} {{ formattedStartTime }}</span>
      </div>

      <div class="header-with-time">
        <div class="record-panel-actions" @click.stop>
          <ButtonTranslate />
        </div>
      </div>

      <div class="record-panel">
        <CarouselWithDot
          ref="componentCarouselRef"
          :items="componentList"
          item-width="100%"
          :disable-gesture="false"
          @active-index-change="handleCarouselActiveIndexChange"
          class="record-component-carousel"
        >
          <template #default="{ item, index }">
            <div class="project-display">
              <div class="component-section">
                <span v-if="isRecordableComponent(item)" class="component-progress-tag">{{ getComponentProgress(index) }}%</span>
                <div class="component-label">{{ getComponentLabel(item, index) }}</div>
                <RecordingTable
                  v-if="isRecordableComponent(item)"
                  :ref="setComponentTableRef(index)"
                  :model-value="item.content.row_list"
                  :row-groups="Array.isArray(item?.content?.row_groups) ? item.content.row_groups : []"
                  :component-id="index"
                  :component-name="getComponentLabel(item, index)"
                  @update-end-at="(row_index, crochet_count) => handleUpdateEndAt(index, row_index, crochet_count)"
                  @revert-selection="handleRevertSelection"
                />

                <ComponentCardStitch
                  v-else-if="isStitchComponent(item)"
                  :component="item"
                  :component-list="componentList"
                  :component-index="index"
                />

                <div v-else class="component-not-recordable">
                  <p class="component-not-recordable__title">{{ $t('record.notRecordableTitle') }}</p>
                  <p class="component-not-recordable__desc">{{ $t('record.notRecordableDesc') }}</p>
                </div>
              </div>
            </div>
          </template>
        </CarouselWithDot>
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

    <Teleport to="#bottom-left-dock-before">
      <div class="home-latest-record-dock">
        <div
          class="home-latest-record-panel"
          :class="{ 'is-hidden': recordDockCollapsed }"
        >
          <RecordOptions
            :context="recordOptionsContext"
            :actions="recordOptionsActions"
            docked
          />
        </div>

        <div class="home-latest-record-mini-outer">
          <button
            type="button"
            class="home-latest-record-mini"
            :aria-label="recordDockCollapsed ? 'Show record options' : 'Hide record options'"
            :title="recordDockCollapsed ? 'Show record options' : 'Hide record options'"
            @click="recordDockCollapsed = !recordDockCollapsed"
          >
            <img
              class="home-latest-record-mini__icon"
              :src="crochetIconUrl"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import UpdateStatus from '@/components/modals/UpdateStatus.vue'
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { addRecordToProjectOngoing, completeProjectRecord } from '@/services/firestore/projects'
import { fetchUserRecord, mergeUserRecord, setUserRecord } from '@/services/firestore/records'
import { openConfirmation } from '@/services/ui/confirmation'
import { openError } from '@/services/ui/notice'
import { formatDateTimeCompact } from '@/utils/dateTime'
import { useRecordContext } from '@/composables/recordContext'
import { useSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'
import { useAchievementStore } from '@/stores/achievementStore'

import { endAtToSelectionList } from '@/utils/crochetPosition.js'
import {
  clampCrochetCount,
  findRowWithRepeated,
  getLastEndAtForComponent,
  getComponentProgressPercent
} from '@/utils/recordProgressGenerate.js'
import RecordingTable from '@/components/CrochetTable/RecordingTable.vue'
import RecordOptions from '@/components/FloatingTransparentBox/RecordOptions.vue'
import CarouselWithDot from '@/components/Carousel/CarouselWithDot.vue'
import ComponentCardStitch from '@/components/cards/ComponentCard.vue/Stitch.vue'
import ButtonTranslate from '@/components/buttons/svg/ButtonTranslate.vue'
import { originalStatuses } from '@/constants/status.js'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const recordCtx = useRecordContext()
const selfDefinedCtx = useSelfDefinedStitchesContext()
const achievementStore = useAchievementStore()

const recordDockCollapsed = ref(false)
const crochetIconUrl = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/achievement/noun-crochet-5351977-FFFFFF.svg`
})

const recordId = recordCtx?.recordId || ref(route.params.record_id)
const currentRecord = recordCtx?.recordData || ref(null)
const isRecording = ref(false)
const currentTime = ref(Date.now())
const currentUser = ref(null)
const hasEnsuredProjectOngoing = ref(false)

const recordViewRef = ref(null)
const componentCarouselRef = ref(null)
const componentTableRefs = ref([])

const setComponentTableRef = (idx) => (el) => {
  if (!el) return
  componentTableRefs.value[idx] = el
}

const componentList = computed(() => {
  const list = currentRecord.value?.component_list
  return Array.isArray(list) ? list : []
})

const firstIncompleteIdx = computed(() => {
  const list = componentList.value
  for (let i = 0; i < list.length; i += 1) {
    const c = list[i]
    if (c && c.is_completed !== true) return i
  }
  return null
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

const hasInitializedComponentSelection = ref(false)

watch(
  () => [currentRecord.value?.last_selected_component_index, componentList.value.length],
  () => {
    if (!currentRecord.value) return

    // Requirement: on first enter, jump to the latest unfinished component.
    // Prefer the record's `last_selected_component_index` if it's unfinished; otherwise jump to the first unfinished.
    if (!hasInitializedComponentSelection.value) {
      const isCompletedRecord = currentRecord.value?.is_completed === true
      const lastSelected = clampComponentIndex(currentRecord.value?.last_selected_component_index ?? 0)
      const lastSelectedIsUnfinished = componentList.value?.[lastSelected]?.is_completed !== true
      const firstUnfinished = firstIncompleteIdx.value

      const next = isCompletedRecord
        ? 0
        : (lastSelectedIsUnfinished ? lastSelected : (firstUnfinished != null ? clampComponentIndex(firstUnfinished) : 0))

      selectedComponentIndex.value = next
      currentRecord.value.last_selected_component_index = clampComponentIndex(next)
      hasInitializedComponentSelection.value = true

      // Ensure the carousel view matches the initial selection.
      // Avoid a global selection->scroll watcher to prevent feedback loops
      // that can cancel dot-triggered smooth scrolling.
      void (async () => {
        await nextTick()
        componentCarouselRef.value?.scrollToIndex?.(clampComponentIndex(next))
        await nextTick()
        applySelectionForSelectedComponent()
      })()
      return
    }

    const next = clampComponentIndex(currentRecord.value?.last_selected_component_index ?? 0)
    if (next !== selectedComponentIndex.value) selectedComponentIndex.value = next
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

const handleCarouselActiveIndexChange = async (idx) => {
  await nextTick()
  selectedComponentIndex.value = clampComponentIndex(idx)
  applySelectionForSelectedComponent()
}

// NOTE: generate/progress helpers are shared in `src/utils/*`.

const handleRevertSelection = async () => {
  await nextTick()
  applySelectionForSelectedComponent()
}
const isComponentEditing = ref(false)

const isRecordableComponent = (component) => {
  return Array.isArray(component?.content?.row_list)
}

const isStitchComponent = (component) => {
  return component?.type === 'stitch'
}

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
      title: t('statusModal.titleEdit'),
      message: '',
      confirmText: t('common.confirm'),
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

const recordOptionsContext = computed(() => ({
  recording: {
    isRecording: isRecording.value,
    timeSlot: lastTimeSlot.value
  },
  status: {
    id: currentStatusId.value,
    note: currentStatusNote.value,
    originalStatuses,
    selfDefinedStatuses: selfDefinedStatuses.value
  },
  selected: {
    name: activeComponent.value ? getComponentLabel(activeComponent.value, selectedComponentIndex.value) : '',
    endAt: activeComponent.value?.end_at || null,
    isCompleted: activeComponent.value?.is_completed === true
  }
}))

const recordOptionsActions = {
  startRecording: () => startRecording(),
  pauseRecording: () => pauseRecording(),
  openStatusModal: () => openModal('update-status'),
  finishComponent: () => handleFinishComponent()
}

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
const applySelectionForSelectedComponent = () => {
  const tableRef = componentTableRefs.value?.[clampComponentIndex(selectedComponentIndex.value)]
  if (!tableRef) return

  const clearSelection = () => {
    if (typeof tableRef.applySelection === 'function') {
      tableRef.applySelection({ row_index: 0, selectionList: [] })
    }
  }

  const cIdx = clampComponentIndex(selectedComponentIndex.value)

  if (!currentRecord.value?.component_list?.[cIdx]) {
    clearSelection()
    return
  }
  const component = currentRecord.value.component_list[cIdx]
  if (!Array.isArray(component?.content?.row_list)) {
    clearSelection()
    return
  }
  const endAt = component?.end_at
  if (!endAt) {
    clearSelection()
    return
  }

  const base_row = findRowWithRepeated(
    component.content.row_list,
    Array.isArray(component?.content?.row_groups) ? component.content.row_groups : [],
    endAt.row_index
  )
  if (!base_row) {
    clearSelection()
    return
  }

  const baseGenerate = Number(base_row?.content?.generate ?? base_row?.generate ?? 0)
  const nextCrochetCount = clampCrochetCount(endAt?.crochet_count, baseGenerate)
  if (nextCrochetCount !== Number(endAt?.crochet_count)) {
    endAt.crochet_count = nextCrochetCount
    currentRecord.value.component_list[cIdx].end_at.crochet_count = nextCrochetCount
  }

  const selectionList = endAtToSelectionList(base_row, endAt, selfDefinedCtx.list.value)
  tableRef.applySelection({ row_index: endAt.row_index, selectionList })
}

const formattedStartTime = computed(() => {
  if (!currentRecord.value?.time_slots?.[0]?.start) return ''

  return formatDateTimeCompact(currentRecord.value.time_slots[0].start, { now: currentTime.value })
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

const ensureProjectOngoing = async () => {
  if (hasEnsuredProjectOngoing.value) return
  hasEnsuredProjectOngoing.value = true

  const projectId = currentRecord.value?.project_id
  if (!projectId) return

  try {
    await addRecordToProjectOngoing(String(projectId), String(recordId.value))
  } catch (error) {
    // Non-blocking; may fail due to rules (e.g. private projects).
    console.warn('[project record tracking] failed to add ongoing record:', error)
  }
}

const componentNotStartedYet = (component) => {
  if (!component || typeof component !== 'object') return true
  if (component.is_completed === true) return false
  const endAt = component.end_at
  if (!endAt) return true
  const rowIndex = Number(endAt?.row_index)
  const crochetCount = Number(endAt?.crochet_count)
  return (!Number.isFinite(rowIndex) || rowIndex <= 1) && (!Number.isFinite(crochetCount) || crochetCount <= 0)
}

const ensureComponentHasStartEndAt = (component) => {
  if (!component || typeof component !== 'object') return
  if (component.is_completed === true) return

  const endAt = component.end_at
  const rowIndex = Number(endAt?.row_index)
  const crochetCount = Number(endAt?.crochet_count)

  // If the component has never started (or end_at is malformed), initialize to the first position.
  if (!endAt || !Number.isFinite(rowIndex) || rowIndex < 1 || !Number.isFinite(crochetCount) || crochetCount < 0) {
    component.end_at = { row_index: 1, crochet_count: 0 }
  }
}

const startRecording = async () => {
  if (!currentRecord.value) return

  const targetIdx = clampComponentIndex(selectedComponentIndex.value)
  const list = currentRecord.value?.component_list
  if (!Array.isArray(list) || !list[targetIdx]) return

  const target = list[targetIdx]

  // (1) If starting on a completed component, confirm and (if insisted) reset completion.
  if (target?.is_completed === true) {
    const ok = await openConfirmation({
      type: {
        id: 'startRecordingOnCompletedComponent',
        params: { name: getComponentLabel(target, targetIdx) }
      }
    })
    if (!ok) return

    target.is_completed = false
    target.end_at = getLastEndAtForComponent(target)
  }

  // (2) If not starting on the first incomplete component, confirm.
  if (componentNotStartedYet(target)) {
    const firstIdx = firstIncompleteIdx.value
    if (firstIdx != null && firstIdx !== targetIdx) {
      const first = list[firstIdx]
      const ok = await openConfirmation({
        type: {
          id: 'startRecordingNotFirstIncompleteComponent',
          params: {
            name: getComponentLabel(target, targetIdx),
            first: getComponentLabel(first, firstIdx)
          }
        }
      })
      if (!ok) return
    }
  }

  // Requirement: once recording successfully starts on a component, initialize end_at
  // to the first row/first crochet if it wasn't started yet.
  ensureComponentHasStartEndAt(target)

  void ensureProjectOngoing()
  currentRecord.value.time_slots.push({
    start: new Date().toISOString(),
    end: null,
    status_id: currentStatusId.value,
    status_note: currentStatusNote.value,
    end_at_list: (currentRecord.value?.component_list || []).map((comp) => (comp?.end_at ? { ...comp.end_at } : null))
  })
  isRecording.value = true
  await saveRecord()
}

const pauseRecording = async () => {
  if (!currentTimeSlot.value) {
    console.warn('No active time slot to pause')
    return
  }

  currentRecord.value.time_slots[currentRecord.value.time_slots.length - 1].end = new Date().toISOString()
  currentRecord.value.time_slots[currentRecord.value.time_slots.length - 1].status_id = currentStatusId.value
  currentRecord.value.time_slots[currentRecord.value.time_slots.length - 1].status_note = currentStatusNote.value
  await saveRecord()
  isRecording.value = false
}

const saveRecord = async () => {
  try {
    if (!currentUser.value) return

    await setUserRecord(currentUser.value.uid, recordId.value, currentRecord.value)
  } catch (error) {
    console.error('Error saving record:', error)
  }
}

const findNextIncompleteComponentIndex = (fromIndex) => {
  const list = componentList.value
  const len = list.length
  if (len <= 0) return null

  const start = clampComponentIndex(fromIndex)
  for (let step = 1; step <= len; step += 1) {
    const idx = (start + step) % len
    const c = list[idx]
    if (c && c.is_completed !== true) return idx
  }

  return null
}

const handleFinishComponent = async () => {
  if (!currentUser.value) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }
  if (!currentRecord.value) return

  const targetIdx = clampComponentIndex(selectedComponentIndex.value)

  const list = currentRecord.value?.component_list
  if (!Array.isArray(list) || !list[targetIdx]) return

  const ok = await openConfirmation({ type: 'finishComponent' })
  if (!ok) return

  // Mark as completed: clear end_at and set explicit flag.
  currentRecord.value.component_list[targetIdx].end_at = null
  currentRecord.value.component_list[targetIdx].is_completed = true

  // Requirement: when a component becomes completed, stop recording.
  if (isRecording.value) {
    try {
      await pauseRecording()
    } catch (error) {
      console.warn('[finishComponent] failed to pause recording:', error)
    }
  }

  // Jump to the next incomplete component (wrap-around).
  const nextIdx = findNextIncompleteComponentIndex(targetIdx)
  if (nextIdx != null) {
    selectedComponentIndex.value = nextIdx
    if (currentRecord.value) currentRecord.value.last_selected_component_index = clampComponentIndex(nextIdx)

    try {
      await mergeUserRecord(currentUser.value.uid, recordId.value, {
        component_list: currentRecord.value.component_list,
        last_selected_component_index: clampComponentIndex(nextIdx)
      })
    } catch (error) {
      console.error('[finishComponent] Error updating Firestore:', error)
    }

    await nextTick()
    componentCarouselRef.value?.scrollToIndex?.(clampComponentIndex(nextIdx))
    await nextTick()
    applySelectionForSelectedComponent()
    return
  }

  // All components are completed.
  const okRecord = await openConfirmation({ type: 'finishRecord' })
  if (!okRecord) {
    // Still persist component completion.
    try {
      await mergeUserRecord(currentUser.value.uid, recordId.value, {
        component_list: currentRecord.value.component_list
      })
    } catch (error) {
      console.error('[finishComponent] Error updating Firestore:', error)
    }
    return
  }

  currentRecord.value.is_completed = true
  selectedComponentIndex.value = 0
  currentRecord.value.last_selected_component_index = 0

  // Also ensure we are not recording when finishing the record.
  if (isRecording.value) {
    try {
      await pauseRecording()
    } catch (error) {
      console.warn('[finishRecord] failed to pause recording:', error)
    }
  }

  try {
    await mergeUserRecord(currentUser.value.uid, recordId.value, {
      component_list: currentRecord.value.component_list,
      is_completed: true,
      last_selected_component_index: 0,
      // Use client timestamp for immediate achievement evaluation.
      completed_at: new Date().toISOString()
    })

    try {
      await completeProjectRecord(String(currentRecord.value?.project_id || ''), String(recordId.value))
    } catch (error) {
      const code = error?.code || error?.name || ''
      if (String(code).includes('permission') || String(code).includes('unauthorized')) return
      console.warn('[project record tracking] failed to complete project record:', error)
    }
  } catch (error) {
    console.error('[finishRecord] Error updating Firestore:', error)
  }

  // Grant achievements immediately after finishing a record.
  // Non-blocking: navigation to result screen should stay snappy.
  if (currentUser.value?.uid) {
    achievementStore.scanAndAwardNow(currentUser.value.uid).catch((e) => {
      console.warn('[achievements] scan after finish record failed:', e)
    })
  }

  const wantEdit = await openConfirmation({ type: 'editResultAfterFinishRecord' })
  await router.push({
    name: 'record',
    params: { record_id: recordId.value },
    query: wantEdit
      ? { 'completed-result': '1', 'edit-result': '1' }
      : { 'completed-result': '1' }
  })
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

  const prevEndAt = component?.end_at
  const hasPrevEndAt = prevEndAt && typeof prevEndAt === 'object'
  const prevRowIndex = hasPrevEndAt ? Number(prevEndAt?.row_index) : NaN
  const prevCrochetCount = hasPrevEndAt ? Number(prevEndAt?.crochet_count) : NaN

  const isMovingBackward =
    Number.isFinite(prevRowIndex) &&
    Number.isFinite(prevCrochetCount) &&
    (rowIndex < prevRowIndex || (rowIndex === prevRowIndex && safeCrochetCount < prevCrochetCount))

  if (isMovingBackward) {
    const ok = await openConfirmation({
      type: {
        id: 'endAtBeforeCurrent',
        params: {
          name: getComponentLabel(component, componentId),
          fromRow: prevRowIndex,
          fromCrochet: prevCrochetCount,
          toRow: rowIndex,
          toCrochet: safeCrochetCount
        }
      }
    })

    if (!ok) {
      selectedComponentIndex.value = clampComponentIndex(componentId)
      await nextTick()
      componentCarouselRef.value?.scrollToIndex?.(clampComponentIndex(componentId))
      await nextTick()
      applySelectionForSelectedComponent()
      isComponentEditing.value = false
      return
    }
  }

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
  if (!Array.isArray(component?.content?.row_list)) return 0
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
        applySelectionForSelectedComponent()
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
.record-view {
  max-width: 1200px;
  margin: 0 auto;
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

.record-panel-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 0.25rem;
}

/* Center the carousel items for this page.
   Use the same sizing model as ProjectView (item-width: 100%). */
.record-component-carousel :deep(.carousel__row) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  gap: 0 !important;
  scroll-padding-left: 0 !important;
  scroll-padding-right: 0 !important;
}

.project-display {
  width: 100%;
  display: flex;
  justify-content: center;
}

.component-section {
  width: 100%;
  max-width: 1200px;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  position: relative;
}

.component-label {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #111827;
}

.component-not-recordable {
  padding: 1rem;
  border-radius: 10px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  color: #6b7280;
}

.component-not-recordable__title {
  margin: 0 0 0.25rem;
  font-weight: 700;
  color: #374151;
}

.component-not-recordable__desc {
  margin: 0;
  font-size: 0.95rem;
}

.component-progress-tag {
  position: absolute;
  right: 2em;
  top: -1em;
  background: var(--color-icon-add);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.5em 1.2em;
  border-radius: 2em;
  box-shadow: 0 2px 8px rgb(var(--color-icon-add-rgb) / 0.12);
  z-index: 10;
}

/* Bottom-left dock: record options panel + crochetting toggle button */
.home-latest-record-dock {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.home-latest-record-panel {
  position: absolute;
  left: 0;
  bottom: calc(64px + 10px);
  width: 100%;
  z-index: 1;
}

.home-latest-record-panel.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.home-latest-record-mini {
  width: 64px;
  height: 64px;
  border-radius: 9999px;
  border: none;
  background: var(--color-icon-add);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}

.home-latest-record-mini__icon {
  width: 30px;
  height: 30px;
  display: block;
}

.home-latest-record-mini:active {
  transform: translateY(1px);
}
</style>
