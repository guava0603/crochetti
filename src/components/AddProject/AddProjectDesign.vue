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
          <h3>{{ $t('addProject.design.componentsTitle') }}</h3>
          <div class="section-header__right">
          <span class="section-header__right-label">{{ $t('project.public') }}</span>
          <label class="switch" :aria-label="$t('project.public')">
            <input type="checkbox" v-model="projectData.is_public" />
            <span class="slider" aria-hidden="true"></span>
          </label>
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
              @remove="removeComponent(index)"
            />
          </template>
        </CarouselWithDot>

        <!-- Add Component Type Selector -->
        <div class="add-component-selector">
          <button
            type="button"
            class="add-component-selector__button"
            :aria-label="$t('addProject.design.addMenuAria')"
            @click="handleAddComponent"
          >
            <ButtonAdd type="flat" />
          </button>
        </div>
      </div>

      <OptionSelectModal
        :show="showAddTypeSelector"
        :title="$t('addProject.design.addMenuAria')"
        :message="$t('confirmation.addProjectChooseComponentType.message')"
        :options="addTypeOptions"
        :cancel-text="$t('confirmation.actions.cancel')"
        @cancel="closeAddTypeSelector"
        @select="selectAddType"
      />

      <div v-if="error" class="error">
        {{ error }}
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
import { ref, defineProps, defineEmits, nextTick, computed, onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { v4 as uuidv4 } from '@lukeed/uuid'
import ComponentCard from '../cards/ComponentCard.vue/index.vue'
import CarouselWithDot from '@/components/Carousel/CarouselWithDot.vue'
import { openConfirmation } from '@/services/ui/confirmation'
import ButtonAdd from '@/components/buttons/svg/ButtonAdd.vue'
import OptionSelectModal from '@/components/modals/OptionSelectModal.vue'

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

const emit = defineEmits(['back', 'submit'])

const loading = ref(false)
const error = ref(null)

const carouselEl = ref(null)
const bottomToolbarEl = ref(null)
const bottomToolbarHeight = ref(0)


const stepFormStyle = computed(() => {
  if (!bottomToolbarHeight.value) return {}
  return {
    paddingBottom: `calc(${bottomToolbarHeight.value}px + env(safe-area-inset-bottom))`
  }
})

let bottomToolbarResizeObserver = null

function updateBottomToolbarHeight() {
  const el = bottomToolbarEl.value
  if (!el) {
    bottomToolbarHeight.value = 0
    return
  }
  bottomToolbarHeight.value = Math.ceil(el.getBoundingClientRect().height)
}

onMounted(() => {
  updateBottomToolbarHeight()
  window.addEventListener('resize', updateBottomToolbarHeight)

  if (typeof ResizeObserver !== 'undefined' && bottomToolbarEl.value) {
    bottomToolbarResizeObserver = new ResizeObserver(() => updateBottomToolbarHeight())
    bottomToolbarResizeObserver.observe(bottomToolbarEl.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateBottomToolbarHeight)
  if (bottomToolbarResizeObserver) bottomToolbarResizeObserver.disconnect()
  bottomToolbarResizeObserver = null
})

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

// Initialize project data
const projectData = ref(props.initialData || {
  component_list: [],
  is_public: false
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

async function handleAddComponent() {
  showAddTypeSelector.value = true
}

const showAddTypeSelector = ref(false)

const addTypeOptions = computed(() => {
  return [
    { id: 'component', label: t('addProject.design.addComponent') },
    { id: 'stitch', label: t('addProject.design.addStitch') }
  ]
})

function closeAddTypeSelector() {
  showAddTypeSelector.value = false
}

async function selectAddType(type) {
  closeAddTypeSelector()
  if (type === 'component' || type === 'stitch') {
    await addComponentOfType(type)
  }
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

const hasAnyCrochetRow = computed(() => {
  const list = Array.isArray(projectData.value.component_list)
    ? projectData.value.component_list
    : []

  return list.some((c) => {
    const isPart = !c?.type || c?.type === 'component'
    if (!isPart) return false
    const rowList = c?.content?.row_list
    return Array.isArray(rowList) && rowList.length > 0
  })
})

const canSubmit = computed(() => {
  if (loading.value) return false
  if (!Array.isArray(projectData.value.component_list) || projectData.value.component_list.length === 0) return false
  return hasAnyCrochetRow.value
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
    error.value = t('addProject.design.errors.atLeastOneComponent')
    return
  }

  if (!hasAnyCrochetRow.value) {
    error.value = t('addProject.design.errors.atLeastOneRow')
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

  error.value = null
  loading.value = true
  emit('submit', projectData.value)
}

// Add at least one component by default if none exist
if (projectData.value.component_list.length === 0) {
  addComponentOfType('component', { scrollToLatest: false })
}
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

.section-header h3 {
  margin: 0;
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

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 26px;
  margin: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #d1d5db;
  transition: 0.18s;
  border-radius: 999px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 3px;
  top: 3px;
  background-color: white;
  transition: 0.18s;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}

.switch input:checked + .slider {
  background-color: #42b983;
}

.switch input:checked + .slider:before {
  transform: translateX(18px);
}

.switch input:disabled + .slider {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-component-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.add-component-selector__button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.add-component-selector__button:hover {
  background: transparent;
}

.add-component-selector__button:active {
  transform: translateY(1px);
}

.button-group-fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(229, 231, 235, 0.9);
  padding: 0.75rem 2rem;
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
}

.button-group-fixed__inner {
  max-width: 1000px;
  margin: 0 auto;
}

:deep(.button-group-fixed__inner.button-group) {
  margin-top: 0;
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
