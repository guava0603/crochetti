<template>
  <div class="add-project-design">

    <form
      @submit.prevent="handleSubmit"
      class="step-form"
      :style="stepFormStyle"
    >
      <div class="form-section">

        <div class="form-group">
          <label>
            <input type="checkbox" v-model="projectData.is_public" />
            {{ $t('addProject.design.makePublic') }}
          </label>
        </div>
      </div>

      <!-- Components -->
      <div class="form-section">
        <div class="section-header">
          <h3>{{ $t('addProject.design.componentsTitle') }}</h3>
        </div>

        <CarouselWithDot
          ref="carouselEl"
          :items="projectData.component_list"
          :aria-label="$t('addProject.design.componentsAria')"
          bleed
        >
          <template #default="{ item, index }">
            <ComponentCard
              :component="item"
              :is-editing="true"
              @remove="removeComponent(index)"
            />
          </template>
        </CarouselWithDot>

        <!-- Add Component Type Selector -->
        <div class="add-component-selector">
          <button type="button" @click="addComponentOfType('component')" class="btn-add-type">
            {{ $t('addProject.design.addComponent') }}
          </button>
          <button type="button" @click="addComponentOfType('stitch')" class="btn-add-type">
            {{ $t('addProject.design.addStitch') }}
          </button>
        </div>
      </div>

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
          {{ loading ? $t('addProject.design.creating') : $t('addProject.design.createProject') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, nextTick, computed, onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ComponentCard from '../cards/ComponentCard.vue'
import CarouselWithDot from '@/components/Carousel/CarouselWithDot.vue'
import { openConfirmation } from '@/services/ui/confirmation'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  projectName: {
    type: String,
    required: true
  },
  initialData: {
    type: Object,
    default: null
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

async function scrollToLatestCard() {
  await nextTick()
  const lastIndex = projectData.value.component_list.length - 1
  carouselEl.value?.scrollToIndex?.(lastIndex)
}

// Initialize project data
const projectData = ref(props.initialData || {
  component_list: [],
  is_public: false
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
  }

  return component
}

// Component management
const addComponentOfType = async (type, options = {}) => {
  const { scrollToLatest = true } = options
  const index = projectData.value.component_list.length
  projectData.value.component_list.push(createComponent(index, type))

  if (scrollToLatest) {
    await scrollToLatestCard()
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
  margin-bottom: 2rem;
  padding-bottom: 2rem;
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

.add-component-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.btn-add-type {
  padding: 0.5rem 1rem;
  background: white;
  color: #42b983;
  border: 1px dashed #42b983;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-type:hover {
  background: #f0fdf4;
  border-style: solid;
}

.button-group-fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
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
</style>
