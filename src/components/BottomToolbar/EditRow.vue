<template>
  <div class="edit-row">
    <div class="edit-row-main">
      <div class="edit-row-main-top">
        <div class="row-index">
          <template v-if="isGroupMode">
            {{ t('toolbar.editGroupRow.rangeLabel', { start: props.groupStartRowIndex, end: props.groupEndRowIndex }) }}
          </template>
          <template v-else>
            {{ t('toolbar.editRow.rowLabel', { n: props.rowIndex }) }}
          </template>
        </div>
        <button
          v-if="!isGroupMode"
          type="button"
          class="toggle-button"
          :class="{ selected: props.isSelectingMultipleRows }"
          @click="handleToggleSelectMultipleRows"
        >
          {{ t('toolbar.editRow.selectMultipleRows') }}
        </button>
      </div>
      <div>
        <div v-if="isGroupMode" class="group-summary">
          <span>{{ t('common.repeatRowGroupPrefix', { n: props.groupRowSpan, m: '' }) }}</span>
          <InputNumber
            :model-value="pendingGroupRepeatCount"
            size="sm"
            :min="1"
            :max="999"
            style="margin:0 0.25em;vertical-align:middle;"
            @update:model-value="handleUpdateGroupRepeat"
          />
          <span>{{ t('common.repeatRowGroupSuffix') }}</span>
        </div>

        <div v-else class="count-section">
          <label>{{ t('common.repeatDo') }}</label>
          <InputNumber
            :model-value="pendingCount"
            size="sm"
            :min="1"
            :max="999"
            @update:model-value="handleUpdateRowRepeat"
          />
          <label>{{ t('common.rowUnit') }}</label>
        </div>
        <div class="edit-row-utility">

          <button
            type="button"
            class="secondary-button"
            @click="emit('move-row', { direction: 'up' })"
          >
            {{ t('toolbar.editRow.moveUp') }}
          </button>
          <button
            type="button"
            class="secondary-button"
            @click="emit('move-row', { direction: 'down' })"
          >
            {{ t('toolbar.editRow.moveDown') }}
          </button>
          <button
            type="button"
            class="secondary-button"
            @click="emit('move-row', { direction: 'top' })"
          >
            {{ t('toolbar.editRow.moveTop') }}
          </button>
          <button
            type="button"
            class="secondary-button"
            @click="emit('move-row', { direction: 'bottom' })"
          >
            {{ t('toolbar.editRow.moveBottom') }}
          </button>
        </div>
        <div class="edit-row-utility">
          <button type="button" class="secondary-button" @click="handleCopy">
            {{ t('toolbar.editRow.copyRow') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/Input/InputNumber.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  rowIndex: {
    type: Number,
    required: true
  },
  rowCount: {
    type: Number,
    default: 1
  },
  isSelectingMultipleRows: {
    type: Boolean,
    default: false
  },
  groupIndex: {
    type: Number,
    default: null
  },
  groupStartRowIndex: {
    type: Number,
    default: 0
  },
  groupEndRowIndex: {
    type: Number,
    default: 0
  },
  groupRepeatCount: {
    type: Number,
    default: 1
  },
  groupRowSpan: {
    type: Number,
    default: 1
  }
})

const isGroupMode = computed(() => props.groupIndex !== null && props.groupIndex !== undefined)

// Track pending changes
const pendingCount = ref(props.rowCount)
const pendingGroupRepeatCount = ref(props.groupRepeatCount)

watch(() => props.rowCount, (newVal) => {
  pendingCount.value = newVal
})

watch(
  () => props.groupRepeatCount,
  (newVal) => {
    pendingGroupRepeatCount.value = newVal
  }
)

const emit = defineEmits([
  'update-row-repeat',
  'update-group-repeat-count',
  'toggle-select-multiple-rows',
  'copy-row',
  'copy-group',
  'move-row',
  'close'
])

const handleUpdateRowRepeat = (value) => {
  pendingCount.value = value
}

const handleUpdateGroupRepeat = (value) => {
  pendingGroupRepeatCount.value = value
}

const handleConfirm = () => {
  if (isGroupMode.value) {
    const next = Math.max(1, Number(pendingGroupRepeatCount.value) || 1)
    // Always emit in group mode so the parent can treat `1` as "no group".
    emit('update-group-repeat-count', next)
    emit('close')
    return
  }

  if (pendingCount.value !== props.rowCount) {
    emit('update-row-repeat', pendingCount.value)
  }
  emit('close')
}

const handleCancel = () => {
  if (isGroupMode.value) {
    pendingGroupRepeatCount.value = props.groupRepeatCount
    emit('close')
    return
  }
  pendingCount.value = props.rowCount
  emit('close')
}

const handleToggleSelectMultipleRows = () => {
  if (isGroupMode.value) return
  emit('toggle-select-multiple-rows', !props.isSelectingMultipleRows)
}

const handleCopy = () => {
  if (isGroupMode.value) {
    emit('copy-group')
    return
  }
  emit('copy-row')
}

defineExpose({
  confirm: handleConfirm,
  cancel: handleCancel
})
</script>

<style scoped>
.edit-row {
  display: flex;
  flex-direction: row;
  gap: 2em;
}

.edit-row-utility {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  padding-top: 1.2rem;
  margin-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.group-summary {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #374151;
}

.count-locked {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #6b7280;
}

.row-index {
  font-size: 0.9rem;
  font-weight: 800;
  color: #111827;
}

.edit-row-main {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: space-between;
  flex-wrap: wrap;
  flex: 1;
}

.edit-row-main-top {
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
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

.secondary-button,
.primary-button {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.toggle-button {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 700;
  border: 2px solid transparent;
  cursor: pointer;
  background: #eff6ff;
  color: #1d4ed8;
}

.toggle-button:hover {
  background: #dbeafe;
}

.toggle-button.selected {
  border-color: #93c5fd;
}

.secondary-button {
  background: #f3f4f6;
  color: #374151;
}

.secondary-button:hover {
  background: #e5e7eb;
}

</style>
