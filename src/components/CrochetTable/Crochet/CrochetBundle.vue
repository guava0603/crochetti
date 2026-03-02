<template>
  <span class="bundle">
    <span v-if="showZhRepeat" class="bundle-prefix">{{ t('crochet.display.bundleRepeatPrefix') }}</span>
    <span class="bundle-paren">(</span>
    <template v-for="(item, index) in bundleNodes" :key="index">
      <CrochetNode
        :node="item"
        :level="level + 1"
        :table-type="tableType"
        :selection="handleSelection(index)"
        @selection-change="(next) => handleChildSelectionChange(index, next)"
      />
      <span v-if="index < bundleNodes.length - 1" class="bundle-sep">, </span>
    </template>
    <span class="bundle-paren">)</span>
    <span v-if="bundleCount > 1" class="bundle-count">
      <template v-if="showZhRepeat">{{ t('crochet.display.bundleRepeatSuffix', { count: bundleCount }) }}</template>
      <template v-else> * {{ bundleCount }}</template>
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { createSelection, isInSelection } from '@/constants/selection.js'
import { CROCHET_LANG } from '@/constants/crochetData.js'
import { useCrochetLang } from '@/composables/useCrochetLang'
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
    default: 0
  },
  selection: {
    type: Array,
    default: null
  }
})

const emit = defineEmits(['selection-change'])

const { t } = useI18n({ useScope: 'global' })
const { crochetLang } = useCrochetLang()

const bundleNodes = computed(() => {
  return Array.isArray(props.node?.bundle) ? props.node.bundle : []
})

const bundleCount = computed(() => {
  const count = props.node?.count
  return typeof count === 'number' && Number.isFinite(count) ? count : 1
})

const showZhRepeat = computed(() => crochetLang.value === CROCHET_LANG.text_zh && bundleCount.value > 1)

const handleSelection = (nIndex) => {
  if (!props.selection) return null
  const levelRange = props.selection?.[props.level + 1]
  return isInSelection(levelRange, nIndex) ? props.selection : null
}

const handleChildSelectionChange = (nIndex, nextSelectionList) => {
  emit('selection-change', [createSelection(nIndex, nIndex), ...nextSelectionList])
}
</script>

<style scoped>
.bundle {
  display: inline-block;
  color: #111827;
}

.bundle-paren {
  color: #6b7280;
  font-weight: 600;
}

.bundle-sep {
  color: #6b7280;
}

.bundle-item {
  color: inherit;
}
</style>
