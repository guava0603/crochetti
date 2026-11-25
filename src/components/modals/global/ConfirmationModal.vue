<template>
  <ModalPromptShell
    :show="show"
    :title="title"
    :message="message"
    max-width="500px"
    padding="lg"
    title-size="lg"
    z-level="top"
    @close="$emit('cancel')"
  >
    <template #footer>
      <button
        v-if="cancelText"
        type="button"
        class="modal-btn-cancel"
        @click="$emit('cancel')"
      >
        {{ cancelText }}
      </button>

      <div class="modal-prompt-actions__end">
        <template v-if="Array.isArray(choices) && choices.length">
          <button
            v-for="choice in choices"
            :key="choice?.id"
            type="button"
            :class="choice?.class || 'modal-btn-confirm'"
            :disabled="loading"
            @click="$emit('choose', choice?.id)"
          >
            {{ choice?.label }}
          </button>
        </template>
        <button
          v-else
          type="button"
          :class="confirmClass"
          :disabled="loading"
          @click="$emit('confirm')"
        >
          {{ loading ? loadingText : confirmText }}
        </button>
      </div>
    </template>
  </ModalPromptShell>
</template>

<script setup>
import ModalPromptShell from '@/components/modals/shell/ModalShell/ModalPromptShell.vue'

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  confirmClass: {
    type: String,
    default: 'modal-btn-confirm'
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: 'Processing...'
  },
  choices: {
    type: Array,
    default: null
  }
})

defineEmits(['confirm', 'cancel', 'choose'])
</script>
