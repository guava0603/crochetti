<template>
  <div class="image-uploader">
    <input
      :id="inputId"
      ref="inputRef"
      class="image-uploader__input"
      type="file"
      :accept="accept"
      :multiple="multiple"
      @change="handleChange"
    />

    <div class="image-preview-uploader-conteiner">
      <div
        v-for="slotIdx in slotIndices"
        :key="slotIdx"
        class="image-preview-item"
        :class="{ 'image-preview-item--empty': slotIdx == previews.length }"
      >
        <template v-if="slotIdx < previews.length">
          <ImageBox
            class="image-preview"
            :image-url="previews[slotIdx].url"
            :alt="getAltText(slotIdx)"
            :aria-label="getAltText(slotIdx)"
            :disabled="disabled"
            :openable="true"
            :stop-propagation="true"
            :show-delete="true"
            :delete-aria-label="removeText"
            @delete="removeAt(slotIdx)"
          />
        </template>

        <button
          v-else-if="slotIdx === previews.length"
          type="button"
          class="image-preview-upload"
          :disabled="disabled"
          @click="openFileDialog"
        >
          <ButtonUploadImage class="image-preview-upload__icon" />
        </button>
      </div>
    </div>

    <div v-if="localError" class="image-uploader__error">{{ localError }}</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ButtonUploadImage from '@/components/buttons/svg/ButtonUploadImage.vue'
import ImageBox from '@/components/Image/ImageBox.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  max: {
    type: Number,
    default: 3
  },
  accept: {
    type: String,
    default: 'image/*'
  },
  multiple: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  buttonText: {
    type: String,
    default: 'Upload'
  },
  hint: {
    type: String,
    default: ''
  },
  removeText: {
    type: String,
    default: 'Remove'
  },
  altTextForIndex: {
    type: Function,
    default: null
  },
  maxErrorText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)
const localError = ref('')

const inputId = computed(() => `image-uploader-${Math.random().toString(36).slice(2, 10)}`)

const previews = ref([])

const slotIndices = computed(() => {
  const max = Number.isFinite(props.max) ? props.max : 3
  return Array.from({ length: Math.max(0, max) }, (_, i) => i)
})

function revokePreviews(list) {
  const arr = Array.isArray(list) ? list : []
  for (const p of arr) {
    try {
      if (p?.url) URL.revokeObjectURL(p.url)
    } catch {
      // ignore
    }
  }
}

function syncPreviews(files) {
  revokePreviews(previews.value)
  previews.value = files
    .filter((f) => f instanceof File)
    .slice(0, props.max)
    .map((f, idx) => ({
      key: `${idx}-${f.name}-${f.size}-${f.lastModified}`,
      url: URL.createObjectURL(f)
    }))
}

function getNormalizedFiles(value) {
  const arr = Array.isArray(value) ? value : []
  return arr.filter((f) => f instanceof File)
}

function openFileDialog() {
  if (props.disabled) return
  inputRef.value?.click?.()
}

function handleChange(e) {
  const input = e?.target
  const picked = Array.from(input?.files || [])
    .filter((f) => f && typeof f.type === 'string' && f.type.startsWith('image/'))

  const current = getNormalizedFiles(props.modelValue)
  const next = [...current, ...picked]

  const max = Number.isFinite(props.max) ? props.max : 3
  if (next.length > max) {
    localError.value = props.maxErrorText || `You can upload up to ${max} images.`
  } else {
    localError.value = ''
  }

  const merged = next.slice(0, max)
  emit('update:modelValue', merged)

  // allow selecting the same file again
  if (input) input.value = ''
}

function removeAt(idx) {
  const current = getNormalizedFiles(props.modelValue)
  emit(
    'update:modelValue',
    current.filter((_, i) => i !== idx)
  )
}

function getAltText(idx) {
  if (typeof props.altTextForIndex === 'function') return props.altTextForIndex(idx)
  return `Image ${idx + 1}`
}

watch(
  () => props.modelValue,
  (value) => {
    syncPreviews(getNormalizedFiles(value))
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  revokePreviews(previews.value)
})
</script>

<style scoped>
.image-uploader__input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.image-uploader__button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed var(--color-border-warm);
  border-radius: 10px;
  background: var(--color-surface-page);
  color: #111827;
  cursor: pointer;
  font-weight: 600;
}

.image-uploader__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-uploader__icon {
  width: 22px;
  height: 22px;
}

.image-uploader__hint {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #6b7280;
}

.image-preview-uploader-conteiner {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.image-preview-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.75);
  overflow: hidden;
}

.image-preview {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  border: 1px solid var(--color-border-warm);
}

.image-preview-item--empty {
  border-radius: 10px;
  border: 1px dashed var(--color-border-warm);
  background: rgba(255, 255, 255, 0.75);
}

.image-preview-upload {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
}

.image-preview-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-preview-upload__icon {
  width: 26px;
  height: 26px;
}

.image-uploader__error {
  margin-top: 12px;
  color: #dc3545;
  padding: 0.75rem;
  background: #f8d7da;
  border-radius: 4px;
}
</style>
