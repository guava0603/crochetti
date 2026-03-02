<template>
  <div class="add-project-info">

    <form @submit.prevent="handleNext" class="step-form">
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

      <div v-if="error" class="error">
        {{ error }}
      </div>

      <div class="button-group">
        <button type="submit" class="btn-primary">
          {{ $t('addProject.common.next') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { useI18n } from 'vue-i18n'
import ImageUploader from '@/components/Input/ImageUploader.vue'

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

const emit = defineEmits(['next'])

const formData = ref({
  name: props.initialData.name || '',
  description: props.initialData.description || '',
  image_files: Array.isArray(props.initialData.image_files) ? props.initialData.image_files : []
})

const error = ref(null)

const handleNext = () => {
  if (!formData.value.name.trim()) {
    error.value = t('addProject.info.errors.projectNameRequired')
    return
  }

  error.value = null
  emit('next', formData.value)
}
</script>

<style scoped>
.add-project-info {
  max-width: 600px;
  margin: 0 auto;
}
</style>
