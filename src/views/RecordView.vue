<template>
  <div class="record-shell">
    <TopBanner
      fixed
      :title="bannerTitle"
      @last-page="lastPage"
    >
      <template #right>
        <MoreMenu
          :label="t('project.more')"
          :disabled="!recordData || recordLoading"
          :items="moreMenuItems"
        />
      </template>
    </TopBanner>

    <div class="page-content">
      <component :is="activeView" />
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
import { onAuthStateChanged } from 'firebase/auth'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { v4 as uuidv4 } from '@lukeed/uuid'

import RecordOngoing from '@/components/records/RecordOngoing.vue'
import RecordTimeSlotList from '@/components/records/RecordTimeSlotList.vue'
import RecordSingleTimeSlot from '@/components/records/RecordSingleTimeSlot.vue'
import RecordResult from '@/components/records/RecordResult.vue'
import RecordCompletedResult from '@/components/records/RecordCompletedResult.vue'
import TopBanner from '@/components/layout/TopBanner.vue'
import MoreMenu from '@/components/buttons/MoreMenu.vue'
import { auth } from '@/firebaseConfig'
import {
  deletePublicUserRecordSummary,
  deleteUserRecord,
  fetchUserRecord,
  mergeUserRecord,
  setUserRecord,
  upsertPublicUserRecordSummary,
} from '@/services/firestore/records'
import { fetchProject } from '@/services/firestore/projects'
import { openConfirmation } from '@/services/ui/confirmation'
import { openError, openNotice } from '@/services/ui/notice'
import { provideRecordContext } from '@/composables/recordContext'
import { expandComponentListByCount, normalizeRecordForComponentCountsInPlace } from '@/utils/componentInstances'
import { storage } from '@/firebaseConfig'
import EditRecordResultModal from '@/components/modals/EditRecordResultModal.vue'
import { getLastEndAtForComponent, getRecordProgressPercent } from '@/utils/recordProgressGenerate'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const recordId = computed(() => String(route.params.record_id || ''))
const recordData = ref(null)
const recordLoading = ref(false)
const loadedRecordId = ref('')

const syncingProject = ref(false)
const savingResult = ref(false)
const showEditResultModal = ref(false)

const SCROLLBAR_HIDDEN_CLASS = 'hide-scrollbar'

function setScrollbarHidden(hidden) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(SCROLLBAR_HIDDEN_CLASS, hidden)
  document.body?.classList?.toggle?.(SCROLLBAR_HIDDEN_CLASS, hidden)
}

const bannerTitle = computed(() => {
  return recordData.value?.project_name || recordData.value?.projectName || t('record.record')
})

const projectId = computed(() => {
  const id = recordData.value?.project_id
  const s = id != null ? String(id).trim() : ''
  return s || null
})

const moreMenuItems = computed(() => {
  if (hasCompletedResultQuery.value) {
    return [
      {
        action: 'modifyResult',
        label: t('record.modifyResult'),
        disabled: !recordData.value || recordLoading.value || savingResult.value,
        onSelect: () => openEditResult()
      },
      {
        action: 'details',
        label: t('record.recordDetails'),
        disabled: !recordData.value,
        onSelect: () => goTimeSlots()
      },
      {
        action: 'restartRecord',
        label: t('record.restartRecord'),
        danger: true,
        disabled: !recordData.value || savingResult.value,
        onSelect: () => handleRestartRecord()
      }
    ]
  }

  return [
    {
      action: 'watchResult',
      label: t('record.watchResult'),
      disabled: !recordData.value,
      onSelect: () => goWatchResult()
    },
    {
      action: 'goToProject',
      label: t('record.goToProject'),
      disabled: !projectId.value,
      onSelect: () => goToProject()
    },
    {
      action: 'syncProject',
      label: t('record.syncProject'),
      disabled: syncingProject.value || !recordData.value,
      onSelect: () => handleSyncProject()
    },
    {
      action: 'deleteRecord',
      label: t('record.deleteRecord'),
      danger: true,
      disabled: !recordData.value,
      onSelect: () => handleDeleteRecord()
    }
  ]
})

const hasTimeSlotsQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'time-slots'))
const hasResultSharingQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'result-sharing'))
const hasTimeSlotIdQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'time_slot_id'))
const hasCompletedResultQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'completed-result'))
const hasEditResultQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'edit-result'))

const activeView = computed(() => {
  if (hasTimeSlotIdQuery.value) return RecordSingleTimeSlot
  if (hasTimeSlotsQuery.value) return RecordTimeSlotList
  if (hasCompletedResultQuery.value) return RecordCompletedResult
  if (hasResultSharingQuery.value) return RecordResult
  return RecordOngoing
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

  const user = await waitForAuthReady()
  const uid = user?.uid
  if (!uid) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }
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
    await mergeUserRecord(uid, recordId.value, { result: nextResult })

    // Publish a sanitized summary for public user pages.
    // (Public read path; still private full record under `/users/{uid}/records`.)
    await upsertPublicUserRecordSummary({
      userId: uid,
      recordId: recordId.value,
      project_id: String(recordData.value?.project_id || ''),
      project_name: String(recordData.value?.project_name || recordData.value?.projectName || ''),
      percentage: Number.isFinite(Number(recordData.value?.percentage))
        ? Number(recordData.value.percentage)
        : getRecordProgressPercent(recordData.value),
      result: nextResult,
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
  const user = await waitForAuthReady()
  const uid = user?.uid
  if (!uid) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }
  if (!recordData.value) return

  const ok = await openConfirmation({ type: 'restartRecord' })
  if (!ok) return

  const list = Array.isArray(recordData.value.component_list) ? recordData.value.component_list : []
  const nextList = list.map((c) => {
    if (!c || typeof c !== 'object') return c
    return {
      ...c,
      // Restarting a completed record should restore a valid end position.
      // When components are marked completed we clear end_at; on restart we set it to the last crochet.
      end_at: getLastEndAtForComponent(c),
      is_completed: false
    }
  })

  recordData.value.is_completed = false
  recordData.value.last_selected_component_index = 0
  recordData.value.component_list = nextList

  try {
    await mergeUserRecord(uid, recordId.value, {
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

const waitForAuthReady = () =>
  new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })

const loadRecord = async ({ force = false } = {}) => {
  const id = recordId.value
  if (!id) return

  if (!force && recordData.value && loadedRecordId.value === id) {
    return recordData.value
  }

  const user = await waitForAuthReady()
  const uid = user?.uid
  if (!uid) {
    recordData.value = null
    loadedRecordId.value = ''
    return
  }

  recordLoading.value = true
  try {
    const data = await fetchUserRecord(uid, id)
    if (!data) {
      recordData.value = null
      loadedRecordId.value = id
      return
    }

    normalizeRecordForComponentCountsInPlace(data)

    // Ensure project_name is available for banner title.
    if (!data.project_name && data.project_id) {
      try {
        const project = await fetchProject(String(data.project_id))
        if (project?.name) data.project_name = project.name
      } catch (e) {
        console.warn('Failed to fetch project name for record title:', e)
      }
    }

    recordData.value = data
    loadedRecordId.value = id
    return data
  } finally {
    recordLoading.value = false
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

async function handleSyncProject() {
  if (syncingProject.value) return
  if (!recordData.value) return

  await openConfirmation({
    type: 'syncProject',
    onConfirm: async () => {
      await syncProject()
    }
  })
}

async function syncProject() {
  if (syncingProject.value) return

  const user = await waitForAuthReady()
  const uid = user?.uid
  if (!uid) {
    openError({
      title: t('common.error'),
      message: t('auth.loginRequired'),
      confirmText: t('common.ok')
    })
    return
  }

  if (!recordData.value?.project_id) {
    openError({
      title: t('common.error'),
      message: t('record.noProjectId'),
      confirmText: t('common.ok')
    })
    return
  }

  try {
    syncingProject.value = true

    const project = await fetchProject(String(recordData.value.project_id))
    if (!project) {
      openError({
        title: t('common.error'),
        message: t('project.notFound'),
        confirmText: t('common.ok')
      })
      return
    }

    const projectComponents = expandComponentListByCount(project.component_list, { resetEndAt: false })
    const recordComponents = Array.isArray(recordData.value.component_list) ? recordData.value.component_list : []
    const endAtByIndex = recordComponents.map((c) => c?.end_at ?? null)

    const nextComponentList = projectComponents.map((component, idx) => {
      const clone = JSON.parse(JSON.stringify(component))
      clone.end_at = idx < endAtByIndex.length ? endAtByIndex[idx] : null
      return clone
    })

    recordData.value.component_list = nextComponentList
    if (project?.name) recordData.value.project_name = project.name

    normalizeRecordForComponentCountsInPlace(recordData.value)
    await setUserRecord(uid, recordId.value, recordData.value)

    openNotice({
      title: t('common.notice'),
      message: t('record.syncSuccessNotice'),
      confirmText: t('common.ok')
    })
  } catch (error) {
    console.error('RecordView: error syncing project:', error)
    openError({
      title: t('common.error'),
      message: t('record.syncFailedNotice'),
      confirmText: t('common.ok')
    })
  } finally {
    syncingProject.value = false
  }
}

async function handleDeleteRecord() {
  const user = await waitForAuthReady()
  const uid = user?.uid
  if (!uid) return

  const ok = await openConfirmation({ type: 'deleteRecord' })
  if (!ok) return

  try {
    await deleteUserRecord(uid, recordId.value)

    try {
      await deletePublicUserRecordSummary({ userId: uid, recordId: recordId.value })
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
  // Desired back-chain within a record:
  // time-slot detail -> time-slots list -> result-sharing -> ongoing -> project
  // if (hasTimeSlotIdQuery.value) {
  //   router.push({
  //     name: 'record',
  //     params: route.params,
  //     query: { 'time-slots': '1' }
  //   })
  //   return
  // }

  // if (hasTimeSlotsQuery.value) {
  //   router.push({
  //     name: 'record',
  //     params: route.params,
  //     query: { 'result-sharing': '1' }
  //   })
  //   return
  // }

  // if (hasResultSharingQuery.value) {
  //   router.push({
  //     name: 'record',
  //     params: route.params,
  //     query: {}
  //   })
  //   return
  // }

  // router.push({ name: 'project', params: { project_id: projectId.value } })
}

provideRecordContext({
  recordId,
  recordData,
  recordLoading,
  loadRecord
})

onMounted(() => {
  setScrollbarHidden(true)
  loadRecord()
})

onUnmounted(() => {
  setScrollbarHidden(false)
})

watch(recordId, () => {
  loadRecord({ force: true })
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
  max-width: 1200px;
  margin: 0 auto;
  height: 100vh;
  overflow: hidden;
}

.page-content {
  padding: 6.5rem 1rem 0;
  height: 100vh;
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
</style>
