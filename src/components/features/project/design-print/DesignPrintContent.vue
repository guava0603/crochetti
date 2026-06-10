<template>
  <div
    ref="captureRootRef"
    class="design-print"
    :class="{
      'is-capturing': isCapturing,
      'remove-printed-area-style': removePrintedAreaStyle,
      'printed-domain': showPrintedDomainBorder
    }"
  >
    <div class="design-print__body">
      <section v-if="showProjectSections && showImages" class="capture-block capture-block--images">
        <ExtraImages
          :images="resolvedProjectImages.images"
          :aspect-ratio-css="resolvedProjectImages.aspectRatioCss"
          :display-order="resolvedProjectImages.displayOrder"
          :gap-px="resolvedProjectImages.gapPx"
          :rounded-corners="resolvedProjectImages.roundedCorners"
        />
      </section>

      <h1 v-if="showProjectSections && projectName" class="design-print__title">{{ projectName }}</h1>

      <ProjectMetaSections
        v-if="showProjectSections"
        variant="print"
        :description="description"
        :hook-lines="hookLines"
        :yarn-lines="yarnLines"
        :stitch-introductions="stitchIntroductions"
        :show-description="showDescription"
        :show-materials="showMaterials"
        :show-self-defined-stitches="showSelfDefinedStitches"
      />

      <section
        v-for="(component, cIndex) in componentList"
        :key="cIndex"
        class="component"
      >
        <ComponentCard
          :component="component"
          :materials="projectData?.materials || null"
          :is-editing="false"
          :show-edit-actions="false"
          :visibility="{
            notes: showNotes,
            materials: showMaterials
          }"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import ComponentCard from '@/components/features/project/component-card/index.vue'
import ExtraImages from '@/components/features/record/ExtraImages.vue'
import ProjectMetaSections from '@/components/features/project/ProjectMetaSections.vue'
import { useProjectMetaDisplay } from '@/composables/useProjectMetaDisplay'
import { isComponentType } from '@/utils/componentTypes'
import { normalizeDesignSectionVisibility } from '@/constants/designPrintSections'
import { resolveExtraImagesForDisplay } from '@/constants/recordPrintExtraImages'
import { measurePrintedDomainWidthPx } from '@/constants/recordResultSharingLayout'
import { useRecordResultSharingLayoutWidth } from '@/composables/useRecordResultSharingLayoutWidth'
import { provideSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'
import {
  captureElementAsPngBlob,
  shareOrDownloadElementAsImage,
  shareOrDownloadImageBlob
} from '@/utils/downloadImage'

const captureRootRef = ref(null)
const { layoutWidthPx, refreshLayoutWidth } = useRecordResultSharingLayoutWidth(captureRootRef)

const props = defineProps({
  projectData: { type: Object, default: null },
  components: {
    type: Array,
    default: undefined
  },
  showProjectSections: {
    type: Boolean,
    default: true
  },
  removePrintedAreaStyle: {
    type: Boolean,
    default: false
  },
  extraImagesSettings: {
    type: Object,
    default: () => ({})
  },
  sectionVisibility: {
    type: Object,
    default: undefined
  },
  showPrintedDomainBorder: {
    type: Boolean,
    default: false
  }
})

const isCapturing = ref(false)

const sectionVisibilityNormalized = computed(() => normalizeDesignSectionVisibility(props.sectionVisibility))

function isSectionVisible(key) {
  return sectionVisibilityNormalized.value[key] !== false
}

const selfDefinedStitchesRef = computed(() => {
  const list = props.projectData?.self_defined_stitches
  return Array.isArray(list) ? list : []
})

provideSelfDefinedStitchesContext({ stitchesRef: selfDefinedStitchesRef })

const projectName = computed(() => String(props.projectData?.name || '').trim())

const { description, hookLines, yarnLines, stitchIntroductions } = useProjectMetaDisplay(
  () => props.projectData
)

const projectImages = computed(() => {
  const raw = props.projectData?.images
  const list = Array.isArray(raw) ? raw : []
  return list
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
})

const resolvedProjectImages = computed(() =>
  resolveExtraImagesForDisplay(props.extraImagesSettings, projectImages.value)
)

const showDescription = computed(
  () => description.value.length > 0 && isSectionVisible('description')
)
const showImages = computed(() => projectImages.value.length > 0 && isSectionVisible('images'))
const showNotes = computed(() => isSectionVisible('notes'))
const showMaterials = computed(
  () =>
    (hookLines.value.length > 0 || yarnLines.value.length > 0) && isSectionVisible('materials')
)
const showSelfDefinedStitches = computed(
  () => stitchIntroductions.value.length > 0 && isSectionVisible('selfDefinedStitches')
)

const componentList = computed(() => {
  if (Array.isArray(props.components)) {
    return props.components.filter((c) => isComponentType(c?.type))
  }
  const list = props.projectData?.component_list
  if (!Array.isArray(list)) return []
  return list.filter((c) => isComponentType(c?.type))
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

let captureInFlight = null

async function captureAsPngBlob(captureOptions = {}) {
  if (captureInFlight) return captureInFlight

  const el = captureRootRef.value
  if (!el) return null

  captureInFlight = (async () => {
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
  })()

  try {
    return await captureInFlight
  } finally {
    captureInFlight = null
  }
}

const shareOrDownload = async (captureOptions = {}) => {
  const fallbackFilename = `${sanitizeFileName(projectName.value)}.png`
  const filename = String(captureOptions?.filename || '').trim() || fallbackFilename
  const shareTitle = String(captureOptions?.shareTitle || '').trim() || projectName.value || filename

  const el = captureRootRef.value
  const resolvedCaptureOptions = el ? withLayoutCaptureOptions(el, captureOptions) : captureOptions
  const blob = await captureAsPngBlob(captureOptions)
  if (!blob) {
    if (!el) return
    await shareOrDownloadElementAsImage(el, {
      filename,
      shareTitle,
      ...resolvedCaptureOptions
    })
    return
  }

  await shareOrDownloadImageBlob({ blob, filename, shareTitle })
}

function sanitizeFileName(name) {
  return String(name || 'design')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

defineExpose({
  shareOrDownload,
  captureAsPngBlob,
  layoutWidthPx
})
</script>

<style scoped>
/*
 * Design export (DownloadDesignView → DesignPrintView): use real DOM for decorations.
 * Do not style printable content with ::before / ::after — html2canvas omits them.
 */
.design-print {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-inline: auto;
  box-sizing: border-box;
}

.design-print.printed-domain {
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: 12px;
  padding: 0.9rem 0.9rem 1.1rem;
}

.design-print.remove-printed-area-style.printed-domain {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.design-print.is-capturing.printed-domain {
  border-color: transparent;
}

/* Print page should never show translate toggle. */
:deep(.translate-toggle) {
  display: none !important;
}

.design-print__title {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1.3;
  color: #111827;
  text-align: center;
  word-break: break-word;
}

.design-print__body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
</style>
