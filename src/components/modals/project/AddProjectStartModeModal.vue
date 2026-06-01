<template>
  <ModalPromptShell
    :show="show"
    :title="titleText"
    :message="messageText"
    z-level="high"
    show-save-footer
    :show-save="false"
    @close="$emit('cancel')"
  >
    <div class="modal-choice-list">
      <div
        class="modal-choice modal-choice--primary"
        role="button"
        tabindex="0"
        @click="$emit('new')"
        @keydown.enter.prevent="$emit('new')"
        @keydown.space.prevent="$emit('new')"
      >
        {{ t('addProject.startMode.new') }}
      </div>
      <div
        class="modal-choice"
        role="button"
        tabindex="0"
        @click="$emit('copy')"
        @keydown.enter.prevent="$emit('copy')"
        @keydown.space.prevent="$emit('copy')"
      >
        {{ t('addProject.startMode.copy') }}
      </div>
    </div>
  </ModalPromptShell>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalPromptShell from '@/components/modals/shell/ModalShell/ModalPromptShell.vue'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

defineEmits(['cancel', 'new', 'copy'])

const titleText = computed(() => t('confirmation.addProjectStartMode.title'))
const messageText = computed(() => t('confirmation.addProjectStartMode.message'))
</script>
