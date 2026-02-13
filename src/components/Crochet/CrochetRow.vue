<template>
  <div v-if="isEditing" class="row-editor" @click="handleDoubleClick">
    <div class="row-table">
      <div class="row-table-cell row-number">
        <strong class="clickable" @click.stop="handleRowNumberClick">
          {{ rowNumberDisplay }}
        </strong>
      </div>
      <div class="row-table-cell row-stitches editable">
        <CrochetDisplay
          ref="crochetDisplayRef"
          :table-type="tableType"
          :stitch-node-list="props.row.content.stitch_node_list"
          @update:stitchNodeList="handleUpdateContent"
          @selection-change="handleSelectionChange"
          @ask-for-selection-position="handleAskForSelectionPosition"
        />
      </div>
      <div class="row-table-cell row-generate" :class="[validationClass, { 'view-mode': tableType !== 'edit' }]">
        {{ props.row.content.generate }}
      </div>
    </div>
  </div>

  <div v-else class="row-card" :class="{ clickable: tableType === 'edit' }" @click="tableType === 'edit' ? $emit('edit-row') : null">
    <div class="row-table">
      <div class="row-table-cell row-number">
        <strong>{{ rowNumberDisplay }}</strong>
      </div>
      <div class="row-table-cell row-stitches" :class="{ 'record-mode': tableType === 'record' }">
        <CrochetDisplay
          v-if="tableType === 'record'"
          ref="crochetDisplayRef"
          :table-type="tableType"
          :stitch-node-list="props.row.content.stitch_node_list"
          @selection-change="handleRecordSelectionChange"
          @ask-for-selection-position="handleAskForSelectionPosition"
        />
        <template v-else v-for="(node, nIndex) in props.row.content.stitch_node_list" :key="nIndex">
          <span class="stitch-preview">
            {{ getPatternItemDisplay(node) }}
          </span>
          <span v-if="nIndex < props.row.content.stitch_node_list.length - 1" class="separator">, </span>
        </template>
      </div>
      <div class="row-table-cell row-generate" :class="[validationClass, { 'view-mode': tableType !== 'edit' }]">
        {{ props.row.content.generate }}
      </div>
    </div>
  </div>

  <!-- Toolbar shown when editing -->
  <BottomToolbar v-if="showBottomToolbar">
    <SetSelectionPosition
      v-if="showSelectionPosition"
      :selection-list="selectionListForPosition"
      :stitch-list="props.row.content.stitch_node_list"
      :row-index="props.row.row_index"
      :row-count="props.row.count || 1"
      @cancel="handleCancelSetSelectionPosition"
      @update-end-at="handleUpdateEndAt"
    />
    <EditRow
      v-else-if="showEditRowToolbar"
      :row-count="props.row.count || 1"
      @update-row-repeat="handleUpdateRowRepeat"
      @delete-row="handleDeleteRow"
      @copy-row="handleCopyRow"
      @close="handleCloseEditRow"
    />
    <EditCrochet
      v-else-if="hasSelection"
      :selection-state="selectionState"
      :selected-node-type="selectedNodeInfo.type"
      :selected-count="selectedNodeInfo.count"
      :current-pattern="selectedNodeInfo.pattern"
      @delete-selection="handleDeleteSelection"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
    <AddCrochet
      v-else-if="isEditing"
      @add-crochet="handleAddStitch"
      @add-bundle="handleAddBundle"
    />
  </BottomToolbar>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getPatternItemDisplay } from '@/constants/crochetData.js'
import { isRangeSelection } from '@/constants/selection.js'
import CrochetDisplay from './CrochetDisplay.vue'
import AddCrochet from '../BottomToolbar/AddCrochet.vue'
import EditCrochet from '../BottomToolbar/EditCrochet.vue'
import EditRow from '../BottomToolbar/EditRow.vue'
import BottomToolbar from '../BottomToolbar/BottomToolbar.vue'
import SetSelectionPosition from '../BottomToolbar/SetSelectionPosition.vue'

const props = defineProps({
  row: {
    type: Object,
    required: true
  },
  previousGenerate: {
    type: Number,
    default: 0
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  tableType: {
    type: String,
    default: 'view'
  }
})

const emit = defineEmits([
  'update:row',
  'update:rowRepeat',
  'edit-row',
  'blur-row',
  'show-row-action',
  'show-selection-position',
  'crochet-select',
  'delete-row',
  'copy-row',
  'update-end-at'
])

const crochetDisplayRef = ref(null)
const showSelectionPosition = ref(false)
const selectionListForPosition = ref([])

const handleRecordSelectionChange = (selectionList) => {
  if (props.tableType !== 'record') return

  if (!selectionList || selectionList.length === 0) {
    emit('crochet-select', false)
    return
  }

  const lastSelection = selectionList[selectionList.length - 1]
  if (isRangeSelection(lastSelection)) {
    emit('crochet-select', false)
    return
  }

  const nodeIndex = selectionList[0]?.start
  if (nodeIndex === null || nodeIndex === undefined) {
    emit('crochet-select', false)
    return
  }

  const node = props.row.content.stitch_node_list[nodeIndex]
  if (!node) {
    emit('crochet-select', false)
    return
  }

  emit('crochet-select', true)
}

const handleAskForSelectionPosition = (selectionList) => {
  console.log('Received ask for selection position with list:', selectionList)
  selectionListForPosition.value = selectionList || []
  showSelectionPosition.value = true
  emit('show-selection-position', props.row.row_index)
}

const closeSelectionPosition = () => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.revertSelection === 'function') {
    crochetDisplayRef.value.revertSelection()
  }
  showSelectionPosition.value = false
  selectionListForPosition.value = []
}

// Expose method to clear selection (called by parent CrochetTable)
const clearSelection = () => {
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.clearSelection === 'function') {
    crochetDisplayRef.value.clearSelection()
  }
}

const setSelection = (selectionList) => {
  console.log('Setting selection to selectionList:', selectionList)
  if (crochetDisplayRef.value && typeof crochetDisplayRef.value.setSelection === 'function') {
    crochetDisplayRef.value.setSelection(selectionList)
  } else {
    console.warn('[setSelection] CrochetDisplay ref not available yet for setSelection')
  }
}

const handleDoubleClick = (event) => {
  // Check if the click target is an interactive element (button, input, etc.)
  const target = event.target
  const isInteractive = target.tagName === 'BUTTON' ||
                       target.tagName === 'INPUT' ||
                       target.closest('button') !== null ||
                       target.closest('input') !== null ||
                       target.closest('.bottom-toolbar') !== null

  // Only show row action if not clicking on interactive elements
  if (!isInteractive) {
    console.log('CrochetRow double click')
    emit('show-row-action')
  }
}

const showEditRowToolbar = ref(false)

const handleRowNumberClick = () => {
  showEditRowToolbar.value = true
}

const hasSelection = computed(() => selectionState.value !== 'no_select')

const selectionState = ref('no_select')
const selectedNodeInfo = ref({ type: 'stitch', pattern: null })

const handleSelectionChange = (selectionList) => {
  if (!selectionList || selectionList.length === 0) {
    selectionState.value = 'no_select'
    return
  }

  const lastSelection = selectionList[selectionList.length - 1]
  selectionState.value = isRangeSelection(lastSelection) ? 'select_range' : 'select_one'

  // selectionList without the last element
  const selectionPath = selectionList.slice(0, -1)

  let currentPattern = props.row.content.stitch_node_list
  for (const selection of selectionPath) {
    const nextNode = currentPattern[selection.start]
    currentPattern = nextNode.pattern
  }

  const node = currentPattern[lastSelection.start]
  if (selectionState.value === 'select_one') {
    selectedNodeInfo.value = {
      type: node.type,
      count: node.count || 1,
      pattern: node.type === 'pattern' ? node.pattern : null
    }
  } else {
    selectedNodeInfo.value = {
      type: 'pattern',
      count: 1,
      pattern: null
    }
  }
}

const showBottomToolbar = computed(() => {
  return props.isEditing || hasSelection.value || showSelectionPosition.value || showEditRowToolbar.value
})

// Validate if row consume matches previous row generate
const validationClass = computed(() => {
  if (props.previousGenerate === 0) return 'valid'

  if (props.row.content.consume < props.previousGenerate) return 'less'
  if (props.row.content.consume === props.previousGenerate) return 'valid'
  return 'invalid'
})

// Get row number display
const rowNumberDisplay = computed(() => `${props.row.row_index}`)


const addStitch = (stitchId) => {
  if (crochetDisplayRef.value) {
    crochetDisplayRef.value.addStitch(stitchId)
  }
}

const addBundle = (bundle) => {
  if (crochetDisplayRef.value) {
    crochetDisplayRef.value.addBundle(bundle)
  }
}

const handleAddStitch = (stitchId) => {
  addStitch(stitchId)
}

const handleAddBundle = (bundle) => {
  addBundle(bundle)
}

const handleDeleteSelection = () => {
  if (crochetDisplayRef.value) {
    crochetDisplayRef.value.deleteSelected()
  }
}

const handleUpdateContent = (updatedContent) => {
  emit('update:row', {
    ...props.row,
    content: updatedContent
  })
}

const handleUpdateRowRepeat = (newCount) => {
  emit('update:rowRepeat', newCount)
  showEditRowToolbar.value = false
}

const handleDeleteRow = () => {
  emit('delete-row')
  showEditRowToolbar.value = false
}

const handleCopyRow = () => {
  emit('copy-row')
  showEditRowToolbar.value = false
}

const handleCloseEditRow = () => {
  showEditRowToolbar.value = false
}

const handleCancelSetSelectionPosition = () => {
  crochetDisplayRef.value.revertSelection()
  showSelectionPosition.value = false
}

const handleUpdateEndAt = (rowIndex, crochetCount) => {
  emit('update-end-at', rowIndex, crochetCount)
  showSelectionPosition.value = false
}

const handleConfirm = (changes) => {
  if (crochetDisplayRef.value) {
    if (selectionState.value === 'select_range') {
      // Handle range selection pattern creation
      crochetDisplayRef.value.createPatternFromRange(changes.count)
    } else {
      if (changes.count !== undefined) {
        crochetDisplayRef.value.updateNodeCount(changes.count)
      }
      if (changes.stitchId !== undefined) {
        crochetDisplayRef.value.changeSelectedStitch(changes.stitchId)
      }
      if (changes.pattern !== undefined) {
        crochetDisplayRef.value.updateNodePattern(changes.pattern)
      }
    }
    // Clear selection after confirming changes to switch back to add mode
    crochetDisplayRef.value.clearSelection()
  }
}

const handleCancel = () => {
  // Clear selection
  if (crochetDisplayRef.value) {
    crochetDisplayRef.value.clearSelection()
  }
  // Blur the row (exit edit mode)
  emit('blur-row')
}

defineExpose({
  addStitch,
  addBundle,
  clearSelection,
  setSelection,
  closeSelectionPosition
})

</script>

<style scoped>
.row-editor {
  width: 100%;
  background: white;
  border: 2px solid #42b983;
  border-radius: 6px;
  padding: 0;
  overflow: visible;
}

.row-number-editor {
  position: relative;
  display: inline-block;
}


.row-stitches.editable {
  background: #fff7ed;
  position: relative;
}

.row-card {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 0;
  width: 100%;
  height: 100%;
  transition: all 0.2s;
  overflow: visible;
}

.row-card.clickable:hover {
  background: #f9fafb;
  border-color: #42b983;
  cursor: pointer;
}

.stitch-preview {
  color: #111827;
}

.row-stitches.record-mode {
  cursor: pointer;
}

.separator {
  color: #6b7280;
}

:deep(.row-generate.view-mode) {
  background: #f3f4f6 !important;
  color: #6b7280 !important;
}

.clickable {
  cursor: pointer;
}
</style>
