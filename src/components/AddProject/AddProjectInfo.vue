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

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({
      name: '',
      description: ''
    })
  }
})

const emit = defineEmits(['next'])

const formData = ref({
  name: props.initialData.name || '',
  description: props.initialData.description || ''
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
