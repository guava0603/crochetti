<template>
  <div class="record-shell">
    <TopBanner
      fixed
      :title="bannerTitle"
      :show-more="false"
      @last-page="lastPage"
    />

    <div class="page-content" :style="pageBackgroundStyle">
      <component :is="activeView" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'

import recordBackgroundUrl from '@/assets/image/background.png'

import RecordOngoing from '@/components/records/RecordOngoing.vue'
import RecordTimeSlotList from '@/components/records/RecordTimeSlotList.vue'
import RecordSingleTimeSlot from '@/components/records/RecordSingleTimeSlot.vue'
import RecordResult from '@/components/records/RecordResult.vue'
import TopBanner from '@/components/layout/TopBanner.vue'
import { auth } from '@/firebaseConfig'
import { fetchUserRecord } from '@/services/firestore/records'
import { fetchProject } from '@/services/firestore/projects'
import { provideRecordContext } from '@/composables/recordContext'
import { normalizeRecordForComponentCountsInPlace } from '@/utils/componentInstances'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const pageBackgroundStyle = computed(() => ({
  backgroundImage: `url(${recordBackgroundUrl})`
}))

const recordId = computed(() => String(route.params.record_id || ''))
const recordData = ref(null)
const recordLoading = ref(false)
const loadedRecordId = ref('')

const bannerTitle = computed(() => {
  return recordData.value?.project_name || recordData.value?.projectName || t('record.record')
})

const projectId = computed(() => recordData.value?.project_id || recordData.value?.projectId || null)

const hasTimeSlotsQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'time-slots'))
const hasResultSharingQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'result-sharing'))
const hasTimeSlotIdQuery = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'time_slot_id'))

const activeView = computed(() => {
  if (hasTimeSlotIdQuery.value) return RecordSingleTimeSlot
  if (hasTimeSlotsQuery.value) return RecordTimeSlotList
  if (hasResultSharingQuery.value) return RecordResult
  return RecordOngoing
})

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

const lastPage = () => {
  // Desired back-chain within a record:
  // time-slot detail -> time-slots list -> result-sharing -> ongoing -> project
  if (hasTimeSlotIdQuery.value) {
    router.push({
      name: 'record',
      params: route.params,
      query: { 'time-slots': '1' }
    })
    return
  }

  if (hasTimeSlotsQuery.value) {
    router.push({
      name: 'record',
      params: route.params,
      query: { 'result-sharing': '1' }
    })
    return
  }

  if (hasResultSharingQuery.value) {
    router.push({
      name: 'record',
      params: route.params,
      query: {}
    })
    return
  }

  router.push({ name: 'project', params: { project_id: projectId.value } })
}

provideRecordContext({
  recordId,
  recordData,
  recordLoading,
  loadRecord
})

onMounted(() => {
  loadRecord()
})

watch(recordId, () => {
  loadRecord({ force: true })
})
</script>

<style scoped>
.record-shell {
  max-width: 1200px;
  margin: 0 auto;
}

.page-content {
  padding: 6.5rem 2rem 0;
  min-height: 100vh;
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
