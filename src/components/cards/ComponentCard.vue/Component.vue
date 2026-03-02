<template>
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

  <!-- Repeat count (edit mode, bottom of card) -->
  <div v-if="isEditing" class="subsection component-count-subsection">
    <div class="component-count-editor">
      <span class="component-count-text">需要</span>
      <div class="component-count-number">
        <InputNumber
          :model-value="countDraft"
          size="sm"
          class="component-count-number__input"
          :min="1"
          :max="99"
          @update:model-value="handleUpdateCountDraft"
          @close="commitCountDraft"
        />
      </div>
      <span class="component-count-text">個</span>
    </div>
  </div>

  <!-- Image upload (edit mode, at most one image) -->
  <div v-if="isEditing" class="subsection component-image-subsection">
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

      <div v-if="imageUploadError" class="error">
        {{ imageUploadError }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebaseConfig'
import EditingTable from '@/components/CrochetTable/EditingTable.vue'
import FixTable from '@/components/CrochetTable/FixTable.vue'
import ComponentMaterialField from '@/components/cards/ComponentMaterialField.vue'
import ImageUploader from '@/components/Input/ImageUploader.vue'
import InputNumber from '@/components/Input/InputNumber.vue'

const { t } = useI18n({ useScope: 'global' })

defineOptions({
  name: 'ComponentCardComponent'
})

const props = defineProps({
  component: {
    type: Object,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  }
})

const component = computed(() => props.component)
const isEditing = computed(() => props.isEditing)

function ensureNotesInputs() {
  if (!Array.isArray(component.value.notes)) component.value.notes = []

  component.value.notes = component.value.notes
    .filter(Boolean)
    .map((n) => ({ description: String(n?.description ?? '') }))

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

const imageFiles = ref([])
const imageUploading = ref(false)
const imageUploadError = ref('')
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

    imageUploadError.value = ''
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
      imageUploadError.value = t('project.componentImage.uploadFailed')
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
  imageUploadError.value = ''
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
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.12);
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
