<template>
  <div class="add-project-info">

    <form @submit.prevent="handleNext" class="step-form">
      <div class="form-group">
        <label for="projectName">Project Name *</label>
        <input
          id="projectName"
          v-model="formData.name"
          type="text"
          placeholder="Enter project name"
          required
        />
      </div>

      <div class="form-group">
        <label for="projectDescription">Description</label>
        <textarea
          id="projectDescription"
          v-model="formData.description"
          placeholder="Enter project description (optional)"
          rows="5"
        ></textarea>
      </div>

      <div v-if="error" class="error">
        {{ error }}
      </div>

      <div class="button-group">
        <button type="submit" class="btn-primary">
          Next
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'

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
    error.value = 'Project name is required'
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
