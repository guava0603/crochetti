<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="modal-overlay"
        :class="overlayClass"
        @click="handleOverlayClick"
      >
        <div
          class="modal-container"
          :style="containerStyle"
          role="dialog"
          aria-modal="true"
          @click.stop
        >
          <div v-if="title || $slots.header || showClose" class="modal-header">
            <slot name="header">
              <h2 class="modal-title">{{ title }}</h2>
            </slot>
            <button
              v-if="showClose"
              type="button"
              class="modal-close-button"
              @click="emitClose"
            >
              ×
            </button>
          </div>

          <div class="modal-body" :class="bodyClass">
            <slot />
          </div>

          <div v-if="showFooter" class="modal-actions">
            <slot v-if="$slots.footer" name="footer" />
            <ModalDefaultFooter
              v-else
              :cancel-label="cancelLabel"
              :save-label="saveLabel"
              :saving-label="savingLabel"
              :saving="saving"
              :save-disabled="saveDisabled"
              :cancel-disabled="cancelDisabled"
              :show-cancel="showCancel"
              :show-save="showSave"
              @cancel="emitCancel"
              @save="emitSave"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import ModalDefaultFooter from '@/components/modals/ModalShell/ModalDefaultFooter.vue'

defineOptions({ name: 'ModalShell' })

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '520px' },
  zLevel: {
    type: String,
    default: 'base',
    validator: (value) => ['base', 'high', 'top'].includes(value)
  },
  closeOnOverlay: { type: Boolean, default: true },
  showClose: { type: Boolean, default: true },
  bodyClass: { type: [String, Array, Object], default: '' },
  showSaveFooter: { type: Boolean, default: false },
  cancelLabel: { type: String, default: '' },
  saveLabel: { type: String, default: '' },
  savingLabel: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  saveDisabled: { type: Boolean, default: false },
  cancelDisabled: { type: Boolean, default: false },
  showCancel: { type: Boolean, default: true },
  showSave: { type: Boolean, default: true }
})

const emit = defineEmits(['update:show', 'close', 'save'])

const slots = useSlots()

const overlayClass = computed(() => {
  if (props.zLevel === 'high') return 'modal-overlay--high'
  if (props.zLevel === 'top') return 'modal-overlay--top'
  return null
})

const containerStyle = computed(() => ({
  '--modal-max-width': props.maxWidth
}))

const showFooter = computed(() => Boolean(slots.footer) || props.showSaveFooter)

function emitClose() {
  emit('update:show', false)
  emit('close')
}

function emitCancel() {
  emitClose()
}

function emitSave() {
  emit('save')
}

function handleOverlayClick() {
  if (!props.closeOnOverlay) return
  emitClose()
}
</script>
