<template>
  <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3>{{ title }}</h3>

      <!-- Resume existing record selection -->
      <div v-if="existingRecords.length > 1" class="form-group">
        <label :for="recordInputId">{{ t('recordSelection.selectToResume') }}</label>
        <SelectionInputCombineList
          :input-id="recordInputId"
          :aria-label="t('recordSelection.selectToResume')"
          v-model="selectedRecordOption"
          :suggestions="recordOptions"
          :placeholder="t('recordSelection.selectPlaceholder')"
        />
      </div>

      <p v-if="message" class="message">{{ message }}</p>

      <div class="modal-actions">
        <button @click="$emit('cancel')" class="btn-cancel" type="button">{{ t('common.cancel') }}</button>
        <button
          v-if="showResumeButton"
          @click="$emit('resume', selectedRecordIndex)"
          class="btn-resume"
          type="button"
        >
          {{ t('project.resume') }}
        </button>
        <button
          v-if="showStartButton"
          @click="$emit('start-new')"
          class="btn-confirm"
          type="button"
        >
          {{ startNewText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTimeNoSeconds } from '@/utils/dateTime'
import SelectionInputCombineList from '@/components/Input/SelectionInputCombineList.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
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
    default: ''
  },
  existingRecords: {
    type: Array,
    default: () => []
  },
  showResumeButton: {
    type: Boolean,
    default: false
  },
  showStartButton: {
    type: Boolean,
    default: true
  },
  startNewText: {
    type: String,
    default: 'Start New'
  }
})

defineEmits(['cancel', 'resume', 'start-new'])

const selectedRecordIndex = ref(0)
const selectedRecordOption = ref('')
const recordInputId = 'record-select-input'

// Reset selection when modal opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedRecordIndex.value = 0
    selectedRecordOption.value = recordOptions.value?.[0] || ''
  }
})

watch(selectedRecordOption, (value) => {
  const idx = parseRecordOptionIndex(value)
  if (idx == null) return
  selectedRecordIndex.value = idx
})

watch(() => props.existingRecords, () => {
  if (!props.show) return
  if (selectedRecordOption.value) return
  selectedRecordOption.value = recordOptions.value?.[0] || ''
})

const formatRecordStart = (record) => {
  if (!record?.time_slots?.[0]?.start) return t('recordSelection.unknown')
  return formatDateTimeNoSeconds(record.time_slots[0].start)
}

const recordOptions = computed(() => {
  const list = Array.isArray(props.existingRecords) ? props.existingRecords : []
  return list.map((record, index) => {
    const label = formatRecordStart(record)
    return `${index + 1}. ${label}`
  })
})

function parseRecordOptionIndex(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const m = text.match(/^\s*(\d+)\s*[.)、\-:：]/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n)) return null
  const idx = n - 1
  if (idx < 0) return 0
  const max = Math.max(0, (props.existingRecords?.length || 0) - 1)
  return Math.min(idx, max)
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
  z-index: var(--z-modal);
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #111827;
  font-size: 1.5rem;
}

.message {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
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

.btn-resume {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-resume:hover {
  background: #2563eb;
}

.btn-confirm {
  background: var(--color-icon-add);
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
