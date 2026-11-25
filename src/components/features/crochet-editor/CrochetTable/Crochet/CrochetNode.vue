<template>
  <span
    class="pattern-text"
    :class="{ selected: showSelected, clickable: isClickable }"
    @click.stop="handleClick"
  >
    <component
      v-if="node.type === 'stitch'"
      :is="StitchComponent"
      :stitch-id="node.stitch_id"
      :position="node.position"
      :count="node.count || 1"
    />

    <component
      v-else-if="node.type === 'bundle'"
      :is="BundleComponent"
      :node="node"
      :table-type="tableType"
      :level="level"
      :selection="selection"
      @selection-change="handleChildSelectionChange"
    />

    <component
      v-else-if="node.type === 'rope'"
      :is="RopeComponent"
      :chain-count="node.chain_count"
    />

    <component
      v-else-if="node.type === 'pattern'"
      :is="PatternComponent"
      :node="node"
      :table-type="tableType"
      :level="level"
      :selection="selection"
      @selection-change="handleChildSelectionChange"
    />
  </span>
</template>

<script setup>
import { computed, inject } from 'vue'
import CrochetStitch from './CrochetStitch.vue'
import CrochetBundle from './CrochetBundle.vue'
import CrochetPattern from './CrochetPattern.vue'
import CrochetRope from './CrochetRope.vue'

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

// Allow other crafts to reuse CrochetNode/CrochetPattern tree with a different stitch renderer.
// Defaults preserve existing crochet behavior.
const StitchComponent = inject('stitchComponent', CrochetStitch)
const BundleComponent = inject('bundleComponent', CrochetBundle)
const PatternComponent = inject('patternComponent', CrochetPattern)
const RopeComponent = inject('ropeComponent', CrochetRope)

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
  background: var(--color-selected-active);
  border-color: var(--color-selected);
}

</style>
