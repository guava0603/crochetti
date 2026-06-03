<template>
  <div class="edit-crochet">
    <div class="edit-crochet__body">
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
            <span class="pattern-count__symbol">{{ isRopeSelected ? 'ch' : '×' }}</span>
            <InputNumber
              :model-value="displayCount"
              size="sm"
              :min="1"
              :max="isRopeSelected ? 99 : 999"
              :aria-label="isRopeSelected ? t('toolbar.addCrochet.ropeBundle.chainCountLabel') : t('toolbar.editCrochet.count')"
              @update:model-value="handleUpdateCount"
            />
          </div>
        </div>

        <AddCrochet
          v-if="selectedNodeType !== 'select_range' && selectedNodeType !== 'rope'"
          :disabled="false"
          :craft-key="craftKey"
          :stitches="stitchesForList"
          :show-custom-button="showCustomButton"
          :enable-wizard="enableWizard"
          :enable-self-defined-stitches="enableSelfDefinedStitches"
          :preset-stitch-id="presetStitchId"
          :preset-position="presetPosition"
          :default-position="''"
          :emit-on-decrease-toggle="showStitchAddTabs && stitchEditTab === 'change'"
          @add-crochet="handleAddCrochet"
          @position-change="handlePositionChange"
          @add-bundle="handleAddBundle"
          @add-rope="handleAddRope"
        />
      </div>
      </div>
    </div>

    <div class="edit-crochet__actions" role="toolbar" :aria-label="t('toolbar.editCrochet.actionsAria')">
      <ThinIconButton
        src="010__arrow_anti-clockwise"
        size="s"
        background="transparent"
        :disabled="!canUndo"
        :aria-label="t('toolbar.editCrochet.undo')"
        :title="t('toolbar.editCrochet.undo')"
        @click="handleUndo"
      />
      <ThinIconButton
        src="009__arrow_lockwise"
        size="s"
        background="transparent"
        :disabled="!canRedo"
        :aria-label="t('toolbar.editCrochet.redo')"
        :title="t('toolbar.editCrochet.redo')"
        @click="handleRedo"
      />
      <ThinIconButton
        src="137__previous"
        size="s"
        background="transparent"
        :disabled="!canDeleteLast"
        :aria-label="t('toolbar.editCrochet.deleteLast')"
        :title="t('toolbar.editCrochet.deleteLast')"
        @click="handleDeleteLast"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, inject, unref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputNumber from '@/components/shared/inputs/InputNumber.vue'
import AddCrochet from '@/components/features/crochet-editor/BottomToolbar/AddCrochet.vue'
import GoParent from '@/components/shared/buttons/GoParent.vue'
import ButtonGroup from '@/components/shared/buttons/ButtonGroup.vue'
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'
import CrochetNodeDisplay from '@/components/features/crochet-editor/CrochetTable/CrochetNodeDisplay.vue'
import { addStitchToPatternList } from '@/utils/patternEdit.js'
import { createBundle, createSimpleStitch } from '@/constants/crochetData.js'
import { openConfirmation } from '@/services/ui/confirmation'
import { resolveDisplayCount } from '@/utils/editCrochetCount'
import { createEditCrochetHistory } from '@/utils/editCrochetHistory'
import { removeLastPatternNode } from '@/utils/editCrochetPatternEdit'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  craftKey: {
    type: String,
    default: 'crochet'
  },
  stitchesForList: {
    type: Array,
    default: null
  },
  showCustomButton: {
    type: Boolean,
    default: true
  },
  enableWizard: {
    type: Boolean,
    default: true
  },
  enableSelfDefinedStitches: {
    type: Boolean,
    default: true
  },
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
  },
  selectionPath: {
    type: Array,
    default: () => []
  },
  rowCopy: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'delete-selection',
  'confirm',
  'cancel',
  'draft-pattern-change',
  'row-copy-count-change',
  'go-parent',
  'add-inner-selection',
  'dirty-change'
])

const isPatternSelected = computed(() => props.selectedNodeType === 'pattern')

const isBundleSelected = computed(() => props.selectedNodeType === 'bundle')

const isStitchSelected = computed(() => props.selectedNodeType === 'stitch')
const isRopeSelected = computed(() => props.selectedNodeType === 'rope')
const showStitchAddTabs = computed(() => !isPatternSelected.value && (isStitchSelected.value || isBundleSelected.value))

const supportsPosition = computed(() => String(props.craftKey || 'crochet') === 'crochet')

const stitchLookup = inject('stitchLookup', null)
const resolvedStitchLookup = computed(() => unref(stitchLookup))

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
  if (props.virtualWholeRow) return true
  return isPatternSelected.value || props.selectedNodeType === 'bundle'
})

const crochetColumnLabel = computed(() => {
  if (isRopeSelected.value) return t('toolbar.addCrochet.ropeBundle.title')
  if (isPatternSelected.value) return t('toolbar.editCrochet.addStitch')
  if (showStitchAddTabs.value && stitchEditTab.value === 'add') return t('toolbar.editCrochet.tabs.addToBundle')
  return t('toolbar.editCrochet.changeStitch')
})

const POSITION_SUPPORTED_STITCH_IDS = new Set([4, 7, 10, 13, 6, 9, 12, 15]) // X, T, F, E and their decrease variants
const supportsPositionForStitch = (stitchId) => supportsPosition.value && POSITION_SUPPORTED_STITCH_IDS.has(stitchId)

const normalizePosition = (pos) => (typeof pos === 'string' ? pos.trim().toUpperCase() : '')

const appendStitchIntoBundleList = (bundleList, stitchId, position) => {
  const safe = Array.isArray(bundleList) ? bundleList : []
  const pos = normalizePosition(position)

  // Do not compact/merge while editing; keep explicit stitches.
  safe.push(createSimpleStitch(stitchId, pos, resolvedStitchLookup.value || undefined))
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

const countDirty = ref(false)
const pendingStitchId = ref(null)
const pendingPosition = ref('')
const pendingReplaceNode = ref(null)
const pendingPattern = ref(props.currentPattern ? [...props.currentPattern] : [])
const suppressDraftEmit = ref(false)
const suppressHistoryPush = ref(false)
const draftTouched = ref(false)
const editHistory = createEditCrochetHistory()
const canUndo = ref(false)
const canRedo = ref(false)

const canDeleteLast = computed(() => {
  if (props.selectedNodeType === 'select_range' || props.selectedNodeType === 'rope') return false
  const list = Array.isArray(pendingPattern.value) ? pendingPattern.value : []
  return list.length > 0 || props.canGoParent
})

function syncHistoryFlags() {
  canUndo.value = editHistory.canUndo()
  canRedo.value = editHistory.canRedo()
}

function captureHistoryState() {
  return {
    pendingPattern: pendingPattern.value,
    pendingStitchId: pendingStitchId.value,
    pendingPosition: pendingPosition.value,
    pendingReplaceNode: pendingReplaceNode.value,
    countDirty: countDirty.value,
    rowCopyCount: displayCount.value,
    stitchEditTab: stitchEditTab.value
  }
}

function pushHistorySnapshot() {
  if (suppressHistoryPush.value) return
  editHistory.pushUndo(captureHistoryState())
  syncHistoryFlags()
}

function applyHistorySnapshot(snap) {
  if (!snap) return

  suppressDraftEmit.value = true
  suppressHistoryPush.value = true

  pendingPattern.value = Array.isArray(snap.pendingPattern)
    ? JSON.parse(JSON.stringify(snap.pendingPattern))
    : []
  pendingStitchId.value = snap.pendingStitchId ?? null
  pendingPosition.value = String(snap.pendingPosition ?? '')
  pendingReplaceNode.value = snap.pendingReplaceNode
    ? JSON.parse(JSON.stringify(snap.pendingReplaceNode))
    : null
  countDirty.value = Boolean(snap.countDirty)
  stitchEditTab.value = snap.stitchEditTab === 'add' ? 'add' : 'change'

  if (snap.countDirty) {
    emit('row-copy-count-change', { count: Math.max(1, Number(snap.rowCopyCount) || 1) })
  }

  draftTouched.value = true
  nextTick(() => {
    suppressDraftEmit.value = false
    suppressHistoryPush.value = false
    emit('draft-pattern-change', pendingPattern.value)
  })
}

function clearEditHistory() {
  editHistory.clear()
  syncHistoryFlags()
}

const countContext = (pendingPattern) => ({
  rowCopy: props.rowCopy,
  selectionPath: props.selectionPath,
  selectedNodeType: props.selectedNodeType,
  virtualWholeRow: props.virtualWholeRow,
  selectedCount: props.selectedCount,
  pendingPattern
})

const baseDisplayCount = computed(() => resolveDisplayCount(countContext(props.currentPattern)))

const displayCount = computed(() => resolveDisplayCount(countContext(pendingPattern.value)))

const isDirty = computed(() => {
  const basePattern = Array.isArray(props.currentPattern) ? props.currentPattern : []
  const currentPattern = Array.isArray(pendingPattern.value) ? pendingPattern.value : []
  const patternChanged = JSON.stringify(currentPattern) !== JSON.stringify(basePattern)

  return Boolean(
    draftTouched.value ||
    patternChanged ||
    countDirty.value ||
    pendingReplaceNode.value !== null ||
    pendingStitchId.value !== null
  )
})

watch(isDirty, (next) => {
  emit('dirty-change', next)
}, { immediate: true })

const resetCountDirty = () => {
  countDirty.value = false
}

watch(
  () => [props.selectedNodeType, props.selectionPath, props.rowCopy],
  () => {
    resetCountDirty()
    pendingStitchId.value = null
    pendingPosition.value = ''
    pendingReplaceNode.value = null
    stitchEditTab.value = props.selectedNodeType === 'bundle' ? 'add' : 'change'
    clearEditHistory()
  },
  { deep: true }
)

watch(() => props.currentPattern, (newPattern) => {
  suppressDraftEmit.value = true
  pendingPattern.value = newPattern ? [...newPattern] : []
  pendingStitchId.value = null
  pendingPosition.value = ''
  pendingReplaceNode.value = null
  stitchEditTab.value = props.selectedNodeType === 'bundle' ? 'add' : 'change'
  resetCountDirty()
  clearEditHistory()
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
  if (nextCount === baseDisplayCount.value) return

  pushHistorySnapshot()
  countDirty.value = true
  emit('row-copy-count-change', { count: nextCount })
}

const handleUndo = () => {
  const snap = editHistory.undo(captureHistoryState())
  applyHistorySnapshot(snap)
  syncHistoryFlags()
}

const handleRedo = () => {
  const snap = editHistory.redo(captureHistoryState())
  applyHistorySnapshot(snap)
  syncHistoryFlags()
}

const handleDeleteLast = () => {
  if (!canDeleteLast.value) return

  pushHistorySnapshot()

  const { nextList, becameEmpty } = removeLastPatternNode(pendingPattern.value)

  if (becameEmpty) {
    pendingReplaceNode.value = null
    pendingStitchId.value = null
    pendingPosition.value = ''
    pendingPattern.value = []
    draftTouched.value = true

    if (props.canGoParent) {
      emit('go-parent')
      emit('delete-selection')
    }
    return
  }

  pendingReplaceNode.value = null
  pendingStitchId.value = null
  pendingPosition.value = ''
  pendingPattern.value = nextList
}

const handleAddCrochet = (payload) => {
  pushHistorySnapshot()

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
  if (!isAddToBundleMode && !positionSafe && supportsPositionForStitch(stitchId)) {
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
        first.label || null,
        resolvedStitchLookup.value || undefined
      )
      pendingReplaceNode.value = nextBundle
      pendingPattern.value = [nextBundle]
      return
    }

    if (first.type === 'stitch' && typeof first.stitch_id === 'number') {
      const nextInner = [createSimpleStitch(first.stitch_id, first.position, resolvedStitchLookup.value || undefined)]
      appendStitchIntoBundleList(nextInner, stitchId, positionSafe)
      const nextBundle = createBundle(nextInner, 1, 1, null, resolvedStitchLookup.value || undefined)
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
  if (!supportsPosition.value) return
  if (!isStitchSelected.value) return

  pushHistorySnapshot()

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
  pushHistorySnapshot()
  pendingPattern.value = [...pendingPattern.value, bundle]
}

const handleAddRope = (rope) => {
  if (!isPatternSelected.value) return
  if (!rope || rope.type !== 'rope') return
  pushHistorySnapshot()
  pendingPattern.value = [...pendingPattern.value, rope]
}

const handleConfirm = async ({ close = true } = {}) => {
  // Ensure any focused input (e.g. InputNumber) commits its value before we read pending refs.
  if (typeof document !== 'undefined') {
    const el = document.activeElement
    if (el && typeof el.blur === 'function') el.blur()
  }
  await nextTick()

  const changes = {}

  if (draftTouched.value || countDirty.value) {
    changes.applyDraft = true
  }

  // Count edits are written into row_copy when the number picker is saved.

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
  } else if (close) {
    emit('cancel')
  }
}

const handleCancel = async ({ close = true, skipConfirm = false } = {}) => {
  if (isDirty.value && !skipConfirm) {
    const ok = await openConfirmation({ type: 'discardChanges' })
    if (!ok) return
  }

  // Reset to original values
  suppressDraftEmit.value = true
  draftTouched.value = false
  resetCountDirty()
  pendingStitchId.value = null
  pendingReplaceNode.value = null
  stitchEditTab.value = 'change'
  pendingPattern.value = props.currentPattern ? [...props.currentPattern] : []
  clearEditHistory()
  nextTick(() => {
    suppressDraftEmit.value = false
  })
  emit('draft-pattern-change', null)
  if (close) emit('cancel')
}

defineExpose({
  confirm: handleConfirm,
  cancel: handleCancel,
  isDirty
})

</script>

<style scoped>
.edit-crochet {
  /* Fills the fixed-height tab panel (EditRowCrochetTabs) */
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.edit-crochet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.edit-crochet__body::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.edit-crochet__actions {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  background: rgba(255, 255, 255, 0.92);
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
  gap: 0.5rem;
  flex-wrap: wrap;
}

.crochet-column-header__main {
  flex: 1 1 auto;
  min-width: 180px;
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
  width: auto;
}


.pattern-display {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.5;
}

</style>
