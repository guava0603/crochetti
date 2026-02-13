<template>
  <div class="edit-row">
    <div class="edit-row-main">
      <div class="count-section">
        <label>行數</label>
        <InputNumber
          :model-value="pendingCount"
          :min="1"
          :max="999"
          @update:model-value="handleUpdateRowRepeat"
        />
      </div>
      <div class="action-buttons">
        <button type="button" class="secondary-button" @click="handleCopyRow">
          複製
        </button>
        <button type="button" class="danger-button" @click="handleDeleteRow">
          刪除
        </button>
      </div>
    </div>
    <div class="footer-actions">
      <button type="button" class="cancel-button" @click="handleCancel">
        取消
      </button>
      <button type="button" class="confirm-button" @click="handleConfirm">
        確認
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import InputNumber from '@/components/Input/InputNumber.vue'

const props = defineProps({
  rowCount: {
    type: Number,
    default: 1
  }
})

// Track pending changes
const pendingCount = ref(props.rowCount)

const emit = defineEmits(['update-row-repeat', 'delete-row', 'copy-row', 'cancel'])

const handleUpdateRowRepeat = (value) => {
  pendingCount.value = value
}

const handleConfirm = () => {
  if (pendingCount.value !== props.rowCount) {
    emit('update-row-repeat', pendingCount.value)
  }
}

const handleCancel = () => {
  // Reset to original values
  pendingCount.value = props.rowCount
  emit('cancel')
}
</script>

<style scoped>
.edit-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.edit-row-main {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.count-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.count-section label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.secondary-button,
.danger-button,
.primary-button {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.secondary-button {
  background: #f3f4f6;
  color: #374151;
}

.secondary-button:hover {
  background: #e5e7eb;
}

.danger-button {
  background: #fee2e2;
  color: #991b1b;
}

.danger-button:hover {
  background: #fecaca;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.footer-actions button {
  padding: 0.5rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-button {
  background: #f3f4f6;
  color: #374151;
}

.cancel-button:hover {
  background: #e5e7eb;
}

.confirm-button {
  background: #42b983;
  color: white;
}

.confirm-button:hover {
  background: #369970;
}
</style>
