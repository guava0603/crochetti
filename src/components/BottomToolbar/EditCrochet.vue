<template>
  <div class="edit-crochet">
    <div>
      <div class="edit-columns">
      <!-- Crochet selector (for stitch and pattern types, but not for select_range) -->
      <div class="crochet-column">
        <div class="crochet-column-header">
          <div class="crochet-column-header__main">
            <ButtonGroup
              v-if="showStitchAddTabs"
              type="toggle"
              v-model="stitchEditTab"
              :items="stitchTabItems"
              :aria-label="t('toolbar.editCrochet.addStitch')"
            />

            <label v-else>{{ crochetColumnLabel }}</label>
          </div>

          <div class="crochet-column-header__actions" @click.stop>
            <ButtonTranslate />
            <HelpIconButton
              topic-id="editCrochetHowTo"
              :aria-label="t('help.editCrochetHowTo.aria')"
            />
          </div>
        </div>

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
                :can-select-inner="canSelectPreviewInner"
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

        <AddCrochet
          v-if="selectedNodeType !== 'select_range'"
          :disabled="false"
          :preset-stitch-id="presetStitchId"
          :preset-position="presetPosition"
          :default-position="''"
          :emit-on-decrease-toggle="showStitchAddTabs && stitchEditTab === 'change'"
          @add-crochet="handleAddCrochet"
          @position-change="handlePositionChange"
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
import ButtonGroup from '@/components/buttons/ButtonGroup.vue'
import ButtonTranslate from '@/components/buttons/svg/ButtonTranslate.vue'
import CrochetNodeDisplay from '@/components/CrochetTable/CrochetNodeDisplay.vue'
import HelpIconButton from '@/components/help/HelpIconButton.vue'
import { addStitchToPatternList } from '@/utils/patternEdit.js'
import { createBundle, createPattern, createSimpleStitch } from '@/constants/crochetData.js'

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
  virtualWholeRow: {
    type: Boolean,
    default: false
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
  'draft-pattern-change',
  'go-parent',
  'add-inner-selection'
])

const isPatternSelected = computed(() => props.selectedNodeType === 'pattern')

const isBundleSelected = computed(() => props.selectedNodeType === 'bundle')

const isStitchSelected = computed(() => props.selectedNodeType === 'stitch')
const showStitchAddTabs = computed(() => !isPatternSelected.value && (isStitchSelected.value || isBundleSelected.value))

const stitchEditTab = ref('change')

const stitchTabItems = computed(() => ([
  {
    key: 'change',
    label: t('toolbar.editCrochet.changeStitch'),
    ariaLabel: t('toolbar.editCrochet.changeStitch')
  },
  {
    key: 'add',
    label: t('toolbar.editCrochet.tabs.addToBundle'),
    ariaLabel: t('toolbar.editCrochet.tabs.addToBundle')
  }
]))

const canSelectPreviewInner = computed(() => {
  const base = isPatternSelected.value || props.selectedNodeType === 'bundle'
  return base
})

const crochetColumnLabel = computed(() => {
  if (isPatternSelected.value) return t('toolbar.editCrochet.addStitch')
  if (showStitchAddTabs.value && stitchEditTab.value === 'add') return t('toolbar.editCrochet.tabs.addToBundle')
  return t('toolbar.editCrochet.changeStitch')
})

const POSITION_SUPPORTED_STITCH_IDS = new Set([4, 7, 10, 13]) // X, T, F, E

const normalizePosition = (pos) => (typeof pos === 'string' ? pos.trim().toUpperCase() : '')

const appendStitchIntoBundleList = (bundleList, stitchId, position) => {
  const safe = Array.isArray(bundleList) ? bundleList : []
  const pos = normalizePosition(position)

  // Do not compact/merge while editing; keep explicit stitches.
  safe.push(createSimpleStitch(stitchId, pos))
  return safe
}

const getFirstSelectedStitchInfo = (list) => {
  const safe = Array.isArray(list) ? list : []
  const first = safe[0]
  if (!first) return null

  if (first.type === 'stitch' && typeof first.stitch_id === 'number') {
    const pos = typeof first.position === 'string' ? first.position.trim().toUpperCase() : ''
    return { stitchId: first.stitch_id, position: pos }
  }

  if (
    first.type === 'pattern' &&
    Array.isArray(first.pattern) &&
    first.pattern.length === 1 &&
    first.pattern[0]?.type === 'stitch' &&
    typeof first.pattern[0]?.stitch_id === 'number'
  ) {
    const inner = first.pattern[0]
    const pos = typeof inner.position === 'string' ? inner.position.trim().toUpperCase() : ''
    return { stitchId: inner.stitch_id, position: pos }
  }

  return null
}

const presetStitchId = computed(() => {
  if (!isStitchSelected.value) return null
  const info = getFirstSelectedStitchInfo(pendingPattern.value)
  return info?.stitchId ?? null
})

const presetPosition = computed(() => {
  if (!isStitchSelected.value) return ''
  const info = getFirstSelectedStitchInfo(pendingPattern.value)
  return info?.position ?? ''
})

// Track pending changes
const pendingCount = ref(props.selectedCount)
const countDirty = ref(false)
const pendingStitchId = ref(null)
const pendingPosition = ref('')
const pendingReplaceNode = ref(null)
const pendingPattern = ref(props.currentPattern ? [...props.currentPattern] : [])
const suppressDraftEmit = ref(false)
const draftTouched = ref(false)

// Reset pending changes when selection changes
watch(() => props.selectedCount, (newCount) => {
  pendingCount.value = newCount
  countDirty.value = false
  pendingStitchId.value = null
  pendingPosition.value = ''
  pendingReplaceNode.value = null
})

watch(() => props.selectedNodeType, () => {
  stitchEditTab.value = 'change'
  pendingStitchId.value = null
  pendingPosition.value = ''
  pendingReplaceNode.value = null
  pendingCount.value = props.selectedCount
  countDirty.value = false
})

watch(() => props.currentPattern, (newPattern) => {
  suppressDraftEmit.value = true
  pendingPattern.value = newPattern ? [...newPattern] : []
  pendingStitchId.value = null
  pendingPosition.value = ''
  pendingReplaceNode.value = null
  // Bundle edits almost always want "add to bundle" by default. For stitches, default to change.
  stitchEditTab.value = props.selectedNodeType === 'bundle' ? 'add' : 'change'
  if (!props.virtualWholeRow) {
    pendingCount.value = props.selectedCount
    countDirty.value = false
  }
  nextTick(() => {
    suppressDraftEmit.value = false
  })
}, { deep: true })

watch(
  () => pendingPattern.value,
  (next) => {
    if (suppressDraftEmit.value) return
    draftTouched.value = true
    emit('draft-pattern-change', Array.isArray(next) ? next : [])
  },
  { deep: true }
)

const handleUpdateCount = (newCount) => {
  const nextCount = Math.max(1, Number(newCount) || 1)
  pendingCount.value = nextCount
  countDirty.value = true

  // For a single stitch node, represent count by wrapping into a pattern node.
  // This makes count belong to the node itself (and draft/selection stays consistent).
  if (props.selectedNodeType === 'stitch') {
    const current = Array.isArray(pendingPattern.value) ? pendingPattern.value : []
    const first = current[0]
    if (!first || first.type !== 'stitch' || typeof first.stitch_id !== 'number') return

    if (nextCount <= 1) {
      pendingPattern.value = [{ ...first }]
      return
    }

    pendingPattern.value = [createPattern(nextCount, [{ type: 'stitch', stitch_id: first.stitch_id, position: first.position }])]
    return
  }

  // Whole-row editing (root / virtual selection): count is applied on confirm,
  // but we still want the editing table to reflect the count immediately.
  if (props.virtualWholeRow) {
    draftTouched.value = true
    emit('draft-pattern-change', {
      list: Array.isArray(pendingPattern.value) ? pendingPattern.value : [],
      count: nextCount,
      selectRootPattern: nextCount > 1
    })
    return
  }

  // For pattern/bundle nodes, count belongs to the selected node (not to the inner list).
  // Push the draft count up so selection props (selectedCount) update immediately and don't snap back.
  if (props.selectedNodeType === 'pattern' || props.selectedNodeType === 'bundle') {
    draftTouched.value = true
    emit('draft-pattern-change', {
      list: Array.isArray(pendingPattern.value) ? pendingPattern.value : [],
      count: nextCount
    })
  }
}

const handleAddCrochet = (payload) => {
  const stitchId = typeof payload === 'number'
    ? payload
    : (payload?.stitchId ?? payload?.stitch_id)
  if (stitchId === null || stitchId === undefined) return

  const position = typeof payload === 'object' ? String(payload?.position ?? '') : ''
  const isAddToBundleMode = showStitchAddTabs.value && stitchEditTab.value === 'add'
  let positionSafe = normalizePosition(position)
  // Never auto-default position (e.g. FP). If user didn't pick a position,
  // keep it empty — except when we're changing a stitch that already had a position,
  // in which case we preserve it for position-supported stitches.
  if (!isAddToBundleMode && !positionSafe && POSITION_SUPPORTED_STITCH_IDS.has(stitchId)) {
    const currentInfo = getFirstSelectedStitchInfo(pendingPattern.value)
    if (currentInfo?.position) {
      positionSafe = normalizePosition(currentInfo.position)
    }
  }

  if (isPatternSelected.value) {
    pendingPattern.value = addStitchToPatternList(pendingPattern.value, payload)
    return
  }

  if (showStitchAddTabs.value && stitchEditTab.value === 'add') {
    // When a bundle node is selected, EditCrochet receives the bundle's *inner* list as currentPattern.
    // In this case, "加針" should mutate that inner list directly (NOT wrap it into another bundle).
    if (props.selectedNodeType === 'bundle') {
      const currentInner = Array.isArray(pendingPattern.value) ? pendingPattern.value : []
      const nextInner = currentInner.map((n) => ({ ...n }))
      appendStitchIntoBundleList(nextInner, stitchId, positionSafe)
      pendingPattern.value = nextInner
      return
    }

    pendingStitchId.value = null
    pendingPosition.value = ''

    const current = Array.isArray(pendingPattern.value) ? pendingPattern.value : []
    const first = current[0]
    if (!first) return

    if (first.type === 'bundle' && Array.isArray(first.bundle)) {
      const nextInner = first.bundle.map((n) => ({ ...n }))
      appendStitchIntoBundleList(nextInner, stitchId, positionSafe)
      const nextBundle = createBundle(
        nextInner,
        1,
        first.count || 1,
        first.label || null
      )
      pendingReplaceNode.value = nextBundle
      pendingPattern.value = [nextBundle]
      return
    }

    if (first.type === 'stitch' && typeof first.stitch_id === 'number') {
      const nextInner = [createSimpleStitch(first.stitch_id, first.position)]
      appendStitchIntoBundleList(nextInner, stitchId, positionSafe)
      const nextBundle = createBundle(nextInner, 1, 1)
      pendingReplaceNode.value = nextBundle
      pendingPattern.value = [nextBundle]
      return
    }

    return
  }

  // Replace stitch (ignore mode here)
  pendingReplaceNode.value = null
  pendingStitchId.value = stitchId
  pendingPosition.value = positionSafe

  // Update preview immediately for stitch edits.
  const current = Array.isArray(pendingPattern.value) ? pendingPattern.value : []
  const first = current[0]
  if (current.length === 1 && first && first.type === 'stitch') {
    const next = { ...first, stitch_id: stitchId }
    if (positionSafe) next.position = positionSafe
    else delete next.position
    pendingPattern.value = [next]
  } else {
    const next = { type: 'stitch', stitch_id: stitchId }
    if (positionSafe) next.position = positionSafe
    pendingPattern.value = [next]
  }
}

const handlePositionChange = (pos) => {
  if (!isStitchSelected.value) return

  const info = getFirstSelectedStitchInfo(pendingPattern.value)
  if (!info) return

  const positionSafe = typeof pos === 'string' ? pos.trim().toUpperCase() : ''

  pendingReplaceNode.value = null
  pendingStitchId.value = info.stitchId
  pendingPosition.value = positionSafe

  const current = Array.isArray(pendingPattern.value) ? [...pendingPattern.value] : []
  const first = current[0]

  if (first?.type === 'stitch') {
    const next = { ...first }
    if (positionSafe) next.position = positionSafe
    else delete next.position
    current[0] = next
    pendingPattern.value = current
    return
  }

  if (
    first?.type === 'pattern' &&
    Array.isArray(first.pattern) &&
    first.pattern.length === 1 &&
    first.pattern[0]?.type === 'stitch'
  ) {
    const nextInner = { ...first.pattern[0] }
    if (positionSafe) nextInner.position = positionSafe
    else delete nextInner.position
    const nextPattern = { ...first, pattern: [nextInner] }
    current[0] = nextPattern
    pendingPattern.value = current
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

  if (draftTouched.value) {
    changes.applyDraft = true
  }

  // Stitch count is represented by pendingPattern wrapper; don't emit count separately.
  if (props.selectedNodeType !== 'stitch' && countDirty.value && pendingCount.value !== props.selectedCount) {
    changes.count = pendingCount.value
  }

  if (pendingReplaceNode.value !== null) {
    changes.replaceNode = pendingReplaceNode.value
  } else if (pendingStitchId.value !== null) {
    changes.stitch = { stitch_id: pendingStitchId.value, position: pendingPosition.value }
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
  suppressDraftEmit.value = true
  draftTouched.value = false
  pendingCount.value = props.selectedCount
  pendingStitchId.value = null
  pendingReplaceNode.value = null
  stitchEditTab.value = 'change'
  pendingPattern.value = props.currentPattern ? [...props.currentPattern] : []
  nextTick(() => {
    suppressDraftEmit.value = false
  })
  emit('draft-pattern-change', null)
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
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;

  /* Hide scrollbar but keep scrolling */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}

.edit-crochet::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.edit-columns {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  flex: 1;
  min-height: 0;
  overflow: visible;
}

.crochet-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  min-height: 0;
  overflow: visible;
}

.crochet-column label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.crochet-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.crochet-column-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
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
  border-color: rgb(var(--color-icon-add-rgb) / 0.55);
  background: rgb(var(--color-icon-add-rgb) / 0.12);
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
