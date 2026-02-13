<template>
  <div class="edit-crochet">
    <div>
      <div class="edit-columns">
      <!-- Column 1: Count editor + Delete button (vertical) -->
      <div class="control-column">
        <div class="count-section">
          <label>數量</label>
          <InputNumber
            :model-value="pendingCount"
            :min="1"
            :max="999"
            @update:model-value="handleUpdateCount"
          />
        </div>
        <TrashButton @click="$emit('delete-selection')" />
      </div>

      <!-- Column 2: Crochet selector (for stitch and pattern types, but not for select_range) -->
      <div v-if="isSelectSingle" class="crochet-column">
        <label>{{ selectedNodeType === 'pattern' ? '新增針法' : '更換針法' }}</label>

        <!-- Display current pattern for pattern type -->
        <div v-if="selectedNodeType === 'pattern'" class="current-pattern">
          <div class="pattern-display">
            <template v-for="(anchor, index) in pendingPattern" :key="index">
              <span class="pattern-item">{{ getPatternItemDisplay(anchor) }}</span>
              <span v-if="index < pendingPattern.length - 1" class="separator">, </span>
            </template>
          </div>
        </div>

        <CrochetList
          :show-custom-button="false"
          @stitch-click="handleStitchSelect"
        />
      </div>
    </div>

    <!-- Confirm/Cancel buttons -->
    <div class="action-buttons">
      <button type="button" class="cancel-button" @click="handleCancel">
        取消
      </button>
      <button type="button" class="confirm-button" @click="handleConfirm">
        確認
      </button>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { getPatternItemDisplay } from '@/constants/crochetData.js'
import InputNumber from '@/components/Input/InputNumber.vue'
import CrochetList from './CrochetList.vue'
import TrashButton from '@/components/buttons/TrashButton.vue'

const props = defineProps({
  selectionState: {
    type: String,
    default: 'select_one'
  },
  selectedNodeType: {
    type: String,
    default: 'stitch'
  },
  selectedCount: {
    type: Number,
    default: 1
  },
  currentPattern: {
    type: Array,
    default: null
  }
})

const emit = defineEmits(['delete-selection', 'confirm', 'cancel'])

const isSelectSingle = computed(() => props.selectionState === 'select_one')

// Track pending changes
const pendingCount = ref(props.selectedCount)
const pendingStitchId = ref(null)
const pendingPattern = ref(props.currentPattern ? [...props.currentPattern] : [])

// Reset pending changes when selection changes
watch(() => props.selectedCount, (newCount) => {
  pendingCount.value = newCount
  pendingStitchId.value = null
})

watch(() => props.currentPattern, (newPattern) => {
  pendingPattern.value = newPattern ? [...newPattern] : []
}, { deep: true })

const handleUpdateCount = (newCount) => {
  pendingCount.value = newCount
}

const handleStitchSelect = (stitchId) => {
  if (props.selectedNodeType === 'pattern') {
    const lastNode = pendingPattern.value[pendingPattern.value.length - 1]
    if (
      lastNode &&
      lastNode.type === 'pattern' &&
      Array.isArray(lastNode.pattern) &&
      lastNode.pattern.length === 1 &&
      lastNode.pattern[0].type === 'stitch' &&
      lastNode.pattern[0].stitch_id === stitchId
    ) {
      lastNode.count = (lastNode.count || 1) + 1
    } else {
      pendingPattern.value.push({
        type: 'pattern',
        pattern: [{ type: 'stitch', stitch_id: stitchId }],
        count: 1
      })
    }
    console.log('Updated pattern:', pendingPattern.value)
  } else {
    // Replace stitch
    pendingStitchId.value = stitchId
  }
}

const handleConfirm = () => {
  const changes = {}

  if (pendingCount.value !== props.selectedCount) {
    changes.count = pendingCount.value
  }

  if (pendingStitchId.value !== null) {
    changes.stitchId = pendingStitchId.value
  }

  if (props.selectedNodeType === 'pattern' && props.currentPattern) {
    // Check if pattern has changed
    if (JSON.stringify(pendingPattern.value) !== JSON.stringify(props.currentPattern)) {
      changes.pattern = pendingPattern.value
    }
  }

  if (Object.keys(changes).length > 0) {
    emit('confirm', changes)
  }
}

const handleCancel = () => {
  // Reset to original values
  pendingCount.value = props.selectedCount
  pendingStitchId.value = null
  pendingPattern.value = props.currentPattern ? [...props.currentPattern] : []
  emit('cancel')
}

</script>

<style scoped>
.edit-columns {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  max-height: calc(50vh - 100px);
  overflow: visible;
}

.control-column {
  flex: 0 0 90px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.count-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.count-section label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.count-section :deep(.input-number) {
  width: 100%;
}

.crochet-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  max-height: calc(50vh - 100px);
  overflow: hidden;
}

.crochet-column label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.crochet-column :deep(.crochet-list) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(50vh - 140px);
  padding-right: 0.5rem;
}

.crochet-column :deep(.crochet-list)::-webkit-scrollbar {
  width: 6px;
}

.crochet-column :deep(.crochet-list)::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.crochet-column :deep(.crochet-button) {
  flex: 0 0 auto;
  width: 60px;
  min-width: 60px;
  padding: 0.5rem;
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

.current-pattern {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}

.pattern-display {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.5;
}

.pattern-item {
  font-weight: 500;
}

.pattern-display .separator {
  color: #6b7280;
}
</style>
