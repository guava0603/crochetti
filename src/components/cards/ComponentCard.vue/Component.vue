<template>
  <!-- Rows -->
  <div :class="isEditing ? 'subsection' : 'view-section'">
    <div v-if="isEditing" class="subsection-header">
      <div class="label-wrapper">
        <h5>{{ t('common.rows') }}</h5>
        <span class="required-badge">必填</span>
      </div>
      <HelpIconButton
        topic-id="crochetTableBasics"
        :aria-label="t('help.crochetTableBasics.aria')"
      />
    </div>

    <EditingTable
      v-if="isEditing"
      v-model="rowListModel"
      v-model:row-groups="rowGroupsModel"
      :help-topic-id="helpTopicId"
      :help-topic-ids="helpTopicIds"
    />
    <FixTable
      v-else
      :model-value="rowListModel"
      :row-groups="rowGroupsModel"
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
      :get-text="(n) => n"
      :set-text="(_n, v) => String(v ?? '')"
      @add="addNote"
      @remove="removeNote"
      @item-blur="(idx) => handleNoteBlur(idx)"
    />
  </div>
  <div v-else-if="displayNotes.length > 0" class="view-section" style="margin-top: 1rem;">
    <h5 class="view-section-title">{{ t('common.notes') }}</h5>
    <ul class="view-list">
      <li v-for="(note, nIndex) in displayNotes" :key="nIndex">
        {{ note }}
      </li>
    </ul>
  </div>

  <!-- Materials (edit mode) -->
  <div v-if="isEditing && hasMaterialOptions" class="subsection component-metadata-subsection">
    <div class="subsection-header">
      <h5>{{ t('project.componentMetadata.title') }}</h5>
    </div>

    <div class="component-material-row" :class="{ 'component-material-row--single': isSingleMaterialField }">
      <div v-if="hookSuggestions.length" class="component-material-field">
        <div class="component-material-field__label">{{ t('project.componentMetadata.hook') }}</div>
        <MultipleSelectionList
          :model-value="component.hook"
          :suggestions="hookSuggestions"
          :placeholder="t('project.componentMetadata.hookPlaceholder')"
          @update:modelValue="(v) => (component.hook = Array.isArray(v) ? v : [])"
        />
      </div>

      <div v-if="yarnOptions.length" class="component-material-field">
        <div class="component-material-field__label">{{ t('project.componentMetadata.yarn') }}</div>
        <MultipleSelectionList
          :model-value="component.yarn"
          :options="yarnOptions"
          :placeholder="t('project.componentMetadata.yarnPlaceholder')"
          @update:modelValue="(v) => (component.yarn = Array.isArray(v) ? v : [])"
        />
      </div>
    </div>
  </div>

  <!-- Yarn / Hook (optional, view mode) -->
  <div
    v-if="!isEditing && (resolvedYarnList.length > 0 || resolvedHookList.length > 0)"
    class="component-metadata-view"
  >
    <div v-if="resolvedHookList.length > 0" class="component-metadata-row">
      <span class="component-metadata-label">{{ t('project.componentMetadata.hook') }}</span>
      <span class="component-metadata-value">{{ resolvedHookList.join('\n') }}</span>
    </div>
    <div v-if="resolvedYarnList.length > 0" class="component-metadata-row">
      <span class="component-metadata-label">{{ t('project.componentMetadata.yarn') }}</span>
      <span class="component-metadata-value">{{ resolvedYarnList.join('\n') }}</span>
    </div>
  </div>

  <!-- Repeat count (edit mode, bottom of card) -->
  <div v-if="isEditing" class="subsection component-count-subsection">
    <div class="component-count-editor">
      <span class="component-count-text">{{ t('project.makeCountLabel') }}</span>
      <div class="component-count-number">
        <InputNumber
          :model-value="countDraft"
          :auto-focus="false"
          size="sm"
          class="component-count-number__input"
          :min="1"
          :max="99"
          @update:model-value="handleUpdateCountDraft"
          @close="commitCountDraft"
        />
      </div>
    </div>
  </div>

  <!-- Image upload (edit mode, at most one image) -->
  <div v-if="false && isEditing" class="subsection component-image-subsection">
    <div class="subsection-header">
      <h5>{{ t('project.componentImage.uploadLabel') }}</h5>
    </div>

    <div class="component-image-uploader">
      <ImageUploader
        v-model="imageFiles"
        :max="1"
        accept="image/*"
        :multiple="false"
        :disabled="imageUploading"
        :button-text="t('project.componentImage.uploadLabel')"
        :remove-text="t('common.delete')"
        :max-error-text="t('addProject.info.errors.maxImages', { max: 1 })"
        :alt-text-for-index="(i) => t('project.componentImage.imageAlt', { n: i + 1 })"
      />

      <div v-if="imageUploading" class="component-image-status">
        {{ t('project.componentImage.uploading') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HelpIconButton from '@/components/help/HelpIconButton.vue'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebaseConfig'
import EditingTable from '@/components/CrochetTable/EditingTable.vue'
import FixTable from '@/components/CrochetTable/FixTable.vue'
import ComponentMaterialField from '@/components/cards/ComponentMaterialField.vue'
import MultipleSelectionList from '@/components/Selection/MultipleSelectionList.vue'
import ImageUploader from '@/components/Input/ImageUploader.vue'
import InputNumber from '@/components/Input/InputNumber.vue'
import { openError } from '@/services/ui/error'
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
  helpTopicId: {
    type: String,
    default: ''
  },
  helpTopicIds: {
    type: Object,
    default: null
  }
})

const component = computed(() => props.component)
const materials = computed(() => props.materials)
const isEditing = computed(() => props.isEditing)
const helpTopicId = computed(() => props.helpTopicId)
const helpTopicIds = computed(() => props.helpTopicIds)

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

function ensureNotesInputs() {
  if (!Array.isArray(component.value.notes)) component.value.notes = []

  component.value.notes = component.value.notes
    .filter((n) => n != null)
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
    .map((n) => String(n ?? ''))

}

function trimTrailingEmptyNotesInPlace() {
  ensureNotesInputs()
  const list = Array.isArray(component.value.notes) ? component.value.notes : []
  let end = list.length
  while (end > 0 && String(list[end - 1] ?? '').trim() === '') end -= 1
  component.value.notes = list.slice(0, end)
}

function handleNoteBlur(idx) {
  ensureNotesInputs()
  const list = Array.isArray(component.value.notes) ? component.value.notes : []
  const i = Number(idx)
  if (!Number.isFinite(i)) return
  if (i !== list.length - 1) return
  if (String(list[i] ?? '').trim() !== '') return
  trimTrailingEmptyNotesInPlace()
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
  const baseYarnMeta = normalizeYarnMetaList(materials.value?.yarn)
  const baseYarnIdMap = yarnMetaIdMap(baseYarnMeta)

  const legacyYarn = typeof component.value?.metadata?.yarn === 'string' ? component.value.metadata.yarn : null
  const legacyHook = typeof component.value?.metadata?.hook === 'string' ? component.value.metadata.hook : null

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

  component.value.metadata.yarn = Array.isArray(component.value.yarn) ? component.value.yarn : []
  component.value.metadata.hook = uniqueList(normalizeStringList(component.value.metadata.hook))

}

ensureMaterialArrays()

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

  const out = []
  const seen = new Set()
  for (const rawId of Array.isArray(ids) ? ids : []) {
    const id = String(rawId ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const meta = idMap.get(id)
    const type = String(meta?.type ?? '').trim()
    out.push(type || id)
  }
  return out
})

const resolvedHookList = computed(() => {
  const values = uniqueList(normalizeStringList(component.value?.hook))
  if (values.length > 0) return values
  if (typeof component.value?.metadata?.hook === 'string') return normalizeStringList(component.value.metadata.hook)
  return uniqueList(normalizeStringList(component.value?.metadata?.hook))
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

const hasMaterialOptions = computed(() => yarnOptions.value.length > 0 || hookSuggestions.value.length > 0)

const isSingleMaterialField = computed(() => {
  const count = (hookSuggestions.value.length > 0 ? 1 : 0) + (yarnOptions.value.length > 0 ? 1 : 0)
  return count <= 1
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

const addNote = () => {
  ensureNotesInputs()
  component.value.notes.push('')
}

const removeNote = (index) => {
  ensureNotesInputs()
  component.value.notes.splice(index, 1)
  ensureNotesInputs()
}

const imageFiles = ref([])
const imageUploading = ref(false)
const lastUploadedSignature = ref('')

function safeFileName(name) {
  const raw = String(name || 'image')
  return raw.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'image'
}

function fileSignature(file) {
  if (!(file instanceof File)) return ''
  return `${file.name}-${file.size}-${file.lastModified}`
}

watch(
  () => imageFiles.value,
  async (files) => {
    const file = Array.isArray(files) ? files[0] : null

    if (!file) {
      // If the user removed the file in the uploader, also clear the saved URL.
      lastUploadedSignature.value = ''
      if (component.value?.image) removeImage()
      return
    }

    const sig = fileSignature(file)
    if (sig && sig === lastUploadedSignature.value && component.value?.image) return

    imageUploading.value = true

    try {
      const componentId = String(component.value?.id || '').trim() || 'unknown'
      const path = `component-images/${componentId}/${Date.now()}-${safeFileName(file.name)}`
      const fileRef = storageRef(storage, path)

      await uploadBytes(fileRef, file, {
        contentType: file.type || undefined
      })

      const url = await getDownloadURL(fileRef)
      component.value.image = url
      lastUploadedSignature.value = sig
    } catch (error) {
      console.warn('component image upload failed', error)
      openError({ title: t('common.error'), message: t('project.componentImage.uploadFailed') })
    } finally {
      imageUploading.value = false
    }
  },
  { immediate: true }
)

function removeImage() {
  if (!component.value || typeof component.value !== 'object') return
  if ('image' in component.value) delete component.value.image
  imageFiles.value = []
  lastUploadedSignature.value = ''
}
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

.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.subsection-header h5 {
  margin: 0;
  font-weight: 500;
  font-size: 1rem;
}

.label-wrapper {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 0.5rem;
}

.required-badge {
  background: var(--color-surface-accent);
  color: var(--color-font-invisible);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.6rem;
  border-radius: 0.5rem;
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

.component-metadata-subsection {
  margin-top: 1rem;
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

.component-material-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.component-material-field__label {
  font-size: 0.85rem;
  font-weight: 800;
  color: #6b7280;
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

.component-image-uploader {
  display: grid;
  gap: 0.75rem;
}

.component-image-status {
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 700;
}

.component-image-preview {
  display: grid;
  gap: 0.5rem;
}

.component-image-preview__img {
  width: 100%;
  max-height: 260px;
  object-fit: contain;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
}

.component-image-preview__remove {
  justify-self: start;
}
</style>
