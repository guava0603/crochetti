<template>
  <div class="row-actions-display">
    <template v-for="(stitchNode, nIndex) in stitchNodeList" :key="nIndex">
      <CrochetNode
        :table-type="tableType"
        :node="stitchNode"
        :level="0"
        :selection="handleSelection(selectionList, nIndex)"
        @selection-change="(next) => handleChildSelectionChange(nIndex, next)"
      />
      <span v-if="nIndex < stitchNodeList.length - 1" class="separator">, </span>
    </template>
  </div>
</template>

<script setup>
import { computed, inject, ref, unref } from 'vue'
import { createSelection, isInSelection } from '@/constants/selection.js'
import { crochetValidate } from '@/utils/crochetValidate.js'
import { calculateConsumeGenerate } from '@/utils/calculateConsumeGenerate.js'
import { calculateConsumeGenerateCore } from '@/utils/crochetStatsCore.js'
import CrochetNode from './CrochetNode.vue'
import { useSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'

const props = defineProps({
  tableType: {
    type: String,
    required: true
  },
  stitchNodeList: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'update:stitchNodeList',
  'selection-change'
])

const selectionList = ref([])

const selfDefinedCtx = useSelfDefinedStitchesContext()
const selfDefinedStitches = computed(() => selfDefinedCtx.list.value)

// Parent tables can provide a craft-specific stitch lookup (e.g. knit stitches).
// It may be provided as a raw lookup or as a computed/ref.
const stitchLookupInjected = inject('stitchLookup', null)

const calcStats = (input, repeatCount = 1) => {
  const injectedLookup = stitchLookupInjected ? unref(stitchLookupInjected) : null
  if (injectedLookup) return calculateConsumeGenerateCore(input, repeatCount, injectedLookup)
  return calculateConsumeGenerate(input, repeatCount, selfDefinedStitches.value)
}

const emitSelectionChange = () => {
  emit('selection-change', selectionList.value)
}

// Helper function to emit updated stitch node list with calculated stats
const emitUpdatedRow = (rowContent) => {
  const safeRowContent = Array.isArray(rowContent) ? rowContent : []
  const normalizedRowContent = crochetValidate(safeRowContent)
  const stats = calcStats(normalizedRowContent, 1)
  emit('update:stitchNodeList', {
    stitch_node_list: normalizedRowContent,
    generate: stats.generate,
    consume: stats.consume
  })
}

const setStitchNodeList = (nextList) => {
  const safe = Array.isArray(nextList) ? nextList : []
  emitUpdatedRow(safe)
}

const handleSelection = (selectionListValue, nIndex) => {
  if (!Array.isArray(selectionListValue) || selectionListValue.length === 0) return null
  const firstRange = selectionListValue[0]
  return isInSelection(firstRange, nIndex) ? selectionListValue : null
}

const isSameSinglePath = (a, b) => {
  const listA = Array.isArray(a) ? a : []
  const listB = Array.isArray(b) ? b : []
  if (listA.length !== listB.length) return false
  for (let i = 0; i < listA.length; i += 1) {
    const sa = listA[i]
    const sb = listB[i]
    if (!sa || !sb) return false
    if (sa.start !== sa.end) return false
    if (sb.start !== sb.end) return false
    if (sa.start !== sb.start) return false
  }
  return true
}

const handleChildSelectionChange = (rootIndex, nextSelectionList) => {
  if (props.tableType === 'view') return

  // Design table: open row editor at root only; drill-down is via the preview panel.
  if (props.tableType === 'edit') {
    selectionList.value = []
    emitSelectionChange()
    return
  }

  const safeChild = Array.isArray(nextSelectionList) ? nextSelectionList : []
  const next = [createSelection(rootIndex, rootIndex), ...safeChild]

  if (props.tableType === 'record') {
    // Record table: never toggle-off selection (avoid unselect), but still
    // re-emit the selection so the toolbar can open again.
    if (isSameSinglePath(selectionList.value, next)) {
      selectionList.value = next
      emitSelectionChange()
      return
    }
  }
  selectionList.value = next
  emitSelectionChange()
}

const clearSelection = () => {
  if (selectionList.value.length === 0) return
  selectionList.value = []
  emitSelectionChange()
}

const setSelection = (next) => {
  const safe = Array.isArray(next) ? next : []
  if (props.tableType === 'view') {
    clearSelection()
    return
  }

  if (props.tableType === 'record') {
    selectionList.value = safe.map(sel => createSelection(sel.start, sel.start))
    emitSelectionChange()
    return
  }

  // edit
  if (safe.length <= 1) {
    selectionList.value = safe.length === 1 ? [safe[0]] : []
  } else {
    selectionList.value = safe.map(sel => createSelection(sel.start, sel.start))
  }
  emitSelectionChange()
}

// Rows are edited as a whole by the keypad (EditCrochet → EditingTable draft → setStitchNodeList).
defineExpose({
  clearSelection,
  setSelection,
  setStitchNodeList
})
</script>

<style scoped>
.row-actions-display {
  flex: 1;
  min-width: 0;
  line-height: 1.2;
  font-size: 0.875rem;
  overflow: visible;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  position: relative;
}

.separator {
  color: #6b7280;
}
</style>
