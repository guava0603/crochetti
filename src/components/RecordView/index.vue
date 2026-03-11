<template>
  <Teleport to=".top-banner__side--right">
    <div class="record-top-actions" @click.stop>
      <HelpIconButton
        v-if="isOngoingView"
        topic-id="recordHowTo"
        :aria-label="$t('help.recordHowTo.aria')"
      />
      <button
        v-if="hasResultSharingQuery"
        type="button"
        class="record-top-actions__icon-btn"
        :aria-label="$t('recordResult.shareOrDownload')"
        :title="$t('recordResult.shareOrDownload')"
        :disabled="!recordData || recordLoading"
        @click="handleResultShareDownload"
      >
        <img
          class="record-top-actions__icon-img"
          :src="downloadIconUrl"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      </button>
      <MoreMenu
        v-else
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

    <EditRecordResultModal
      :show="showEditResultModal"
      :saving="savingResult"
      :initial-images="recordData?.result?.images"
      :initial-thought="recordData?.result?.thought"
      @close="closeEditResult"
      @save="handleSaveEditResult"
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

import HelpIconButton from '@/components/help/HelpIconButton.vue'
import MoreMenu from '@/components/buttons/MoreMenu.vue'

import RecordOngoing from '@/components/records/RecordOngoing.vue'
import RecordTimeSlotList from '@/components/records/RecordTimeSlotList.vue'
import RecordSingleTimeSlot from '@/components/records/RecordSingleTimeSlot.vue'
import RecordResult from '@/components/records/RecordResult.vue'
import RecordCompletedResult from '@/components/records/RecordCompletedResult.vue'

import { provideRecordContext } from '@/composables/recordContext'
import { provideSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'
import { useAppBanner } from '@/composables/appBanner'

import { expandComponentListByCount, normalizeRecordForComponentCountsInPlace } from '@/utils/componentInstances'
import EditRecordResultModal from '@/components/modals/EditRecordResultModal.vue'
import { getLastEndAtForComponent, getRecordProgressPercent } from '@/utils/recordProgressGenerate'
import { formatDateTimeCompact } from '@/utils/dateTime'
import { toMs } from '@/utils/toMs'

import { openConfirmation } from '@/services/ui/confirmation'
import { openError, openNotice } from '@/services/ui/notice'
import { useLatestRecordStore } from '@/stores/latestRecordStore'

defineOptions({ name: 'RecordViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null }
})

const currentUser = computed(() => props.currentUser)
const authPending = computed(() => currentUser.value === undefined)

const emit = defineEmits(['api'])

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

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
const showEditResultModal = ref(false)

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
  if (!isOngoingView.value) return { cancelled: false }
  if (nextRecord?.is_completed === true) return { cancelled: false }

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
const hasCompletedResultQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'completed-result'))
const hasEditResultQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'edit-result'))

const recordCreatedAtMs = computed(() => {
  const r = recordData.value
  return toMs(r?.created_at) ?? toMs(r?.createdAt) ?? null
})

const recordUpdatedAtMs = computed(() => {
  const r = recordData.value
  return toMs(r?.updated_at) ?? toMs(r?.updatedAt) ?? null
})

const recordCreatedAtCompact = computed(() => {
  const ms = recordCreatedAtMs.value
  if (ms == null) return ''
  return formatDateTimeCompact(ms)
})

const recordUpdatedAtCompact = computed(() => {
  const ms = recordUpdatedAtMs.value
  if (ms == null) return ''
  return formatDateTimeCompact(ms)
})

const baseUrl = import.meta.env.BASE_URL || '/'
const downloadIconUrl = `${baseUrl}assets/image/settings/027__download.svg`

const activeViewRef = ref(null)

async function handleResultShareDownload() {
  const fn = activeViewRef.value?.shareOrDownload
  if (typeof fn !== 'function') {
    console.warn('RecordView: active view does not expose shareOrDownload')
    await openNotice({
      title: t('common.notice'),
      message: t('common.loading'),
      confirmText: t('common.ok')
    })
    return
  }
  await fn()
}

const activeView = computed(() => {
  if (hasTimeSlotIdQuery.value) return RecordSingleTimeSlot
  if (hasTimeSlotsQuery.value) return RecordTimeSlotList
  if (hasCompletedResultQuery.value) return RecordCompletedResult
  if (hasResultSharingQuery.value) return RecordResult
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
  if (hasCompletedResultQuery.value) {
    return [
      {
        key: 'record-completed',
        label: '',
        items: [
          {
            action: 'modifyResult',
            label: t('record.modifyResult'),
            disabled: !recordData.value || recordLoading.value || savingResult.value,
            onSelect: openEditResult
          },
          {
            action: 'details',
            label: t('record.recordDetails'),
            disabled: !recordData.value,
            onSelect: goTimeSlots
          }
        ]
      },
      {
        key: 'record-completed-danger',
        label: '',
        items: [
          {
            action: 'restartRecord',
            label: t('record.restartRecord'),
            danger: true,
            disabled: !recordData.value || savingResult.value,
            onSelect: handleRestartRecord
          }
        ]
      }
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

function openEditResult() {
  showEditResultModal.value = true
}

async function closeEditResult({ toCompletedResult = false } = {}) {
  showEditResultModal.value = false

  if (toCompletedResult) {
    await router.replace({
      name: 'record',
      params: { record_id: recordId.value },
      query: { 'completed-result': '1' }
    })
    return
  }

  if (hasEditResultQuery.value) {
    const next = { ...route.query }
    delete next['edit-result']
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

async function handleSaveEditResult(payload) {
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

    await closeEditResult({ toCompletedResult: hadExistingResult })
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

let inFlightLoad = null
let inFlightRecordId = ''

const loadRecord = async ({ force = false } = {}) => {
  const id = recordId.value
  if (!id) return

  if (!force && recordData.value && loadedRecordId.value === id) {
    return recordData.value
  }

  if (authPending.value) return
  const uid = currentUser.value?.uid
  if (!uid) {
    recordData.value = null
    loadedRecordId.value = ''
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

    recordData.value = data
    loadedRecordId.value = id
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

onMounted(() => {
  appBanner?.setBanner({ visible: true, showBack: true, onBack: lastPage })
  setScrollbarHidden(true)
})

onUnmounted(() => {
  setScrollbarHidden(false)
  appBanner?.resetHandlers()
})

watch(
  () => hasEditResultQuery.value,
  (v) => {
    if (v) showEditResultModal.value = true
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
  padding: 1rem;
  flex: 1;
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

.record-top-actions__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s, opacity 0.15s;
}

.record-top-actions__icon-btn:hover {
  background: rgba(243, 244, 246, 0.98);
}

.record-top-actions__icon-btn:active {
  transform: translateY(1px);
}

.record-top-actions__icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.record-top-actions__icon-img {
  width: 20px;
  height: 20px;
  display: block;
  transform: scale(2);
}

</style>
