<template>
  <div class="design-print-shell">
    <div class="print-page-content">
      <div class="print-page-toolbar">
        <ToolbarButton
          icon-src="assets/image/settings/083__setting_edit.svg"
          :aria-label="t('print.editSettings')"
          :title="t('print.editSettings')"
          :disabled="!projectData || loading"
          @click="openSettings"
        />
        <button
          type="button"
          class="btn-share-image"
          :disabled="!projectData || loading || sharing"
          :aria-label="t('project.downloadDesignPage.shareOrDownload')"
          :title="t('project.downloadDesignPage.shareOrDownload')"
          @click="shareImage"
        >
          <ButtonPrinter />
        </button>
      </div>

      <div v-if="loading" class="print-loading">{{ t('common.loading') }}</div>

      <div v-else-if="permissionDenied" class="print-no-permission">
        {{ t('project.noPermission') }}
      </div>

      <div v-else-if="projectData" class="print-live-html">
        <template v-if="componentMode === COMPONENT_MODES.separate && componentList.length > 1">
          <div class="print-multi">
            <DesignPrintContent
              v-for="(c, idx) in componentList"
              :key="idx"
              :ref="(el) => setContentRef(el, idx)"
              show-printed-domain-border
              :show-project-sections="false"
              remove-printed-area-style
              :project-data="projectData"
              :components="[c]"
              :section-visibility="sectionVisibility"
              :extra-images-settings="extraImagesSettings"
            />
          </div>
        </template>
        <DesignPrintContent
          v-else
          ref="contentRef"
          show-printed-domain-border
          :project-data="projectData"
          :section-visibility="sectionVisibility"
          :extra-images-settings="extraImagesSettings"
        />
      </div>

      <p v-else class="print-not-found">{{ t('project.notFound') }}</p>
    </div>

    <DesignPrintSettingsModal
      v-model:show="showSettingsModal"
      :model-value="sectionVisibility"
      :component-mode="componentMode"
      :extra-images-settings="extraImagesSettings"
      :source-images="sourceImageUrls"
      :show-component-mode="componentList.length > 1"
      :available-keys="availableSectionKeys"
      @save="applySettings"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import ToolbarButton from '@/components/layout/ToolbarButton.vue'
import ButtonPrinter from '@/components/buttons/svg/ButtonPrinter.vue'
import DesignPrintContent from '@/components/projects/DesignPrintContent.vue'
import DesignPrintSettingsModal from '@/components/modals/DesignPrintSettingsModal.vue'
import { useAppBanner } from '@/composables/appBanner'
import { shareOrDownloadImageBlobs } from '@/utils/downloadImage'
import {
  DEFAULT_DESIGN_PRINT_COMPONENT_MODE,
  DESIGN_PRINT_COMPONENT_MODES,
  loadStoredDesignPrintSettings,
  saveStoredDesignPrintSettings
} from '@/constants/designPrintSections'
import {
  getAvailableDesignPrintSections,
  normalizeDesignSectionVisibilityForAvailable
} from '@/utils/designPrintSectionAvailability'
import { RECORD_RESULT_SHARING_WIDTH_CSS } from '@/constants/recordResultSharingLayout'
import { normalizeExtraImagesSettings, normalizeSourceImageUrls } from '@/constants/recordPrintExtraImages'

defineOptions({ name: 'DesignPrintViewMain' })

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null },
  loading: { type: Boolean, default: true },
  permissionDenied: { type: Boolean, default: false },
  projectData: { type: Object, default: null }
})

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const appBanner = useAppBanner()

const projectId = computed(() => String(route.params.project_id || '').trim())
const contentRef = ref(null)
const contentRefs = ref([])
const sharing = ref(false)
const showSettingsModal = ref(false)

const COMPONENT_MODES = DESIGN_PRINT_COMPONENT_MODES

function setContentRef(el, idx) {
  if (!el) return
  contentRefs.value[idx] = el
}

const componentList = computed(() => {
  const list = props.projectData?.component_list
  return Array.isArray(list) ? list : []
})

const printLayoutWidth = computed(() => {
  const px = contentRef.value?.layoutWidthPx || contentRefs.value?.[0]?.layoutWidthPx
  return px > 0 ? `${px}px` : RECORD_RESULT_SHARING_WIDTH_CSS
})

const availableSectionKeys = computed(() => getAvailableDesignPrintSections(props.projectData))

const sourceImageUrls = computed(() => normalizeSourceImageUrls(props.projectData?.images))

const printSettings = ref(
  loadStoredDesignPrintSettings(projectId.value, availableSectionKeys.value, sourceImageUrls.value)
)

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

const componentMode = computed({
  get: () => printSettings.value.componentMode || DEFAULT_DESIGN_PRINT_COMPONENT_MODE,
  set: (value) => {
    printSettings.value = { ...printSettings.value, componentMode: value }
  }
})

function reloadPrintSettings() {
  printSettings.value = loadStoredDesignPrintSettings(
    projectId.value,
    availableSectionKeys.value,
    sourceImageUrls.value
  )
}

watch(projectId, () => {
  reloadPrintSettings()
})

watch([availableSectionKeys, sourceImageUrls], () => {
  if (!availableSectionKeys.value.length) return
  reloadPrintSettings()
})

const bannerTitle = computed(() => t('designPrint.title'))

watch(
  bannerTitle,
  (v) => {
    appBanner?.setBanner({ title: v })
  },
  { immediate: true }
)

function openSettings() {
  showSettingsModal.value = true
}

function applySettings(payload) {
  const nextVisibility = normalizeDesignSectionVisibilityForAvailable(
    payload?.sectionVisibility,
    availableSectionKeys.value
  )

  const nextExtraImages = normalizeExtraImagesSettings(payload?.extraImages, sourceImageUrls.value)

  printSettings.value = {
    sectionVisibility: nextVisibility,
    componentMode: payload?.componentMode || printSettings.value.componentMode || DEFAULT_DESIGN_PRINT_COMPONENT_MODE,
    extraImages: nextExtraImages
  }

  saveStoredDesignPrintSettings(
    projectId.value,
    printSettings.value,
    availableSectionKeys.value,
    sourceImageUrls.value
  )
}

async function shareImage() {
  if (sharing.value) return
  sharing.value = true
  try {
    const captureOptions = { flattenForExport: true, backgroundColor: '#ffffff' }

    if (componentMode.value === COMPONENT_MODES.separate && componentList.value.length > 1) {
      // Capture all components first, then share/download in one go (avoids browsers blocking multi-download).
      const items = []
      for (let i = 0; i < componentList.value.length; i += 1) {
        const inst = contentRefs.value?.[i]
        const name = String(componentList.value[i]?.name || '').trim() || `component-${i + 1}`
        const filename = `${name}.png`

        const blob = await inst?.captureAsPngBlob?.(captureOptions)
        if (blob) items.push({ blob, filename })
      }

      if (items.length) {
        await shareOrDownloadImageBlobs(items)
      }
      return
    }

    await contentRef.value?.shareOrDownload?.(captureOptions)
  } finally {
    sharing.value = false
  }
}

const lastPage = () => {
  window.history.back()
}

onMounted(() => {
  appBanner?.setBanner({ visible: true, showBack: true, onBack: lastPage })
})

onUnmounted(() => {
  appBanner?.resetHandlers()
})
</script>

<style scoped>
.design-print-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.print-page-content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 3.25rem 0 5rem;
}

.print-page-toolbar {
  position: absolute;
  top: 0.5rem;
  right: 1rem;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.print-live-html {
  width: 100%;
  max-width: v-bind(printLayoutWidth);
  margin-inline: auto;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
}

.print-multi {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.print-loading,
.print-not-found,
.print-no-permission {
  color: #6b7280;
  font-weight: 700;
  padding: 1rem;
  text-align: center;
}

.print-no-permission {
  font-size: 1.05rem;
  color: #374151;
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
