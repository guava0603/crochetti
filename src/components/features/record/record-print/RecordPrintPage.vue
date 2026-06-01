<template>
  <div class="record-print-shell">
    <div class="print-page-content">
      <div class="print-page-toolbar">
        <ToolbarButton
          icon-src="assets/image/settings/083__setting_edit.svg"
          :aria-label="t('print.editSettings')"
          :title="t('print.editSettings')"
          :disabled="!recordData || recordLoading"
          @click="openSettings"
        />
        <button
          type="button"
          class="btn-share-image"
          :disabled="!recordData || recordLoading || sharing"
          :aria-label="t('record.shareCompletedResultImage')"
          :title="t('record.shareCompletedResultImage')"
          @click="shareImage"
        >
          <ButtonPrinter />
        </button>
      </div>

      <div v-if="recordLoading" class="print-loading">{{ t('common.loading') }}</div>

      <div v-else-if="recordData" class="print-live-html">
        <RecordResultSharing
          ref="sharingRef"
          disable-animations
          show-printed-domain-border
          :current-user="currentUser"
          :profile="profile"
          :section-visibility="sectionVisibility"
          :extra-images-settings="extraImagesSettings"
          :completed-time-settings="completedTimeSettings"
        />
      </div>
    </div>

    <RecordPrintSettingsModal
      v-model:show="showSettingsModal"
      :model-value="sectionVisibility"
      :extra-images-settings="extraImagesSettings"
      :completed-time-settings="completedTimeSettings"
      :completed-at-ms="completedAtMs"
      :source-images="sourceImageUrls"
      :available-keys="availableSectionKeys"
      @save="applySettings"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import ToolbarButton from '@/components/shell/layout/ToolbarButton.vue'
import ButtonPrinter from '@/components/shared/buttons/svg/ButtonPrinter.vue'
import RecordResultSharing from '@/components/features/record/RecordResultSharing.vue'
import RecordPrintSettingsModal from '@/components/modals/record/RecordPrintSettingsModal.vue'
import { provideRecordContext } from '@/composables/recordContext'
import { useAppBanner } from '@/composables/appBanner'
import {
  getRecordSourceImageUrls,
  loadStoredPrintSettings,
  saveStoredPrintSettings
} from '@/constants/recordResultSharingSections'
import { getAvailableSharingSections, normalizeSectionVisibilityForAvailable } from '@/utils/recordResultSectionAvailability'
import { normalizeExtraImagesSettings } from '@/constants/recordPrintExtraImages'
import { normalizeCompletedTimeSettings } from '@/constants/recordPrintCompletedTime'
import { getRecordCompletedAtMs } from '@/utils/recordResultSectionAvailability'

defineOptions({ name: 'RecordPrintViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null }
})

const emit = defineEmits(['api'])

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const appBanner = useAppBanner()

const currentUser = computed(() => props.currentUser)
const authPending = computed(() => currentUser.value === undefined)

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const recordId = computed(() => String(route.params.record_id || ''))
const recordData = ref(null)
const recordLoading = ref(false)
const sharingRef = ref(null)
const sharing = ref(false)
const showSettingsModal = ref(false)

const printSettings = ref(loadStoredPrintSettings(recordId.value))

const sourceImageUrls = computed(() => getRecordSourceImageUrls(recordData.value))

const sectionVisibility = computed({
  get: () => printSettings.value.sectionVisibility,
  set: (value) => {
    printSettings.value = { ...printSettings.value, sectionVisibility: value }
  }
})

const extraImagesSettings = computed({
  get: () => printSettings.value.extraImages,
  set: (value) => {
    printSettings.value = { ...printSettings.value, extraImages: value }
  }
})

const completedTimeSettings = computed({
  get: () => printSettings.value.completedTime,
  set: (value) => {
    printSettings.value = { ...printSettings.value, completedTime: value }
  }
})

const completedAtMs = computed(() => getRecordCompletedAtMs(recordData.value))

const availableSectionKeys = computed(() =>
  getAvailableSharingSections(recordData.value, { layout: 'sharing' })
)

function reloadPrintSettings() {
  printSettings.value = loadStoredPrintSettings(
    recordId.value,
    availableSectionKeys.value,
    sourceImageUrls.value
  )
}

watch(recordId, () => {
  reloadPrintSettings()
})

watch([availableSectionKeys, sourceImageUrls], () => {
  if (!availableSectionKeys.value.length) return
  reloadPrintSettings()
})

const bannerTitle = computed(() => t('recordPrint.title'))

watch(
  bannerTitle,
  (v) => {
    appBanner?.setBanner({ title: v })
  },
  { immediate: true }
)

async function loadRecord() {
  const id = recordId.value
  if (!id) return

  if (authPending.value) return
  const uid = currentUser.value?.uid
  if (!uid) {
    recordData.value = null
    return
  }

  recordLoading.value = true
  try {
    const data = await callApi('fetchUserRecord', uid, id)
    if (data && typeof data === 'object') {
      data.id = id
      recordData.value = data
    } else {
      recordData.value = null
    }
  } catch (e) {
    console.warn('RecordPrintView: failed to load record:', e)
    recordData.value = null
  } finally {
    recordLoading.value = false
  }
}

function openSettings() {
  showSettingsModal.value = true
}

function applySettings(payload) {
  const nextVisibility = normalizeSectionVisibilityForAvailable(
    payload?.sectionVisibility,
    availableSectionKeys.value
  )
  const nextExtraImages = normalizeExtraImagesSettings(payload?.extraImages, sourceImageUrls.value)
  const nextCompletedTime = normalizeCompletedTimeSettings(payload?.completedTime)

  printSettings.value = {
    sectionVisibility: nextVisibility,
    extraImages: nextExtraImages,
    completedTime: nextCompletedTime
  }

  saveStoredPrintSettings(
    recordId.value,
    printSettings.value,
    availableSectionKeys.value,
    sourceImageUrls.value
  )
}

async function shareImage() {
  if (sharing.value) return
  sharing.value = true
  try {
    await sharingRef.value?.shareOrDownload?.({
      flattenForExport: true,
      backgroundColor: '#ffffff'
    })
  } finally {
    sharing.value = false
  }
}

const lastPage = () => {
  window.history.back()
}

provideRecordContext({
  recordId,
  recordData,
  recordLoading,
  loadRecord
})

watch(
  () => [recordId.value, currentUser.value],
  ([rid, user]) => {
    if (!rid || user === undefined) return
    loadRecord()
  },
  { immediate: true }
)

onMounted(() => {
  appBanner?.setBanner({ visible: true, showBack: true, onBack: lastPage })
})

onUnmounted(() => {
  appBanner?.resetHandlers()
})
</script>

<style scoped>
.record-print-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.print-page-content {
  position: relative;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow-x: clip;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 1rem 0 5rem;
}

.print-live-html {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-inline: auto;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
}

.print-loading {
  color: #6b7280;
  font-weight: 700;
  padding: 1rem 0;
}

.btn-share-image {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--color-icon-base);
}

.btn-share-image:hover:not(:disabled) {
  background: rgba(243, 244, 246, 0.98);
}

.btn-share-image:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
