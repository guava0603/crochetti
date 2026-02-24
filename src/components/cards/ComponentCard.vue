<template>
  <div class="component-card">
    <div class="card-header">
      <div class="card-title-row">
        <input
          v-if="isEditing"
          v-model="component.name"
          class="component-text component-title-row__name"
          type="text"
        />
        <h4 v-else class="component-title-row__name">{{ component.name }}</h4>

        <div
          v-if="!component.type || component.type === 'component'"
          class="component-title-row__cast-on"
        >
          <SelectionInput
            v-if="isEditing"
            v-model="component.content.type"
            :options="castOnOptions"
            :placeholder="t('project.castOnType')"
          />
          <div
            v-else-if="castOnLabel"
            class="component-cast-on-tag"
            :title="t('project.castOnType')"
          >
            {{ castOnLabel }}
          </div>
        </div>
      </div>
      <div class="card-actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Component Content (only for type 'component') -->
    <template v-if="!component.type || component.type === 'component'">
      <!-- Rows -->
      <div :class="isEditing ? 'subsection' : 'view-section'">
        <div v-if="isEditing" class="subsection-header">
          <h5>{{ t('common.rows') }}</h5>
        </div>

        <EditingTable
          v-if="isEditing"
          v-model="component.content.row_list"
          v-model:row-groups="component.content.row_groups"
        />
        <FixTable
          v-else
          :model-value="component.content.row_list"
          :row-groups="component.content.row_groups"
        />
      </div>

      <!-- Notes Section -->
      <div v-if="isEditing" class="subsection">
        <div class="subsection-header">
          <h5>{{ t('common.notes') }}</h5>
        </div>
        <ComponentMaterialField
          variant="notes"
          v-model:items="component.notes"
          input-type="textarea"
          :placeholder="t('common.noteDescriptionPlaceholder')"
          input-class="list-item-input"
          :rows="2"
          :get-text="(n) => n?.description"
          :set-text="(n, v) => ({ ...(n || {}), description: v })"
          @add="addNote"
          @remove="removeNote"
        />
      </div>
      <div v-else-if="component.notes && component.notes.length > 0" class="view-section" style="margin-top: 1rem;">
        <h5 class="view-section-title">{{ t('common.notes') }}</h5>
        <ul class="view-list">
          <li v-for="(note, nIndex) in component.notes" :key="nIndex">
            {{ note.description }}
          </li>
        </ul>
      </div>

      <!-- Materials (edit mode) -->
      <div v-if="isEditing" class="subsection component-metadata-subsection">
        <div class="subsection-header">
          <h5>{{ t('project.componentMetadata.title') }}</h5>
        </div>

        <div class="component-material-row">
          <ComponentMaterialField
            class="component-material-field--hook"
            v-model:items="component.hook"
            input-type="selection"
            :label="t('project.componentMetadata.hook')"
            :placeholder="t('project.componentMetadata.hookPlaceholder')"
            :suggestions="hookSuggestions"
            :item-key="(_, idx) => `hook-${idx}`"
            @add="addMaterialInput('hook')"
            @remove="(idx) => removeMaterialInput('hook', idx)"
            @item-blur="(idx) => handleMaterialBlur('hook', idx)"
          />

          <ComponentMaterialField
            class="component-material-field--yarn"
            v-model:items="component.yarn"
            input-type="selection"
            :label="t('project.componentMetadata.yarn')"
            :placeholder="t('project.componentMetadata.yarnPlaceholder')"
            :suggestions="yarnSuggestions"
            :item-key="(_, idx) => `yarn-${idx}`"
            @add="addMaterialInput('yarn')"
            @remove="(idx) => removeMaterialInput('yarn', idx)"
            @item-blur="(idx) => handleMaterialBlur('yarn', idx)"
          />
        </div>
      </div>

      <!-- Yarn / Hook (optional, view mode) -->
      <div
        v-if="!isEditing && (resolvedYarnList.length > 0 || resolvedHookList.length > 0)"
        class="component-metadata-view"
      >
        <div v-if="resolvedHookList.length > 0" class="component-metadata-row">
          <span class="component-metadata-label">{{ t('project.componentMetadata.hook') }}</span>
          <span class="component-metadata-value">{{ resolvedHookList.join(', ') }}</span>
        </div>
        <div v-if="resolvedYarnList.length > 0" class="component-metadata-row">
          <span class="component-metadata-label">{{ t('project.componentMetadata.yarn') }}</span>
          <span class="component-metadata-value">{{ resolvedYarnList.join(', ') }}</span>
        </div>
      </div>
    </template>

    <!-- Repeat count (edit mode, bottom of card) -->
    <div v-if="isEditing && (!component.type || component.type === 'component')" class="subsection component-count-subsection">
      <div class="component-count-editor">
        <span class="component-count-text">需要</span>
        <div class="component-count-number">
          <input
            v-model.trim="countDraft"
            class="component-count-number__input"
            type="number"
            inputmode="numeric"
            min="1"
            max="99"
            step="1"
            @blur="commitCountDraft"
            @keydown.enter.prevent="commitCountDraft"
            @keydown.esc.prevent="resetCountDraft"
          />
        </div>
        <span class="component-count-text">個</span>
      </div>
    </div>

    <!-- Bottom actions (edit mode) -->
    <div v-if="isEditing" class="subsection">
      <ButtonDelete
        class="component-remove-btn"
        :text="t('project.removeComponentAction')"
        :type="{ id: 'removeComponent', params: { name: component?.name || '' } }"
        @click="$emit('remove')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CastOn } from '@/constants/crochetData'
import EditingTable from '@/components/CrochetTable/EditingTable.vue'
import FixTable from '@/components/CrochetTable/FixTable.vue'
import ButtonDelete from '@/components/buttons/ButtonDelete.vue'
import ComponentMaterialField from '@/components/cards/ComponentMaterialField.vue'
import SelectionInput from '@/components/tools/SelectionInput.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  showEditActions: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['remove', 'confirm', 'cancel', 'update:component'])

const component = computed({
  get: () => props.component,
  set: (value) => emit('update:component', value)
})

const castOnOptions = computed(() => {
  return (CastOn || []).map((castOn) => ({
    value: castOn.index,
    label: t(castOn.nameKey)
  }))
})

const castOnLabel = computed(() => {
  const typeIndex = component.value?.content?.type
  if (typeIndex === null || typeIndex === undefined) return ''
  const option = castOnOptions.value.find((o) => o?.value === typeIndex)
  return option?.label || ''
})

if (!component.value.notes) {
  component.value.notes = []
}

function ensureNotesInputs() {
  if (!Array.isArray(component.value.notes)) component.value.notes = []

  // Normalize items.
  component.value.notes = component.value.notes
    .filter(Boolean)
    .map((n) => ({ description: String(n?.description ?? '') }))

  // Default: always show one input in edit mode.
  if (component.value.notes.length === 0) {
    component.value.notes.push({ description: '' })
  }
}

watch(
  () => props.isEditing,
  (editing) => {
    if (editing) ensureNotesInputs()
  },
  { immediate: true }
)

if (!component.value.metadata || typeof component.value.metadata !== 'object') {
  component.value.metadata = { yarn: [], hook: [] }
} else {
  if (component.value.metadata.yarn == null) component.value.metadata.yarn = []
  if (component.value.metadata.hook == null) component.value.metadata.hook = []
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
  // Legacy migration: old schema stored strings at component.metadata.yarn/hook
  const legacyYarn = typeof component.value?.metadata?.yarn === 'string' ? component.value.metadata.yarn : null
  const legacyHook = typeof component.value?.metadata?.hook === 'string' ? component.value.metadata.hook : null

  if (component.value.yarn == null) {
    component.value.yarn = legacyYarn ? normalizeStringList(legacyYarn) : []
  } else {
    component.value.yarn = normalizeStringList(component.value.yarn)
  }

  if (component.value.hook == null) {
    component.value.hook = legacyHook ? normalizeStringList(legacyHook) : []
  } else {
    component.value.hook = normalizeStringList(component.value.hook)
  }

  component.value.metadata.yarn = uniqueList(normalizeStringList(component.value.metadata.yarn))
  component.value.metadata.hook = uniqueList(normalizeStringList(component.value.metadata.hook))

  // Ensure at least one editable input.
  if (component.value.yarn.length === 0) component.value.yarn = ['']
  if (component.value.hook.length === 0) component.value.hook = ['']
}

ensureMaterialArrays()

function addUniqueInPlace(list, value) {
  const v = String(value || '').trim()
  if (!v) return
  if (!Array.isArray(list)) return
  if (!list.includes(v)) list.push(v)
}

const resolvedYarnList = computed(() => {
  const values = uniqueList(normalizeStringList(component.value?.yarn))
  if (values.length > 0) return values
  // Back-compat: show legacy string if present
  if (typeof component.value?.metadata?.yarn === 'string') return normalizeStringList(component.value.metadata.yarn)
  return uniqueList(normalizeStringList(component.value?.metadata?.yarn))
})

const resolvedHookList = computed(() => {
  const values = uniqueList(normalizeStringList(component.value?.hook))
  if (values.length > 0) return values
  if (typeof component.value?.metadata?.hook === 'string') return normalizeStringList(component.value.metadata.hook)
  return uniqueList(normalizeStringList(component.value?.metadata?.hook))
})

const yarnSuggestions = computed(() => {
  return uniqueList(normalizeStringList(component.value?.metadata?.yarn))
})

const hookSuggestions = computed(() => {
  return uniqueList(normalizeStringList(component.value?.metadata?.hook))
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

const countMode = ref('single')
const countDraft = ref('1')

function resetCountDraft() {
  countDraft.value = String(component.value?.count ?? 1)
}

function commitCountDraft() {
  const next = clampCount(countDraft.value)
  component.value.count = next
  countDraft.value = String(next)
}

function initCountModeFromComponent() {
  const n = Math.floor(Number(component.value?.count))
  countMode.value = Number.isFinite(n) && n > 1 ? 'multiple' : 'single'
  resetCountDraft()
}

watch(
  () => props.component,
  () => {
    initCountModeFromComponent()
  },
  { immediate: true }
)

function addMaterialInput(kind) {
  ensureMaterialArrays()
  if (kind === 'yarn') component.value.yarn.push('')
  if (kind === 'hook') component.value.hook.push('')
}

function removeMaterialInput(kind, idx) {
  ensureMaterialArrays()
  const list = kind === 'yarn' ? component.value.yarn : component.value.hook
  if (!Array.isArray(list)) return

  if (list.length <= 1) {
    list[0] = ''
    return
  }

  list.splice(idx, 1)
  ensureMaterialArrays()
}

function handleMaterialBlur(kind, idx) {
  ensureMaterialArrays()
  const list = kind === 'yarn' ? component.value.yarn : component.value.hook
  const value = String(list?.[idx] || '').trim()
  if (value) {
    list[idx] = value
    if (kind === 'yarn') addUniqueInPlace(component.value.metadata.yarn, value)
    if (kind === 'hook') addUniqueInPlace(component.value.metadata.hook, value)
  }
}

// Ensure grouped-row metadata exists for component parts
if (component.value?.content && component.value?.type === 'component') {
  if (!Array.isArray(component.value.content.row_groups)) {
    component.value.content.row_groups = []
  }
}

const addNote = () => {
  ensureNotesInputs()
  component.value.notes.push({ description: '' })
}

const removeNote = (index) => {
  ensureNotesInputs()
  component.value.notes.splice(index, 1)
  ensureNotesInputs()
}

</script>

<style scoped>
.component-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.card-title-row {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px;
  gap: 0.5rem;
  align-items: center;
}

.card-header h4 {
  margin: 0;
  color: #111827;
}


.component-title-row__name {
  min-width: 0;
}

.component-title-row__cast-on {
  min-width: 0;
}

.component-cast-on-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.component-metadata-subsection {
  margin-top: 1rem;
}

.component-material-row {
  display: grid;
  grid-template-columns: 40% 1fr;
  gap: 0.75rem;
  align-items: start;
}

.component-metadata-view {
  margin: 0.75rem 0 0.25rem;
  padding: 0.65rem 0.8rem;
  background: rgba(17, 24, 39, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
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

.component-count-mode {
  display: inline-flex;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  overflow: hidden;
  background: #fff;
}

.component-count-mode__btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 800;
  color: #374151;
  cursor: pointer;
}

.component-count-mode__btn.is-active {
  background: #42b983;
  color: #fff;
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
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.12);
}

.component-metadata-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
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
  word-break: break-word;
  text-align: right;
}

.view-section {
  /* background: white; */
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

.component-text {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  resize: vertical;
}

.component-text:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.12);
}

:deep(.component-remove-btn) {
  min-width: 84px;
  height: 32px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
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
</style>
