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
          @selection-change="(next) => handleChildSelectionChange(nIndex, next)"
        />
        <span v-if="nIndex < node.pattern.length - 1" class="separator">, </span>
      </template>
      <span class="pattern-count">] * {{ node.count }}</span>
    </span>
    <span v-else>
      <CrochetStitch
        v-if="compactInnerType === 'stitch'"
        :stitch-id="node.pattern[0].stitch_id"
        :count="node.count"
      />

      <template v-else-if="compactInnerType === 'bundle'">
        <CrochetBundle
          :node="node.pattern[0]"
          :table-type="tableType"
          :level="level + 1"
        />
        <span v-if="(node.count || 1) > 1" class="pattern-count"> * {{ node.count }}</span>
      </template>
     </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { createSelection, isInSelection } from '@/constants/selection.js'
import CrochetStitch from './CrochetStitch.vue'
import CrochetBundle from './CrochetBundle.vue'
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

const emit = defineEmits(['selection-change'])

const compactInnerType = computed(() => {
  const list = props.node?.pattern
  if (!Array.isArray(list) || list.length !== 1) return null
  const innerType = list[0]?.type
  return innerType === 'stitch' || innerType === 'bundle' ? innerType : null
})

const isLongPattern = computed(() => {
  const list = props.node?.pattern
  if (!Array.isArray(list) || list.length === 0) return true
  if (list.length > 1) return true
  // single item patterns: stitch/bundle render compact, everything else uses long form
  return compactInnerType.value === null
})

const handleSelection = (nIndex) => {
  if (!props.selection) return null
  const levelRange = props.selection?.[props.level+1]
  return isInSelection(levelRange, nIndex) ? props.selection : null
}

const handleChildSelectionChange = (nIndex, nextSelectionList) => {
  if (nextSelectionList.length === 0) {
    emit('selection-change', [createSelection(nIndex, nIndex)])
  } else {
    emit('selection-change', [createSelection(nIndex, nIndex), ...nextSelectionList])
  }
}

// selection-change is handled by CrochetNode; CrochetPattern only forwards.
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
}

</style>
