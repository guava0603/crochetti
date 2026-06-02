<template>
  <div class="crochet-node-display">
    <template v-for="(stitchNode, nIndex) in nodeList" :key="nIndex">
      <CrochetNode
        :table-type="'edit'"
        :node="stitchNode"
        :level="0"
        :selection="null"
        @selection-change="(payload) => handleNodeSelection(nIndex, payload)"
      />
      <span v-if="nIndex < nodeList.length - 1" class="separator">, </span>
    </template>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { normalizePreviewClickPayload } from '@/utils/crochetSelectionPath'
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
  if (!Array.isArray(newList)) {
    console.warn('nodeList should be an array')
  }
}, { immediate: true })

const emit = defineEmits(['add-inner-selection'])

const handleNodeSelection = (rootIndex, payload) => {
  if (!props.canSelectInner) return

  const clickPayload = normalizePreviewClickPayload(rootIndex, payload)
  if (!clickPayload) return

  emit('add-inner-selection', clickPayload)
}
</script>

<style scoped>
.crochet-node-display {
  line-height: 1.2;
}

.separator {
  color: #6b7280;
}
</style>
