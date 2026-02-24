<template>
  <div class="crochet-node-display">
    <template v-for="(stitchNode, nIndex) in nodeList" :key="nIndex">
      <CrochetNode
        :table-type="'edit'"
        :node="stitchNode"
        :level="0"
        :selection="null"
        @selection-change="handleNodeClick(nIndex)"
      />
      <span v-if="nIndex < nodeList.length - 1" class="separator">, </span>
    </template>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { createSelection } from '@/constants/selection'
import CrochetNode from './Crochet/CrochetNode.vue'

const props = defineProps({
  nodeList: {
    type: Array,
    required: true
  },
  canSelectInner: {
    type: Boolean,
    default: false
  }
})

watch(() => props.nodeList, (newList) => {
  // Ensure nodeList is always an array
  if (!Array.isArray(newList)) {
    console.warn('nodeList should be an array')
  }
}, { immediate: true })

const emit = defineEmits(['add-inner-selection'])

const handleNodeClick = (nIndex) => {
  if (props.canSelectInner) {
    emit('add-inner-selection', createSelection(nIndex, nIndex))
  }
}
</script>

<style scoped>
.crochet-node-display {
  line-height: 1.2;
}

.node-item {
  display: inline-flex;
  align-items: baseline;
  cursor: pointer;
}

.separator {
  color: #6b7280;
}
</style>
