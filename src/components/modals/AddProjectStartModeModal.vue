<template>
  <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3 class="title">{{ titleText }}</h3>
      <p class="message">{{ messageText }}</p>

      <div class="choice-list">
        <div
          class="choice choice--primary"
          role="button"
          tabindex="0"
          @click="$emit('new')"
          @keydown.enter.prevent="$emit('new')"
          @keydown.space.prevent="$emit('new')"
        >
          {{ t('addProject.startMode.new') }}
        </div>
        <div
          class="choice"
          role="button"
          tabindex="0"
          @click="$emit('copy')"
          @keydown.enter.prevent="$emit('copy')"
          @keydown.space.prevent="$emit('copy')"
        >
          {{ t('addProject.startMode.copy') }}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" type="button" @click="$emit('cancel')">
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

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

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-high);
}

.modal-content {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  max-width: 520px;
  width: 92%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.title {
  margin: 0 0 0.75rem 0;
  color: #111827;
  font-size: 1.25rem;
}

.message {
  margin: 0 0 1rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.choice-list {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.choice {
  width: 100%;
  text-align: left;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.choice--primary {
  border-color: rgb(var(--color-icon-add-rgb) / 0.6);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.625rem 1.1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}
</style>
