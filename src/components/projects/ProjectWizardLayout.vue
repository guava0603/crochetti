<template>
  <div class="project-wizard-layout">
    <TopBanner
      v-if="showBanner"
      :title="title"
      @last-page="handleLastPage"
    />

    <slot name="status" />

    <div v-if="showSteps" class="progress-steps">
      <template v-for="(label, idx) in steps" :key="`step-${idx}`">
        <div
          class="step"
          :class="{ active: currentStep === idx + 1, completed: currentStep > idx + 1 }"
        >
          <div class="step-number">{{ idx + 1 }}</div>
          <div class="step-label">{{ label }}</div>
        </div>
        <div v-if="idx < steps.length - 1" class="step-divider" aria-hidden="true" />
      </template>
    </div>

    <slot v-if="showSteps && currentStep === 1" name="step-1" />
    <slot v-else-if="showSteps && currentStep === 2" name="step-2" />
    <slot v-else name="step-fallback" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import TopBanner from '@/components/layout/TopBanner.vue'
import { openConfirmation } from '@/services/ui/confirmation'

defineOptions({
  name: 'ProjectWizardLayout'
})

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  showBanner: {
    type: Boolean,
    default: true
  },
  showSteps: {
    type: Boolean,
    default: true
  },
  currentStep: {
    type: Number,
    default: 1
  },
  steps: {
    type: Array,
    default: () => []
  },
  hideScrollbar: {
    type: Boolean,
    default: true
  },
  hideScrollbarClass: {
    type: String,
    default: 'hide-scrollbar'
  },
  isDirty: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['last-page'])

async function handleLastPage() {
  if (!props.isDirty) {
    emit('last-page')
    return
  }

  const ok = await openConfirmation({ type: 'discardChanges' })
  if (ok) emit('last-page')
}

function applyHideScrollbar(on) {
  if (!props.hideScrollbar) return
  if (typeof document === 'undefined') return

  const cls = String(props.hideScrollbarClass || 'hide-scrollbar')
  if (!cls) return

  if (on) {
    document.documentElement.classList.add(cls)
    document.body?.classList?.add?.(cls)
  } else {
    document.documentElement.classList.remove(cls)
    document.body?.classList?.remove?.(cls)
  }
}

onMounted(() => applyHideScrollbar(true))
onBeforeUnmount(() => applyHideScrollbar(false))
</script>

<style scoped>
.project-wizard-layout {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  position: relative;
}

.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  margin-bottom: 1.5rem;
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
  background: var(--color-surface-accent);
  color: var(--color-font-invisible);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s;
}

.step.active .step-number {
  background: var(--color-icon-add);
  color: white;
}

.step.completed .step-number {
  background: var(--color-icon-add-light);
  color: white;
}

.step-label {
  font-size: 0.875rem;
  color: var(--color-font-invisible);
  font-weight: 500;
}

.step.active .step-label {
  color: var(--color-font-dark);
  font-weight: 600;
}

.step-divider {
  width: 60px;
  height: 2px;
  background: var(--color-border-warm);
}

/* Common form styles for child components */
:deep(h2) {
  margin-bottom: 2rem;
  color: #111827;
}

:deep(.step-form) {
  background: rgba(255, 255, 255, 0.6);
  /* border: 1px solid var(--color-border-warm); */
  border-radius: 8px;
  /* padding: 1.5rem 1rem; */
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

:deep(input[type='text']),
:deep(input[type='number']),
:deep(select) {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border-warm);
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.75);
  color: var(--color-font-dark);
}

:deep(input[type='checkbox']) {
  margin-right: 0.5rem;
}

:deep(input:focus),
:deep(select:focus) {
  outline: none;
  border-color: var(--color-icon-add);
  box-shadow: 0 0 0 3px rgb(var(--color-icon-add-rgb) / 0.18);
}

:deep(.button-group) {
  display: flex;
}

:deep(.error) {
  color: #dc3545;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8d7da;
  border-radius: 4px;
}
</style>
