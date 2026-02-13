<template>
  <button
    class="btn-delete"
    type="button"
    :disabled="disabled"
    :title="buttonText"
    @click="handleClick"
  >
    {{ buttonText }}
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { openConfirmation } from '@/services/ui/confirmation'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  disabled: { type: Boolean, default: false },
  text: { type: String, default: '' },
  confirmTitle: { type: String, default: '' },
  confirmMessage: { type: String, default: '' },
  loadingText: { type: String, default: '' }
})

const emit = defineEmits(['click'])

function safeT(key, fallback) {
  const value = t(key)
  return value === key ? fallback : value
}

const buttonText = computed(() => props.text || safeT('common.delete', 'Delete'))

async function handleClick() {
  if (props.disabled) return

  const ok = await openConfirmation({
    title: props.confirmTitle || safeT('record.deleteTitle', safeT('project.deleteTitle', 'Delete?')),
    message:
      props.confirmMessage ||
      safeT('record.deleteMessage', safeT('project.deleteMessage', 'Are you sure you want to delete?')),
    confirmText: safeT('common.delete', 'Delete'),
    cancelText: safeT('common.cancel', 'Cancel'),
    confirmClass: 'btn-confirm-delete',
    loadingText: props.loadingText || safeT('record.deleting', safeT('project.deleting', 'Deleting…')),
    onConfirm: async () => {
      emit('click')
    }
  })

  return ok
}
</script>

<style scoped>
.btn-delete {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  height: 40px;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.btn-delete:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.btn-delete:active {
  transform: translateY(0);
}

.btn-delete:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}
</style>
