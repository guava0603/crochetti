<template>
  <span
    class="pattern-text"
    :class="{ selected: showSelected, clickable: isClickable }"
    @click.stop="handleClick"
  >
    <CrochetStitch
      v-if="node.type === 'stitch'"
      :stitch-id="node.stitch_id"
      :count="1"
    />

    <CrochetBundle
      v-else-if="node.type === 'bundle'"
      :node="node"
      :table-type="tableType"
      :level="level"
      :selection="selection"
      @selection-change="handleChildSelectionChange"
    />

    <CrochetPattern
      v-else-if="node.type === 'pattern'"
      :node="node"
      :table-type="tableType"
      :level="level"
      :selection="selection"
      @selection-change="handleChildSelectionChange"
    />
  </span>
</template>

<script setup>
import { computed } from 'vue'
import CrochetStitch from './CrochetStitch.vue'
import CrochetBundle from './CrochetBundle.vue'
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

const emit = defineEmits(['selection-change'])

const isClickable = computed(() => props.tableType !== 'view')

const showSelected = computed(() => {
  if (props.selection && props.selection.length > 0) {
    return props.level === props.selection.length - 1
  }
  return false
})

const handleClick = () => {
  if (isClickable.value) {
    emit('selection-change', [])
  }
}

const handleChildSelectionChange = (childSelectionList) => {
  emit('selection-change', childSelectionList)
}

</script>

<style scoped>
.pattern-text {
  position: relative;
  display: inline-block;
  color: #111827;
  border-radius: 3px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  padding: 2px 2px 0;
}

.clickable {
  cursor: pointer;
}

.selected {
  background: #dbeafe;
  border-color: #3b82f6;
}

</style>
