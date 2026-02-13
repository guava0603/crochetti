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
    @confirm="confirmConfirmation"
    @cancel="cancelConfirmation"
  />
</template>

<script setup>
import ConfirmationModal from './ConfirmationModal.vue'
import {
  cancelConfirmation,
  confirmConfirmation,
  useConfirmationState
} from '@/services/ui/confirmation'

const state = useConfirmationState()
</script>
