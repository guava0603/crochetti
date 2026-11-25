<template>
  <ConfirmationModal
    :show="state.show"
    :title="state.title"
    :message="state.message"
    :confirm-text="state.confirmText"
    :cancel-text="state.cancelText"
    :confirm-class="state.confirmClass"
    :loading="state.loading"
    :loading-text="state.loadingText"
    :choices="state.choices"
    @confirm="confirmConfirmation"
    @cancel="cancelConfirmation"
    @choose="chooseConfirmation"
  />
</template>

<script setup>
import ConfirmationModal from './ConfirmationModal.vue'
import {
  cancelConfirmation,
  chooseConfirmation,
  confirmConfirmation,
  useConfirmationState
} from '@/services/ui/confirmation'

const state = useConfirmationState()
</script>
