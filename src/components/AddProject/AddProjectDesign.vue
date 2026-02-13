<template>
  <div class="add-project-design">

    <form @submit.prevent="handleSubmit" class="step-form">
      <div class="form-section">

        <div class="form-group">
          <label>
            <input type="checkbox" v-model="projectData.is_public" />
            Make project public
          </label>
        </div>
      </div>

      <!-- Components -->
      <div class="form-section">
        <div class="section-header">
          <h3>Components</h3>
        </div>

        <ComponentCard
          v-for="(component, cIndex) in projectData.component_list"
          :key="cIndex"
          :component="component"
          :is-editing="true"
          @remove="removeComponent(cIndex)"
        />

        <!-- Add Component Type Selector -->
        <div class="add-component-selector">
          <button type="button" @click="addComponentOfType('component')" class="btn-add-type">
            + Component
          </button>
          <button type="button" @click="addComponentOfType('stitch')" class="btn-add-type">
            + Stitch
          </button>
        </div>
      </div>

      <div v-if="error" class="error">
        {{ error }}
      </div>

      <div class="button-group">
        <button type="button" @click="handleBack" class="btn-secondary">
          Back
        </button>
        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Creating...' : 'Create Project' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import ComponentCard from '../cards/ComponentCard.vue'

const props = defineProps({
  projectName: {
    type: String,
    required: true
  },
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['back', 'submit'])

const loading = ref(false)
const error = ref(null)

// Initialize project data
const projectData = ref(props.initialData || {
  component_list: [],
  is_public: false
})

// Create default structures
const createPart = () => ({
  type: 0,
  row_list: [],
  consume: 0,
  generate: 0
})

const createComponent = (index, type = 'component') => {
  const component = {
    name: `${props.projectName} ${index + 1}`,
    type: type
  }

  if (type === 'component') {
    component.content = createPart()
  } else {
    component.content = { text: '' }
  }

  return component
}

// Component management
const addComponentOfType = (type) => {
  const index = projectData.value.component_list.length
  projectData.value.component_list.push(createComponent(index, type))
}

const removeComponent = (index) => {
  projectData.value.component_list.splice(index, 1)
}

const handleBack = () => {
  emit('back', projectData.value)
}

const handleSubmit = () => {
  if (projectData.value.component_list.length === 0) {
    error.value = 'At least one component is required'
    return
  }

  error.value = null
  loading.value = true
  emit('submit', projectData.value)
}

// Add at least one component by default if none exist
if (projectData.value.component_list.length === 0) {
  addComponentOfType('component')
}
</script>

<style scoped>
.add-project-design {
  max-width: 900px;
  margin: 0 auto;
}

.step-form {
  padding-bottom: 120px; /* Space for crochet scrollbar */
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 0.5rem;
  align-items: center;
}

.add-component-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.btn-add-type {
  padding: 0.5rem 1rem;
  background: white;
  color: #42b983;
  border: 1px dashed #42b983;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-type:hover {
  background: #f0fdf4;
  border-style: solid;
}

.btn-small {
  background: white;
  color: #42b983;
  padding: 0.5rem 1rem;
  border: 1px solid #42b983;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-small:hover {
  background: #42b983;
  color: white;
}

.clickable {
  cursor: pointer;
}
</style>
