<template>
  <div class="project-wizard-layout">
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
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { openConfirmation } from '@/services/ui/confirmation'
import { useAppBanner } from '@/composables/appBanner'

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

const appBanner = useAppBanner()

async function handleLastPage() {
  if (!props.isDirty) {
    emit('last-page')
    return
  }

  const ok = await openConfirmation({ type: 'discardChanges' })
  if (ok) emit('last-page')
}

function syncBanner() {
  if (!appBanner) return
  appBanner.setBanner({
    visible: props.showBanner,
    title: props.title,
    showBack: props.showBanner,
    onBack: props.showBanner ? handleLastPage : null
  })
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

onMounted(() => {
  syncBanner()
  applyHideScrollbar(true)
})

watch(
  () => [props.title, props.showBanner],
  () => syncBanner()
)

onBeforeUnmount(() => applyHideScrollbar(false))

onBeforeUnmount(() => {
  appBanner?.resetHandlers()
})
</script>

<style scoped>
.project-wizard-layout {
  --color-border-edit-project: var(--color-border);

  flex: 1 1 auto;
  min-height: 0;
  max-width: 1000px;
  padding: 1rem 1.5rem;
  position: relative;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}

.project-wizard-layout::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
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
  min-width: min(4rem, 40%);
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
  border-radius: 8px;
}

:deep(.form-group) {
  margin-top: 1.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

:deep(label) {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
}

:deep(input[type='text']),
:deep(input[type='number']),
:deep(select) {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border-edit-project);
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.75);
  color: var(--color-font-dark);
}

:deep(.project-wizard-layout textarea) {
  border-color: var(--color-border-edit-project);
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

:deep(.label-wrapper) {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

:deep(.required-badge) {
  background: var(--color-surface-accent);
  color: var(--color-font-invisible);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.6rem;
  border-radius: 0.5rem;
}
</style>
