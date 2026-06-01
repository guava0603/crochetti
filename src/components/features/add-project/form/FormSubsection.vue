<template>
  <div :class="wrapperClass">
    <div
      v-if="showHeaderComputed"
      class="subsection-header"
      :class="headerClass || undefined"
    >
      <div class="label-wrapper">
        <div v-if="resolvedTitle" class="subsection-title">{{ resolvedTitle }}</div>
        <span v-if="required" class="required-badge">必填</span>
      </div>
    </div>

    <FormSubsectionInputContent v-if="resolvedKind === 'slot'">
      <slot />
    </FormSubsectionInputContent>

    <FormSubsectionInputContent v-else-if="resolvedKind === 'text'">
      <input
        :id="forId || undefined"
        :type="inputType"
        :placeholder="resolvedPlaceholder"
        :required="required"
        :disabled="disabled"
        v-bind="inputAttrs"
        :value="textValue"
        @input="onTextInput"
      />
    </FormSubsectionInputContent>

    <FormSubsectionInputContent v-else-if="resolvedKind === 'textarea'">
      <LimitedTextArea
        :id="forId || undefined"
        :model-value="textValue"
        :placeholder="resolvedPlaceholder"
        :rows="rows"
        :disabled="disabled"
        v-bind="inputAttrs"
        @update:modelValue="(v) => emit('update:modelValue', v)"
      />
    </FormSubsectionInputContent>

    <FormSubsectionInputContent
      v-else-if="resolvedKind === 'notes'"
      repeatable
      :items="notesItemsModel"
      :show-delete="!disabled"
      :show-add="canAddNote"
      :disabled="disabled"
      :add-aria-label="t('common.add')"
      :delete-aria-label="t('common.delete')"
      @add="addNote"
      @delete="removeNoteAt"
    >
      <template #item="{ item, idx }">
        <LimitedTextArea
          :model-value="String(item ?? '')"
          :placeholder="resolvedPlaceholder"
          :rows="notesRows"
          :disabled="disabled"
          :class="notesInputClass || undefined"
          @update:modelValue="(v) => updateNoteAt(idx, v)"
          @blur="() => handleNoteBlur(idx)"
        />
      </template>
    </FormSubsectionInputContent>

    <FormSubsectionInputContent v-else-if="resolvedKind === 'multi-select'">
      <MultipleSelectionList
        :model-value="multiSelectModel"
        :options="multiSelectOptions"
        :suggestions="multiSelectSuggestions"
        :placeholder="resolvedPlaceholder"
        :aria-label="resolvedMultiSelectAriaLabel"
        @update:modelValue="(v) => emit('update:modelValue', Array.isArray(v) ? v : [])"
      />
    </FormSubsectionInputContent>

    <FormSubsectionInputContent
      v-else-if="resolvedKind === 'images'"
      wrapper-class="existing-images"
    >
      <div
        class="existing-images"
        :aria-label="t('image.existingImages')"
      >
        <div class="existing-images__grid">
          <ImageBox
            v-for="(url, idx) in existingImageUrls"
            :key="`${idx}-${url}`"
            class="existing-images__item"
            :image-url="url"
            alt=""
            :aria-label="t('image.openImage')"
            :openable="true"
            :show-delete="true"
            :delete-aria-label="t('common.delete')"
            :stop-propagation="true"
            @delete="emit('remove-existing-image', idx)"
          />

          <ImageUploader
            v-model="imageFilesModel"
            :max="remainingUploadSlots"
            accept="image/*"
            multiple
            :remove-text="t('addProject.info.removeImage')"
            :max-error-text="t('addProject.info.errors.maxImages', { max: resolvedMaxImages })"
            :alt-text-for-index="(i) => t('addProject.info.imageAlt', { n: i + 1 })"
            :disabled="remainingUploadSlots <= 0 || disabled"
            use-parent-grid
          />
        </div>
      </div>
    </FormSubsectionInputContent>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormSubsectionInputContent from '@/components/features/add-project/form/FormSubsectionInputContent.vue'
import ImageUploader from '@/components/shared/inputs/ImageUploader.vue'
import LimitedTextArea from '@/components/shared/inputs/LimitedTextArea.vue'
import MultipleSelectionList from '@/components/shared/selection/MultipleSelectionList.vue'
import ImageBox from '@/components/shared/image/ImageBox.vue'

defineOptions({ name: 'FormSubsection' })

const props = defineProps({
  wrapperClass: { type: String, default: 'form-group' },
  headerClass: { type: String, default: '' },
  showHeader: { type: Boolean, default: true },

  title: { type: String, default: '' },
  forId: { type: String, default: '' },

  required: { type: Boolean, default: false },

  kind: {
    type: String,
    default: 'text',
    validator: (v) => ['header', 'slot', 'text', 'textarea', 'images', 'notes', 'multi-select'].includes(v)
  },

  modelValue: { type: [String, Number, Array, Object], default: '' },
  placeholder: { type: String, default: '' },

  inputType: { type: String, default: 'text' },
  rows: { type: Number, default: 3 },
  disabled: { type: Boolean, default: false },

  inputAttrs: { type: Object, default: () => ({}) },

  // images
  existingImages: { type: Array, default: () => [] },
  maxImages: { type: Number, default: 3 },

  // notes
  notesRows: { type: Number, default: 2 },
  notesInputClass: { type: String, default: 'list-item-input textarea-soft' },

  // multi-select
  options: { type: Array, default: () => [] },
  suggestions: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits([
  'update:modelValue',
  'remove-existing-image',
  'update:component-list'
])

const { t } = useI18n({ useScope: 'global' })

const resolvedKind = computed(() => String(props.kind || 'text'))

const resolvedTitle = computed(() => {
  return String(props.title || '').trim()
})

const resolvedPlaceholder = computed(() => {
  return String(props.placeholder || '').trim()
})

const showHeaderComputed = computed(() => {
  if (!props.showHeader) return false
  if (resolvedKind.value === 'slot' && !resolvedTitle.value && !props.required) return false
  if (resolvedKind.value === 'images' && !resolvedTitle.value && !props.required) return false
  if (resolvedKind.value === 'text' && !resolvedTitle.value && !props.required) return false
  if (resolvedKind.value === 'textarea' && !resolvedTitle.value && !props.required) return false
  if (resolvedKind.value === 'notes' && !resolvedTitle.value && !props.required) return false
  if (resolvedKind.value === 'multi-select' && !resolvedTitle.value && !props.required) return false
  return Boolean(resolvedTitle.value || props.required || resolvedKind.value === 'header')
})

const textValue = computed(() => String(props.modelValue ?? ''))

function onTextInput(e) {
  emit('update:modelValue', e?.target?.value ?? '')
}

const resolvedMaxImages = computed(() => {
  const n = Math.floor(Number(props.maxImages))
  return Number.isFinite(n) ? Math.max(1, n) : 3
})

const existingImageUrls = computed(() => {
  const list = Array.isArray(props.existingImages) ? props.existingImages : []
  return list
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, resolvedMaxImages.value)
})

const remainingUploadSlots = computed(() => {
  return Math.max(0, resolvedMaxImages.value - existingImageUrls.value.length)
})

const imageFilesModel = computed({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : []
  },
  set(next) {
    emit('update:modelValue', Array.isArray(next) ? next : [])
  }
})

function normalizeNotesList(value) {
  const list = Array.isArray(value) ? value : []
  return list
    .filter((n) => n != null)
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
    .map((n) => String(n ?? ''))
}

const notesItemsModel = computed({
  get() {
    return normalizeNotesList(props.modelValue)
  },
  set(next) {
    emit('update:modelValue', normalizeNotesList(next))
  }
})

function trimTrailingEmptyNotesInPlace(list) {
  const xs = Array.isArray(list) ? list : []
  let end = xs.length
  while (end > 0 && String(xs[end - 1] ?? '').trim() === '') end -= 1
  return xs.slice(0, end)
}

function handleNoteBlur(idx) {
  const list = notesItemsModel.value
  const i = Number(idx)
  if (!Number.isFinite(i)) return
  if (i !== list.length - 1) return
  if (String(list[i] ?? '').trim() !== '') return
  notesItemsModel.value = trimTrailingEmptyNotesInPlace(list)
}

const canAddNote = computed(() => {
  const list = notesItemsModel.value
  if (!Array.isArray(list) || list.length === 0) return true
  return String(list[list.length - 1] ?? '').trim().length > 0
})

function addNote() {
  const list = notesItemsModel.value
  if (list.length > 0 && String(list[list.length - 1] ?? '').trim() === '') return
  notesItemsModel.value = [...list, '']
}

function updateNoteAt(idx, nextValue) {
  const list = Array.isArray(notesItemsModel.value) ? notesItemsModel.value : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next[i] = String(nextValue ?? '')
  notesItemsModel.value = next
}

function removeNoteAt(idx) {
  const list = Array.isArray(notesItemsModel.value) ? notesItemsModel.value : []
  const i = Number(idx)
  if (!Number.isFinite(i) || i < 0 || i >= list.length) return
  const next = list.slice()
  next.splice(i, 1)
  notesItemsModel.value = next
}

const multiSelectModel = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const multiSelectOptions = computed(() => (Array.isArray(props.options) ? props.options : []))

const multiSelectSuggestions = computed(() => (Array.isArray(props.suggestions) ? props.suggestions : []))

const resolvedMultiSelectAriaLabel = computed(() => {
  return String(props.ariaLabel || '').trim()
})

</script>

<style scoped>
.subsection {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.existing-images {
  margin-bottom: 0.75rem;
}

.existing-images__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.existing-images__item {
  width: 100%;
  border: 0.1rem solid var(--color-border);
  border-radius: 0.8rem;
}


.subsection-title {
  font-size: 1rem;
  color: #374151;
  font-weight: 600;
}
</style>
