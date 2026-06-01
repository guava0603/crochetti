<template>
  <div
    ref="captureRootRef"
    class="record-result-sharing"
    :class="{
      'is-capturing': isCapturing,
      'printed-domain': showPrintedDomainBorder,
      'record-result-sharing--static': disableAnimations
    }"
  >
    <h1
      v-if="projectTitle && isSectionVisible('projectTitle')"
      class="sharing-meta__title"
    >
      {{ projectTitle }}
    </h1>

    <RecordResult
      layout="sharing"
      :current-user="currentUser"
      :profile="profile"
      :section-visibility="sectionVisibilityNormalized"
      :disable-animations="disableAnimations"
    >
      <template v-if="extraImagesDisplay?.images?.length && isSectionVisible('extraImages')" #extra-images>
        <ExtraImages
          :images="extraImagesDisplay.images"
          :aspect-ratio-css="extraImagesDisplay.aspectRatioCss"
          :display-order="extraImagesDisplay.displayOrder"
          :gap-px="extraImagesDisplay.gapPx"
          :rounded-corners="extraImagesDisplay.roundedCorners"
        />
      </template>

      <template v-if="thought && isSectionVisible('extraNote')" #extra-note>
        <section
          class="extra-note-card export-healing-card"
          :aria-label="t('recordPrint.sections.extraNote')"
        >
          <span class="card-inner-frame" aria-hidden="true" />
          <p class="extra-note-card__body">{{ thought }}</p>
        </section>
      </template>
    </RecordResult>

    <p
      v-if="completedTimeLabel && isSectionVisible('completedTime')"
      class="sharing-meta__completed"
    >
      {{ completedTimeLabel }}
    </p>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useRecordContext } from '@/composables/recordContext'
import { normalizeSectionVisibility } from '@/constants/recordResultSharingSections'
import { resolveExtraImagesForDisplay, normalizeSourceImageUrls } from '@/constants/recordPrintExtraImages'
import { getRecordCompletedAtMs, getRecordProjectTitle } from '@/utils/recordResultSectionAvailability'
import {
  formatCompletedTimeForPrint,
  normalizeCompletedTimeSettings
} from '@/constants/recordPrintCompletedTime'
import RecordResult from '@/components/features/record/RecordResult.vue'
import ExtraImages from '@/components/features/record/ExtraImages.vue'
import { captureElementAsPngBlob, shareOrDownloadElementAsImage, shareOrDownloadImageBlob } from '@/utils/downloadImage'
import { measurePrintedDomainWidthPx } from '@/constants/recordResultSharingLayout'
import { useRecordResultSharingLayoutWidth } from '@/composables/useRecordResultSharingLayoutWidth'

const captureRootRef = ref(null)
const { layoutWidthPx, refreshLayoutWidth } = useRecordResultSharingLayoutWidth(captureRootRef)

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null },
  sectionVisibility: {
    type: Object,
    default: undefined
  },
  showPrintedDomainBorder: {
    type: Boolean,
    default: false
  },
  extraImagesSettings: {
    type: Object,
    default: undefined
  },
  completedTimeSettings: {
    type: Object,
    default: undefined
  },
  disableAnimations: {
    type: Boolean,
    default: false
  }
})

const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()

const recordCtx = useRecordContext()
const currentRecord = recordCtx?.recordData || ref(null)

const isCapturing = ref(false)

const recordId = computed(() => String(route.params.record_id || '').trim())

const sectionVisibilityNormalized = computed(() => normalizeSectionVisibility(props.sectionVisibility))

function isSectionVisible(key) {
  return sectionVisibilityNormalized.value[key] !== false
}

const sourceImages = computed(() => normalizeSourceImageUrls(currentRecord.value?.result?.images))

const extraImagesDisplay = computed(() => {
  if (!sourceImages.value.length) return null
  return resolveExtraImagesForDisplay(props.extraImagesSettings, sourceImages.value)
})

const thought = computed(() => String(currentRecord.value?.result?.thought || '').trim())

const projectTitle = computed(() => getRecordProjectTitle(currentRecord.value))

const completedTimeLabel = computed(() => {
  const ms = getRecordCompletedAtMs(currentRecord.value)
  if (ms == null) return ''
  const precision = normalizeCompletedTimeSettings(props.completedTimeSettings).precision
  const time = formatCompletedTimeForPrint(ms, precision, { locale: locale.value })
  if (!time) return ''
  return t('recordResult.sharingCompletedAt', { time })
})

function withLayoutCaptureOptions(el, captureOptions = {}) {
  const layoutWidthPx = measurePrintedDomainWidthPx(el)
  const html2canvas = captureOptions.html2canvas || {}

  return {
    ...captureOptions,
    layoutWidthPx,
    html2canvas: {
      ...html2canvas,
      width: layoutWidthPx,
      windowWidth: layoutWidthPx
    }
  }
}

async function captureAsPngBlob(captureOptions = {}) {
  if (isCapturing.value) return null

  const el = captureRootRef.value
  if (!el) return null

  isCapturing.value = true
  try {
    await nextTick()
    refreshLayoutWidth()
    await nextTick()
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    return await captureElementAsPngBlob(el, withLayoutCaptureOptions(el, captureOptions))
  } finally {
    isCapturing.value = false
  }
}

const shareOrDownload = async (captureOptions = {}) => {
  if (isCapturing.value) return

  const safeId = recordId.value.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'record'
  const filename = `record-result-sharing-${safeId}.png`
  const shareTitle = t('record.shareCompletedResultImage')

  const el = captureRootRef.value
  const resolvedCaptureOptions = el ? withLayoutCaptureOptions(el, captureOptions) : captureOptions
  const blob = await captureAsPngBlob(captureOptions)
  if (!blob) {
    if (!el) return
    await shareOrDownloadElementAsImage(el, { filename, shareTitle, ...resolvedCaptureOptions })
    return
  }

  await shareOrDownloadImageBlob({ blob, filename, shareTitle })
}

defineExpose({
  shareOrDownload,
  layoutWidthPx
})
</script>

<style scoped>
/* Fill padded `.page-content`; width for PNG capture comes from measured layoutWidthPx. */
.record-result-sharing {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-inline: auto;
  box-sizing: border-box;
}

.sharing-meta {
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sharing-meta__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1.3;
  color: #111827;
  letter-spacing: 0.01em;
  text-align: center;
}

.sharing-meta__completed {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-font-invisible);
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.record-result-sharing.printed-domain {
  border-radius: 12px;
  background: #fff;
  padding: 0.9rem 0.9rem 1.1rem;
  box-sizing: border-box;
}

.record-result-sharing.is-capturing :deep(.result-share-btn--floating) {
  display: none;
}

.record-result-sharing.is-capturing.printed-domain {
  border-color: transparent;
}

.extra-note-card__body {
  margin: 0;
  white-space: pre-line;
  color: #111827;
  font-weight: 600;
  line-height: 1.55;
  font-size: 0.95rem;
}
</style>

<style src="@/assets/export-card.css"></style>
