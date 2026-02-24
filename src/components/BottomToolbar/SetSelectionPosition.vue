<template>
  <div class="set-selection-position">
    <div class="title">{{ t('toolbar.setSelectionPosition.title') }}</div>

    <div v-if="!pathSizes.length" class="empty">{{ t('toolbar.setSelectionPosition.noSelection') }}</div>

    <div v-else class="levels">
      <div class="level-label">{{ t('toolbar.setSelectionPosition.rowLabel', { n: rowIndex }) }}</div>
      <div v-for="(size, idx) in pathSizes" :key="'level-' + idx" class="level-row">
        <div class="level-label">{{ pathLabels[idx] || t('toolbar.setSelectionPosition.level', { n: idx + 1 }) }}</div>
        <div class="level-input-label-wrapper">
          <div class="level-label">{{ t('toolbar.setSelectionPosition.groupPrefix') }} </div>
          <InputNumber
            class="level-input"
            size="sm"
            :model-value="pendingCounts[idx]"
            :min="1"
            :max="Math.max(1, size)"
            @update:modelValue="(value) => handleCountChange(idx, value)"
          />
          <div class="level-label"> {{ t('toolbar.setSelectionPosition.groupSuffix') }}</div>
        </div>
      </div>
    </div>
    <div class="action-buttons">
      <button type="button" class="cancel-button" @click="handleCancel">
        {{ t('common.cancel') }}
      </button>
      <button type="button" class="confirm-button" @click="handleConfirm">
        {{ t('common.confirm') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/Input/InputNumber.vue'
import { getPatternItemDisplay } from '@/constants/crochetData.js'
import { getNodeSize, computeGenerateDone } from '@/utils/crochetPosition.js'

const { t } = useI18n({ useScope: 'global' })

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
  emit('update-end-at', props.rowIndex, generateCount)
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
