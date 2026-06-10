<template>
  <div class="record-print-shell">
    <section v-if="recordData && !recordLoading" class="print-page-preview" :aria-label="t('recordPrint.previewSection')">
      <div class="print-page-toolbar">
        <ToolbarButton
          icon-src="083__setting_edit"
          :aria-label="t('print.editSettings')"
          :title="t('print.editSettings')"
          :disabled="!recordData || recordLoading"
          @click="openSettings"
        />
        <ToolbarButton
          icon-src="027__download"
          :aria-label="t('record.shareCompletedResultImage')"
          :title="t('record.shareCompletedResultImage')"
          :disabled="!recordData || recordLoading || sharing"
          @click="shareImage"
        />
      </div>

      <div class="printed-image-preview">
        <div class="printed-image-preview__display">
          <img
            v-if="previewUrl"
            class="printed-image-preview__image"
            :src="previewUrl"
            :alt="t('recordPrint.previewAlt')"
          />
          <p v-else-if="previewLoading" class="printed-image-preview__status">
            {{ t('recordPrint.previewLoading') }}
          </p>
        </div>
        <div class="printed-image-preview__source" aria-hidden="true">
          <RecordResultSharing
            ref="sharingRef"
            disable-animations
            show-printed-domain-border
            :print-style-id="printStyleId"
            :current-user="currentUser"
            :profile="profile"
            :section-visibility="sectionVisibility"
            :extra-images-settings="extraImagesSettings"
            :completed-time-settings="completedTimeSettings"
          />
        </div>
      </div>
    </section>

    <div v-if="recordLoading" class="print-page-content print-page-content--centered">
      <p class="print-loading">{{ t('common.loading') }}</p>
    </div>

    <footer
      v-if="recordData && !recordLoading"
      class="print-style-dock"
      :aria-label="t('recordPrint.stylePickerLabel')"
    >
      <HorizontalStylePicker
        v-model="printStyleId"
        :items="printStylePickerItems"
        :aria-label="t('recordPrint.stylePickerLabel')"
      />
    </footer>

    <RecordPrintSettingsModal
      v-model:show="showSettingsModal"
      :model-value="sectionVisibility"
      :extra-images-settings="extraImagesSettings"
      :completed-time-settings="completedTimeSettings"
      :completed-at-ms="completedAtMs"
      :source-images="sourceImageUrls"
      :available-keys="availableSectionKeys"
      :project-id="projectId"
      @save="applySettings"
      @go-to-project="goToProject"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePrintedImagePreview } from '@/composables/usePrintedImagePreview'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import ToolbarButton from '@/components/shell/layout/ToolbarButton.vue'
import HorizontalStylePicker from '@/components/shared/inputs/HorizontalStylePicker.vue'
import RecordResultSharing from '@/components/features/record/RecordResultSharing.vue'
import '@/constants/recordPrintStyles'
import {
  getRecordPrintStyle,
  RECORD_PRINT_STYLES
} from '@/constants/recordPrintStyles'
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
const router = useRouter()
const appBanner = useAppBanner()

const currentUser = computed(() => props.currentUser)
const authPending = computed(() => currentUser.value === undefined)

function callApi(name, ...args) {
  return new Promise((resolve, reject) => {
    emit('api', { name, args, resolve, reject })
  })
}

const recordId = computed(() => String(route.params.record_id || ''))
const projectId = computed(() => String(recordData.value?.project_id || '').trim())
const recordData = ref(null)
const recordLoading = ref(false)
const sharingRef = ref(null)
const sharing = ref(false)
const showSettingsModal = ref(false)

const printSettings = ref(loadStoredPrintSettings(recordId.value))

const printStyleId = computed({
  get: () => printSettings.value.printStyle,
  set: (value) => {
    printSettings.value = {
      ...printSettings.value,
      printStyle: value
    }
  }
})

const activePrintStyle = computed(() => getRecordPrintStyle(printStyleId.value))

const printStylePickerItems = computed(() =>
  RECORD_PRINT_STYLES.map((style) => ({
    id: style.id,
    label: t(style.titleKey),
    swatchColors: style.swatchColors
  }))
)

const { previewUrl, previewLoading, scheduleRefresh } = usePrintedImagePreview(
  () => sharingRef.value,
  () => [
    recordData.value,
    recordLoading.value,
    sharingRef.value,
    printSettings.value
  ],
  () => ({
    backgroundColor: activePrintStyle.value.captureBackground
  })
)

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

watch(printStyleId, (nextId, prevId) => {
  if (nextId === prevId || recordLoading.value) return
  saveStoredPrintSettings(
    recordId.value,
    printSettings.value,
    availableSectionKeys.value,
    sourceImageUrls.value
  )
  scheduleRefresh()
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
    if (recordData.value) {
      scheduleRefresh()
    }
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
    completedTime: nextCompletedTime,
    printStyle: printSettings.value.printStyle
  }

  saveStoredPrintSettings(
    recordId.value,
    printSettings.value,
    availableSectionKeys.value,
    sourceImageUrls.value
  )

  scheduleRefresh()
}

function goToProject() {
  if (!projectId.value) return
  router.push({ name: 'project', params: { project_id: projectId.value } })
}

async function shareImage() {
  if (sharing.value) return
  sharing.value = true
  try {
    await sharingRef.value?.shareOrDownload?.({
      flattenForExport: true,
      backgroundColor: activePrintStyle.value.captureBackground
    })
  } catch (error) {
    console.warn('RecordPrintPage: share image failed', error)
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
  --print-style-dock-height: 5.25rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.print-page-preview {
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-x: clip;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 1rem 0.75rem calc(var(--print-style-dock-height) + var(--app-footer-height) + var(--safe-area-bottom) + 0.75rem);
  box-sizing: border-box;
}

.print-page-content--centered {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.print-page-toolbar {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.print-style-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--app-footer-height) + var(--safe-area-bottom));
  height: var(--print-style-dock-height);
  z-index: calc(var(--z-float) - 1);
  box-sizing: border-box;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.98) 70%, rgba(255, 255, 255, 0.88));
  border-top: 1px solid rgba(17, 24, 39, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.print-loading {
  color: #6b7280;
  font-weight: 700;
  padding: 1rem 0;
  text-align: center;
}

</style>

<style src="@/assets/printed-image-preview.css"></style>
