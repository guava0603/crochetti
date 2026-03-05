<template>
  <div class="add-project-design">

    <form
      @submit.prevent="handleSubmit"
      class="step-form"
      :style="stepFormStyle"
    >
      <!-- Components -->
      <div class="form-section">
        <div class="section-header">
          <div class="section-header__right">
            <ButtonGroup
              type="toggle"
              v-model="visibilityKey"
              :items="visibilityItems"
              :aria-label="$t('project.visibility')"
            />
          </div>
        </div>

        <CarouselWithDot
          ref="carouselEl"
          :items="projectData.component_list"
          :aria-label="$t('addProject.design.componentsAria')"
          :get-dot-variant="(item) => (item?.type === 'stitch' ? 'outline' : 'solid')"
          bleed
        >
          <template #default="{ item, index }">
            <ComponentCard
              :component="item"
              :component-list="projectData.component_list"
              :component-index="index"
              :is-editing="true"
              :help-topic-ids="{
                stitch: 'addProjectTableHeaderStitch',
                total: 'addProjectTableHeaderTotalStitches'
              }"
              @remove="removeComponent(index)"
            />
          </template>
        </CarouselWithDot>

        <div class="add-component-actions" role="group" :aria-label="$t('addProject.design.addMenuAria')">
          <button
            type="button"
            class="add-component-actions__btn"
            :disabled="loading"
            @click="handleAddPart"
          >
            {{ $t('addProject.design.addComponent') }}
          </button>
          <button
            type="button"
            class="add-component-actions__btn"
            :disabled="loading"
            @click="handleAddStitch"
          >
            {{ $t('addProject.design.addStitch') }}
          </button>
        </div>
      </div>
    </form>

    <div
      ref="bottomToolbarEl"
      class="button-group-fixed"
      role="region"
      :aria-label="$t('addProject.design.submitBarAria')"
    >
      <div class="button-group button-group-fixed__inner">
        <button type="button" @click="handleBack" class="btn-secondary" :disabled="loading">
          {{ $t('addProject.common.back') }}
        </button>
        <button type="button" @click="handleSubmit" :disabled="loading || !canSubmit" class="btn-primary">
          {{ loading ? (submittingText || $t('addProject.design.creating')) : (submitText || $t('addProject.design.createProject')) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, nextTick, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { v4 as uuidv4 } from '@lukeed/uuid'
import ComponentCard from '../cards/ComponentCard.vue/index.vue'
import CarouselWithDot from '@/components/Carousel/CarouselWithDot.vue'
import ButtonGroup from '@/components/buttons/ButtonGroup.vue'
import { openConfirmation } from '@/services/ui/confirmation'
import { openError } from '@/services/ui/error'
import { useBottomToolbarPadding } from './useBottomToolbarPadding'
import { provideSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  projectName: {
    type: String,
    required: true
  },
  initialData: {
    type: Object,
    default: null
  },
  submitText: {
    type: String,
    default: ''
  },
  submittingText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['back', 'submit', 'dirty-change'])

const loading = ref(false)

const carouselEl = ref(null)

const { bottomToolbarEl, stepFormStyle } = useBottomToolbarPadding()

async function scrollToCard(index) {
  await nextTick()
  const list = Array.isArray(projectData.value.component_list) ? projectData.value.component_list : []
  const max = Math.max(0, list.length - 1)
  const target = Math.min(max, Math.max(0, Number(index)))
  carouselEl.value?.scrollToIndex?.(target)
}

function capturePageScroll() {
  if (typeof document === 'undefined') return null
  const el = document.scrollingElement || document.documentElement || document.body
  if (!el) return null
  return { el, top: el.scrollTop }
}

function restorePageScroll(state) {
  if (!state) return
  const el = state.el
  if (!el) return
  const top = Number(state.top)
  const safeTop = Number.isFinite(top) ? top : 0
  const maxTop = Math.max(0, (el.scrollHeight || 0) - (el.clientHeight || 0))
  el.scrollTop = Math.min(maxTop, Math.max(0, safeTop))
}

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // fall through
    }
  }
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

const DEFAULT_PROJECT_DATA = {
  component_list: [],
  is_public: false,
  self_defined_stitches: []
}

// Initialize project data (clone so we can diff against a snapshot for dirty tracking)
const projectData = ref(deepClone(props.initialData || DEFAULT_PROJECT_DATA))

const visibilityKey = computed({
  get: () => (projectData.value?.is_public ? 'public' : 'private'),
  set: (key) => {
    projectData.value.is_public = key === 'public'
  }
})

const visibilityItems = computed(() => [
  { key: 'public', label: t('project.public') },
  { key: 'private', label: t('project.private') }
])

if (!Array.isArray(projectData.value.self_defined_stitches)) {
  projectData.value.self_defined_stitches = []
}

function addSelfDefinedStitch(stitch) {
  if (!stitch || typeof stitch !== 'object') return
  if (!Array.isArray(projectData.value.self_defined_stitches)) {
    projectData.value.self_defined_stitches = []
  }

  const id = Number(stitch.stitch_id)
  if (!Number.isFinite(id)) return

  const list = projectData.value.self_defined_stitches
  const next = {
    stitch_id: id,
    name: String(stitch.name || '').trim(),
    description: String(stitch.description || ''),
    consume: Number(stitch.consume || 0),
    generate: Number(stitch.generate || 0)
  }

  const existingIndex = list.findIndex((s) => Number(s?.stitch_id) === id)
  if (existingIndex >= 0) {
    list.splice(existingIndex, 1, next)
  } else {
    list.push(next)
  }
}

provideSelfDefinedStitchesContext({
  stitchesRef: computed(() => projectData.value.self_defined_stitches),
  addStitch: addSelfDefinedStitch
})

function ensureComponentIdsAndStitchFieldsInPlace(componentList) {
  const list = Array.isArray(componentList) ? componentList : []
  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    if (!c.id) c.id = uuidv4()

    if (c.type === 'stitch') {
      if (!Array.isArray(c.related_component_ids)) c.related_component_ids = []
      if (c.related_component_ids.length === 0) c.related_component_ids.push('')

      if (!Array.isArray(c.notes)) c.notes = []
      c.notes = c.notes
        .filter((n) => n != null)
        .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
      if (c.notes.length === 0) c.notes.push('')
    }
  }
}

ensureComponentIdsAndStitchFieldsInPlace(projectData.value.component_list)

const initialSnapshot = ref(null)

function safeSerialize(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

const isDirty = computed(() => {
  if (!initialSnapshot.value) return false
  return safeSerialize(projectData.value) !== safeSerialize(initialSnapshot.value)
})

// Create default structures
const createPart = () => ({
  type: 0,
  row_list: [],
  row_groups: [],
  consume: 0,
  generate: 0
})

const createComponent = (index, type = 'component') => {
  const component = {
    id: uuidv4(),
    name: `${props.projectName} ${index + 1}`,
    type: type,
    count: 1,
    yarn: [''],
    hook: [''],
    metadata: {
      yarn: [],
      hook: []
    }
  }

  if (type === 'component') {
    component.content = createPart()
  } else {
    component.content = { text: '' }
    component.related_component_ids = ['']
    component.notes = ['']
  }

  return component
}

function countStitchesUpToIndex(list, indexInclusive) {
  const arr = Array.isArray(list) ? list : []
  const max = Math.min(arr.length - 1, Math.max(0, Number(indexInclusive)))
  let count = 0
  for (let i = 0; i <= max; i += 1) {
    if (arr[i]?.type === 'stitch') count += 1
  }
  return count
}

// Component management
const addComponentOfType = async (type, options = {}) => {
  const { scrollToLatest = true } = options
  const scrollState = capturePageScroll()
  const list = Array.isArray(projectData.value.component_list) ? projectData.value.component_list : []
  ensureComponentIdsAndStitchFieldsInPlace(list)
  const currentIndexRaw = carouselEl.value?.getActiveIndex?.()
  const currentIndex = Number.isFinite(Number(currentIndexRaw)) ? Number(currentIndexRaw) : list.length - 1
  const insertAt = Math.min(list.length, Math.max(0, currentIndex + 1))

  const next = createComponent(list.length, type)
  if (type === 'stitch') {
    const n = countStitchesUpToIndex(list, insertAt) + 1
    next.name = t('addProject.design.stitchDefaultName', { n })
  }

  list.splice(insertAt, 0, next)
  projectData.value.component_list = list

  if (scrollToLatest) {
    await scrollToCard(insertAt)
  }

  // Some browsers/WebViews may scroll the page when DOM updates or when the carousel scrolls.
  // Restore the previous vertical scroll position so the user's y-position doesn't jump.
  await nextTick()
  if (scrollState) {
    requestAnimationFrame(() => restorePageScroll(scrollState))
  }
}

async function handleAddPart() {
  await addComponentOfType('component')
}

async function handleAddStitch() {
  await addComponentOfType('stitch')
}

const removeComponent = (index) => {
  projectData.value.component_list.splice(index, 1)
}

const handleBack = () => {
  emit('back', projectData.value)
}

function safeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function rowHasCrochetContent(row) {
  const nodes = row?.content?.stitch_node_list
  if (Array.isArray(nodes) && nodes.length > 0) return true

  // Fallback: if a row has explicit non-zero values, treat as content.
  // (Some flows may compute generate/consume even if nodes are not present.)
  const generate = safeNumber(row?.content?.generate)
  const consume = safeNumber(row?.content?.consume)
  return generate !== 0 || consume !== 0
}

function trimTrailingEmptyRows(rowList) {
  const list = Array.isArray(rowList) ? rowList : []
  let end = list.length
  while (end > 0 && !rowHasCrochetContent(list[end - 1])) end -= 1
  return list.slice(0, end)
}

function findEmptyRowsAfterTrim(componentList) {
  const results = []
  const list = Array.isArray(componentList) ? componentList : []

  for (let cIndex = 0; cIndex < list.length; cIndex += 1) {
    const component = list[cIndex]
    const isPart = !component?.type || component?.type === 'component'
    if (!isPart) continue

    const rowListRaw = component?.content?.row_list
    const rowList = trimTrailingEmptyRows(rowListRaw)

    for (let rIndex = 0; rIndex < rowList.length; rIndex += 1) {
      const row = rowList[rIndex]
      if (rowHasCrochetContent(row)) continue
      const rowNumber = row?.row_index ?? (rIndex + 1)
      results.push({
        componentName: component?.name || String(cIndex + 1),
        rowNumber
      })
    }
  }

  return results
}

function trimTrailingEmptyRowsInPlace(componentList) {
  const list = Array.isArray(componentList) ? componentList : []
  for (const component of list) {
    const isPart = !component?.type || component?.type === 'component'
    if (!isPart) continue
    if (!component.content || typeof component.content !== 'object') component.content = {}

    const rowListRaw = component?.content?.row_list
    if (!Array.isArray(rowListRaw) || rowListRaw.length === 0) continue
    component.content.row_list = trimTrailingEmptyRows(rowListRaw)
  }
}

const hasAnyCrochetRow = computed(() => {
  const list = Array.isArray(projectData.value.component_list)
    ? projectData.value.component_list
    : []

  return list.some((c) => {
    const isPart = !c?.type || c?.type === 'component'
    if (!isPart) return false
    const rowList = c?.content?.row_list
    if (!Array.isArray(rowList) || rowList.length === 0) return false
    return rowList.some(rowHasCrochetContent)
  })
})

const emptyCrochetRows = computed(() => findEmptyRowsAfterTrim(projectData.value.component_list))
const hasEmptyCrochetRow = computed(() => emptyCrochetRows.value.length > 0)

const canSubmit = computed(() => {
  if (loading.value) return false
  if (!Array.isArray(projectData.value.component_list) || projectData.value.component_list.length === 0) return false
  if (!hasAnyCrochetRow.value) return false
  return !hasEmptyCrochetRow.value
})

function findUnexpectedGenerateRows(componentList) {
  const results = []
  const list = Array.isArray(componentList) ? componentList : []

  for (let cIndex = 0; cIndex < list.length; cIndex += 1) {
    const component = list[cIndex]
    const isPart = !component?.type || component?.type === 'component'
    if (!isPart) continue

    const rowList = Array.isArray(component?.content?.row_list)
      ? component.content.row_list
      : []

    let previousGenerate = 0
    for (let rIndex = 0; rIndex < rowList.length; rIndex += 1) {
      const row = rowList[rIndex]
      const consume = safeNumber(row?.content?.consume)

      if (previousGenerate !== 0 && consume > previousGenerate) {
        const rowNumber = row?.row_index ?? (rIndex + 1)
        results.push({
          componentName: component?.name || String(cIndex + 1),
          rowNumber
        })
      }

      previousGenerate = safeNumber(row?.content?.generate)
    }
  }

  return results
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim())
  const s = String(value || '').trim()
  return s ? [s] : []
}

function uniqueNonEmpty(list) {
  const seen = new Set()
  const out = []
  for (const raw of normalizeStringList(list)) {
    const v = String(raw || '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

function normalizeProjectMaterialsInPlace(componentList) {
  const list = Array.isArray(componentList) ? componentList : []

  for (const component of list) {
    const isPart = !component?.type || component?.type === 'component'
    if (!isPart) continue

    // Legacy: metadata may contain strings
    const legacyYarn = typeof component?.metadata?.yarn === 'string' ? component.metadata.yarn : ''
    const legacyHook = typeof component?.metadata?.hook === 'string' ? component.metadata.hook : ''

    const yarnValues = uniqueNonEmpty(component?.yarn?.length ? component.yarn : legacyYarn)
    const hookValues = uniqueNonEmpty(component?.hook?.length ? component.hook : legacyHook)

    component.yarn = yarnValues
    component.hook = hookValues

    if (!component.metadata || typeof component.metadata !== 'object') component.metadata = {}
    component.metadata.yarn = yarnValues
    component.metadata.hook = hookValues
  }
}

const handleSubmit = async () => {
  if (loading.value) return

  normalizeProjectMaterialsInPlace(projectData.value.component_list)

  if (!Array.isArray(projectData.value.component_list) || projectData.value.component_list.length === 0) {
    openError({ title: t('common.error'), message: t('addProject.design.errors.atLeastOneComponent') })
    return
  }

  if (!hasAnyCrochetRow.value) {
    openError({ title: t('common.error'), message: t('addProject.design.errors.atLeastOneRow') })
    return
  }

  if (hasEmptyCrochetRow.value) {
    const first = emptyCrochetRows.value[0]
    const example = first ? `${first.componentName} #${first.rowNumber}` : ''
    openError({
      title: t('common.error'),
      message: t('addProject.design.errors.noEmptyRows', { example })
    })
    return
  }

  const unexpected = findUnexpectedGenerateRows(projectData.value.component_list)
  if (unexpected.length > 0) {
    const rowListText = unexpected
      .map((r) => `${r.componentName} #${r.rowNumber}`)
      .join(', ')

    const ok = await openConfirmation({
      type: {
        id: 'addProjectUnexpectedGenerate',
        params: { rows: rowListText }
      }
    })

    if (!ok) return
  }

  loading.value = true

    // Ensure saved projects never include trailing placeholder rows.
    trimTrailingEmptyRowsInPlace(projectData.value.component_list)
  emit('submit', projectData.value)
}

// Add at least one component by default if none exist
;(async () => {
  if (projectData.value.component_list.length === 0) {
    await addComponentOfType('component', { scrollToLatest: false })
  }
  initialSnapshot.value = deepClone(projectData.value)
  emit('dirty-change', false)
})()

watch(
  () => projectData.value,
  () => {
    emit('dirty-change', Boolean(isDirty.value))
  },
  { deep: true }
)
</script>

<style scoped>
.add-project-design {
  max-width: 900px;
  margin: 0 auto;
}



.form-section {
  /* margin-bottom: 2rem;
  padding-bottom: 2rem; */
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header__right {
	display: inline-flex;
	align-items: center;
	gap: 0.6rem;
	user-select: none;
}

.section-header__right-label {
	font-size: 0.9rem;
	font-weight: 800;
	color: #374151;
	white-space: nowrap;
}

.add-component-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
  margin: 0.75rem 0 1rem;
}

.add-component-actions__btn {
  width: min(320px, 40vw);
  height: 44px;
  padding: 0 1rem;
  border-radius: 12px;
  background: var(--color-icon-add);
  color: var(--color-white);
  font-weight: 900;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
  border: none;
}

.add-component-actions__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

:deep(.button-group-fixed__inner.button-group) {
  justify-content: space-between;
}

/* Carousel arrows: fix to viewport so they stay at screen edges */
:deep(.carousel__arrow) {
  position: fixed;
  top: 50vh;
  transform: translateY(-50%);
  z-index: 30;
}

:deep(.carousel__arrow--left) {
  left: calc(10px + env(safe-area-inset-left));
}

:deep(.carousel__arrow--right) {
  right: calc(10px + env(safe-area-inset-right));
}
</style>
