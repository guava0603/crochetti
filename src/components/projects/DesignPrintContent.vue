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
    <h1 v-if="showProjectSections && projectName" class="design-print__title">{{ projectName }}</h1>

    <div class="design-print__body">
      <section v-if="showProjectSections && showImages" class="capture-block capture-block--images">
        <ExtraImages
          :images="resolvedProjectImages.images"
          :size="resolvedProjectImages.size"
          :display-order="resolvedProjectImages.displayOrder"
          :gap-px="resolvedProjectImages.gapPx"
          :rounded-corners="resolvedProjectImages.roundedCorners"
        />
      </section>

      <div
        v-if="showProjectSections && (showDescription || showMaterials || showSelfDefinedStitches)"
        class="project-description"
      >
        <p v-if="showDescription" class="project-description-text">
          {{ projectDescription }}
        </p>

        <div
          v-if="showMaterials"
          class="project-materials"
          :aria-label="t('project.componentMetadata.title')"
        >
          <div v-if="projectMaterialsHookLines.length > 0" class="project-materials__row">
            <span class="project-materials__label">{{ t('project.componentMetadata.hook') }}</span>
            <span class="project-materials__value">{{ projectMaterialsHookLines.join('\n') }}</span>
          </div>

          <div v-if="projectMaterialsYarnLines.length > 0" class="project-materials__row">
            <span class="project-materials__label">{{ t('project.componentMetadata.yarn') }}</span>
            <span class="project-materials__value">{{ projectMaterialsYarnLines.join('\n') }}</span>
          </div>
        </div>

        <div
          v-if="showSelfDefinedStitches"
          class="project-stitch-intro"
          :aria-label="t('project.stitchIntroduction.title')"
        >
          <div class="project-stitch-intro__title">{{ t('project.stitchIntroduction.title') }}</div>
          <ul class="project-stitch-intro__list">
            <li
              v-for="stitch in selfDefinedStitchIntroductions"
              :key="stitch.stitch_id"
              class="project-stitch-intro__item"
            >
              <div class="project-stitch-intro__name">{{ stitch.name }}</div>
              <p class="project-stitch-intro__description">{{ stitch.description }}</p>
            </li>
          </ul>
        </div>
      </div>

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
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import ComponentCard from '@/components/cards/ComponentCard.vue/index.vue'
import ExtraImages from '@/components/records/ExtraImages.vue'
import { isComponentType } from '@/utils/componentTypes'
import { uniqueTrimmedStrings, toTrimmedText as toText } from '@/utils/text'
import { normalizeYarnMetaList } from '@/utils/yarnMeta'
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
const { layoutWidthPx, layoutWidthCss, refreshLayoutWidth } = useRecordResultSharingLayoutWidth(captureRootRef)

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

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

const isCapturing = ref(false)

const projectId = computed(() => String(route.params.project_id || '').trim())

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

const projectDescription = computed(() => String(props.projectData?.description || '').trim())

const projectMaterialsHookLines = computed(() => uniqueTrimmedStrings(props.projectData?.materials?.hook))

const projectMaterialsYarnLines = computed(() => {
  const meta = normalizeYarnMetaList(props.projectData?.materials?.yarn)
  return meta
    .map((m) => {
      const type = toText(m?.type)
      const amount = toText(m?.amount)
      if (!type) return ''
      return amount ? `${type}: ${amount}` : type
    })
    .filter(Boolean)
})

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

const selfDefinedStitchIntroductions = computed(() => {
  const list = props.projectData?.self_defined_stitches
  if (!Array.isArray(list)) return []

  const out = []
  for (const stitch of list) {
    if (!stitch || typeof stitch !== 'object') continue
    const name = String(stitch.name || '').trim()
    const description = String(stitch.description || '').trim()
    if (!name || !description) continue
    out.push({ stitch_id: stitch.stitch_id, name, description })
  }

  return out.sort((a, b) => Number(a.stitch_id) - Number(b.stitch_id))
})

const showDescription = computed(
  () => projectDescription.value.length > 0 && isSectionVisible('description')
)
const showImages = computed(() => projectImages.value.length > 0 && isSectionVisible('images'))
const showNotes = computed(() => isSectionVisible('notes'))
const showMaterials = computed(
  () =>
    (projectMaterialsHookLines.value.length > 0 || projectMaterialsYarnLines.value.length > 0) &&
    isSectionVisible('materials')
)
const showSelfDefinedStitches = computed(
  () => selfDefinedStitchIntroductions.value.length > 0 && isSectionVisible('selfDefinedStitches')
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
.design-print {
  width: v-bind(layoutWidthCss);
  max-width: v-bind(layoutWidthCss);
  margin-inline: auto;
  box-sizing: border-box;
}

.design-print.printed-domain {
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: 12px;
  background: var(--color-surface-sheet);
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

/* Align project-level blocks with ProjectView styles. */
.project-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.project-description-text {
  width: min(680px, 100%);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: #111827;
  font-weight: 800;
}

.project-materials {
  width: min(680px, 100%);
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(17, 24, 39, 0.06);
}

.project-materials__row {
  display: grid;
  grid-template-columns: 0.3fr 1.3fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.35rem 0;
}

.project-materials__label {
  font-size: 0.85rem;
  font-weight: 900;
  color: #6b7280;
}

.project-materials__value {
  font-size: 0.9rem;
  font-weight: 800;
  color: #111827;
  white-space: pre-wrap;
}

.project-stitch-intro {
  width: min(680px, 100%);
  padding: 1rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(17, 24, 39, 0.06);
}

.project-stitch-intro__title {
  font-weight: 900;
  color: #111827;
  margin-bottom: 0.5rem;
}

.project-stitch-intro__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.project-stitch-intro__name {
  font-weight: 900;
  color: #111827;
}

.project-stitch-intro__description {
  margin: 0.15rem 0 0;
  font-weight: 700;
  line-height: 1.55;
  color: #374151;
  white-space: pre-wrap;
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

.capture-block__title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
}

.capture-block__subtitle {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #374151;
}

.capture-block__text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: #111827;
}

.capture-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.35rem;
  line-height: 1.5;
}

.capture-meta-row__label {
  font-weight: 700;
  color: #374151;
  flex: 0 0 auto;
}

.capture-meta-row__value {
  white-space: pre-wrap;
  word-break: break-word;
  color: #111827;
  flex: 1 1 auto;
  min-width: 0;
}

.capture-stitch-list {
  margin: 0;
  padding-left: 1.1rem;
}

.capture-stitch-list__item {
  margin-bottom: 0.65rem;
}

.capture-stitch-list__name {
  font-weight: 800;
  color: #111827;
}

.capture-stitch-list__description {
  margin: 0.2rem 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
  line-height: 1.5;
}

.capture-notes-list {
  margin: 0 0 0.75rem;
  padding-left: 1.1rem;
  color: #374151;
}

.capture-notes-list li {
  margin-bottom: 0.25rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.component-title {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  font-weight: 900;
  color: #111827;
  word-break: break-word;
}
</style>
