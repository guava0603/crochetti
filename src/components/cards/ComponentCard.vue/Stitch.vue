<template>
  <FormSubsection
    v-if="isEditing"
    wrapper-class="subsection"
    kind="multi-select"
    :title="t('addProject.design.relatedComponentsLabel')"
    v-model="relatedComponentIdsModel"
    :options="relatedComponentOptions"
    :placeholder="t('addProject.design.relatedComponentsPlaceholder')"
    :aria-label="t('addProject.design.relatedComponentsLabel')"
  />

  <FormSubsection
    v-else-if="relatedComponentNames.length"
    wrapper-class="view-section view-section--related"
    kind="slot"
    :show-header="false"
  >
    <div class="related-components-line">
      <span class="related-components-label">{{ t('project.stitchCard.seamPartsLabel') }}</span>
      <span class="related-components-value">{{ relatedComponentNames.join('、') }}</span>
    </div>
  </FormSubsection>

  <FormSubsection
    v-if="isEditing"
    wrapper-class="subsection"
    kind="notes"
    :title="t('common.notes')"
    v-model="component.notes"
    :placeholder="t('addProject.design.stitchNotesPlaceholder')"
    :notes-rows="2"
    notes-input-class="list-item-input"
  />

  <FormSubsection
    v-else-if="displayNotes.length > 0"
    wrapper-class="view-section"
    kind="slot"
    :title="t('common.notes')"
  >
    <ul class="view-list">
      <li v-for="(note, nIndex) in displayNotes" :key="nIndex">
        {{ note }}
      </li>
    </ul>
  </FormSubsection>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormSubsection from '@/components/AddProject/FormSubsection.vue'
import { isComponentType } from '@/utils/componentTypes'

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

  if (!Array.isArray(component.value.notes)) {
    component.value.notes = []
  }

  component.value.notes = component.value.notes
    .filter((n) => n != null)
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
}

function normalizeIdList(value) {
  const list = Array.isArray(value) ? value : []
  const seen = new Set()
  const out = []
  for (const raw of list) {
    const v = String(raw ?? '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
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
  return isComponentType(c?.type)
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
  return normalizeIdList(component.value?.related_component_ids)
    .map((id) => relatedComponentIdLabelMap.value.get(id) || id)
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

const relatedComponentIdsModel = computed({
  get() {
    const allowed = new Set(relatedComponentOptions.value.map((o) => String(o?.value ?? '').trim()).filter(Boolean))
    const raw = normalizeIdList(component.value?.related_component_ids)
    if (allowed.size === 0) return raw
    return raw.filter((id) => allowed.has(id))
  },
  set(next) {
    ensureStitchFields()
    const allowed = new Set(relatedComponentOptions.value.map((o) => String(o?.value ?? '').trim()).filter(Boolean))
    const normalized = normalizeIdList(next)
    component.value.related_component_ids = allowed.size
      ? normalized.filter((id) => allowed.has(id))
      : normalized
  }
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

</script>

<style scoped>
.view-section {
  border-radius: 6px;
}

.subsection {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
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
