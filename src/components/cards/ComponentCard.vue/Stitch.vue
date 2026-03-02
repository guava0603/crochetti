<template>
  <div v-if="isEditing" class="subsection">
    <div class="subsection-header">
      <h5>{{ t('addProject.design.relatedComponentsLabel') }}</h5>
    </div>
    <ComponentMaterialField
      v-model:items="component.related_component_ids"
      input-type="dropdown"
      :placeholder="t('addProject.design.relatedComponentsPlaceholder')"
      :options="relatedComponentOptions"
      :item-key="(_, idx) => `related-${idx}`"
      :get-text="(id) => id"
      :set-text="(_id, v) => String(v ?? '')"
      @add="addRelatedComponent"
      @remove="removeRelatedComponent"
      @item-blur="pruneRelatedComponentIds"
    />
  </div>

  <div
    v-else-if="relatedComponentNames.length"
    class="view-section view-section--related"
    style="margin-top: 1rem;"
  >
    <div class="related-components-line">
      <span class="related-components-label">{{ t('project.stitchCard.seamPartsLabel') }}</span>
      <span class="related-components-value">{{ relatedComponentNames.join('、') }}</span>
    </div>
  </div>

  <div v-if="isEditing" class="subsection">
    <div class="subsection-header">
      <h5>{{ t('common.notes') }}</h5>
    </div>
    <ComponentMaterialField
      variant="notes"
      v-model:items="component.notes"
      input-type="textarea"
      :placeholder="t('addProject.design.stitchNotesPlaceholder')"
      input-class="list-item-input"
      :rows="2"
      :get-text="(n) => n"
      :set-text="(_n, v) => String(v ?? '')"
      @add="addStitchNote"
      @remove="removeStitchNote"
    />
  </div>

  <div
    v-else-if="displayNotes.length > 0"
    class="view-section"
    style="margin-top: 1rem;"
  >
    <h5 class="view-section-title">{{ t('common.notes') }}</h5>
    <ul class="view-list">
      <li v-for="(note, nIndex) in displayNotes" :key="nIndex">
        {{ note }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ComponentMaterialField from '@/components/cards/ComponentMaterialField.vue'

const { t } = useI18n({ useScope: 'global' })

defineOptions({
  name: 'ComponentCardStitch'
})

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  componentList: {
    type: Array,
    default: null
  },
  componentIndex: {
    type: Number,
    default: -1
  },
  isEditing: {
    type: Boolean,
    default: false
  }
})

const component = computed(() => props.component)
const isEditing = computed(() => props.isEditing)

const displayNotes = computed(() => {
  const notes = Array.isArray(component.value?.notes) ? component.value.notes : []
  return notes
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
    .map((n) => String(n ?? '').trim())
    .filter(Boolean)
})

function ensureStitchFields() {
  if (!Array.isArray(component.value.related_component_ids)) {
    component.value.related_component_ids = []
  }
  if (isEditing.value && component.value.related_component_ids.length === 0) {
    component.value.related_component_ids.push('')
  }

  if (!Array.isArray(component.value.notes)) {
    component.value.notes = []
  }

  component.value.notes = component.value.notes
    .filter((n) => n != null)
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))

  if (isEditing.value && component.value.notes.length === 0) {
    component.value.notes.push('')
  }
}

const stitchOrderN = computed(() => {
  const list = Array.isArray(props.componentList) ? props.componentList : []
  const idx = Number.isFinite(Number(props.componentIndex)) ? Number(props.componentIndex) : -1
  if (!Array.isArray(list) || list.length === 0 || idx < 0) return 1

  const max = Math.min(list.length - 1, idx)
  let count = 0
  for (let i = 0; i <= max; i += 1) {
    if (list[i]?.type === 'stitch') count += 1
  }
  return Math.max(1, count)
})

function isPartComponent(c) {
  return !c?.type || c?.type === 'component'
}

const relatedComponentIdLabelMap = computed(() => {
  const list = Array.isArray(props.componentList) ? props.componentList : []
  const map = new Map()

  for (let i = 0; i < list.length; i += 1) {
    const c = list[i]
    if (!isPartComponent(c)) continue
    const id = String(c?.id ?? '').trim()
    if (!id) continue

    const label = String(c?.name || '').trim() || `#${i + 1}`
    map.set(id, label)
  }

  return map
})

const relatedComponentNames = computed(() => {
  const ids = Array.isArray(component.value?.related_component_ids)
    ? component.value.related_component_ids
    : []

  const seen = new Set()
  const out = []

  for (const raw of ids) {
    const id = String(raw ?? '').trim()
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)

    out.push(relatedComponentIdLabelMap.value.get(id) || id)
  }

  return out
})

const relatedComponentOptions = computed(() => {
  const list = Array.isArray(props.componentList) ? props.componentList : []
  const idx = Number.isFinite(Number(props.componentIndex)) ? Number(props.componentIndex) : list.length
  const max = Math.min(list.length, Math.max(0, idx))

  return list
    .slice(0, max)
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => isPartComponent(c))
    .map(({ c, i }) => ({
      value: String(c?.id ?? ''),
      label: String(c?.name || `#${i + 1}`)
    }))
    .filter((o) => o.value)
})

watch(
  () => props.component,
  () => ensureStitchFields(),
  { immediate: true }
)

watch(
  () => props.isEditing,
  (editing) => {
    if (editing) ensureStitchFields()
  }
)

watch(
  () => [props.componentList, props.componentIndex, props.isEditing],
  () => {
    const currentName = String(component.value?.name || '').trim()
    if (currentName) return
    component.value.name = t('addProject.design.stitchDefaultName', { n: stitchOrderN.value })
  },
  { immediate: true }
)

function pruneRelatedComponentIds() {
  const allowed = new Set(relatedComponentOptions.value.map((o) => String(o.value)))
  const list = Array.isArray(component.value.related_component_ids)
    ? component.value.related_component_ids
    : []

  const seen = new Set()
  const out = []
  for (const raw of list) {
    const v = String(raw ?? '').trim()
    if (!v) continue
    if (!allowed.has(v)) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }

  out.push('')
  component.value.related_component_ids = out
}

function addRelatedComponent() {
  ensureStitchFields()
  component.value.related_component_ids.push('')
}

function removeRelatedComponent(idx) {
  ensureStitchFields()
  component.value.related_component_ids.splice(idx, 1)
  if (component.value.related_component_ids.length === 0) component.value.related_component_ids.push('')
}

function addStitchNote() {
  ensureStitchFields()
  component.value.notes.push('')
}

function removeStitchNote(index) {
  ensureStitchFields()
  component.value.notes.splice(index, 1)
  if (component.value.notes.length === 0) component.value.notes.push('')
}
</script>

<style scoped>
.view-section {
  border-radius: 6px;
}

.subsection {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.subsection-header h5 {
  margin: 0;
  font-size: 1rem;
}

.view-section-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #374151;
  font-weight: 600;
}

.view-list {
  margin: 0;
  padding-left: 1.5rem;
  list-style: disc;
}

.view-list li {
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 0.25rem;
  white-space: pre-wrap;
}

.related-components-line {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.related-components-label {
  font-size: 0.9rem;
  font-weight: 800;
  color: #374151;
  white-space: nowrap;
}

.related-components-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: #111827;
  overflow-wrap: anywhere;
}
</style>
