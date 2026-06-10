<template>
  <ModalShell
    :show="true"
    :title="displayTitle"
    max-width="400px"
    z-level="top"
    overflow-visible
    :close-on-overlay="false"
    show-save-footer
    :saving="isAddStatusSaving"
    :save-disabled="isAddStatusSaving || (isAdding && !canSaveAddMode)"
    @close="handleCancel"
    @save="handleSave"
  >
    <div v-if="!isAdding" class="status-select-wrap">
      <SelectionInput
        v-model="statusIdProxy"
        :options="editStatusOptions"
        :placeholder="t('statusModal.selectCategoryPlaceholder')"
      />
    </div>

    <div v-else class="add-custom-status-section">
      <TextInput
        id="custom-status-input"
        v-model="customStatusDraft"
        :placeholder="t('statusModal.newCategoryPlaceholder')"
      />
    </div>

    <div v-if="isNumericStatusId" class="status-note">
      <label class="status-note-label">{{ t('common.notes') }}</label>
      <div class="status-note-controls">
        <SelectionInputCombineList
          v-model="noteDraft"
          :suggestions="noteSuggestions"
          :placeholder="t('statusModal.notePlaceholder')"
        />
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, ref, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectionInput from '@/components/shared/selection/SelectionInput.vue'
import SelectionInputCombineList from '@/components/shared/inputs/SelectionInputCombineList.vue'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import TextInput from '@/components/shared/inputs/TextInput.vue'
import { getNoteSuggestionsForStatus } from '@/utils/recordStatusCatalog'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  modalStatusId: [String, Number],
  originalStatuses: Array,
  /** Statuses linked on the current record (edit-current-status picker). */
  recordLinkedStatuses: {
    type: Array,
    default: () => []
  },
  /** Full user catalog (kept for API compatibility with callers). */
  userStatusCatalog: {
    type: Array,
    default: () => []
  },
  userStatusNotes: {
    type: Array,
    default: () => []
  },
  modalStatusNote: {
    type: String,
    default: ''
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
  recordLinkedStatuses,
  userStatusNotes,
  modalStatusNote,
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

const editStatusOptions = computed(() => {
  const out = []

  for (const s of originalStatuses.value || []) {
    const label = s?.nameKey ? t(s.nameKey) : (s?.name ?? '')
    out.push({ value: s.id, label })
  }

  const linked = Array.isArray(recordLinkedStatuses.value) ? recordLinkedStatuses.value : []
  if (linked.length > 0) {
    out.push({ kind: 'group', label: t('statusModal.customGroupLabel') })
    for (const s of linked) {
      out.push({ value: s.id, label: s.name })
    }
  }

  out.push({ value: '__add_custom__', label: t('statusModal.addCustomOption') })
  return out
})

const customStatusDraft = ref('')
const isAddStatusSaving = ref(false)

const isAdding = computed(() => String(modalStatusId.value) === '__add_custom__')

const displayTitle = computed(() => {
  return isAdding.value ? t('statusModal.titleAddCustom') : t('statusModal.titleEdit')
})

const canSaveAddMode = computed(() => {
  if (!isAdding.value) return true
  return Boolean(customStatusDraft.value.trim())
})

const addCustomStatus = async () => {
  if (typeof confirmAddCustomStatus.value !== 'function') return

  isAddStatusSaving.value = true
  try {
    const name = customStatusDraft.value.trim()
    if (!name) return
    const result = await confirmAddCustomStatus.value({ name })
    applyConfirmResult(result)
  } finally {
    isAddStatusSaving.value = false
  }
}

function applyConfirmResult(result) {
  const newId = (result && typeof result === 'object' && 'id' in result) ? result.id : result
  customStatusDraft.value = ''

  if (newId != null && typeof handleModalStatusChange.value === 'function') {
    handleModalStatusChange.value({ target: { value: newId } })
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

const noteDraft = ref(String(modalStatusNote.value))

const isNumericStatusId = computed(() => {
  return !isAdding.value && Number.isFinite(Number(modalStatusId.value))
})

const noteSuggestions = computed(() => {
  const statusId = Number(modalStatusId.value)
  return getNoteSuggestionsForStatus(userStatusNotes.value, statusId)
})

watch(modalStatusId, (next, prev) => {
  if (prev !== undefined && String(next) !== String(prev)) {
    noteDraft.value = ''
  }

  if (isAdding.value) {
    customStatusDraft.value = ''
  }
})

watch(
  modalStatusNote,
  (val) => {
    noteDraft.value = String(val || '')
  },
  { immediate: true }
)

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
.status-select-wrap {
  position: relative;
  margin-bottom: 1rem;
}
.add-custom-status-section {
  margin-top: 0.25rem;
  margin-bottom: 1rem;
}

.status-section-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.35rem;
}

.status-section-label--spaced {
  margin-top: 1rem;
}

.status-note {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
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

</style>
