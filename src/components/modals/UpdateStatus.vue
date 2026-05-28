<template>
  <ModalPromptShell
    :show="true"
    :title="displayTitle"
    max-width="400px"
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
        <SelectionInput
          id="custom-status-input"
          v-model="addModePickProxy"
          :options="addCustomStatusOptions"
          :placeholder="t('statusModal.selectCategoryPlaceholder')"
        />
        <input
          v-if="isCreatingNewCategory"
          v-model="customStatusDraft"
          class="status-input status-input--new"
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

  </ModalPromptShell>
</template>

<script setup>
import { computed, ref, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectionInput from '@/components/Selection/SelectionInput.vue'
import SelectionInputCombineList from '@/components/Input/SelectionInputCombineList.vue'
import ModalPromptShell from '@/components/modals/ModalShell/ModalPromptShell.vue'
import { getNoteSuggestionsForStatus } from '@/utils/recordStatusCatalog'

const CREATE_NEW_STATUS_VALUE = '__new__'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  modalStatusId: [String, Number],
  originalStatuses: Array,
  /** Statuses linked on the current record (edit-current-status picker). */
  recordLinkedStatuses: {
    type: Array,
    default: () => []
  },
  /** Full user catalog (add-custom picker + note suggestions). */
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
  userStatusCatalog,
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

const addModePickProxy = computed({
  get: () => addModePickId.value,
  set: (value) => {
    addModePickId.value = value
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

const addCustomStatusOptions = computed(() => {
  const out = []

  for (const s of originalStatuses.value || []) {
    const label = s?.nameKey ? t(s.nameKey) : (s?.name ?? '')
    out.push({ value: s.id, label })
  }

  const catalog = Array.isArray(userStatusCatalog.value) ? userStatusCatalog.value : []
  if (catalog.length > 0) {
    out.push({ kind: 'group', label: t('statusModal.customGroupLabel') })
    for (const s of catalog) {
      out.push({ value: s.id, label: s.name })
    }
  }

  out.push({ value: CREATE_NEW_STATUS_VALUE, label: t('statusModal.createNewCategoryOption') })
  return out
})

const customStatusDraft = ref('')
const addModePickId = ref('')
const isAddStatusSaving = ref(false)

const isAdding = computed(() => String(modalStatusId.value) === '__add_custom__')

const isCreatingNewCategory = computed(() => String(addModePickId.value) === CREATE_NEW_STATUS_VALUE)

const displayTitle = computed(() => {
  return isAdding.value ? t('statusModal.titleAddCustom') : t('statusModal.titleEdit')
})

const canSaveAddMode = computed(() => {
  if (!isAdding.value) return true
  const pick = String(addModePickId.value || '')
  if (pick === CREATE_NEW_STATUS_VALUE) return Boolean(customStatusDraft.value.trim())
  return pick !== '' && Number.isFinite(Number(pick))
})

const addCustomStatus = async () => {
  if (typeof confirmAddCustomStatus.value !== 'function') return

  isAddStatusSaving.value = true
  try {
    const pickRaw = addModePickId.value

    if (String(pickRaw) === CREATE_NEW_STATUS_VALUE) {
      const name = customStatusDraft.value.trim()
      if (!name) return
      const result = await confirmAddCustomStatus.value({ name })
      applyConfirmResult(result)
      return
    }

    const pickId = Number(pickRaw)
    if (Number.isFinite(pickId)) {
      const result = await confirmAddCustomStatus.value({ statusId: pickId })
      applyConfirmResult(result)
    }
  } finally {
    isAddStatusSaving.value = false
  }
}

function applyConfirmResult(result) {
  const newId = (result && typeof result === 'object' && 'id' in result) ? result.id : result
  customStatusDraft.value = ''
  addModePickId.value = ''

  if (newId != null && typeof handleModalStatusChange.value === 'function') {
    handleModalStatusChange.value({ target: { value: newId } })
  }
}

const handleCancel = () => {
  if (isAdding.value) {
    customStatusDraft.value = ''
    addModePickId.value = ''
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
    addModePickId.value = ''
    customStatusDraft.value = ''
  }
})

watch(addModePickId, (pick) => {
  if (String(pick) !== CREATE_NEW_STATUS_VALUE) {
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
}
.status-input:focus {
  outline: none;
  border-color: var(--color-icon-add);
  box-shadow: 0 0 0 2px rgb(var(--color-icon-add-rgb) / 0.1);
}

.status-input--new {
  margin-top: 0.75rem;
}
</style>
