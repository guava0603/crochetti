<template>
  <div v-if="show" class="row-action-wizard">
    <button type="button" @click="handleCopy" class="action-tab copy">
      Copy
    </button>
    <button type="button" @click="handleDelete" class="action-tab delete">
      Delete
    </button>
  </div>

  <!-- Delete confirmation dialog -->
  <div v-if="showDeleteConfirm" class="delete-confirm-overlay" @click="showDeleteConfirm = false">
    <div class="delete-confirm-dialog" @click.stop>
      <h3>確認刪除</h3>
      <p>確定要刪除這一行嗎？此操作無法復原。</p>
      <div class="dialog-actions">
        <button type="button" @click="confirmDelete" class="btn-confirm">確認刪除</button>
        <button type="button" @click="showDeleteConfirm = false" class="btn-cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['copy', 'delete', 'cancel'])

const showDeleteConfirm = ref(false)

const handleCopy = () => {
  emit('copy')
  emit('cancel')
}

const handleDelete = () => {
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  showDeleteConfirm.value = false
  emit('delete')
  emit('cancel')
}
</script>

<style scoped>
.row-action-wizard {
  position: absolute;
  top: -32px;
  right: 0;
  display: flex;
  gap: 4px;
  z-index: 100;
}

.action-tab {
  padding: 4px 12px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  font-size: 0.75rem;
  color: #374151;
  transition: all 0.2s;
  border-radius: 4px 4px 0 0;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

.action-tab:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.action-tab.copy:hover {
  background: #dbeafe;
  color: #1e40af;
  border-color: #60a5fa;
}

.action-tab.delete:hover {
  background: #fee2e2;
  color: #991b1b;
  border-color: #f87171;
}

.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.delete-confirm-dialog {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.delete-confirm-dialog h3 {
  margin: 0 0 12px 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.delete-confirm-dialog p {
  margin: 0 0 20px 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-confirm,
.btn-cancel {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm {
  background: #dc2626;
  color: white;
}

.btn-confirm:hover {
  background: #b91c1c;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}
</style>
