<template>
  <CrochetStitch
    v-if="node.type === 'stitch'"
    class="pattern-text"
    :class="{ 'selected': showSelected }"
    :stitch-id="node.stitch_id"
    :count="1"
    @select="handlePassSelection"
  />
  <CrochetPattern
    v-else-if="node.type === 'pattern'"
    class="pattern-text"
    :class="{ 'selected': showSelected }"
    :node="node"
    :table-type="tableType"
    :level="level"
    :selection="selection"
    @update-last-selection="(sel) => $emit('update-last-selection', sel)"
    @remove-last-selection="$emit('remove-last-selection')"
    @add-last-selection="(sel) => $emit('add-last-selection', sel)"
    @unselect="$emit('unselect')"
    @pass-selection="handlePassSelection"
    @set-selection="handleSetSelection"
  />
</template>

<script setup>
import { computed } from 'vue'
import CrochetStitch from './CrochetStitch.vue'
import CrochetPattern from './CrochetPattern.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  tableType: {
    type: String,
    default: 'view'
  },
  selection: {
    type: Array,
    default: null
  },
  level: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['unselect', 'pass-selection', 'add-last-selection', 'update-last-selection', 'remove-last-selection', 'set-selection'])

const showSelected = computed(() => {
  if (props.selection && props.selection.length > 0) {
    return props.level === props.selection.length - 1
  }
  return false
})

const handlePassSelection = () => {
  console.log('[CrochetNode] Handling pass selection for level', props.level)
  emit('pass-selection')
}

const handleSetSelection = (sels) => {
  console.log('[CrochetNode] Handling set selection for level', props.level, 'index:', sels)
  const safeList = Array.isArray(sels) ? sels : []
  emit('set-selection', safeList)
}

</script>

<style scoped>
.pattern-text {
  position: relative;
  display: inline-block;
  color: #111827;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.selected {
  background: #dbeafe;
  border-color: #3b82f6;
}

</style>
