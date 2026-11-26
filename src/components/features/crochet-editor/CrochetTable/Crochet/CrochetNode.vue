<template>
  <span
    class="pattern-text"
    :class="{
      selected: showSelected && !isRecord,
      'locate-box': isRecord && isLeaf,
      located: showSelected && isRecord,
      clickable: isClickable
    }"
    @click.stop="handleClick"
  >
    <LocatedArrow v-if="showSelected && isRecord && isLeaf" />
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
      :count="node.count || 1"
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
import LocatedArrow from './LocatedArrow.vue'

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

// Record table: the current position of work is shown as "located" (box + floating arrow)
// instead of the selected highlight.
const isRecord = computed(() => props.tableType === 'record')
// Patterns/bundles draw their own located child; only leaves carry the arrow.
const isLeaf = computed(() => props.node.type === 'stitch' || props.node.type === 'rope')

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
  color: var(--color-font-dark);
  border-radius: 3px;
  /* Not `all`: a border appearing would otherwise fade in from the text color. */
  transition: background-color 0.2s, border-color 0.2s;
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

/* Record table leaves always carry the (transparent) located border, so tapping only
   changes its color: same look while pressing and after, and no layout shift.
   Padding keeps the 1.2×-scaled stitch icon from painting over the border. */
.locate-box {
  --located-border: 3px;
  border: var(--located-border) solid transparent;
  border-radius: 4px;
  padding: 2px;
  transition: none;
}

/* Located: square with tiny round corners, bordered in a lighter accent color. */
.locate-box.located {
  border-color: rgb(var(--color-icon-add-rgb) / 0.55);
}

</style>
