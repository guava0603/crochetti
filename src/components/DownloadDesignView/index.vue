<template>
  <div class="download-design">
    <div v-if="noticeMessage" class="notice" role="status" aria-live="polite">
      {{ noticeMessage }}
    </div>

    <div v-if="loading" class="loading">
      {{ $t('project.loading') }}
    </div>

    <div v-else-if="permissionDenied" class="no-permission" role="status" aria-live="polite">
      {{ $t('project.noPermission') }}
    </div>

    <div v-else-if="projectData" class="content">
      <div class="header">
        <ToolbarButton
          class="btn-back banner-button-l"
          icon-src="assets/image/settings/001__arrow_left.svg"
          :aria-label="$t('common.back')"
          :title="$t('common.back')"
          @click="backToProject"
        />

        <div v-if="availableSectionOptions.length" class="header-sections">
          <label class="header-sections__label" for="download-design-sections">
            {{ $t('project.downloadDesignPage.sectionsLabel') }}
          </label>
          <MultipleSelectionList
            v-model="selectedSections"
            class="header-sections__picker"
            input-id="download-design-sections"
            :options="availableSectionOptions"
            :placeholder="$t('project.downloadDesignPage.sectionsPlaceholder')"
            :aria-label="$t('project.downloadDesignPage.sectionsLabel')"
            :show-chips="true"
          />
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="btn-download"
            :disabled="downloading"
            :aria-label="$t('project.downloadDesignPage.shareOrDownload')"
            :title="$t('project.downloadDesignPage.shareOrDownload')"
            @click="shareOrDownloadDesign"
          >
            <ButtonPrinter />
          </button>
        </div>
      </div>

      <h1 class="title">{{ projectData.name }}</h1>

      <div ref="captureRef" class="capture">
        <section v-if="showDescription" class="capture-block capture-block--description">
          <h2 class="capture-block__title">{{ $t('project.downloadDesignPage.sectionDescription') }}</h2>
          <p class="capture-block__text">{{ projectDescription }}</p>
        </section>

        <section v-if="showMaterials" class="capture-block capture-block--materials">
          <h2 class="capture-block__title">{{ $t('project.componentMetadata.title') }}</h2>
          <div v-if="projectMaterialsHookLines.length" class="capture-meta-row">
            <span class="capture-meta-row__label">{{ $t('project.componentMetadata.hook') }}</span>
            <span class="capture-meta-row__value">{{ projectMaterialsHookLines.join('\n') }}</span>
          </div>
          <div v-if="projectMaterialsYarnLines.length" class="capture-meta-row">
            <span class="capture-meta-row__label">{{ $t('project.componentMetadata.yarn') }}</span>
            <span class="capture-meta-row__value">{{ projectMaterialsYarnLines.join('\n') }}</span>
          </div>
        </section>

        <section v-if="showSelfDefinedStitches" class="capture-block capture-block--stitches">
          <h2 class="capture-block__title">{{ $t('project.stitchIntroduction.title') }}</h2>
          <ul class="capture-stitch-list">
            <li
              v-for="stitch in selfDefinedStitchIntroductions"
              :key="stitch.stitch_id"
              class="capture-stitch-list__item"
            >
              <div class="capture-stitch-list__name">{{ stitch.name }}</div>
              <p class="capture-stitch-list__description">{{ stitch.description }}</p>
            </li>
          </ul>
        </section>

        <section
          v-for="(component, cIndex) in componentList"
          :key="cIndex"
          class="component"
        >
          <h2 class="component-title">{{ component.name }}</h2>

          <div
            v-if="showNotes && getComponentNotes(component).length"
            class="capture-block capture-block--notes"
          >
            <h3 class="capture-block__subtitle">{{ $t('common.notes') }}</h3>
            <ul class="capture-notes-list">
              <li v-for="(note, nIndex) in getComponentNotes(component)" :key="nIndex">
                {{ note }}
              </li>
            </ul>
          </div>

          <table class="design-table">
            <tbody>
              <template v-for="row in component.content.row_list" :key="row.row_index">
                <tr>
                  <td class="cell cell-index">{{ row.row_index }}</td>
                  <td class="cell cell-stitches">
                    {{ getRowStitchesText(row) }}
                  </td>
                  <td class="cell cell-generate">{{ row?.content?.generate ?? '' }}</td>
                </tr>
                <tr v-if="getRowRepeatCount(row) > 1" class="repeat-reminder-row">
                  <td class="cell repeat-reminder" colspan="3">
                    {{ $t('common.repeatDo') }}{{ getRowRepeatCount(row) }}{{ $t('common.rowUnit') }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </section>
      </div>
    </div>

    <div v-else>
      <p>{{ $t('project.notFound') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ToolbarButton from '@/components/layout/ToolbarButton.vue'
import ButtonPrinter from '@/components/buttons/svg/ButtonPrinter.vue'
import MultipleSelectionList from '@/components/Selection/MultipleSelectionList.vue'
import { getPatternItemDisplay } from '@/constants/crochetData.js'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { buildStitchLookup } from '@/utils/calculateConsumeGenerate.js'
import { isComponentType } from '@/utils/componentTypes'
import { uniqueTrimmedStrings, toTrimmedText as toText } from '@/utils/text'
import { normalizeYarnMetaList } from '@/utils/yarnMeta'

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null },
  loading: { type: Boolean, default: true },
  permissionDenied: { type: Boolean, default: false },
  projectData: { type: Object, default: null }
})

defineOptions({ name: 'DownloadDesignViewMain' })

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const loading = computed(() => Boolean(props.loading))
const permissionDenied = computed(() => Boolean(props.permissionDenied))
const projectData = computed(() => props.projectData ?? null)

const captureRef = ref(null)
const downloading = ref(false)
const selectedSections = ref([])

const { crochetLang } = useCrochetLang()

const stitchLookup = computed(() => {
  const list = projectData.value?.self_defined_stitches
  return buildStitchLookup(Array.isArray(list) ? list : [])
})

const noticeMessage = ref('')
let noticeTimer = null

function showNotice(message) {
  noticeMessage.value = String(message || '')
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    noticeMessage.value = ''
  }, 2200)
}

const projectDescription = computed(() => String(projectData.value?.description || '').trim())

const projectMaterialsHookLines = computed(() => {
  const raw = projectData.value?.materials?.hook
  return uniqueTrimmedStrings(raw)
})

const projectMaterialsYarnLines = computed(() => {
  const meta = normalizeYarnMetaList(projectData.value?.materials?.yarn)
  return meta
    .map((m) => {
      const type = toText(m?.type)
      const amount = toText(m?.amount)
      if (!type) return ''
      return amount ? `${type}: ${amount}` : type
    })
    .filter(Boolean)
})

const selfDefinedStitchIntroductions = computed(() => {
  const list = projectData.value?.self_defined_stitches
  if (!Array.isArray(list)) return []

  const out = []
  for (const stitch of list) {
    if (!stitch || typeof stitch !== 'object') continue
    const name = String(stitch.name || '').trim()
    const description = String(stitch.description || '').trim()
    if (!name || !description) continue
    out.push({
      stitch_id: stitch.stitch_id,
      name,
      description
    })
  }

  return out.sort((a, b) => Number(a.stitch_id) - Number(b.stitch_id))
})

const fullComponentList = computed(() => {
  const list = projectData.value?.component_list
  return Array.isArray(list) ? list : []
})

const hasDescription = computed(() => projectDescription.value.length > 0)

const hasMaterials = computed(
  () => projectMaterialsHookLines.value.length > 0 || projectMaterialsYarnLines.value.length > 0
)

const hasSelfDefinedStitches = computed(() => selfDefinedStitchIntroductions.value.length > 0)

function getComponentNotes(component) {
  const notes = Array.isArray(component?.notes) ? component.notes : []
  return notes
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
    .map((n) => String(n ?? '').trim())
    .filter(Boolean)
}

const hasNotes = computed(() => fullComponentList.value.some((c) => getComponentNotes(c).length > 0))

const availableSectionOptions = computed(() => {
  const opts = []
  if (hasDescription.value) {
    opts.push({
      value: 'description',
      label: t('project.downloadDesignPage.sectionDescription')
    })
  }
  if (hasNotes.value) {
    opts.push({ value: 'notes', label: t('project.downloadDesignPage.sectionNotes') })
  }
  if (hasMaterials.value) {
    opts.push({
      value: 'materials',
      label: t('project.downloadDesignPage.sectionMaterials')
    })
  }
  if (hasSelfDefinedStitches.value) {
    opts.push({
      value: 'selfDefinedStitches',
      label: t('project.downloadDesignPage.sectionSelfDefinedStitches')
    })
  }
  return opts
})

watch(
  availableSectionOptions,
  (opts) => {
    const allowed = new Set(opts.map((o) => o.value))
    const prev = Array.isArray(selectedSections.value) ? selectedSections.value : []
    const kept = prev.filter((v) => allowed.has(v))
    const missing = opts.map((o) => o.value).filter((v) => !kept.includes(v))
    selectedSections.value = [...kept, ...missing]
  },
  { immediate: true }
)

const selectedSectionSet = computed(() => new Set(selectedSections.value))

const showDescription = computed(
  () => hasDescription.value && selectedSectionSet.value.has('description')
)
const showNotes = computed(() => hasNotes.value && selectedSectionSet.value.has('notes'))
const showMaterials = computed(
  () => hasMaterials.value && selectedSectionSet.value.has('materials')
)
const showSelfDefinedStitches = computed(
  () => hasSelfDefinedStitches.value && selectedSectionSet.value.has('selfDefinedStitches')
)

const getRowStitchesText = (row) => {
  const list = row?.content?.stitch_node_list
  if (!Array.isArray(list) || list.length === 0) return ''
  return list
    .map((node) => getPatternItemDisplay(node, crochetLang.value, stitchLookup.value))
    .join(', ')
}

const getRowRepeatCount = (row) => {
  const raw = row?.repeat_count ?? row?.count ?? row?.repeatCount
  const n = Number(raw ?? 1)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.trunc(n))
}

const componentList = computed(() => {
  const list = projectData.value?.component_list
  if (!Array.isArray(list)) return []
  return list.filter((c) => isComponentType(c?.type))
})

const sanitizeFileName = (name) => {
  return String(name || 'design')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

const backToProject = () => {
  router.go(-1)
}

const capturePageContentPngBlob = async () => {
  const el = captureRef.value
  if (!el) throw new Error('capture element not found')

  const { default: html2canvas } = await import('html2canvas')

  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
  const scale = Math.max(1, Math.min(2, dpr))

  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale,
    useCORS: true,
    logging: false,
    width: el.scrollWidth,
    windowWidth: el.scrollWidth
  })

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png')
  })

  if (!blob) throw new Error('Failed to create PNG blob')
  return blob
}

const shareOrDownloadDesign = async () => {
  const el = captureRef.value
  if (!el) {
    showNotice(t('project.downloadDesignPage.exportFailed'))
    return
  }

  downloading.value = true
  try {
    await nextTick()
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready
    }

    const fileName = `${sanitizeFileName(projectData.value?.name)}.png`
    const title = String(projectData.value?.name || '').trim() || fileName
    const blob = await capturePageContentPngBlob()
    const file = typeof File !== 'undefined' ? new File([blob], fileName, { type: 'image/png' }) : null

    try {
      if (file && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title, files: [file] })
        return
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
      // Fall through to download.
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = fileName
    link.href = url
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showNotice(t('project.downloadDesignPage.exportStarted'))
  } catch (error) {
    console.error('Failed to export design:', error)
    showNotice(t('project.downloadDesignPage.exportFailed'))
  } finally {
    downloading.value = false
  }
}

// Data fetching is handled by the wrapper view.
</script>

<style scoped>
.download-design {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 1.5rem 1rem;
  margin: 0 auto;
  padding-bottom: calc(2rem + var(--safe-area-bottom));
}

.content {
  width: 100%;
  max-width: 100%;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.header-sections {
  flex: 1 1 12rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.header-sections__label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #374151;
}

.header-sections__picker {
  width: 100%;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex: 0 0 auto;
}

.title {
  margin: 0 0 1.25rem;
  text-align: center;
  word-break: break-word;
}

.component {
  width: 100%;
}

.component-title {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  font-weight: 900;
  color: #111827;
  word-break: break-word;
}

.btn-download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.12);
  background: rgba(17, 24, 39, 0.04);
  color: #111827;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
}

.btn-download :deep(.button-printer) {
  cursor: inherit;
  color: currentColor;
}

.btn-download:hover:not(:disabled) {
  background: rgba(17, 24, 39, 0.08);
  border-color: rgba(17, 24, 39, 0.18);
}

.btn-download:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-download:focus-visible {
  outline: 2px solid rgb(var(--color-icon-add-rgb) / 0.55);
  outline-offset: 2px;
}

.btn-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notice {
  position: sticky;
  top: 0.75rem;
  z-index: var(--z-sticky);
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid rgb(var(--color-icon-add-rgb) / 0.35);
  background: rgb(var(--color-icon-add-rgb) / 0.12);
  color: #0f5132;
  font-weight: 700;
}

.no-permission {
  padding: 2.5rem 1rem;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 800;
  color: #374151;
}

.capture {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  background: white;
  padding: 1rem;
  border-radius: 12px;
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

.design-table {
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  background: white;
}

.cell {
  padding: 0.25rem 0.5rem;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
  font-size: 0.875rem;
  line-height: 1.5;
  word-break: break-word;
}

.design-table tr:last-child .cell {
  border-bottom: none;
}

.design-table .cell:last-child {
  border-right: none;
}

.cell-index {
  width: 2.75rem;
  font-size: 1rem;
  font-weight: 800;
  text-align: center;
  background: #f9fafb;
  color: #111827;
}

.repeat-reminder-row .repeat-reminder {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.1;
  padding-top: 0.35rem;
  padding-bottom: 0.45rem;
  text-align: left;
}

.cell-stitches {
  color: var(--color-icon-base);
  white-space: normal;
}

.cell-generate {
  width: 3.25rem;
  font-size: 1rem;
  font-weight: 800;
  text-align: center;
  background: #f9fafb;
}
</style>
