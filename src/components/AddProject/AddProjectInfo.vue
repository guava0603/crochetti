<template>
  <div class="add-project-info">

    <form @submit.prevent="handleNext" class="step-form" :style="stepFormStyle">
      <div class="form-group">
        <label for="projectName">{{ $t('addProject.info.projectNameLabel') }} *</label>
        <input
          id="projectName"
          v-model="formData.name"
          type="text"
          :placeholder="$t('addProject.info.projectNamePlaceholder')"
          required
        />
      </div>

      <div class="form-group">
        <label for="projectDescription">{{ $t('addProject.info.descriptionLabel') }}</label>
        <textarea
          id="projectDescription"
          v-model="formData.description"
          :placeholder="$t('addProject.info.descriptionPlaceholder')"
          rows="5"
        ></textarea>
      </div>

      <div class="form-group">
        <label>{{ $t('addProject.info.imagesLabel') }}</label>
        <ImageUploader
          v-model="formData.image_files"
          :max="3"
          accept="image/*"
          multiple
          :button-text="$t('addProject.info.imagesLabel')"
          :hint="$t('addProject.info.imagesHint', { max: 3 })"
          :remove-text="$t('addProject.info.removeImage')"
          :max-error-text="$t('addProject.info.errors.maxImages', { max: 3 })"
          :alt-text-for-index="(i) => $t('addProject.info.imageAlt', { n: i + 1 })"
        />
      </div>
    </form>

    <div
      ref="bottomToolbarEl"
      class="button-group-fixed"
      role="region"
      :aria-label="$t('addProject.info.submitBarAria')"
    >
      <div class="button-group button-group-fixed__inner">
        <button type="button" class="btn-primary" @click="handleNext">
          {{ $t('addProject.common.next') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ImageUploader from '@/components/Input/ImageUploader.vue'
import { useBottomToolbarPadding } from './useBottomToolbarPadding'
import { openError } from '@/services/ui/error'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({
      name: '',
      description: '',
      image_files: []
    })
  }
})

const emit = defineEmits(['next', 'dirty-change'])

const formData = ref({
  name: props.initialData.name || '',
  description: props.initialData.description || '',
  image_files: Array.isArray(props.initialData.image_files) ? props.initialData.image_files : []
})

function normalizeImageList(value) {
  const list = Array.isArray(value) ? value : []
  return list
    .filter(Boolean)
    .map((x) => {
      if (typeof File !== 'undefined' && x instanceof File) return `file:${x.name}:${x.size}`
      return String(x)
    })
}

const initialSnapshot = {
  name: String(props.initialData?.name || ''),
  description: String(props.initialData?.description || ''),
  images: normalizeImageList(props.initialData?.image_files)
}

const isDirty = computed(() => {
  const name = String(formData.value?.name || '')
  const description = String(formData.value?.description || '')
  const images = normalizeImageList(formData.value?.image_files)
  if (name !== initialSnapshot.name) return true
  if (description !== initialSnapshot.description) return true
  return JSON.stringify(images) !== JSON.stringify(initialSnapshot.images)
})

watch(
  () => formData.value,
  () => {
    emit('dirty-change', Boolean(isDirty.value))
  },
  { deep: true, immediate: true }
)

const { bottomToolbarEl, stepFormStyle } = useBottomToolbarPadding()

const handleNext = () => {
  if (!formData.value.name.trim()) {
    openError({ title: t('common.error'), message: t('addProject.info.errors.projectNameRequired') })
    return
  }
  emit('next', formData.value)
}
</script>

<style scoped>
.add-project-info {
  max-width: 600px;
  margin: 0 auto;
}

:deep(.button-group-fixed__inner.button-group) {
  justify-content: flex-end;
}
</style>
