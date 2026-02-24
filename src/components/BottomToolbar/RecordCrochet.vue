<template>
  <div class="record-crochet" @blur.capture="handleBlur" tabindex="-1">
    <!-- Title Section -->
    <div class="title-section">
      <div class="title-content">
        <span>{{ componentName }}</span>
      </div>
      <div class="title-content">
        <span>已完成</span>
      </div>
      <div class="title-content">
        <span>第{{ endAt?.row_index }}行，{{ endAt?.crochet_count }}針</span>
      </div>
      <div class="title-content" v-if="getCrochetNumber">
        <span>第{{ getCrochetNumber.node_index + 1 }}組的{{ nodeSymbol }}</span>
        <span v-if="getCrochetNumber.stitch_index >= 0">的{{ stitchSymbol }}第{{ getCrochetNumber.selectedCount }}針</span>
      </div>
    </div>

    <!-- Confirm/Cancel buttons -->
    <div class="action-buttons">
      <button type="button" class="cancel-button" @click="$emit('cancel')">
        Cancel
      </button>
      <button type="button" class="confirm-button" @click="handleConfirm">
        Confirm
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getNodePerRepeatGenerate, getNodeTotalGenerate } from '@/utils/crochetGenerate.js'

const props = defineProps({
  componentName: {
    type: String,
    required: true
  },
  row: {
    type: Object,
    required: true
  },
  endAt: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const getCrochetNumber = computed(() => {
  if (!props.row || !props.endAt) return null

  let remaining = Math.max(0, props.endAt.crochet_count || 0)
  let nodeIndex = 0
  let stitchIndex = -1
  let selectedCount = remaining

  const nodes = props.row.content.stitch_node_list
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const nodeGenerate = getNodeTotalGenerate(node)

    if (remaining < nodeGenerate) {
      nodeIndex = i
      if (node.type === 'pattern') {
        const per = getNodePerRepeatGenerate(node)
        const rawRemainder = per > 0 ? (remaining % per) : remaining
        let innerRemaining = rawRemainder === 0 && remaining > 0 ? per : rawRemainder

        for (let j = 0; j < (node.pattern || []).length; j++) {
          const item = node.pattern[j]
          const itemGenerate = getNodeTotalGenerate(item)
          if (innerRemaining < itemGenerate) {
            stitchIndex = j
            selectedCount = innerRemaining
            break
          }
          innerRemaining -= itemGenerate
        }
      } else {
        stitchIndex = -1
        selectedCount = remaining
      }
      return {
        row_index: props.endAt.row_index,
        node_index: nodeIndex,
        stitch_index: stitchIndex,
        selectedCount
      }
    }

    remaining -= nodeGenerate
  }

  return {
    row_index: props.endAt.row_index,
    node_index: nodeIndex,
    stitch_index: stitchIndex,
    selectedCount
  }
})

const nodeSymbol = computed(() => {
  if (!getCrochetNumber.value) return ''
  const node = props.row.content.stitch_node_list[getCrochetNumber.value.node_index]
  if (!node) return ''
  if (node.type === 'stitch') {
    const stitch = BasicStitch[node.stitch_id]
    return stitch?.symbol_jp || ''
  }
  if (node.type === 'pattern') {
    return node.pattern.map(item => {
      const stitch = BasicStitch[item.stitch_id]
      if (!stitch) return ''
      return item.count > 1 ? `${item.count}${stitch.symbol_jp}` : stitch.symbol_jp
    }).join(', ')
  }
  return ''
})

const stitchSymbol = computed(() => {
  if (!getCrochetNumber.value || getCrochetNumber.value.stitch_index < 0) return ''
  const node = props.row.content.stitch_node_list[getCrochetNumber.value.node_index]
  if (!node || node.type !== 'pattern') return ''
  const item = node.pattern[getCrochetNumber.value.stitch_index]
  const stitch = BasicStitch[item.stitch_id]
  return stitch?.symbol_jp || ''
})

const handleConfirm = () => {
  emit('confirm', props.endAt)
}

const handleBlur = (event) => {
  // Check if the new focus target is outside this component
  if (!event.currentTarget.contains(event.relatedTarget)) {
    emit('cancel')
  }
}
</script>

<style scoped>
.title-section {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.title-section h3 {
  margin: 0 0 0.75rem 0;
  color: #111827;
  font-size: 1.125rem;
  font-weight: 600;
}

.title-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
  flex-wrap: wrap;
  padding-bottom: 0.3rem;
}

.inline-input {
  display: inline-flex;
}

.inline-input :deep(.selection-actions) {
  padding: 0.125rem;
  background: white;
  border: 1px solid #d1d5db;
  box-shadow: none;
}

.inline-input :deep(.counter-input) {
  min-width: 30px;
  width: 30px;
  font-size: 0.875rem;
  padding: 0.125rem;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.position-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-weight: 600;
  color: #6b7280;
  min-width: 100px;
  font-size: 0.875rem;
}

.value {
  color: #111827;
  font-weight: 500;
}

.count-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.count-section label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  justify-content: flex-end;
  border-top: 1px solid #e5e7eb;
}

.cancel-button,
.confirm-button {
  padding: 0.625rem 1.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.cancel-button:hover {
  background: #f3f4f6;
}

.confirm-button {
  background: #42b983;
  color: white;
  border: none;
}

.confirm-button:hover {
  background: #3aa876;
}
</style>
