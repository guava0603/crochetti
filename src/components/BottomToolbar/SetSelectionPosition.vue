<template>
  <div class="set-selection-position">
    <div class="title">目前做到</div>

    <div v-if="!pathSizes.length" class="empty">No selection.</div>

    <div v-else class="levels">
      <div v-if="props.rowCount > 1" class="level-row">
        <div class="level-label">行號</div>
        <InputNumber
          class="level-input"
          :model-value="selectedRowIndex"
          :min="props.rowIndex"
          :max="props.rowIndex + props.rowCount - 1"
          @update:modelValue="val => selectedRowIndex = val"
        />
      </div>
      <div v-else class="level-label">第 {{ selectedRowIndex }} 行</div>
      <div v-for="(size, idx) in pathSizes" :key="'level-' + idx" class="level-row">
        <div class="level-label">{{ pathLabels[idx] || `Level ${idx + 1}` }}</div>
        <div class="level-input-label-wrapper">
          <div class="level-label">第 </div>
          <InputNumber
            class="level-input"
            :model-value="pendingCounts[idx]"
            :min="1"
            :max="Math.max(1, size)"
            @update:modelValue="(value) => handleCountChange(idx, value)"
          />
          <div class="level-label"> 組</div>
        </div>
      </div>
    </div>
    <div class="action-buttons">
      <button type="button" class="cancel-button" @click="handleCancel">
        取消
      </button>
      <button type="button" class="confirm-button" @click="handleConfirm">
        確認
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import InputNumber from '@/components/Input/InputNumber.vue'
import { BasicStitch, getPatternItemDisplay } from '@/constants/crochetData.js'

const props = defineProps({
  selectionList: {
    type: Array,
    default: () => []
  },
  stitchList: {
    type: Array,
    default: () => []
  },
  rowIndex: {
    type: Number,
    required: true
  },
  rowCount: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits([
  'update-end-at', // (row_index, crochet_count)
  'cancel'
])

const getNodeSize = (node) => {
  if (!node) return 0

  if (node.type === 'stitch') {
    return node.count || 1
  }

  if (node.type === 'bundle') {
    return node.count || 1
  }

  if (node.type === 'pattern') {
    return node.count || 1
  }

  return 0
}

const getStitchGenerate = (node) => {
  if (!node) return 0
  return BasicStitch[node.stitch_id]?.generate || 0
}

const getBundleGenerate = (node) => {
  if (!node) return 0
  return node.generate || 0
}

const getPatternRepeatGenerate = (pattern = []) => {
  return pattern.reduce((sum, item) => {
    if (item.type === 'stitch') {
      return sum + (getStitchGenerate(item) * (item.count || 1))
    }
    if (item.type === 'bundle') {
      return sum + (getBundleGenerate(item) * (item.count || 1))
    }
    if (item.type === 'pattern') {
      return sum + (getPatternRepeatGenerate(item.pattern || []) * (item.count || 1))
    }
    return sum
  }, 0)
}

const getNodeTotalGenerate = (node) => {
  if (!node) return 0
  if (node.type === 'stitch') {
    return getStitchGenerate(node) * (node.count || 1)
  }
  if (node.type === 'bundle') {
    return getBundleGenerate(node) * (node.count || 1)
  }
  if (node.type === 'pattern') {
    return getPatternRepeatGenerate(node.pattern || []) * (node.count || 1)
  }
  return 0
}

const computeGenerateDone = (selectionList, stitchList, counts) => {
  if (!Array.isArray(selectionList) || selectionList.length === 0) return 0

  let total = 0
  let currentList = stitchList
  let countIndex = 0

  for (let level = 0; level < selectionList.length; level += 1) {
    const selection = selectionList[level]
    const index = selection?.start
    if (index === null || index === undefined) break

    for (let i = 0; i < index; i += 1) {
      total += getNodeTotalGenerate(currentList?.[i])
    }

    const node = currentList?.[index]
    if (!node) break

    const size = getNodeSize(node)
    const selectedCount = size > 1 ? (counts?.[countIndex] ?? 1) : 1
    if (size > 1) countIndex += 1

    if (node.type === 'pattern') {
      const perRepeat = getPatternRepeatGenerate(node.pattern || [])
      if (level === selectionList.length - 1) {
        total += perRepeat * selectedCount
        return total
      }

      total += perRepeat * Math.max(0, selectedCount - 1)
      currentList = node.pattern || []
      continue
    }

    if (node.type === 'stitch') {
      total += getStitchGenerate(node) * selectedCount
      return total
    }

    if (node.type === 'bundle') {
      total += getBundleGenerate(node) * selectedCount
      return total
    }

    break
  }

  return total
}

const getNodePath = (stitchList, selectionList) => {
  if (!Array.isArray(selectionList) || selectionList.length === 0) return []

  const pathNodes = []
  let currentList = stitchList

  for (let i = 0; i < selectionList.length; i += 1) {
    const selection = selectionList[i]
    const index = selection?.start
    if (index === null || index === undefined) break

    const node = currentList?.[index]
    if (!node) break

    pathNodes.push(node)

    if (node.type === 'pattern' && Array.isArray(node.pattern)) {
      currentList = node.pattern
    } else {
      break
    }
  }

  return pathNodes
}

const pathNodes = computed(() => getNodePath(props.stitchList, props.selectionList))

const pathSizes = computed(() => {
  return pathNodes.value.map(node => getNodeSize(node)).filter(size => size > 1)
})

const pathLabels = computed(() => {
  return pathNodes.value.map(node => getPatternItemDisplay(node))
})

const selectionCounts = ref([])
const pendingCounts = ref([])

// Add selectedRowIndex ref, initialized to props.rowIndex
const selectedRowIndex = ref(props.rowIndex)

watch(pathSizes, (sizes) => {
  const defaults = sizes.map(() => 1)
  selectionCounts.value = defaults
  pendingCounts.value = defaults
}, { immediate: true })

const handleCountChange = (index, value) => {
  const nextCounts = [...pendingCounts.value]
  nextCounts[index] = Number(value)
  pendingCounts.value = nextCounts
}

const handleConfirm = () => {
  selectionCounts.value = [...pendingCounts.value]
  const generateCount = computeGenerateDone(props.selectionList, props.stitchList, selectionCounts.value)
  emit('update-end-at', selectedRowIndex.value, generateCount)
}

const handleCancel = () => {
  pendingCounts.value = [...selectionCounts.value]
  emit('cancel')
}
</script>

<style scoped>
.set-selection-position {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
}

.empty {
  font-size: 0.875rem;
  color: #6b7280;
}

.levels {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.level-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.level-label {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 600;
}

.level-size {
  font-size: 0.75rem;
  color: #6b7280;
}

.level-select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
}

.level-input {
  margin: 0 0.3rem;
}

.level-input :deep(.counter-input) {
  min-width: 40px;
  width: 40px;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
}

.level-input :deep(.btn-arrow) {
  width: 14px;
  height: 18px;
  font-size: 0.65rem;
}

.level-input :deep(.selection-actions) {
  padding: 0.25rem 0.375rem;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.action-buttons button {
  padding: 0.5rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-button {
  background: #f3f4f6;
  color: #374151;
}

.cancel-button:hover {
  background: #e5e7eb;
}

.confirm-button {
  background: #42b983;
  color: white;
}

.confirm-button:hover {
  background: #369970;
}

.level-input-label-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
}
</style>
