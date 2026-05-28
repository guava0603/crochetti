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
          class="modal-prompt"
          :class="promptClass"
          :style="containerStyle"
          role="dialog"
          aria-modal="true"
          @click.stop
        >
          <slot name="title">
            <h3
              v-if="title"
              class="modal-prompt__title"
              :class="{ 'modal-prompt__title--lg': titleSize === 'lg' }"
            >
              {{ title }}
            </h3>
          </slot>

          <slot name="message">
            <p v-if="message" class="modal-prompt__message">{{ message }}</p>
          </slot>

          <slot />

          <div v-if="showFooter" class="modal-prompt-actions">
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

defineOptions({ name: 'ModalPromptShell' })

const props = defineProps({
  show: { type: Boolean, default: true },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  maxWidth: { type: String, default: '520px' },
  padding: {
    type: String,
    default: 'md',
    validator: (value) => ['md', 'lg'].includes(value)
  },
  titleSize: {
    type: String,
    default: 'md',
    validator: (value) => ['md', 'lg'].includes(value)
  },
  zLevel: {
    type: String,
    default: 'base',
    validator: (value) => ['base', 'high', 'top'].includes(value)
  },
  closeOnOverlay: { type: Boolean, default: true },
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

const promptClass = computed(() => {
  if (props.padding === 'lg') return 'modal-prompt--padding-lg'
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
