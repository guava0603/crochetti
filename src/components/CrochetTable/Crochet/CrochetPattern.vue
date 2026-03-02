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
      <span class="pattern-count">
        ]
        <template v-if="patternCount > 1">
          <template v-if="showZhRepeat">{{ t('crochet.display.patternRepeatSuffix', { count: patternCount }) }}</template>
          <template v-else> * {{ patternCount }}</template>
        </template>
      </span>
    </span>
    <span v-else>
      <span
        v-if="compactInnerType === 'stitch'"
        class="compact-stitch"
        :class="{ clickable: tableType !== 'view' }"
        @click.stop="handleCompactInnerClick"
      >
        <span v-if="(node.count || 1) > 1" class="compact-count">{{ node.count }}</span>
        <span class="compact-inner" :class="{ selected: compactInnerSelected }">
          <CrochetStitch
            :stitch-id="node.pattern[0].stitch_id"
            :position="node.pattern[0].position"
            :count="1"
          />
        </span>
      </span>

      <template v-else-if="compactInnerType === 'bundle'">
        <CrochetBundle
          :node="node.pattern[0]"
          :table-type="tableType"
          :level="level + 1"
          :selection="handleSelection(0)"
          @selection-change="(next) => handleChildSelectionChange(0, next)"
        />
        <span v-if="patternCount > 1" class="pattern-count">
          <template v-if="showZhRepeat">{{ t('crochet.display.patternRepeatSuffix', { count: patternCount }) }}</template>
          <template v-else> * {{ patternCount }}</template>
        </span>
      </template>
     </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { createSelection, isInSelection } from '@/constants/selection.js'
import { CROCHET_LANG } from '@/constants/crochetData.js'
import { useCrochetLang } from '@/composables/useCrochetLang'
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

const { t } = useI18n({ useScope: 'global' })
const { crochetLang } = useCrochetLang()

const patternCount = computed(() => {
  const count = props.node?.count
  return typeof count === 'number' && Number.isFinite(count) ? count : 1
})

const showZhRepeat = computed(() => crochetLang.value === CROCHET_LANG.text_zh && patternCount.value > 1)

const compactInnerSelected = computed(() => {
  if (!props.selection || props.selection.length === 0) return false
  const targetLevel = props.level + 1
  if (props.selection.length - 1 !== targetLevel) return false
  const levelRange = props.selection?.[targetLevel]
  return isInSelection(levelRange, 0)
})

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

const handleCompactInnerClick = () => {
  if (props.tableType === 'view') return
  handleChildSelectionChange(0, [])
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

.compact-inner {
  display: inline-block;
  border-radius: 3px;
  border-bottom: 2px solid transparent;
  padding: 2px 2px 0;
}

.compact-stitch.clickable {
  cursor: pointer;
}

.compact-count {
  display: inline-block;
  border-bottom: 2px solid transparent;
}

.compact-inner.selected {
  background: #dbeafe;
  border-color: #3b82f6;
}

</style>
