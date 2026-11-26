<template>
  <div class="edit-crochet">
    <div class="edit-crochet__body">
      <!-- Input display: whole row, current pattern/bundle highlighted -->
      <div class="input-row">
        <KeypadCaretButton direction="left" :disabled="caret <= 0" @move="moveCaret" />
        <div class="input-display">
          <KeypadPreview
            :row-list="draftRow"
            :active-path="containerPath"
            :caret="caret"
            @pick="handlePreviewPick"
            @update-count="handleUpdateCount"
          />
        </div>
        <KeypadCaretButton direction="right" :disabled="caret >= currentChildCount" @move="moveCaret" />
        <ThinIconButton
          class="input-row__delete"
          src="137__previous"
          size="m"
          background="transparent"
          :disabled="!canDeleteBefore"
          :aria-label="t('toolbar.editCrochet.deleteBefore')"
          :title="t('toolbar.editCrochet.deleteBefore')"
          @click="handleDeleteBefore"
        />
      </div>

      <!-- 重複花樣 / 在同一針目裡: buttons only, above the stitches. A hidden button keeps its
           space so the stitch buttons never move under the finger. -->
      <div class="keypad-structure">
        <button
          type="button"
          class="keypad-structure__button"
          :class="{ 'is-hidden': !showPatternSection }"
          :aria-hidden="!showPatternSection"
          :disabled="!showPatternSection"
          @click="handleStartPattern"
        >
          {{ t('toolbar.editCrochet.repeatPattern') }}
        </button>
        <button
          type="button"
          class="keypad-structure__button"
          :class="{ 'is-hidden': !showBundleSection }"
          :aria-hidden="!showBundleSection"
          :disabled="!showBundleSection"
          @click="handleStartBundle"
        >
          {{ t('toolbar.editCrochet.sameStitch') }}
        </button>
      </div>

      <!-- Stitch section -->
      <section class="keypad-section keypad-section--stitch">
        <h4 class="keypad-section__title">{{ t('toolbar.editCrochet.sections.stitch') }}</h4>
        <AddCrochet
          :craft-key="craftKey"
          :stitches="stitchesForList"
          :show-custom-button="showCustomButton"
          :disable-rope="isInBundle"
          :enable-wizard="enableWizard"
          :enable-self-defined-stitches="enableSelfDefinedStitches"
          @add-crochet="handleAddCrochet"
          @add-rope="handleAddRope"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
// Keypad for editing one row.
// The keypad owns a draft of the whole row plus a cursor (`containerPath`) into
// nested patterns/bundles; all edits go through the pure helpers in utils/keypadEdit.
// Every change is reported upward as a whole-row draft, so the table preview and
// Save/Cancel in EditingTable work on that draft.
import { ref, computed, watch, nextTick, inject, unref } from 'vue'
import { useI18n } from 'vue-i18n'
import AddCrochet from '@/components/features/crochet-editor/BottomToolbar/AddCrochet.vue'
import KeypadPreview from '@/components/features/crochet-editor/BottomToolbar/KeypadPreview.vue'
import KeypadCaretButton from '@/components/features/crochet-editor/BottomToolbar/KeypadCaretButton.vue'
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'
import { BasicStitch, createSimpleStitch } from '@/constants/crochetData.js'
import { openConfirmation } from '@/services/ui/confirmation'
import {
  canRemoveBefore,
  canStartBundle,
  canStartPattern,
  clampCaret,
  findLeafContainerPath,
  getContainerChildren,
  getContainerKind,
  insertEmptyBundle,
  insertEmptyPattern,
  insertNode,
  isValidContainerPath,
  leaveContainer,
  moveToContainer,
  pruneEmptyContainers,
  removeBefore,
  setContainerCount
} from '@/utils/keypadEdit'

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
  // Identity of the row being edited; switching rows resets the cursor.
  rowKey: {
    type: [Number, String],
    default: null
  },
  // Current row content (EditingTable's draft when one exists, otherwise the saved row).
  rowCopy: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['confirm', 'cancel', 'draft-pattern-change', 'dirty-change', 'selection-change'])

const stitchLookupInjected = inject('stitchLookup', null)
const stitchLookup = computed(() => unref(stitchLookupInjected) || BasicStitch)

const clone = (v) => JSON.parse(JSON.stringify(v ?? []))

const draftRow = ref(clone(props.rowCopy))
const containerPath = ref([])
// Insertion point: index inside the current container (0…its child count).
const caret = ref(draftRow.value.length)
const touched = ref(false)

const isDirty = computed(() => touched.value)
watch(isDirty, (next) => emit('dirty-change', next), { immediate: true })

const resetFromRow = () => {
  draftRow.value = clone(props.rowCopy)
  containerPath.value = []
  caret.value = draftRow.value.length
  touched.value = false
}

// External changes (row switch, cancel clearing the draft, saved row updates) win over the local draft.
watch(
  () => props.rowCopy,
  (next) => {
    if (JSON.stringify(next ?? []) === JSON.stringify(draftRow.value)) return
    resetFromRow()
  },
  { deep: true }
)

watch(() => props.rowKey, resetFromRow)

const containerKind = computed(() => getContainerKind(draftRow.value, containerPath.value))
const isInBundle = computed(() => containerKind.value === 'bundle')
const showPatternSection = computed(() => canStartPattern(draftRow.value, containerPath.value))
const showBundleSection = computed(() => canStartBundle(draftRow.value, containerPath.value))
const canDeleteBefore = computed(() => canRemoveBefore(draftRow.value, containerPath.value, caret.value))
const currentChildCount = computed(() => getContainerChildren(draftRow.value, containerPath.value).length)

/**
 * Apply a helper result: new row, new container and/or new caret. The caret is always
 * clamped to the (new) current container, so it can never leave the selected domain.
 */
const commit = ({ root, containerPath: nextPath, caret: nextCaret } = {}) => {
  if (Array.isArray(root)) {
    draftRow.value = root
    touched.value = true
    emit('draft-pattern-change', { list: clone(root), replaceWholeRow: true })
  }
  if (Array.isArray(nextPath)) {
    containerPath.value = isValidContainerPath(draftRow.value, nextPath) ? nextPath : []
  }
  caret.value = clampCaret(draftRow.value, containerPath.value, nextCaret ?? caret.value)
}

/** ◀ / ▶: move the insertion point by one inside the current container. */
const moveCaret = (delta) => {
  caret.value = clampCaret(draftRow.value, containerPath.value, caret.value + delta)
}

const handleAddCrochet = (payload) => {
  const stitchId = typeof payload === 'number' ? payload : (payload?.stitchId ?? payload?.stitch_id)
  if (stitchId === null || stitchId === undefined) return
  const position = typeof payload === 'object' ? String(payload?.position ?? '') : ''

  let node
  try {
    node = createSimpleStitch(stitchId, position, stitchLookup.value)
  } catch {
    return
  }
  commit(insertNode(draftRow.value, containerPath.value, caret.value, node, stitchLookup.value))
}

const handleAddRope = (rope) => {
  if (isInBundle.value) return
  if (!rope || rope.type !== 'rope') return
  commit(insertNode(draftRow.value, containerPath.value, caret.value, rope, stitchLookup.value))
}

const handleStartPattern = () => {
  if (!showPatternSection.value) return
  commit(insertEmptyPattern(draftRow.value, containerPath.value, stitchLookup.value, caret.value))
}

const handleStartBundle = () => {
  if (!showBundleSection.value) return
  commit(insertEmptyBundle(draftRow.value, containerPath.value, stitchLookup.value, caret.value))
}

const commitIfChanged = (result) => {
  const changed = JSON.stringify(result.root) !== JSON.stringify(draftRow.value)
  commit({ root: changed ? result.root : undefined, containerPath: result.containerPath, caret: result.caret })
}

// 確認 in the bottom bar (EditRowCrochetTabs) confirms the selected pattern/bundle and
// goes up one level; leaving an empty container removes it.
const confirmSelection = () => {
  commitIfChanged(leaveContainer(draftRow.value, containerPath.value, stitchLookup.value))
}

// Tell the bottom bar whether a pattern/bundle is selected (it then shows only 確認).
const isInContainer = computed(() => containerPath.value.length > 0)
watch(isInContainer, (next) => emit('selection-change', next), { immediate: true })

// Delete (backspace): remove the node before the insertion point.
const handleDeleteBefore = () => {
  if (!canDeleteBefore.value) return
  commit(removeBefore(draftRow.value, containerPath.value, caret.value, stitchLookup.value))
}

// Tapping a node:
// - a stitch/rope directly in the current domain moves the insertion point right after it;
// - otherwise, the deepest pattern or bundle containing it is selected (caret at its end);
// - outside both nothing happens.
const handlePreviewPick = (nodePath) => {
  const path = Array.isArray(nodePath) ? nodePath : []
  const here = containerPath.value
  const isDirectChild = path.length === here.length + 1 && here.every((v, i) => v === path[i])
  const target = findLeafContainerPath(draftRow.value, path)
  const tappedContainer = target && target.length === path.length
  if (isDirectChild && !tappedContainer) {
    caret.value = clampCaret(draftRow.value, here, path[path.length - 1] + 1)
    return
  }
  if (!target) return
  commitIfChanged(moveToContainer(draftRow.value, containerPath.value, target, stitchLookup.value))
}

const handleUpdateCount = (n) => {
  commit({ root: setContainerCount(draftRow.value, containerPath.value, n, stitchLookup.value) })
}

const handleConfirm = async ({ close = true } = {}) => {
  // Let a focused InputNumber commit its value first.
  if (typeof document !== 'undefined') {
    const el = document.activeElement
    if (el && typeof el.blur === 'function') el.blur()
  }
  await nextTick()

  if (!touched.value) {
    if (close) emit('cancel')
    return
  }

  const cleaned = pruneEmptyContainers(draftRow.value, stitchLookup.value)
  emit('draft-pattern-change', { list: cleaned, replaceWholeRow: true })
  await nextTick()
  emit('confirm', { applyDraft: true })
}

const handleCancel = async ({ close = true, skipConfirm = false } = {}) => {
  if (isDirty.value && !skipConfirm) {
    const ok = await openConfirmation({ type: 'discardChanges' })
    if (!ok) return
  }
  emit('draft-pattern-change', null)
  await nextTick()
  resetFromRow()
  if (close) emit('cancel')
}

defineExpose({
  confirm: handleConfirm,
  cancel: handleCancel,
  confirmSelection,
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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.edit-crochet__body::-webkit-scrollbar {
  display: none;
}

.input-row {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
}

/* ◀ [input display] ▶ ⌫ — same space on both sides of the display. */
.input-display {
  margin: 0 0.25rem;
}

.input-row__delete {
  flex: none;
  align-self: center;
  /* The icon box is scaled past the button; keep it from widening the row. */
  overflow: hidden;
}

.input-display {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  padding: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.keypad-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.keypad-section__title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-font-note);
}

.keypad-section--stitch :deep(.crochet-list) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keypad-structure {
  flex: none;
  display: flex;
  gap: 0.75rem;
}

.keypad-structure__button {
  flex: 1;
}

.keypad-structure__button.is-hidden {
  visibility: hidden;
}

.keypad-structure__button {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-font-option);
  cursor: pointer;
}


.keypad-structure__button:active {
  transform: translateY(1px);
}
</style>
