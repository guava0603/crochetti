<template>
  <div class="add-project-view">
    <div class="back-button-wrapper">
      <LastPage />
    </div>
    <h1>Add New Project</h1>

    <!-- Progress indicator -->
    <div class="progress-steps">
      <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
        <div class="step-number">1</div>
        <div class="step-label">Basic Info</div>
      </div>
      <div class="step-divider"></div>
      <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
        <div class="step-number">2</div>
        <div class="step-label">Design</div>
      </div>
    </div>

    <!-- Step 1: Basic Info -->
    <AddProjectInfo
      v-if="currentStep === 1"
      :initial-data="basicInfo"
      @next="handleNextStep"
    />

    <!-- Step 2: Project Design -->
    <AddProjectDesign
      v-if="currentStep === 2"
      :project-name="basicInfo.name"
      :initial-data="designData"
      @back="handleBackStep"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebaseConfig'
import { createProject } from '@/services/firestore/projects'
import AddProjectInfo from '../components/AddProject/AddProjectInfo.vue'
import AddProjectDesign from '../components/AddProject/AddProjectDesign.vue'
import LastPage from '../components/buttons/LastPage.vue'

const router = useRouter()
const currentStep = ref(1)
const basicInfo = ref({
  name: '',
  description: ''
})
const designData = ref(null)

const handleNextStep = (data) => {
  basicInfo.value = data
  currentStep.value = 2
}

const handleBackStep = (data) => {
  designData.value = data
  currentStep.value = 1
}

const handleSubmit = async (data) => {
  try {
    const user = auth.currentUser
    if (!user) {
      alert('You must be logged in to create a project')
      return
    }

    const projectData = {
      name: basicInfo.value.name,
      description: basicInfo.value.description,
      component_list: data.component_list,
      is_public: data.is_public,
      authorId: user.uid,
      createdAt: new Date().toISOString()
    }

    const projectId = await createProject(projectData)
    console.log('Project created successfully:', projectId)

    // Navigate to project page
    router.push(`/project/${projectId}`)
  } catch (err) {
    console.error('Error creating project:', err)
    alert('Failed to create project: ' + err.message)
  }
}
</script>

<style scoped>
.add-project-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  position: relative;
}

.back-button-wrapper {
  position: absolute;
  top: 2rem;
  left: 2rem;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #111827;
}

.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 3rem;
  gap: 1rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s;
}

.step.active .step-number {
  background: #42b983;
  color: white;
}

.step.completed .step-number {
  background: #42b983;
  color: white;
}

.step-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.step.active .step-label {
  color: #111827;
  font-weight: 600;
}

.step-divider {
  width: 60px;
  height: 2px;
  background: #e5e7eb;
}

/* Common form styles for child components */
:deep(h2) {
  margin-bottom: 2rem;
  color: #111827;
}

:deep(.step-form) {
  background: white;
  border-radius: 8px;
}

:deep(.form-group) {
  margin-bottom: 1.5rem;
}

:deep(label) {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
}

:deep(input[type="text"]),
:deep(input[type="number"]),
:deep(select),
:deep(textarea) {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

:deep(input[type="checkbox"]) {
  margin-right: 0.5rem;
}

:deep(input:focus),
:deep(textarea:focus),
:deep(select:focus) {
  outline: none;
  border-color: #42b983;
}

:deep(.button-group) {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

:deep(.btn-primary) {
  background: #42b983;
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

:deep(.btn-primary:hover:not(:disabled)) {
  background: #3aa876;
}

:deep(.btn-primary:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

:deep(.btn-secondary) {
  background: white;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

:deep(.btn-secondary:hover) {
  background: #f3f4f6;
}

:deep(.error) {
  color: #dc3545;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8d7da;
  border-radius: 4px;
}
</style>
