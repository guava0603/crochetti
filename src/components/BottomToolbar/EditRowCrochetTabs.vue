<template>
  <div class="edit-row-crochet-tabs">
    <Tab :tabs="tabs" :model-value="tab" default-key="row" @update:model-value="setTab">
      <template #row>
        <div class="edit-row-crochet-tabs__panel">
          <EditRow
            v-if="activeRow"
            ref="editRowRef"
            :row-index="activeRow.row_index"
            :row-count="activeRow.count || 1"
            :is-selecting-multiple-rows="isSelectingMultipleRows"
            :group-index="groupIndex"
            :group-start-row-index="groupStartRowIndex"
            :group-end-row-index="groupEndRowIndex"
            :group-repeat-count="groupRepeatCount"
            :group-row-span="groupRowSpan"
            @update-row-repeat="(count) => $emit('update-row-repeat', count)"
            @update-group-repeat-count="(count) => $emit('update-group-repeat-count', count)"
            @toggle-select-multiple-rows="(next) => $emit('toggle-select-multiple-rows', next)"
            @copy-row="() => $emit('copy-row')"
            @copy-group="() => $emit('copy-group')"
            @move-row="(payload) => $emit('move-row', payload)"
            @close="() => $emit('close')"
          />
        </div>
      </template>

      <template #crochet>
        <div class="edit-row-crochet-tabs__panel">
          <EditCrochet
            v-if="currentSelectedData"
            ref="editCrochetRef"
            :selected-node-type="currentSelectedData.selectedNodeType"
            :selected-count="currentSelectedData.selectedCount"
            :current-pattern="currentSelectedData.currentPattern"
            :can-go-parent="canGoParent"
            @delete-selection="() => $emit('delete-selection')"
            @add-inner-selection="(next) => $emit('add-inner-selection', next)"
            @confirm="(changes) => $emit('confirm', changes)"
            @cancel="() => $emit('cancel')"
            @go-parent="(event) => $emit('go-parent', event)"
          />
        </div>
      </template>
    </Tab>

    <div class="edit-row-crochet-tabs__actions">
      <ButtonDelete :text="t('common.delete')" :type="deleteConfirmType" @click="handleDelete" />
      <div class="edit-row-crochet-tabs__actions-right">
        <button type="button" class="action-btn action-btn--secondary" @click="handleCancel">
          {{ t('common.cancel') }}
        </button>
        <button type="button" class="action-btn action-btn--primary" @click="handleConfirm">
          {{ t('common.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EditCrochet from '@/components/BottomToolbar/EditCrochet.vue'
import EditRow from '@/components/BottomToolbar/EditRow.vue'
import ButtonDelete from '@/components/buttons/ButtonDelete.vue'
import Tab from '@/components/tools/Tab.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  tab: {
    type: String,
    default: 'row'
  },
  activeRow: {
    type: Object,
    default: null
  },
  currentSelectedData: {
    type: Object,
    default: null
  },
  isSelectingMultipleRows: {
    type: Boolean,
    default: false
  },
  canGoParent: {
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

const emit = defineEmits([
  'update:tab',
  'update-row-repeat',
  'update-group-repeat-count',
  'toggle-select-multiple-rows',
  'copy-row',
  'copy-group',
  'move-row',
  'delete-row',
  'delete-group-rows',
  'delete-selection',
  'add-inner-selection',
  'confirm',
  'cancel',
  'go-parent',
  'close'
])

const editRowRef = ref(null)
const editCrochetRef = ref(null)

const tabs = computed(() => [
  { key: 'row', label: t('toolbar.editTabs.row') },
  { key: 'crochet', label: t('toolbar.editTabs.crochet') }
])

const deleteConfirmType = computed(() => {
  if (props.tab === 'row') {
    if (props.groupIndex !== null && props.groupIndex !== undefined) {
      return { id: 'deleteRows', params: { start: props.groupStartRowIndex, end: props.groupEndRowIndex } }
    }
    return { id: 'deleteRow', params: { n: props.activeRow?.row_index || 0 } }
  }
  return 'deleteItem'
})

const setTab = (next) => {
  emit('update:tab', next)
}

const handleDelete = () => {
  if (props.tab === 'row') {
    if (props.groupIndex !== null && props.groupIndex !== undefined) {
      emit('delete-group-rows')
      emit('close')
      return
    }
    emit('delete-row')
    emit('close')
    return
  }

  emit('delete-selection')
}

const handleCancel = () => {
  if (props.tab === 'row') {
    if (editRowRef.value && typeof editRowRef.value.cancel === 'function') {
      editRowRef.value.cancel()
      return
    }
    emit('close')
    return
  }

  if (editCrochetRef.value && typeof editCrochetRef.value.cancel === 'function') {
    editCrochetRef.value.cancel()
    return
  }
  emit('cancel')
}

const handleConfirm = () => {
  if (props.tab === 'row') {
    if (editRowRef.value && typeof editRowRef.value.confirm === 'function') {
      editRowRef.value.confirm()
      return
    }
    emit('close')
    return
  }

  if (editCrochetRef.value && typeof editCrochetRef.value.confirm === 'function') {
    editCrochetRef.value.confirm()
  }
}
</script>

<style scoped>
.edit-row-crochet-tabs {
  display: flex;
  flex-direction: column;
  height: 440px;
  max-height: 50vh;
  min-height: 260px;
}

/* Override ToolsTab styling to match toolbar tabs */
:deep(.tab) {
  margin-top: 0;
  min-height: 0;
}

:deep(.tab__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 1rem 1.8rem;
}

.edit-row-crochet-tabs__panel {
  height: 100%;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.edit-row-crochet-tabs__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid #e5e7eb;
  padding: 1rem 1.8rem 1.5rem;
  background: #fff;
}

.edit-row-crochet-tabs__actions-right {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  height: 40px;
  min-width: 92px;
}

.action-btn--secondary {
  background: #f3f4f6;
  color: #374151;
}

.action-btn--secondary:hover {
  background: #e5e7eb;
}

.action-btn--primary {
  background: #42b983;
  color: white;
}

.action-btn--primary:hover {
  background: #369970;
}
</style>
