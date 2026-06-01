<template>
  <Teleport to=".top-banner__side--right">
    <div class="record-top-actions" @click.stop>
      <MoreMenu
        :label="$t('project.more')"
        :disabled="!recordData || recordLoading"
        :sections="moreMenuSections"
      />
    </div>
  </Teleport>

  <div class="record-shell">
    <div class="page-content">
      <component
        :is="activeView"
        ref="activeViewRef"
        :current-user="currentUser"
        :profile="props.profile"
      />
    </div>

    <AddRecordFeedbackModal
      :show="showRecordFeedbackModal"
      :saving="savingResult"
      :initial-images="recordData?.result?.images"
      :initial-thought="recordData?.result?.thought"
      @close="closeRecordFeedbackModal"
      @save="handleSaveRecordFeedback"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { v4 as uuidv4 } from '@lukeed/uuid'

import { storage } from '@/firebaseConfig'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

import MoreMenu from '@/components/shared/buttons/MoreMenu.vue'

import RecordOngoing from '@/components/features/record/RecordOngoing.vue'
import RecordTimeSlotList from '@/components/features/record/RecordTimeSlotList.vue'
import RecordSingleTimeSlot from '@/components/features/record/RecordSingleTimeSlot.vue'
import RecordResultSharing from '@/components/features/record/RecordResultSharing.vue'

import { provideRecordContext } from '@/composables/recordContext'
import { provideSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'
import { useAppBanner } from '@/composables/appBanner'

import { expandComponentListByCount, normalizeRecordForComponentCountsInPlace } from '@/utils/componentInstances'
import AddRecordFeedbackModal from '@/components/modals/record/AddRecordFeedbackModal.vue'
import { getLastEndAtForComponent, getRecordProgressPercent } from '@/utils/recordProgressGenerate'
import { toMs } from '@/utils/toMs'

import { openConfirmation } from '@/services/ui/confirmation'
import { openError, openNotice } from '@/services/ui/notice'
import { useLatestRecordStore } from '@/stores/latestRecordStore'
import { clearLastAccessedRecordId, writeLastAccessedRecordId } from '@/utils/lastAccessedRecord'
import { useUserRecordStatusCatalog } from '@/composables/useUserRecordStatusCatalog'

defineOptions({ name: 'RecordViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null }
})

const currentUser = computed(() => props.currentUser)
const authPending = computed(() => currentUser.value === undefined)

const statusCatalog = useUserRecordStatusCatalog(
  () => props.profile,
  () => currentUser.value?.uid
)

const emit = defineEmits(['api'])

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n({ useScope: 'global' })

const appBanner = useAppBanner()

const recordId = computed(() => String(route.params.record_id || ''))
const recordData = ref(null)
const recordLoading = ref(false)
const loadedRecordId = ref('')

const selfDefinedStitches = ref([])
const loadedProjectIdForStitches = ref('')

const projectMaterials = ref({ hook: [], yarn: [] })
const loadedProjectIdForMaterials = ref('')

provideSelfDefinedStitchesContext({ stitchesRef: selfDefinedStitches })

const savingResult = ref(false)
const showRecordFeedbackModal = ref(false)

const latestRecordStore = useLatestRecordStore()

const getLastTimeSlot = (record) => {
  const slots = Array.isArray(record?.time_slots) ? record.time_slots : []
  return slots.length ? slots[slots.length - 1] : null
}

const isRecordPlaying = (record) => {
  const last = getLastTimeSlot(record)
  return Boolean(last && last.end === null)
}

const cloneTimeSlots = (slots) => {
  const list = Array.isArray(slots) ? slots : []
  return list.map((s) => {
    if (!s || typeof s !== 'object') return s
    const endAtList = Array.isArray(s.end_at_list)
      ? s.end_at_list.map((e) => (e && typeof e === 'object' ? { ...e } : e))
      : s.end_at_list
    return { ...s, end_at_list: endAtList }
  })
}

const lastSwitchPromptKey = ref('')
const handleSwitchRecordingSessionIfNeeded = async ({ uid, nextRecordId, nextRecord }) => {
  if (!uid) return { cancelled: false }

  const dockRecord = latestRecordStore.latestRecordData
  const dockId = String(dockRecord?.id || '').trim()
  if (!dockId) return { cancelled: false }
  if (dockId === String(nextRecordId)) return { cancelled: false }
  if (!isRecordPlaying(dockRecord)) return { cancelled: false }

  const promptKey = `${dockId}=>${String(nextRecordId)}`
  if (lastSwitchPromptKey.value === promptKey) return { cancelled: false }

  const fromName = String(dockRecord?.project_name || dockRecord?.projectName || t('record.record')).trim()
  const toName = String(nextRecord?.project_name || nextRecord?.projectName || t('record.record')).trim()

  lastSwitchPromptKey.value = promptKey
  const ok = await openConfirmation({
    type: {
      id: 'switchRecordingSession',
      params: { from: fromName, to: toName }
    }
  })

  if (!ok) {
    router.back()
    return { cancelled: true }
  }

  const nowIso = new Date().toISOString()

  // (1) End the previous active time slot.
  try {
    const dockSlots = cloneTimeSlots(dockRecord?.time_slots)
    const last = dockSlots.length ? dockSlots[dockSlots.length - 1] : null
    if (last && last.end === null) {
      dockSlots[dockSlots.length - 1] = { ...last, end: nowIso }
      await callApi('mergeUserRecord', String(uid), String(dockId), { time_slots: dockSlots })
      latestRecordStore.setLatestRecordData({ ...dockRecord, time_slots: dockSlots })
    }
  } catch (e) {
    console.warn('RecordView: failed to end previous recording slot:', e)
  }

  return { cancelled: false }
}

const SCROLLBAR_HIDDEN_CLASS = 'hide-scrollbar'

function setScrollbarHidden(hidden) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(SCROLLBAR_HIDDEN_CLASS, hidden)
  document.body?.classList?.toggle?.(SCROLLBAR_HIDDEN_CLASS, hidden)
}

const projectId = computed(() => {
  const id = recordData.value?.project_id
  const s = id != null ? String(id).trim() : ''
  return s || null
})

const hasTimeSlotsQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'time-slots'))
const hasResultSharingQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'result-sharing'))
const hasTimeSlotIdQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'time_slot_id'))
const hasAddRecordFeedbackQuery = computed(() =>
  Object.prototype.hasOwnProperty.call(route.query, 'add-record-feedback')
)

const isRecordCompleted = computed(() => Boolean(recordData.value?.is_completed))

const activeViewRef = ref(null)

const activeView = computed(() => {
  if (hasTimeSlotIdQuery.value) return RecordSingleTimeSlot
  if (hasTimeSlotsQuery.value) return RecordTimeSlotList
  if (hasResultSharingQuery.value) return RecordResultSharing
  return RecordOngoing
})

const isOngoingView = computed(() => activeView.value === RecordOngoing)

const projectNameForBanner = computed(() => {
  return String(recordData.value?.project_name || recordData.value?.projectName || '').trim()
})

const baseBannerTitle = computed(() => {
  if (hasResultSharingQuery.value) return t('record.resultSharingTitle')
  if (hasTimeSlotsQuery.value || hasTimeSlotIdQuery.value) return t('record.timeSlotsTitle')
  if (isOngoingView.value) return t('record.ongoingTitle')
  return t('record.record')
})

const bannerTitle = computed(() => {
  const prefix = projectNameForBanner.value
  const base = baseBannerTitle.value
  if (!prefix) return base
  if (!base) return prefix
  return `${prefix} - ${base}`
})

watch(
  bannerTitle,
  (v) => {
    appBanner?.setBanner({ title: v })
  },
  { immediate: true }
)

const moreMenuSections = computed(() => {
  if (hasResultSharingQuery.value) {
    const items = [
      {
        action: 'shareCompletedResultImage',
        label: t('record.shareCompletedResultImage'),
        disabled: !recordData.value || recordLoading.value,
        onSelect: goPrintRecord
      },
      {
        action: 'goToProject',
        label: t('record.goToProject'),
        disabled: !projectId.value,
        onSelect: goToProject
      },
      {
        action: 'addRecordFeedback',
        label: t('record.addRecordFeedback'),
        disabled: !recordData.value || recordLoading.value || savingResult.value,
        onSelect: openRecordFeedbackModal
      },
      {
        action: 'details',
        label: t('record.recordDetails'),
        disabled: !recordData.value,
        onSelect: goTimeSlots
      }
    ]

    const dangerItems = []

    if (isRecordCompleted.value) {
      dangerItems.push({
        action: 'restartRecord',
        label: t('record.restartRecord'),
        danger: true,
        disabled: !recordData.value || savingResult.value,
        onSelect: handleRestartRecord
      })
    }

    dangerItems.push({
      action: 'deleteRecord',
      label: t('record.deleteRecord'),
      iconUrl: '/assets/image/settings/086__empty.svg',
      danger: true,
      disabled: !recordData.value || savingResult.value,
      onSelect: handleDeleteRecord
    })

    return [
      { key: 'record-result-sharing', label: '', items },
      { key: 'record-result-sharing-danger', label: '', items: dangerItems }
    ]
  }

  // Requirement (ongoing view): show 3 groups in this order.
  if (isOngoingView.value) {
    return [
      {
        key: 'record-ongoing-project',
        label: '',
        items: [
          {
            action: 'goToProject',
            label: t('record.goToProject'),
            disabled: !projectId.value,
            onSelect: goToProject
          },
          {
            action: 'syncProject',
            label: t('record.syncProject'),
            disabled: !recordData.value || recordLoading.value || !projectId.value,
            onSelect: handleSyncFromProject
          }
        ]
      },
      {
        key: 'record-ongoing-result',
        label: '',
        items: [
          {
            action: 'watchResult',
            label: t('record.watchResult'),
            disabled: !recordData.value,
            onSelect: goWatchResult
          }
        ]
      },
      {
        key: 'record-ongoing-danger',
        label: '',
        items: [
          {
            action: 'deleteRecord',
            label: t('record.deleteRecord'),
            iconUrl: '/assets/image/settings/086__empty.svg',
            danger: true,
            disabled: !recordData.value,
            onSelect: handleDeleteRecord
          }
        ]
      }
    ]
  }

  // Default (non-ongoing views): keep as one section.
  return [
    {
      key: 'record-default',
      label: '',
      items: [
        {
          action: 'watchResult',
          label: t('record.watchResult'),
          disabled: !recordData.value,
          onSelect: goWatchResult
        },
        {
          action: 'goToProject',
          label: t('record.goToProject'),
          disabled: !projectId.value,
          onSelect: goToProject
        },
        {
          action: 'deleteRecord',
          label: t('record.deleteRecord'),
          iconUrl: '/assets/image/settings/086__empty.svg',
          danger: true,
          disabled: !recordData.value,
          onSelect: handleDeleteRecord
        }
      ]
    }
  ]
})

function goTimeSlots() {
  router.push({
    name: 'record',
    params: { record_id: recordId.value },
    query: { 'time-slots': '1' }
  })
}

function openRecordFeedbackModal() {
  showRecordFeedbackModal.value = true
}

async function closeRecordFeedbackModal({ toResultSharing = false } = {}) {
  showRecordFeedbackModal.value = false

  if (toResultSharing) {
    await router.replace({
      name: 'record',
      params: { record_id: recordId.value },
      query: { 'result-sharing': '1' }
    })
    return
  }

  if (hasAddRecordFeedbackQuery.value) {
    const next = { ...route.query }
    delete next['add-record-feedback']
    await router.replace({
      name: 'record',
      params: { record_id: recordId.value },
      query: next
    })
  }
}

async function uploadResultImages(uid, recordIdArg, files) {
  const recordIdSafe = String(recordIdArg || '').trim()
  const arr = Array.isArray(files) ? files : []
  const out = []
  const MAX_BYTES = 25 * 1024 * 1024

  for (const file of arr) {
    if (!(file instanceof File)) continue
    if (Number.isFinite(file.size) && file.size > MAX_BYTES) {
      throw new Error(t('recordResult.fileTooLarge', { max: 25 }))
    }

    const contentType = file.type || 'image/jpeg'
    const ext = String(contentType).split('/')[1] || 'jpg'
    const path = `users/${uid}/records/${recordIdSafe}/result/${uuidv4()}.${ext}`
    const objRef = storageRef(storage, path)
    await uploadBytes(objRef, file, { contentType })
    out.push(await getDownloadURL(objRef))
  }

  return out
}

async function handleSaveRecordFeedback(payload) {
  if (savingResult.value) return

  if (authPending.value) return
  const uid = currentUser.value?.uid
  if (!uid) return
  if (!recordData.value) return

  const hadExistingResult = recordData.value?.result != null

  const kept = Array.isArray(payload?.kept_urls) ? payload.kept_urls : []
  const newFiles = Array.isArray(payload?.new_files) ? payload.new_files : []
  const thought = String(payload?.thought || '').trim()

  try {
    savingResult.value = true

    const uploadedUrls = await uploadResultImages(uid, recordId.value, newFiles)
    const images = [...kept.map((u) => String(u || '').trim()).filter(Boolean), ...uploadedUrls]
      .filter(Boolean)
      .slice(0, 3)

    const nextResult = { images, thought }
    recordData.value.result = nextResult

    await callApi('mergeUserRecord', uid, recordId.value, { result: nextResult })

    await callApi('upsertPublicUserRecordSummary', {
      userId: uid,
      recordId: recordId.value,
      project_id: String(recordData.value?.project_id || ''),
      project_name: String(recordData.value?.project_name || recordData.value?.projectName || ''),
      percentage: Number.isFinite(Number(recordData.value?.percentage))
        ? Number(recordData.value.percentage)
        : getRecordProgressPercent(recordData.value),
      result: nextResult
    })

    await closeRecordFeedbackModal({ toResultSharing: hadExistingResult })
  } catch (error) {
    console.error('RecordView: error saving result:', error)
    openError({
      title: t('common.error'),
      message: String(error?.message || '').trim() || t('recordResult.saveFailed'),
      confirmText: t('common.ok')
    })
  } finally {
    savingResult.value = false
  }
}

async function handleRestartRecord() {
  if (authPending.value) return
  const uid = currentUser.value?.uid
  if (!uid) return
  if (!recordData.value) return

  const ok = await openConfirmation({ type: 'restartRecord' })
  if (!ok) return

  const list = Array.isArray(recordData.value.component_list) ? recordData.value.component_list : []
  const nextList = list.map((c) => {
    if (!c || typeof c !== 'object') return c
    return {
      ...c,
      end_at: getLastEndAtForComponent(c),
      is_completed: false
    }
  })

  recordData.value.is_completed = false
  recordData.value.last_selected_component_index = 0
  recordData.value.component_list = nextList

  try {
    await callApi('mergeUserRecord', uid, recordId.value, {
      is_completed: false,
      last_selected_component_index: 0,
      component_list: nextList
    })
  } catch (error) {
    console.error('RecordView: error restarting record:', error)
  }

  await router.push({
    name: 'record',
    params: { record_id: recordId.value },
    query: {}
  })
}

function buildRecordQueryForLoadedRecord(record) {
  const query = { ...route.query }
  delete query['completed-result']

  const completed = Boolean(record?.is_completed)
  const onResultSharing = Object.prototype.hasOwnProperty.call(query, 'result-sharing')
  const onTimeSlots = Object.prototype.hasOwnProperty.call(query, 'time-slots')
  const onTimeSlotId = Object.prototype.hasOwnProperty.call(query, 'time_slot_id')

  if (completed && !onTimeSlots && !onTimeSlotId && !onResultSharing) {
    query['result-sharing'] = '1'
  }

  return query
}

async function syncRouteForLoadedRecord(record) {
  if (!record || typeof record !== 'object') return

  const nextQuery = buildRecordQueryForLoadedRecord(record)
  const currentQuery = route.query || {}

  const keys = new Set([...Object.keys(currentQuery), ...Object.keys(nextQuery)])
  let same = true
  for (const key of keys) {
    if (String(currentQuery[key] ?? '') !== String(nextQuery[key] ?? '')) {
      same = false
      break
    }
  }
  if (same) return

  // replace (not push) swaps the current history entry — e.g. /record/id without query
  // becomes /record/id?result-sharing=1 so "back" does not return to bare /record/id
  try {
    await router.replace({
      name: 'record',
      params: { record_id: recordId.value },
      query: nextQuery
    })
  } catch (e) {
    console.warn('RecordView: failed to sync record route:', e)
  }
}

let inFlightLoad = null
let inFlightRecordId = ''

const loadRecord = async ({ force = false } = {}) => {
  const id = recordId.value
  if (!id) return

  if (!force && recordData.value && loadedRecordId.value === id) {
    await syncRouteForLoadedRecord(recordData.value)
    return recordData.value
  }

  if (authPending.value) return
  const uid = currentUser.value?.uid
  if (!uid) {
    recordData.value = null
    loadedRecordId.value = ''
    clearLastAccessedRecordId()
    return
  }

  // Deduplicate concurrent loads for the same record id.
  if (!force && inFlightLoad && inFlightRecordId === id) return inFlightLoad

  recordLoading.value = true
  inFlightRecordId = id
  inFlightLoad = (async () => {
    const data = await callApi('fetchUserRecord', uid, id)
    if (!data) {
      recordData.value = null
      loadedRecordId.value = id
      return null
    }

    normalizeRecordForComponentCountsInPlace(data)

    if (data.project_id) {
      const pid = String(data.project_id)
      const needProjectName = !data.project_name
      const needStitches = loadedProjectIdForStitches.value !== pid

      const needMaterials = loadedProjectIdForMaterials.value !== pid

      if (needProjectName || needStitches || needMaterials) {
        try {
          const project = await callApi('fetchProject', pid)
          if (needProjectName && project?.name) data.project_name = project.name

          if (needStitches) {
            loadedProjectIdForStitches.value = pid
            selfDefinedStitches.value = Array.isArray(project?.self_defined_stitches)
              ? project.self_defined_stitches
              : []
          }

          if (needMaterials) {
            loadedProjectIdForMaterials.value = pid
            const raw = project?.materials && typeof project.materials === 'object' ? project.materials : {}
            projectMaterials.value = {
              hook: Array.isArray(raw?.hook) ? raw.hook : [],
              yarn: Array.isArray(raw?.yarn) ? raw.yarn : []
            }
          }

          if (project?.component_list && Array.isArray(project.component_list)) {
            const projectComponents = expandComponentListByCount(project.component_list, { resetEndAt: false })
            const recordComponents = Array.isArray(data.component_list) ? data.component_list : []

            if (projectComponents.length > recordComponents.length && projectComponents.length > 0) {
              const nextComponentList = projectComponents.map((component, idx) => {
                const base = JSON.parse(JSON.stringify(component))
                const existing = recordComponents[idx]
                if (existing && typeof existing === 'object') {
                  return { ...base, ...JSON.parse(JSON.stringify(existing)) }
                }
                return { ...base, end_at: null, is_completed: false }
              })

              data.component_list = nextComponentList

              const slots = Array.isArray(data.time_slots) ? data.time_slots : []
              for (const slot of slots) {
                if (!slot || typeof slot !== 'object') continue
                if (!Array.isArray(slot.end_at_list)) continue
                const next = slot.end_at_list.slice(0, nextComponentList.length).map((e) => (e ? { ...e } : null))
                while (next.length < nextComponentList.length) next.push(null)
                slot.end_at_list = next
              }

              try {
                await callApi('mergeUserRecord', uid, id, {
                  component_list: nextComponentList,
                  time_slots: data.time_slots
                })
              } catch (e) {
                console.warn('RecordView: failed to reconcile record components with project:', e)
              }
            }
          }
        } catch (e) {
          if (needProjectName) {
            console.warn('Failed to fetch project name for record title:', e)
          }
          if (needStitches) {
            console.warn('Failed to fetch project self_defined_stitches for record:', e)
            selfDefinedStitches.value = []
          }
        }
      }
    }

    const switchResult = await handleSwitchRecordingSessionIfNeeded({
      uid,
      nextRecordId: id,
      nextRecord: data
    })

    if (switchResult?.cancelled) {
      return null
    }

    // Ensure doc id exists on the record object.
    if (data && typeof data === 'object') data.id = String(id)

    recordData.value = data
    loadedRecordId.value = id

    try {
      await statusCatalog.ensureProfileIncludesRecordStatusData(data)
    } catch (e) {
      console.warn('RecordView: failed to sync user status catalog:', e)
    }

    // Latest record is defined as: the last record we accessed.
    latestRecordStore.setLatestRecordData(recordData.value)
    writeLastAccessedRecordId(id)
    await syncRouteForLoadedRecord(data)
    return data
  })()

  try {
    return await inFlightLoad
  } finally {
    recordLoading.value = false
    inFlightLoad = null
    inFlightRecordId = ''
  }
}

function goToProject() {
  if (!projectId.value) return
  router.push({ name: 'project', params: { project_id: projectId.value } })
}

function goWatchResult() {
  router.push({
    name: 'record',
    params: { record_id: recordId.value },
    query: { 'result-sharing': '1' }
  })
}

function goPrintRecord() {
  router.push({
    name: 'record-print',
    params: { record_id: recordId.value }
  })
}

function stableStringify(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function normalizeImageUrls(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean)
}

function stripComponentProgressForCompare(component) {
  if (!component || typeof component !== 'object') return component
  const cloned = JSON.parse(JSON.stringify(component))
  if (cloned && typeof cloned === 'object') {
    delete cloned.end_at
    delete cloned.is_completed
    delete cloned._instance
  }
  return cloned
}

async function handleSyncFromProject() {
  if (authPending.value) return
  const uid = currentUser.value?.uid
  if (!uid) return

  const record = recordData.value
  if (!record || typeof record !== 'object') return

  const pid = projectId.value
  if (!pid) {
    await openNotice({
      title: t('common.notice'),
      message: t('record.noProjectId'),
      confirmText: t('common.ok')
    })
    return
  }

  const ok = await openConfirmation({ type: 'syncProject' })
  if (!ok) return

  try {
    const project = await callApi('fetchProject', String(pid))
    if (!project) {
      await openNotice({
        title: t('common.notice'),
        message: t('common.loading'),
        confirmText: t('common.ok')
      })
      return
    }

    const projectUpdatedMs = toMs(project?.updated_at) ?? toMs(project?.updatedAt) ?? 0
    const recordSyncedMs =
      toMs(record?.sync_at) ??
      toMs(record?.synced_at) ??
      toMs(record?.syncedAt) ??
      0

    if (projectUpdatedMs > 0 && recordSyncedMs > 0 && projectUpdatedMs <= recordSyncedMs) {
      await openNotice({
        title: t('common.notice'),
        message: t('record.syncNoChangesNotice'),
        confirmText: t('common.ok')
      })
      return
    }

    const nextName = String(project?.name || '').trim() || String(record?.project_name || '')
    const nextDescription = String(project?.description || '').trim() || String(record?.project_description || '')
    const nextImages = normalizeImageUrls(project?.images)
    const nextCover = nextImages[0] || (typeof project?.image === 'string' ? project.image.trim() : '') || null

    const projectComponentsRaw = Array.isArray(project?.component_list) ? project.component_list : []
    const projectComponentsExpanded = projectComponentsRaw.length
      ? expandComponentListByCount(projectComponentsRaw, { resetEndAt: false })
      : []
    const recordComponents = Array.isArray(record?.component_list) ? record.component_list : []

    const nextComponentList = projectComponentsExpanded.length
      ? projectComponentsExpanded.map((component, idx) => {
          const base = JSON.parse(JSON.stringify(component))
          const existing = recordComponents[idx]
          if (existing && typeof existing === 'object') {
            base.end_at = existing?.end_at ?? null
            base.is_completed = Boolean(existing?.is_completed)
          } else {
            base.end_at = null
            base.is_completed = false
          }
          return base
        })
      : recordComponents

    const nextTimeSlots = Array.isArray(record?.time_slots)
      ? record.time_slots.map((slot) => {
          if (!slot || typeof slot !== 'object') return slot
          if (!Array.isArray(slot.end_at_list)) return slot
          const next = slot.end_at_list
            .slice(0, nextComponentList.length)
            .map((e) => (e ? { ...e } : null))
          while (next.length < nextComponentList.length) next.push(null)
          return { ...slot, end_at_list: next }
        })
      : record?.time_slots

    const updatedSections = []
    if (String(record?.project_name || '') !== nextName) updatedSections.push(t('record.syncUpdatedSections.name'))
    if (String(record?.project_description || '') !== nextDescription) updatedSections.push(t('record.syncUpdatedSections.description'))
    if (stableStringify(normalizeImageUrls(record?.project_images)) !== stableStringify(nextImages)) {
      updatedSections.push(t('record.syncUpdatedSections.images'))
    }

    const prevChart = stableStringify((recordComponents || []).map(stripComponentProgressForCompare))
    const nextChart = stableStringify((nextComponentList || []).map(stripComponentProgressForCompare))
    if (prevChart !== nextChart) updatedSections.push(t('record.syncUpdatedSections.chart'))

    if (updatedSections.length === 0) {
      await openNotice({
        title: t('common.notice'),
        message: t('record.syncNoChangesNotice'),
        confirmText: t('common.ok')
      })
      return
    }

    const nowIso = new Date().toISOString()

    const patch = {
      project_name: nextName,
      project_image: nextCover,
      project_description: nextDescription,
      project_images: nextImages,
      component_list: nextComponentList,
      time_slots: nextTimeSlots,
      synced_at: nowIso
    }

    await callApi('mergeUserRecord', String(uid), String(recordId.value), patch)

    const nextRecord = { ...record, ...patch }
    nextRecord.id = String(recordId.value)
    recordData.value = nextRecord

    // Keep dock record reference aligned with the record page.
    latestRecordStore.setLatestRecordData(nextRecord)

    const joiner = String(locale.value || '').startsWith('zh') ? '、' : ', '
    await openNotice({
      title: t('common.notice'),
      message: t('record.syncUpdatedNotice', { items: updatedSections.join(joiner) }),
      confirmText: t('common.ok')
    })
  } catch (e) {
    console.error('RecordView: sync from project failed:', e)
    await openError({
      title: t('common.error'),
      message: t('record.syncFailedNotice'),
      confirmText: t('common.ok')
    })
  }
}

async function handleDeleteRecord() {
  if (authPending.value) return
  const uid = currentUser.value?.uid
  if (!uid) return

  const ok = await openConfirmation({ type: 'deleteRecord' })
  if (!ok) return

  try {
    await callApi('deleteUserRecord', uid, recordId.value)

    try {
      await callApi('deletePublicUserRecordSummary', { userId: uid, recordId: recordId.value })
    } catch (e) {
      console.warn('RecordView: failed to delete public record summary:', e)
    }

    recordData.value = null
    loadedRecordId.value = ''

    const dock = latestRecordStore.latestRecordData
    const dockId = String(dock?.id || '').trim()
    if (dockId && dockId === String(recordId.value)) {
      latestRecordStore.setLatestRecordData(null)
      clearLastAccessedRecordId()
    }

    await openNotice({
      title: t('common.notice'),
      message: t('record.deleteSuccessNotice'),
      confirmText: t('common.ok')
    })

    router.back()
  } catch (error) {
    console.error('RecordView: error deleting record:', error)
  }
}

const lastPage = () => {
  router.go(-1)
}

provideRecordContext({
  recordId,
  recordData,
  recordLoading,
  loadRecord,
  projectMaterials
})

watch(
  () => [recordId.value, currentUser.value],
  (newVal, oldVal) => {
    const [rid, user] = newVal || []
    const [prevRid, prevUser] = oldVal || []
    if (!rid) return
    if (user === undefined) return

    const uid = user?.uid || null
    const prevUid = prevUser?.uid || null
    const force = String(prevRid || '') !== String(rid || '') || uid !== prevUid
    loadRecord({ force })
  },
  { immediate: true }
)

watch(
  () => route.fullPath,
  async () => {
    if (recordLoading.value) return
    const r = recordData.value
    if (!r || typeof r !== 'object') return
    await syncRouteForLoadedRecord(r)
  }
)

onMounted(() => {
  appBanner?.setBanner({ visible: true, showBack: true, onBack: lastPage })
  setScrollbarHidden(true)
})

onUnmounted(() => {
  setScrollbarHidden(false)
  appBanner?.resetHandlers()
})

watch(
  () => hasAddRecordFeedbackQuery.value,
  (v) => {
    if (v) showRecordFeedbackModal.value = true
  },
  { immediate: true }
)
</script>

<style scoped>
.record-shell {
  width: 100%;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}


.page-content {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 1rem;
  flex: 1;
  overflow-x: clip;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  position: relative;
}


.page-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  pointer-events: none;
}

.page-content > * {
  position: relative;
}

.record-top-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

</style>
