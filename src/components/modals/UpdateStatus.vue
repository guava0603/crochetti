<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <h3>{{ displayTitle }}</h3>

      <div v-if="!isAdding" class="status-select-wrap">
        <SelectionInput
          v-model="statusIdProxy"
          :options="statusOptions"
          :placeholder="'選擇分類'"
        />
      </div>

      <div v-if="isNumericStatusId" class="status-note">
        <label class="status-note-label">備註</label>
        <div class="status-note-controls">
          <SelectionInputCombineList
            v-model="noteDraft"
            :suggestions="noteSuggestions"
            placeholder="選擇或新增備註"
          />
        </div>
      </div>

      <div v-if="isAdding" class="add-custom-status-section">
        <input
          id="custom-status-input"
          ref="customStatusInputRef"
          v-model="customStatusDraft"
          class="status-input"
          placeholder="輸入新分類名稱"
        />
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="handleCancel">取消</button>
        <button
          class="btn-confirm"
          type="button"
          :disabled="isAddStatusSaving || (isAdding && !customStatusDraft.trim())"
          @click="handleSave"
        >
          {{ isAddStatusSaving ? '儲存中...' : '儲存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectionInput from '@/components/tools/SelectionInput.vue'
import SelectionInputCombineList from '@/components/Input/SelectionInputCombineList.vue'
const { t } = useI18n({ useScope: 'global' })
const props = defineProps({
  modalStatusId: [String, Number],
  originalStatuses: Array,
  selfDefinedStatuses: Array,
  modalStatusNote: {
    type: String,
    default: ''
  },
  statusNotes: {
    type: Array,
    default: () => []
  },
  addStatusNote: {
    type: Function,
    default: null
  },
  customStatusInput: String,
  onCancel: Function,
  onConfirm: Function,
  handleModalStatusChange: Function,
  cancelAddCustomStatus: Function,
  confirmAddCustomStatus: Function
})
const {
  modalStatusId,
  originalStatuses,
  selfDefinedStatuses,
  modalStatusNote,
  statusNotes,
  addStatusNote,
  onCancel,
  onConfirm,
  handleModalStatusChange,
  cancelAddCustomStatus,
  confirmAddCustomStatus
} = toRefs(props)

const statusIdProxy = computed({
  get: () => modalStatusId.value,
  set: (value) => {
    if (typeof handleModalStatusChange.value === 'function') {
      handleModalStatusChange.value({ target: { value } })
    }
  }
})

const statusOptions = computed(() => {
  const out = []

  for (const s of originalStatuses.value || []) {
    const label = s?.nameKey ? t(s.nameKey) : (s?.name ?? '')
    out.push({ value: s.id, label })
  }

  if ((selfDefinedStatuses.value || []).length > 0) {
    out.push({ kind: 'group', label: '自定義' })
    for (const s of selfDefinedStatuses.value || []) {
      out.push({ value: s.id, label: s.name })
    }
  }

  out.push({ value: '__add_custom__', label: '新增' })
  return out
})

const customStatusInputRef = ref(null)
const customStatusDraft = ref('')
const isAddStatusSaving = ref(false)

const isAdding = computed(() => String(modalStatusId.value) === '__add_custom__')

const displayTitle = computed(() => {
  return isAdding.value ? '新增自定義分類' : '編輯當前狀態'
})

const addCustomStatus = async () => {
  const name = customStatusDraft.value.trim()
  if (!name) return

  if (typeof confirmAddCustomStatus.value !== 'function') {
    return
  }

  isAddStatusSaving.value = true
  try {
    const result = await confirmAddCustomStatus.value(name)
    const newId = (result && typeof result === 'object' && 'id' in result) ? result.id : result
    customStatusDraft.value = ''

    if (newId != null && typeof handleModalStatusChange.value === 'function') {
      handleModalStatusChange.value({ target: { value: newId } })
    }
  } finally {
    isAddStatusSaving.value = false
  }
}

const handleCancel = () => {
  if (isAdding.value) {
    customStatusDraft.value = ''
    if (typeof cancelAddCustomStatus.value === 'function') {
      cancelAddCustomStatus.value()
      return
    }
  }
  onCancel.value()
}

// SelectionInput handles click-outside + escape.
const noteDraft = ref('')

const isNumericStatusId = computed(() => {
  return !isAdding.value && Number.isFinite(Number(modalStatusId.value))
})

const noteSuggestions = computed(() => {
  const statusId = Number(modalStatusId.value)
  return (statusNotes.value || [])
    .filter(n => Number(n?.status_id) === statusId)
    .map(n => String(n?.description || '').trim())
    .filter(Boolean)
})

watch(modalStatusId, () => {
  noteDraft.value = ''

  if (isAdding.value) {
    nextTick(() => {
      customStatusInputRef.value?.focus?.()
    })
  }
})

watch(modalStatusNote, (val) => {
  // Keep modal note in sync when opening/reopening modal.
  noteDraft.value = String(val || '')
})

const handleSave = () => {
  if (isAdding.value) {
    addCustomStatus()
    return
  }
  handleSaveNote()
  const payload = { status_note: noteDraft.value.trim() }
  onConfirm.value(payload)
}

const handleSaveNote = () => {
  const description = noteDraft.value.trim()
  if (!description) return

  // If user picked an existing suggestion, don't create a duplicate.
  if (noteSuggestions.value.includes(description)) {
    return
  }

  if (typeof addStatusNote.value === 'function') {
    addStatusNote.value({
      status_id: Number(modalStatusId.value),
      description
    })
  }
}
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
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #111827;
}
.status-select-wrap {
  position: relative;
  margin-bottom: 1rem;
}
.add-custom-status-section {
  margin-top: 1rem;
}

.status-note {
  margin-top: 0.5rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-note-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.status-note-controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  align-items: center;
}

.status-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1.5rem;
}
.status-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover {
  background: #f3f4f6;
}
.btn-confirm {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-confirm:hover {
  background: #3aa876;
}
</style>
