<template>
  <div class="edit-crochet">
    <div>
      <div class="edit-columns">
      <!-- Crochet selector (for stitch and pattern types, but not for select_range) -->
      <div class="crochet-column">
        <label>{{ crochetColumnLabel }}</label>

        <!-- Display current pattern for pattern type -->
        <div class="go-parent-container">
          <GoParent
            v-if="canGoParent"
            @go-parent="(event) => $emit('go-parent', event)"
          />
          <div class="current-pattern">
            <div class="pattern-display">
              <CrochetNodeDisplay
                :node-list="pendingPattern"
                :can-select-inner="isPatternSelected || selectedNodeType === 'bundle'"
                @add-inner-selection="(next) => $emit('add-inner-selection', next)"
              />
            </div>
          </div>

          <div class="pattern-count">
            <span class="pattern-count__symbol">×</span>
            <InputNumber
              :model-value="pendingCount"
              size="sm"
              :min="1"
              :max="999"
              :aria-label="t('toolbar.editCrochet.count')"
              @update:model-value="handleUpdateCount"
            />
          </div>
        </div>

        <div v-if="showStitchAddTabs" class="add-tabs">
          <button
            type="button"
            class="add-tab"
            :class="{ active: stitchEditTab === 'change' }"
            @click="stitchEditTab = 'change'"
          >
            {{ t('toolbar.editCrochet.changeStitch') }}
          </button>
          <button
            type="button"
            class="add-tab"
            :class="{ active: stitchEditTab === 'add' }"
            @click="stitchEditTab = 'add'"
          >
            {{ t('toolbar.editCrochet.tabs.addToBundle') }}
          </button>
        </div>

        <AddCrochet
          v-if="selectedNodeType !== 'select_range'"
          :disabled="false"
          @add-crochet="handleAddCrochet"
          @add-bundle="handleAddBundle"
      />
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/Input/InputNumber.vue'
import AddCrochet from '@/components/BottomToolbar/AddCrochet.vue'
import GoParent from '@/components/buttons/GoParent.vue'
import CrochetNodeDisplay from '@/components/CrochetTable/CrochetNodeDisplay.vue'
import { addStitchToPatternList } from '@/utils/patternEdit.js'
import { createBundle, createSimpleStitch } from '@/constants/crochetData.js'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
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
  },
  canGoParent: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'delete-selection',
  'confirm',
  'cancel',
  'go-parent',
  'add-inner-selection'
])

const isPatternSelected = computed(() => props.selectedNodeType === 'pattern')

const isStitchSelected = computed(() => props.selectedNodeType === 'stitch')
const showStitchAddTabs = computed(() => !isPatternSelected.value && isStitchSelected.value)

const stitchEditTab = ref('change')

const crochetColumnLabel = computed(() => {
  if (isPatternSelected.value) return t('toolbar.editCrochet.addStitch')
  if (showStitchAddTabs.value && stitchEditTab.value === 'add') return t('toolbar.editCrochet.tabs.addToBundle')
  return t('toolbar.editCrochet.changeStitch')
})

// Track pending changes
const pendingCount = ref(props.selectedCount)
const countDirty = ref(false)
const pendingStitchId = ref(null)
const pendingReplaceNode = ref(null)
const pendingPattern = ref(props.currentPattern ? [...props.currentPattern] : [])

// Reset pending changes when selection changes
watch(() => props.selectedCount, (newCount) => {
  pendingCount.value = newCount
  countDirty.value = false
  pendingStitchId.value = null
  pendingReplaceNode.value = null
})

watch(() => props.selectedNodeType, () => {
  stitchEditTab.value = 'change'
  pendingStitchId.value = null
  pendingReplaceNode.value = null
})

watch(() => props.currentPattern, (newPattern) => {
  pendingPattern.value = newPattern ? [...newPattern] : []
  pendingStitchId.value = null
  pendingReplaceNode.value = null
  stitchEditTab.value = 'change'
}, { deep: true })

const handleUpdateCount = (newCount) => {
  pendingCount.value = newCount
  countDirty.value = true
}

const handleAddCrochet = (payload) => {
  const stitchId = typeof payload === 'number' ? payload : payload?.stitchId
  if (stitchId === null || stitchId === undefined) return

  if (isPatternSelected.value) {
    pendingPattern.value = addStitchToPatternList(pendingPattern.value, payload)
    return
  }

  if (showStitchAddTabs.value && stitchEditTab.value === 'add') {
    pendingStitchId.value = null

    const current = Array.isArray(pendingPattern.value) ? pendingPattern.value : []
    const first = current[0]
    if (!first) return

    if (first.type === 'bundle' && Array.isArray(first.bundle)) {
      const nextBundle = createBundle(
        [...first.bundle.map((n) => ({ ...n })), createSimpleStitch(stitchId)],
        1,
        first.count || 1,
        first.label || null
      )
      pendingReplaceNode.value = nextBundle
      pendingPattern.value = [nextBundle]
      return
    }

    if (first.type === 'stitch' && typeof first.stitch_id === 'number') {
      const nextBundle = createBundle(
        [createSimpleStitch(first.stitch_id), createSimpleStitch(stitchId)],
        1,
        1
      )
      pendingReplaceNode.value = nextBundle
      pendingPattern.value = [nextBundle]
      return
    }

    return
  }

  // Replace stitch (ignore mode here)
  pendingReplaceNode.value = null
  pendingStitchId.value = stitchId

  // Update preview immediately for stitch edits.
  const current = Array.isArray(pendingPattern.value) ? pendingPattern.value : []
  const first = current[0]
  if (current.length === 1 && first && first.type === 'stitch') {
    pendingPattern.value = [{ ...first, stitch_id: stitchId }]
  } else {
    pendingPattern.value = [{ type: 'stitch', stitch_id: stitchId }]
  }
}

const handleAddBundle = (bundle) => {
  if (!isPatternSelected.value) return
  if (!bundle || bundle.type !== 'bundle') return
  pendingPattern.value = [...pendingPattern.value, bundle]
}

const handleConfirm = async () => {
  // Ensure any focused input (e.g. InputNumber) commits its value before we read pending refs.
  if (typeof document !== 'undefined') {
    const el = document.activeElement
    if (el && typeof el.blur === 'function') el.blur()
  }
  await nextTick()

  const changes = {}

  if (countDirty.value && pendingCount.value !== props.selectedCount) {
    changes.count = pendingCount.value
  }

  if (pendingReplaceNode.value !== null) {
    changes.replaceNode = pendingReplaceNode.value
  } else if (pendingStitchId.value !== null) {
    changes.stitchId = pendingStitchId.value
  }

  if (isPatternSelected.value && props.currentPattern) {
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
  pendingReplaceNode.value = null
  stitchEditTab.value = 'change'
  pendingPattern.value = props.currentPattern ? [...props.currentPattern] : []
  emit('cancel')
}

defineExpose({
  confirm: handleConfirm,
  cancel: handleCancel
})

</script>

<style scoped>
.edit-crochet {
  /* Fills the fixed-height tab panel (EditRowCrochetTabs) */
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.edit-columns {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.crochet-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.crochet-column label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.add-tabs {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.add-tab {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.05s;
}

.add-tab:hover {
  background: #f3f4f6;
}

.add-tab:active {
  transform: translateY(1px);
}

.add-tab.active {
  border-color: rgba(66, 185, 131, 0.55);
  background: rgba(66, 185, 131, 0.12);
  color: #0f5132;
}

.crochet-column :deep(.crochet-list) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  max-height: none;
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

.go-parent-container {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  margin-bottom: 0.75rem;
}

.go-parent {
  margin-right: 0.5rem;
}

.current-pattern {
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  flex-grow: 1;
  min-height: 40px;
}

.pattern-count {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: 0.6rem;
}

.pattern-count__symbol {
  font-weight: 900;
  color: #6b7280;
  transform: translateY(-1px);
}

.pattern-count :deep(.input-number) {
  width: 96px;
}


.pattern-display {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.5;
}

</style>
