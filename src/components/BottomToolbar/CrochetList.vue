<template>
  <div class="crochet-list-wrapper">
    <div class="crochet-list">
      <button
        v-for="crochet in stitches"
        :key="getStitchId(crochet)"
        type="button"
        class="crochet-button"
        :class="{ 'is-selected': selectedStitchId === getStitchId(crochet) }"
        :disabled="disabled || !isStitchEnabled(getStitchId(crochet)) || isStitchDisabledByPositionSelection(getStitchId(crochet)) || isStitchDisabledByDecreaseMode(getStitchId(crochet))"
        @click="handleStitchClick(getStitchId(crochet))"
      >
        <div class="crochet-symbol">{{ getStitchLabel(crochet) }}</div>
      </button>

      <button
        v-for="sd in selfDefinedStitches"
        :key="getStitchId(sd)"
        type="button"
        class="crochet-button crochet-button--self-defined"
        :class="{ 'is-selected': selectedStitchId === getStitchId(sd) }"
        :disabled="disabled || !isStitchEnabled(getStitchId(sd)) || isStitchDisabledByPositionSelection(getStitchId(sd)) || isStitchDisabledByDecreaseMode(getStitchId(sd))"
        @click="handleStitchClick(getStitchId(sd))"
      >
        <div class="crochet-symbol">{{ getStitchLabel(sd) }}</div>
      </button>

      <button
        v-if="showCustomButton"
        type="button"
        class="crochet-button custom-button"
        :disabled="disabled || isCustomDisabledByPositionSelection || decreaseMode"
        @click="$emit('custom-click')"
      >
        <div class="crochet-symbol">{{ t('toolbar.addCrochet.custom') }}</div>
      </button>
    </div>

    <div class="side-panels">
      <div
        class="position-panel"
        :aria-label="t('toolbar.addCrochet.position.ariaLabel')"
      >
        <button
          v-for="opt in positionOptions"
          :key="opt.value"
          type="button"
          class="crochet-position-button"
          :class="{ active: selectedPosition === opt.value }"
          :disabled="positionTogglesDisabled"
          :aria-pressed="selectedPosition === opt.value"
          @click="togglePosition(opt.value)"
        >
          <div v-if="opt.label" class="crochet-symbol">{{ opt.label }}</div>
        </button>
      </div>

      <div
        class="position-panel position-panel--decrease"
        :aria-label="t('toolbar.addCrochet.decrease.ariaLabel')"
      >
        <button
          type="button"
          class="crochet-position-button"
          :class="{ active: isDecreaseSelected }"
          :disabled="decreaseDisabled"
          :aria-pressed="isDecreaseSelected"
          @click="toggleDecrease"
        >
          <div class="crochet-symbol decrease-symbol">{{ decreaseSymbol }}</div>
          <div class="crochet-symbol decrease-text">{{ decreaseText }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BasicStitchGeneral,
  CrochetPositionOptions,
  getVariantStitchId,
  getStitchDisplayText
} from '@/constants/crochetData'
import { useCrochetLang } from '@/composables/useCrochetLang'

const { t } = useI18n({ useScope: 'global' })

const { crochetLang } = useCrochetLang()

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  emitOnDecreaseToggle: {
    type: Boolean,
    default: false
  },
  selfDefinedStitches: {
    type: Array,
    default: () => []
  },
  presetStitchId: {
    type: Number,
    default: null
  },
  presetPosition: {
    type: String,
    default: ''
  },
  defaultPosition: {
    type: String,
    default: ''
  },
  stitches: {
    type: Array,
    default: () => BasicStitchGeneral
  },
  enabledStitchIds: {
    type: Array,
    default: null
  },
  showCustomButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['stitch-click', 'custom-click', 'position-change'])

const selfDefinedIdSet = computed(() => {
  const set = new Set()
  const list = Array.isArray(props.selfDefinedStitches) ? props.selfDefinedStitches : []
  for (const s of list) {
    const id = Number(s?.stitch_id)
    if (Number.isFinite(id)) set.add(id)
  }
  return set
})

const isSelfDefinedStitchId = (stitchId) => {
  const id = Number(stitchId)
  if (!Number.isFinite(id)) return false
  return selfDefinedIdSet.value.has(id)
}

const isStitchEnabled = (stitchId) => {
  const list = props.enabledStitchIds
  if (!Array.isArray(list) || list.length === 0) return true
  return list.includes(stitchId)
}

const selectedStitchId = ref(null)
const selectedPosition = ref('')
const decreaseMode = ref(false)

const POSITION_SUPPORTED_STITCH_IDS = new Set([4, 7, 10, 13, 6, 9, 12, 15]) // X, T, F, E and their decrease variants
const POSITION_DISABLED_STITCH_IDS = new Set([0, 1, 2, 3]) // sl, ch, skip

const DECREASE_ALLOWED_BASE_STITCH_IDS = new Set([4, 7, 10, 13]) // X, T, F, E

const isStitchDisabledByPositionSelection = (stitchId) => {
  // If a position toggle is selected, prevent clicking stitches that don't make sense with positions.
  // This avoids confusing UX where a selected position appears to "do nothing" for these stitches.
  if (!selectedPosition.value) return false
  // Self-defined stitches do not support position; disable when a position is selected.
  if (isSelfDefinedStitchId(stitchId)) return true
  return POSITION_DISABLED_STITCH_IDS.has(stitchId)
}

const isStitchDisabledByDecreaseMode = (stitchId) => {
  if (!decreaseMode.value) return false
  if (isSelfDefinedStitchId(stitchId)) return true
  return !DECREASE_ALLOWED_BASE_STITCH_IDS.has(stitchId)
}

const isCustomDisabledByPositionSelection = computed(() => {
  // Custom stitch does not support position; disable it when a position is selected
  // to avoid accidental carry-over confusion.
  return !!selectedPosition.value
})

const positionTogglesDisabled = computed(() => {
  if (props.disabled) return true
  if (selectedStitchId.value === null) return false
  if (isSelfDefinedStitchId(selectedStitchId.value)) return true
  return POSITION_DISABLED_STITCH_IDS.has(selectedStitchId.value)
})

const isDecreaseSelected = computed(() => decreaseMode.value)

const decreaseDisabled = computed(() => props.disabled)

const decreaseSymbol = 'A'
const decreaseText = computed(() => t('toolbar.addCrochet.decrease.ariaLabel'))

const DECREASE_VARIANT_TO_BASE = computed(() => {
  const map = new Map()
  for (const baseId of DECREASE_ALLOWED_BASE_STITCH_IDS) {
    const variantId = getVariantStitchId(baseId, 'decrease')
    if (variantId !== null && variantId !== undefined) {
      map.set(variantId, baseId)
    }
  }
  return map
})

const emitStitchSelection = (stitchId) => {
  const effectivePosition = POSITION_SUPPORTED_STITCH_IDS.has(stitchId)
    ? selectedPosition.value
    : ''

  emit('stitch-click', {
    stitch_id: stitchId,
    position: effectivePosition
  })
}

const toggleDecrease = () => {
  if (decreaseDisabled.value) return

  const next = !decreaseMode.value
  decreaseMode.value = next

  // In Change-stitch mode, toggling decrease should immediately apply to the
  // currently selected base stitch (X/T/F/E) to avoid requiring an extra click.
  if (!props.emitOnDecreaseToggle) return

  const current = selectedStitchId.value
  if (current === null || current === undefined) return

  if (next) {
    // turning ON
    if (!DECREASE_ALLOWED_BASE_STITCH_IDS.has(current)) return
    const variantId = getVariantStitchId(current, 'decrease')
    if (variantId === null || variantId === undefined) return
    selectedStitchId.value = variantId
    emitStitchSelection(variantId)
    return
  }

  // turning OFF
  const baseId = DECREASE_VARIANT_TO_BASE.value.get(current)
  if (baseId === null || baseId === undefined) return
  selectedStitchId.value = baseId
  emitStitchSelection(baseId)
}

const positionOptions = computed(() => {
  return CrochetPositionOptions.map((opt) => ({
    value: opt.symbol_jp,
    label: getStitchDisplayText(opt, crochetLang.value)
  }))
})

const normalizePosition = (pos) => {
  return typeof pos === 'string' ? pos.trim().toUpperCase() : ''
}

const togglePosition = (pos) => {
  if (positionTogglesDisabled.value) return
  const next = normalizePosition(pos)
  const updated = selectedPosition.value === next ? '' : next
  selectedPosition.value = updated
  emit('position-change', updated)
}

const handleStitchClick = (stitchId) => {
  if (stitchId === null || stitchId === undefined) return

  // Decrease mode: only allow X/T/F/E. Clicking them emits decrease variants A/TA/FA/EA.
  if (decreaseMode.value) {
    if (!DECREASE_ALLOWED_BASE_STITCH_IDS.has(stitchId)) return
    const variantId = getVariantStitchId(stitchId, 'decrease')
    if (variantId === null || variantId === undefined) return
    selectedStitchId.value = variantId

    const effectivePosition = POSITION_SUPPORTED_STITCH_IDS.has(variantId)
      ? selectedPosition.value
      : ''

    emit('stitch-click', {
      stitch_id: variantId,
      position: effectivePosition
    })
    return
  }

  selectedStitchId.value = stitchId

  // Selecting a stitch must NOT change the current position selection.
  // Position only changes via the position toggle buttons.
  const effectivePosition = POSITION_SUPPORTED_STITCH_IDS.has(stitchId)
    ? selectedPosition.value
    : ''

  // Emit the new stitch payload shape.
  // Note: toggles do NOT auto-emit to avoid accidentally adding stitches.
  // Users can toggle first, then click the stitch again to add with position.
  const payload = {
    stitch_id: stitchId,
    position: effectivePosition
  }
  emit('stitch-click', payload)
}

const getStitchId = (stitch) => {
  if (!stitch || typeof stitch !== 'object') return null
  if (typeof stitch.index === 'number' && Number.isFinite(stitch.index)) return stitch.index
  const id = Number(stitch.stitch_id)
  return Number.isFinite(id) ? id : null
}

const getStitchLabel = (stitch) => {
  if (!stitch || typeof stitch !== 'object') return ''
  // Self-defined stitches always display their raw name.
  if (typeof stitch.name === 'string' && String(stitch.name).trim()) return String(stitch.name)
  return getStitchDisplayText(stitch, crochetLang.value)
}

watch(
  () => [props.presetStitchId, props.presetPosition],
  ([nextId, nextPos]) => {
    if (typeof nextId === 'number' && Number.isFinite(nextId)) {
      selectedStitchId.value = nextId
      const normalized = normalizePosition(nextPos)
      selectedPosition.value = POSITION_SUPPORTED_STITCH_IDS.has(nextId) ? normalized : ''

      // If preset is a decrease variant, reflect it in the UI.
      decreaseMode.value = new Set([6, 9, 12, 15]).has(nextId)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.crochet-list-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
  height: 100%;
  min-height: 0;
}

.side-panels {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.crochet-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 0.75rem;
  overflow-y: auto;
  padding-right: 0.5rem;
  flex: 1;
  height: fit-content;
  min-height: 0;
}

.crochet-scrollbar:not(.expanded) .crochet-list {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  max-height: none;
}

.crochet-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.crochet-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.crochet-button, .crochet-position-button {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 4rem;
  width: fit-content;
  padding: 0.5rem;
}

.crochet-button--self-defined {
  background: rgb(var(--color-icon-add-rgb) / 0.10);
  border-color: rgb(var(--color-icon-add-rgb) / 0.35);
}

.crochet-button--self-defined .crochet-symbol {
  color: var(--color-font-dark);
}

.crochet-button:hover:not(:disabled), .crochet-position-button.active {
  background: var(--color-icon-add);
  border-color: var(--color-icon-add);
  color: white;
}

.crochet-button:hover:not(:disabled) .crochet-stats {
  color: white;
}

.crochet-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.crochet-symbol {
  font-size: 0.75rem;
  line-height: 1.1;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.crochet-button:hover:not(:disabled) .crochet-symbol,
.crochet-position-button.active .crochet-symbol {
  color: white;
}

.decrease-symbol {
  font-size: 0.85rem;
}

.decrease-text {
  font-size: 0.62rem;
  opacity: 0.95;
}

.custom-button {
  background: #fef3c7;
  border-color: #fbbf24;
}

.custom-button:hover:not(:disabled) {
  background: #fbbf24;
  border-color: #f59e0b;
}

.position-panel {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  border-radius: 16px;
}
</style>
