<template>
  <div class="edit-row-crochet-tabs">
    <Tab :tabs="tabs" :model-value="tab" default-key="row" keep-alive @update:model-value="setTab">
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
            @dirty-change="rowDirty = $event"
          />
        </div>
      </template>

      <template #crochet>
        <div class="edit-row-crochet-tabs__panel">
          <div class="edit-row-crochet-tabs__panel-actions" @click.stop>
            <HelpIconButton
              v-if="showHelpButton"
              class="help-btn"
              :topic-id="helpTopicId"
              :aria-label="t('help.editCrochetHowTo.aria')"
            />
          </div>
          <EditCrochet
            v-if="activeRow"
            ref="editCrochetRef"
            :craft-key="craftKey"
            :stitches-for-list="stitchesForList"
            :show-custom-button="showCustomButton"
            :enable-wizard="enableWizard"
            :enable-self-defined-stitches="enableSelfDefinedStitches"
            :row-key="activeRow.row_index"
            :row-copy="rowCopy"
            @draft-pattern-change="(next) => $emit('draft-pattern-change', next)"
            @confirm="(changes) => $emit('confirm', changes)"
            @cancel="() => $emit('cancel')"
            @dirty-change="crochetDirty = $event"
            @selection-change="crochetInSelection = $event"
          />
        </div>
      </template>
    </Tab>

    <div class="edit-row-crochet-tabs__actions">
      <ButtonDelete
        v-if="showDeleteButton"
        :text="t('common.delete')"
        :type="deleteConfirmType"
        @click="handleDelete"
      />
      <!-- A pattern/bundle is selected in the keypad: one 確認 confirms it and goes up a level. -->
      <div v-if="showSelectionConfirm" class="edit-row-crochet-tabs__actions-right">
        <button
          type="button"
          class="action-btn action-btn--primary"
          @click="handleConfirmSelection"
        >
          {{ t('common.confirm') }}
        </button>
      </div>
      <div v-else class="edit-row-crochet-tabs__actions-right">
        <button type="button" class="action-btn action-btn--secondary" @click="handleCancel">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="action-btn action-btn--primary"
          :disabled="!isDirty"
          @click="handleConfirm"
        >
          {{ t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EditCrochet from '@/components/features/crochet-editor/BottomToolbar/EditCrochet.vue'
import EditRow from '@/components/features/crochet-editor/BottomToolbar/EditRow.vue'
import ButtonDelete from '@/components/shared/buttons/ButtonDelete.vue'
import HelpIconButton from '@/components/shared/help/HelpIconButton.vue'
import Tab from '@/components/shared/tools/Tab.vue'
import { openConfirmation } from '@/services/ui/confirmation'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  craftKey: {
    type: String,
    default: 'crochet'
  },
  stitchesForList: {
    type: Array,
    default: null
  },
  showCustomButton: {
    type: Boolean,
    default: true
  },
  enableWizard: {
    type: Boolean,
    default: true
  },
  enableSelfDefinedStitches: {
    type: Boolean,
    default: true
  },
  craftTabLabel: {
    type: String,
    default: ''
  },
  showHelpButton: {
    type: Boolean,
    default: true
  },
  helpTopicId: {
    type: String,
    default: 'editCrochetHowTo'
  },
  tab: {
    type: String,
    default: 'row'
  },
  activeRow: {
    type: Object,
    default: null
  },
  isSelectingMultipleRows: {
    type: Boolean,
    default: false
  },
  rowCopy: {
    type: Array,
    default: () => []
  },
  hasCrochetDraft: {
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
  'draft-pattern-change',
  'confirm',
  'cancel',
  'close'
])

const editRowRef = ref(null)
const editCrochetRef = ref(null)
const rowDirty = ref(false)
const crochetDirty = ref(false)
const crochetInSelection = ref(false)

// While a pattern/bundle is selected on the 針法 tab, 取消/儲存 give way to a single 確認.
const showSelectionConfirm = computed(() => props.tab === 'crochet' && crochetInSelection.value)

const handleConfirmSelection = () => {
  editCrochetRef.value?.confirmSelection?.()
}

const isDirty = computed(() => rowDirty.value || crochetDirty.value || props.hasCrochetDraft)

const tabs = computed(() => [
  { key: 'row', label: t('toolbar.editTabs.row') },
  { key: 'crochet', label: props.craftTabLabel || t('toolbar.editTabs.crochet') }
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

// Crochet tab deletes through the keypad's delete-last button instead.
const showDeleteButton = computed(() => props.tab === 'row')

const setTab = (next) => {
  // Multi-row selection mode is a Row-tab-only interaction (used for building row groups).
  // If the user switches to Crochet tab, exit multi-row selection so the Crochet editor
  // is not effectively blocked by the row-range selection behavior.
  if (next === 'crochet' && props.isSelectingMultipleRows) {
    emit('toggle-select-multiple-rows', false)
  }
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
  }
}

const handleCancel = async () => {
  if (!isDirty.value) {
    emit('close')
    return
  }

  const ok = await openConfirmation({ type: 'discardChanges' })
  if (!ok) return

  if (rowDirty.value && editRowRef.value && typeof editRowRef.value.cancel === 'function') {
    await editRowRef.value.cancel({ close: false, skipConfirm: true })
  }

  if (crochetDirty.value) {
    if (editCrochetRef.value && typeof editCrochetRef.value.cancel === 'function') {
      await editCrochetRef.value.cancel({ close: false, skipConfirm: true })
    }
    emit('cancel')
    return
  }

  emit('close')
}

const handleConfirm = async () => {
  if (!isDirty.value) return

  if (rowDirty.value && editRowRef.value && typeof editRowRef.value.confirm === 'function') {
    await editRowRef.value.confirm({ close: false })
  }

  if (crochetDirty.value) {
    if (editCrochetRef.value && typeof editCrochetRef.value.confirm === 'function') {
      await editCrochetRef.value.confirm({ close: true })
      return
    }
    // Fallback: commit row_copy draft even if EditCrochet is unavailable.
    emit('confirm', { applyDraft: true })
    return
  }

  emit('close')
}
</script>

<style scoped>
.edit-row-crochet-tabs {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
}

.edit-row-crochet-tabs__panel-actions {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  padding: 0 0 0.5rem;
  background: var(--color-background);
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
  /* 1rem sides: the keypad needs the width on narrow phones (320–375px). */
  padding: 1rem;
}

.edit-row-crochet-tabs__panel {
  height: 100%;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;

  /* Hide scrollbar but keep scrolling */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}

.edit-row-crochet-tabs__panel::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}


.edit-row-crochet-tabs__actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  border-top: 1px solid #e5e7eb;
  padding: 0.5rem 1rem 0.8rem;
  padding-bottom: calc(0.8rem + var(--safe-area-bottom));
  background: #fff;
}

.edit-row-crochet-tabs__actions-right {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.action-btn--secondary {
  background: #f3f4f6;
  color: var(--color-font-dark);
}

.action-btn--secondary:hover {
  background: #e5e7eb;
}

.action-btn--primary {
  background: var(--color-icon-add);
  color: white;
}

.action-btn--primary:hover:not(:disabled) {
  background: #369970;
}

.action-btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
