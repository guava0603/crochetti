<template>
  <ModalShell
    :show="show"
    :title="title"
    max-width="500px"
    z-level="high"
    @close="$emit('cancel')"
  >
    <p v-if="message" class="modal-hint">{{ message }}</p>

    <div v-if="existingRecords.length > 1" class="modal-form-group">
      <label :for="recordInputId">{{ t('recordSelection.selectToResume') }}</label>
      <SelectionInputCombineList
        :input-id="recordInputId"
        :aria-label="t('recordSelection.selectToResume')"
        v-model="selectedRecordOption"
        :suggestions="recordOptions"
        :placeholder="t('recordSelection.selectPlaceholder')"
      />
    </div>

    <template #footer>
      <div class="modal-actions-split">
        <button type="button" class="modal-btn-cancel" @click="$emit('cancel')">
          {{ t('common.cancel') }}
        </button>
        <div class="modal-actions-split__end">
          <button
            v-if="showResumeButton"
            type="button"
            class="modal-btn-resume"
            @click="$emit('resume', selectedRecordIndex)"
          >
            {{ t('project.resume') }}
          </button>
          <button
            v-if="showStartButton"
            type="button"
            class="modal-btn-confirm"
            @click="$emit('start-new')"
          >
            {{ startNewText }}
          </button>
        </div>
      </div>
    </template>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTimeNoSeconds } from '@/utils/dateTime'
import SelectionInputCombineList from '@/components/shared/inputs/SelectionInputCombineList.vue'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'

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
