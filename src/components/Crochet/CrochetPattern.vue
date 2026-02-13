<template>
  <!-- Pattern node: [stitch1, stitch2, ...] * n -->
  <span class="pattern-wrapper">
    <span v-if="isLongPattern">
      <span class="pattern-count">[</span>
      <template v-for="(stitchNode, nIndex) in node.pattern" :key="nIndex">
        <CrochetNode
          :table-type="tableType"
          :level="level + 1"
          :node="stitchNode"
          :selection="handleSelection(nIndex)"
          @add-last-selection="(sel) => $emit('add-last-selection', sel)"
          @update-last-selection="(sel) => $emit('update-last-selection', sel)"
          @unselect="$emit('unselect')"
          @pass-selection="handlePassSelection(nIndex)"
          @set-selection="(sels) => handleSetSelection(sels, nIndex)"
        />
        <span v-if="nIndex < node.pattern.length - 1" class="separator">, </span>
      </template>
      <span class="pattern-count">] * {{ node.count }}</span>
    </span>
    <span v-else>
      <CrochetStitch
        :stitch-id="node.pattern[0].stitch_id"
        :count="node.count"
        @select="$emit('pass-selection')"
      />
     </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { createSelection, isInSelection, updateSelection } from '@/constants/selection.js'
import CrochetStitch from './CrochetStitch.vue'
import CrochetNode from './CrochetNode.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  tableType: {
    type: String,
    default: 'view'
  },
  level: {
    type: Number,
    required: true
  },
  selection: {
    type: Array,
    default: null
  }
})

const emit = defineEmits([
  'pass-selection',
  'update-last-selection',
  'unselect',
  'add-last-selection',
  'remove-last-selection',
  'set-selection'
])

const isLongPattern = computed(() => (props.node?.pattern?.length || 0) > 1)

const handleSelection = (nIndex) => {
  if (!props.selection) return null
  const levelRange = props.selection?.[props.level+1]
  return isInSelection(levelRange, nIndex) ? props.selection : null
}

const handlePassSelection = (nIndex) => {
  console.log('Handling pass selection for level', props.level, 'index:', nIndex)
  if (props.tableType === 'record') {
    const newSelectionList = [createSelection(nIndex, nIndex)]
    console.log('In record mode, passing selection up', newSelectionList)
    emit('set-selection', newSelectionList)
  } else {
    if (!props.selection || props.selection.length === 0) {
      emit('pass-selection')
      return
    }

    console.log('Handling pass selection for level', props.level, 'index:', nIndex, 'current selection:', props.selection)
    if (props.level === props.selection.length - 2) {
      const last_range = props.selection[props.selection.length - 1]
      if (isInSelection(last_range, nIndex)) {
        emit('unselect')
      } else {
        const updatedSelection = updateSelection(last_range, nIndex)
        if (updatedSelection && updatedSelection.start === 0 && updatedSelection.end === props.node.pattern.length - 1) {
          emit('remove-last-selection')
        } else {
          emit('update-last-selection', updatedSelection)
        }
      }
    } else if (props.level === props.selection.length - 1) {
      console.log('Adding new selection for level', props.level, 'index:', nIndex)
      emit('add-last-selection', createSelection(nIndex, nIndex))
    } else {
      emit('unselect')
    }
  }
}

const handleSetSelection = (sels, nIndex) => {
  console.log('Handling set selection for level', props.level, 'index:', nIndex, 'selections:', sels)
  const safeList = Array.isArray(sels) ? sels : []
  emit('set-selection', [createSelection(nIndex, nIndex), ...safeList])
}
</script>

<style scoped>
.pattern-wrapper {
  display: inline-block;
}

.separator {
  color: #6b7280;
}

.pattern-count {
  color: #6b7280;
  font-weight: 600;
  margin-left: 4px;
}

</style>
