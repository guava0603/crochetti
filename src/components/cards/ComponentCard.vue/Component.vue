<template>
  <!-- Materials (edit mode) -->
  <FormSubsectionList
    v-if="visibilityResolved.materials !== false && isEditing && hasMaterialOptions"
    wrapper-class="subsection component-metadata-subsection"
    kind="component-material-options"
    :title="t('project.componentMetadata.title')"
    :show-hook="true"
    :show-needle="false"
    v-model:hook="component.hook"
    v-model:needle="component.needle"
    v-model:yarn="component.yarn"
    v-model:yarn-amount-by-id="component.metadata.yarn_amount_by_id"
    :component-hook-suggestions="hookSuggestions"
    :component-yarn-options="yarnOptions"
  />

  <!-- Yarn / Hook (optional, view mode) -->
  <FormSubsection
    v-if="
      visibilityResolved.materials !== false &&
      !isEditing &&
      (resolvedYarnList.length > 0 || resolvedHookList.length > 0)
    "
    wrapper-class="view-section"
    kind="slot"
    :show-header="false"
  >
    <div class="component-metadata-view">
      <div v-if="resolvedHookList.length > 0" class="component-metadata-row">
        <span class="component-metadata-label">{{ t('project.componentMetadata.hook') }}</span>
        <span class="component-metadata-value">{{ resolvedHookList.join('\n') }}</span>
      </div>
      <div v-if="resolvedYarnList.length > 0" class="component-metadata-row">
        <span class="component-metadata-label">{{ t('project.componentMetadata.yarn') }}</span>
        <span class="component-metadata-value">{{ resolvedYarnList.join('\n') }}</span>
      </div>
    </div>
  </FormSubsection>

  <ComponentCardComponentCrochet
    v-if="visibilityResolved.table !== false"
    v-model="rowListModel"
    v-model:row-groups="rowGroupsModel"
    :is-editing="isEditing"
  />

  <!-- Notes Section -->
  <FormSubsection
    v-if="visibilityResolved.notes !== false && isEditing"
    wrapper-class="subsection"
    kind="notes"
    :title="t('common.notes')"
    v-model="component.notes"
    :placeholder="t('common.noteDescriptionPlaceholder')"
    :notes-rows="2"
    notes-input-class="list-item-input"
  />
  <FormSubsection
    v-else-if="visibilityResolved.notes !== false && displayNotes.length > 0"
    wrapper-class="view-section"
    kind="slot"
    :show-header="false"
  >
    <ul class="view-list">
      <li v-for="(note, nIndex) in displayNotes" :key="nIndex">
        {{ note }}
      </li>
    </ul>
  </FormSubsection>

  <!-- Repeat count (edit mode, bottom of card) -->
  <div v-if="isEditing" class="subsection component-count-subsection">
    <div class="component-count-editor">
      <span class="component-count-text">{{ t('project.makeCountLabel') }}</span>
      <div class="component-count-number">
        <InputNumber
          :model-value="countDraft"
          :auto-focus="false"
          size="sm"
          :min="1"
          :max="99"
          @update:model-value="handleUpdateCountDraft"
          @close="commitCountDraft"
        />
      </div>
    </div>
  </div>

</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ComponentCardComponentCrochet from './ComponentCrochet.vue'
import InputNumber from '@/components/Input/InputNumber.vue'
import FormSubsection from '@/components/AddProject/FormSubsection.vue'
import FormSubsectionList from '@/components/AddProject/FormSubsectionList.vue'
import {
  mergeYarnMetaWithTypes,
  normalizeComponentYarnSelection,
  normalizeYarnMetaList,
  yarnMetaIdMap,
  yarnMetaOptions
} from '@/utils/yarnMeta'

const { t } = useI18n({ useScope: 'global' })

defineOptions({
  name: 'ComponentCardComponent'
})

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  materials: {
    type: Object,
    default: null
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: Object,
    default: null
  }
})

const component = computed(() => props.component)
const materials = computed(() => props.materials)
const isEditing = computed(() => props.isEditing)
const visibilityResolved = computed(() => {
  const raw = props.visibility
  if (!raw || typeof raw !== 'object') {
    return {
      table: true,
      notes: true,
      materials: true
    }
  }
  return {
    table: raw.table !== false,
    notes: raw.notes !== false,
    materials: raw.materials !== false
  }
})

function ensureRowTableFields() {
  if (!component.value || typeof component.value !== 'object') return

  if (!component.value.content || typeof component.value.content !== 'object') {
    component.value.content = {}
  }

  // Backward compatibility: some legacy shapes store rows/groups at the top level.
  if (!Array.isArray(component.value.content.row_list)) {
    if (Array.isArray(component.value.row_list)) {
      component.value.content.row_list = component.value.row_list
    } else {
      component.value.content.row_list = []
    }
  }

  if (!Array.isArray(component.value.content.row_groups)) {
    if (Array.isArray(component.value.row_groups)) {
      component.value.content.row_groups = component.value.row_groups
    } else {
      component.value.content.row_groups = []
    }
  }
}

watch(
  () => props.component,
  () => ensureRowTableFields(),
  { immediate: true }
)

const rowListModel = computed({
  get() {
    const list = component.value?.content?.row_list
    return Array.isArray(list) ? list : []
  },
  set(next) {
    ensureRowTableFields()
    component.value.content.row_list = Array.isArray(next) ? next : []
  }
})

const rowGroupsModel = computed({
  get() {
    const list = component.value?.content?.row_groups
    return Array.isArray(list) ? list : []
  },
  set(next) {
    ensureRowTableFields()
    component.value.content.row_groups = Array.isArray(next) ? next : []
  }
})

const displayNotes = computed(() => {
  const notes = Array.isArray(component.value?.notes) ? component.value.notes : []
  return notes
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
    .map((n) => String(n ?? '').trim())
    .filter(Boolean)
})

if (!component.value.metadata || typeof component.value.metadata !== 'object') {
  component.value.metadata = { yarn: [], hook: [], needle: [] }
} else {
  if (component.value.metadata.yarn == null) component.value.metadata.yarn = []
  if (component.value.metadata.hook == null) component.value.metadata.hook = []
  if (component.value.metadata.needle == null) component.value.metadata.needle = []
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter((v) => v.length > 0)
  }
  const s = String(value || '').trim()
  return s ? [s] : []
}

function uniqueList(list) {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(list) ? list : []) {
    const v = String(raw || '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

function ensureMaterialArrays() {
  const baseYarnMeta = normalizeYarnMetaList(materials.value?.yarn)
  const baseYarnIdMap = yarnMetaIdMap(baseYarnMeta)

  const legacyYarn = typeof component.value?.metadata?.yarn === 'string' ? component.value.metadata.yarn : null
  const legacyHook = typeof component.value?.metadata?.hook === 'string' ? component.value.metadata.hook : null
  const legacyNeedle = typeof component.value?.metadata?.needle === 'string' ? component.value.metadata.needle : null

  const yarnRaw = component.value.yarn == null
    ? (legacyYarn ? normalizeStringList(legacyYarn) : [])
    : normalizeStringList(component.value.yarn)

  // If yarn meta exists, store selection as ids.
  if (baseYarnMeta.length > 0) {
    const unknownAsTypes = yarnRaw.filter((v) => !baseYarnIdMap.has(String(v ?? '').trim()))
    const effectiveYarnMeta = mergeYarnMetaWithTypes(baseYarnMeta, unknownAsTypes)
    component.value.yarn = normalizeComponentYarnSelection(yarnRaw, effectiveYarnMeta)
  } else {
    component.value.yarn = yarnRaw
  }

  if (component.value.hook == null) {
    component.value.hook = legacyHook ? normalizeStringList(legacyHook) : []
  } else {
    component.value.hook = normalizeStringList(component.value.hook)
  }

  if (component.value.needle == null) {
    component.value.needle = legacyNeedle ? normalizeStringList(legacyNeedle) : []
  } else {
    component.value.needle = normalizeStringList(component.value.needle)
  }

  component.value.metadata.yarn = Array.isArray(component.value.yarn) ? component.value.yarn : []
  component.value.metadata.hook = uniqueList(normalizeStringList(component.value.metadata.hook))
  component.value.metadata.needle = uniqueList(normalizeStringList(component.value.metadata.needle))

}

ensureMaterialArrays()

function ensureYarnAmountMapObject() {
  if (!component.value || typeof component.value !== 'object') return null
  if (!component.value.metadata || typeof component.value.metadata !== 'object') component.value.metadata = {}

  const raw = component.value.metadata.yarn_amount_by_id
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    component.value.metadata.yarn_amount_by_id = {}
  }
  return component.value.metadata.yarn_amount_by_id
}

const resolvedYarnList = computed(() => {
  const baseYarnMeta = normalizeYarnMetaList(materials.value?.yarn)
  if (baseYarnMeta.length === 0) {
    const values = uniqueList(normalizeStringList(component.value?.yarn))
    if (values.length > 0) return values
    if (typeof component.value?.metadata?.yarn === 'string') return normalizeStringList(component.value.metadata.yarn)
    return uniqueList(normalizeStringList(component.value?.metadata?.yarn))
  }

  const raw = component.value?.yarn ?? component.value?.metadata?.yarn
  const ids = normalizeComponentYarnSelection(raw, baseYarnMeta)
  const idMap = yarnMetaIdMap(baseYarnMeta)
  const amountMap = ensureYarnAmountMapObject() || {}

  const out = []
  const seen = new Set()
  for (const rawId of Array.isArray(ids) ? ids : []) {
    const id = String(rawId ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const meta = idMap.get(id)
    const type = String(meta?.type ?? '').trim()
    const amount = String(amountMap[id] ?? '').trim()
    out.push(amount ? `${type || id}: ${amount}` : (type || id))
  }
  return out
})

const resolvedHookList = computed(() => {
  const values = uniqueList(normalizeStringList(component.value?.hook))
  if (values.length > 0) return values
  if (typeof component.value?.metadata?.hook === 'string') return normalizeStringList(component.value.metadata.hook)
  return uniqueList(normalizeStringList(component.value?.metadata?.hook))
})

const resolvedNeedleList = computed(() => {
  const values = uniqueList(normalizeStringList(component.value?.needle))
  if (values.length > 0) return values
  if (typeof component.value?.metadata?.needle === 'string') return normalizeStringList(component.value.metadata.needle)
  return uniqueList(normalizeStringList(component.value?.metadata?.needle))
})

function mergeMaterialOptions(base, extra) {
  return uniqueList([...(Array.isArray(base) ? base : []), ...(Array.isArray(extra) ? extra : [])])
}

const yarnOptions = computed(() => {
  const base = normalizeYarnMetaList(materials.value?.yarn)
  if (base.length === 0) return []

  // Include any legacy string selections as additional meta types so users don't lose them.
  const selectedRaw = normalizeStringList(component.value?.yarn)
  const idMap = yarnMetaIdMap(base)
  const unknownAsTypes = selectedRaw.filter((v) => !idMap.has(String(v ?? '').trim()))
  const effective = mergeYarnMetaWithTypes(base, unknownAsTypes)
  return yarnMetaOptions(effective)
})

const hookSuggestions = computed(() => {
  const fromProps = normalizeStringList(materials.value?.hook)
  const fromMeta = normalizeStringList(component.value?.metadata?.hook)
  const fromSelected = normalizeStringList(component.value?.hook)
  return mergeMaterialOptions(mergeMaterialOptions(fromProps, fromMeta), fromSelected)
})

const hasMaterialOptions = computed(() => {
  return yarnOptions.value.length > 0
    || hookSuggestions.value.length > 0
})

if (component.value.count == null) {
  component.value.count = 1
} else {
  const n = Math.floor(Number(component.value.count))
  component.value.count = Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : 1
}

function clampCount(value) {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return 1
  return Math.min(99, Math.max(1, n))
}

const countDraft = ref(1)

function resetCountDraft() {
  countDraft.value = clampCount(component.value?.count ?? 1)
}

function commitCountDraft() {
  const next = clampCount(countDraft.value)
  component.value.count = next
  countDraft.value = next
}

function handleUpdateCountDraft(nextValue) {
  const next = clampCount(nextValue)
  countDraft.value = next
  component.value.count = next
}

watch(
  () => props.component,
  () => resetCountDraft(),
  { immediate: true }
)

ensureRowTableFields()
</script>

<style scoped>
.rows-subsection {
  position: relative;
}

.rows-subsection__help {
  position: absolute;
  top: 1.7rem;
  right: 0;
}

.view-section {
  border-radius: 6px;
}

.subsection {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.label-wrapper {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 0.5rem;
}

.view-section-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #374151;
  font-weight: 600;
}

.view-list {
  margin: 1rem 0 0;
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

.component-metadata-subsection {
  margin-top: 1rem;
}

.component-yarn-amount-editor {
  margin-top: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: rgba(17, 24, 39, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
}

.component-yarn-amount-editor__title {
  color: #6b7280;
  font-size: 0.85rem;
  font-weight: 800;
  margin-bottom: 0.35rem;
}

.component-yarn-amount-editor__rows {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.35rem;
}

.component-yarn-amount-editor__row {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 0.45rem;
  align-items: center;
}

.component-yarn-amount-editor__type {
  min-width: 0;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.component-material-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: start;
}

.component-material-row--single {
  grid-template-columns: 1fr;
}

.component-metadata-view {
  margin: 0.75rem 0 0.25rem;
  padding: 0.65rem 0.8rem;
  background: rgba(17, 24, 39, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
}

.component-metadata-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.component-metadata-row + .component-metadata-row {
  margin-top: 0.35rem;
}

.component-metadata-label {
  color: #6b7280;
  font-size: 0.85rem;
  font-weight: 800;
  flex: none;
}

.component-metadata-value {
  color: #111827;
  font-size: 0.9rem;
  font-weight: 800;
  white-space: pre-line;
  word-break: break-word;
  text-align: right;
}

.component-count-editor {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
}

.component-count-text {
  font-size: 0.9rem;
  font-weight: 800;
  color: #374151;
  white-space: nowrap;
}

.component-count-number {
  display: flex;
  align-items: center;
}

.component-count-number__input {
  width: 96px;
  padding: 0.45rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 800;
  color: #111827;
  background: #fff;
}

.component-count-number__input:focus {
  outline: none;
  border-color: var(--color-icon-add);
  box-shadow: 0 0 0 2px rgb(var(--color-icon-add-rgb) / 0.12);
}
</style>
