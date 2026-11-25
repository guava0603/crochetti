<template>
  <div class="edit-crochet">
    <div class="edit-crochet__body">
      <!-- Input display: whole row, current pattern/bundle highlighted -->
      <div class="input-row">
        <GoParent v-if="containerPath.length > 0" class="input-row__back" @go-parent="handleGoParent" />
        <div class="input-display">
          <KeypadPreview
            :row-list="draftRow"
            :active-path="containerPath"
            @pick="handlePreviewPick"
            @update-count="handleUpdateCount"
          />
        </div>
        <ThinIconButton
          class="input-row__delete"
          src="137__previous"
          size="m"
          background="transparent"
          :disabled="!canDeleteLast"
          :aria-label="t('toolbar.editCrochet.deleteLast')"
          :title="t('toolbar.editCrochet.deleteLast')"
          @click="handleDeleteLast"
        />
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

      <!-- Hidden sections keep their space so the stitch buttons never move under the finger. -->
      <div class="keypad-structure">
        <!-- Pattern section -->
        <section class="keypad-section" :class="{ 'is-hidden': !showPatternSection }" :aria-hidden="!showPatternSection">
          <h4 class="keypad-section__title">{{ t('toolbar.editCrochet.sections.pattern') }}</h4>
          <button type="button" class="keypad-structure__button" :disabled="!showPatternSection" @click="handleStartPattern">
            {{ t('toolbar.editCrochet.repeatPattern') }}
          </button>
        </section>

        <!-- Same-stitch (bundle) section -->
        <section class="keypad-section" :class="{ 'is-hidden': !showBundleSection }" :aria-hidden="!showBundleSection">
          <h4 class="keypad-section__title">{{ t('toolbar.editCrochet.sections.bundle') }}</h4>
          <button type="button" class="keypad-structure__button" :disabled="!showBundleSection" @click="handleStartBundle">
            {{ t('toolbar.editCrochet.sameStitch') }}
          </button>
        </section>
      </div>
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
import GoParent from '@/components/shared/buttons/GoParent.vue'
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'
import { BasicStitch, createSimpleStitch } from '@/constants/crochetData.js'
import { openConfirmation } from '@/services/ui/confirmation'
import {
  appendNode,
  canRemoveLast,
  canStartBundle,
  canStartPattern,
  findLeafPatternPath,
  getContainerKind,
  insertEmptyBundle,
  insertEmptyPattern,
  isValidContainerPath,
  leaveContainer,
  moveToContainer,
  pruneEmptyContainers,
  removeLast,
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

const emit = defineEmits(['confirm', 'cancel', 'draft-pattern-change', 'dirty-change'])

const stitchLookupInjected = inject('stitchLookup', null)
const stitchLookup = computed(() => unref(stitchLookupInjected) || BasicStitch)

const clone = (v) => JSON.parse(JSON.stringify(v ?? []))

const draftRow = ref(clone(props.rowCopy))
const containerPath = ref([])
const touched = ref(false)

const isDirty = computed(() => touched.value)
watch(isDirty, (next) => emit('dirty-change', next), { immediate: true })

const resetFromRow = () => {
  draftRow.value = clone(props.rowCopy)
  containerPath.value = []
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
const canDeleteLast = computed(() => canRemoveLast(draftRow.value, containerPath.value))

const commit = ({ root, containerPath: nextPath } = {}) => {
  if (Array.isArray(root)) {
    draftRow.value = root
    touched.value = true
    emit('draft-pattern-change', { list: clone(root), replaceWholeRow: true })
  }
  if (Array.isArray(nextPath)) {
    containerPath.value = isValidContainerPath(draftRow.value, nextPath) ? nextPath : []
  }
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
  commit({ root: appendNode(draftRow.value, containerPath.value, node, stitchLookup.value) })
}

const handleAddRope = (rope) => {
  if (isInBundle.value) return
  if (!rope || rope.type !== 'rope') return
  commit({ root: appendNode(draftRow.value, containerPath.value, rope, stitchLookup.value) })
}

const handleStartPattern = () => {
  if (!showPatternSection.value) return
  commit(insertEmptyPattern(draftRow.value, containerPath.value, stitchLookup.value))
}

const handleStartBundle = () => {
  if (!showBundleSection.value) return
  commit(insertEmptyBundle(draftRow.value, containerPath.value, stitchLookup.value))
}

const commitIfChanged = (result) => {
  const changed = JSON.stringify(result.root) !== JSON.stringify(draftRow.value)
  commit({ root: changed ? result.root : undefined, containerPath: result.containerPath })
}

const handleGoParent = () => {
  commitIfChanged(leaveContainer(draftRow.value, containerPath.value, stitchLookup.value))
}

const handleDeleteLast = () => {
  if (!canDeleteLast.value) return
  commit(removeLast(draftRow.value, containerPath.value, stitchLookup.value))
}

// Clicking a node selects the deepest pattern containing it; outside any pattern nothing happens.
const handlePreviewPick = (nodePath) => {
  const target = findLeafPatternPath(draftRow.value, nodePath)
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
  gap: 0.5rem;
}

.input-row__delete {
  flex: none;
  align-self: center;
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
  color: #6b7280;
}

.keypad-section--stitch :deep(.crochet-list) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-right: 0.5rem;
}

.keypad-structure {
  flex: none;
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.keypad-structure .keypad-section {
  flex: 1;
}

.keypad-structure__button {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
}

.keypad-section.is-hidden {
  visibility: hidden;
}

.keypad-structure__button:active {
  transform: translateY(1px);
}
</style>
