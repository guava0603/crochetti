<template>
  <div class="crochet-list-wrapper">
    <div class="crochet-list">
      <button
        v-for="crochet in stitches"
        :key="getStitchId(crochet)"
        type="button"
        class="crochet-button"
        :class="{ 'is-selected': selectedStitchId === getStitchId(crochet) }"
        :disabled="disabled || !isStitchEnabled(getStitchId(crochet)) || isStitchDisabledByPositionSelection(getStitchId(crochet)) || isStitchDisabledByAdjustMode(getStitchId(crochet))"
        @click="handleStitchClick(getStitchId(crochet))"
      >
        <img
          v-if="supportsIcons && getStitchIconUrl(crochet)"
          class="crochet-icon"
          :src="getStitchIconUrl(crochet)"
          :alt="getStitchLabel(crochet)"
        />
        <div v-else class="crochet-symbol">{{ getStitchLabel(crochet) }}</div>
      </button>

      <button
        v-for="sd in selfDefinedStitches"
        :key="getStitchId(sd)"
        type="button"
        class="crochet-button crochet-button--self-defined"
        :class="{ 'is-selected': selectedStitchId === getStitchId(sd) }"
        :disabled="disabled || !isStitchEnabled(getStitchId(sd)) || isStitchDisabledByPositionSelection(getStitchId(sd)) || isStitchDisabledByAdjustMode(getStitchId(sd))"
        @click="handleStitchClick(getStitchId(sd))"
      >
        <div class="crochet-symbol">{{ getStitchLabel(sd) }}</div>
      </button>

      <button
        v-for="p in ropePresets"
        :key="`rope-${p.chainCount}`"
        type="button"
        class="crochet-button crochet-button--self-defined"
        :disabled="disabled || isCustomDisabledByPositionSelection || adjustMode !== 'none'"
        @click="$emit('rope-preset-click', p)"
      >
        <div class="crochet-symbol">{{ formatRopePresetLabel(p) }}</div>
      </button>

      <button
        v-if="showCustomButton"
        type="button"
        class="crochet-button custom-button"
        :disabled="disabled || isCustomDisabledByPositionSelection || adjustMode !== 'none'"
        @click="$emit('bundle-click')"
      >
        <div class="crochet-symbol">{{ t('toolbar.addCrochet.quickAdd.bundle') }}</div>
      </button>

      <button
        v-if="showCustomButton"
        type="button"
        class="crochet-button custom-button"
        :disabled="disabled || isCustomDisabledByPositionSelection || adjustMode !== 'none'"
        @click="$emit('raised-click')"
      >
        <div class="crochet-symbol">{{ t('toolbar.addCrochet.moreWizard.options.raised') }}</div>
      </button>

      <button
        v-if="showCustomButton"
        type="button"
        class="crochet-button custom-button"
        :disabled="disabled || isCustomDisabledByPositionSelection || adjustMode !== 'none'"
        @click="$emit('custom-click')"
      >
        <div class="crochet-symbol">{{ t('toolbar.addCrochet.moreWizard.options.custom') }}</div>
      </button>
    </div>

    <div v-if="supportsPosition" class="side-panels">

      <div class="position-panel" :aria-label="t('toolbar.addCrochet.adjust.ariaLabel')">
        <div class="crochet-adjust-group" role="group" :aria-label="t('toolbar.addCrochet.adjust.ariaLabel')">
          <button
            type="button"
            class="crochet-position-button crochet-adjust-button--top"
            :class="{ active: isIncreaseSelected }"
            :disabled="adjustDisabled"
            :aria-pressed="isIncreaseSelected"
            :aria-label="increaseText"
            @click="toggleAdjust('increase')"
          >
            <div class="crochet-symbol">{{ increaseButtonLabel }}</div>
          </button>

          <button
            type="button"
            class="crochet-position-button crochet-adjust-button--bottom"
            :class="{ active: isDecreaseSelected }"
            :disabled="adjustDisabled"
            :aria-pressed="isDecreaseSelected"
            :aria-label="decreaseText"
            @click="toggleAdjust('decrease')"
          >
            <div class="crochet-symbol">{{ decreaseButtonLabel }}</div>
          </button>
        </div>
      </div>
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
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BasicStitchGeneral,
  CROCHET_LANG,
  CrochetPositionOptions,
  getVariantStitchId,
  getStitchDisplayText
} from '@/constants/crochetData'
import { getCrochetIconUrl } from '@/constants/crochetIcons'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { normalizeRopeChainCount } from '@/utils/ropeChainCount'

const { t } = useI18n({ useScope: 'global' })

const { crochetLang } = useCrochetLang()

const isIconMode = computed(() => Number(crochetLang.value) === CROCHET_LANG.icon)

const props = defineProps({
  craftKey: {
    type: String,
    default: 'crochet'
  },
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
  ropePresets: {
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

const emit = defineEmits(['stitch-click', 'bundle-click', 'raised-click', 'custom-click', 'rope-preset-click', 'position-change'])

const supportsPosition = computed(() => String(props.craftKey || 'crochet') === 'crochet')

const supportsIcons = computed(() => {
  return supportsPosition.value && isIconMode.value
})

const formatRopePresetLabel = (p) => {
  if (!supportsPosition.value) return ''
  const safe = normalizeRopeChainCount(p?.chainCount)
  // Display like: 繩束 12ch
  return `${t('toolbar.addCrochet.ropeBundle.title')} ${safe}${getStitchDisplayText(BasicStitchGeneral[1], crochetLang.value) || 'ch'}`
}

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
const adjustMode = ref('none') // 'none' | 'increase' | 'decrease'

const POSITION_SUPPORTED_STITCH_IDS = new Set([4, 7, 10, 13, 6, 9, 12, 15]) // X, T, F, E and their decrease variants
const POSITION_DISABLED_STITCH_IDS = new Set([0, 1, 2, 3]) // sl, ch, skip

const ADJUST_ALLOWED_BASE_STITCH_IDS = new Set([4, 7, 10, 13]) // X, T, F, E

const isStitchDisabledByPositionSelection = (stitchId) => {
  if (!supportsPosition.value) return false
  // If a position toggle is selected, prevent clicking stitches that don't make sense with positions.
  // This avoids confusing UX where a selected position appears to "do nothing" for these stitches.
  if (!selectedPosition.value) return false
  // Self-defined stitches do not support position; disable when a position is selected.
  if (isSelfDefinedStitchId(stitchId)) return true
  return POSITION_DISABLED_STITCH_IDS.has(stitchId)
}

const isStitchDisabledByAdjustMode = (stitchId) => {
  if (!supportsPosition.value) return false
  if (adjustMode.value === 'none') return false
  if (isSelfDefinedStitchId(stitchId)) return true
  return !ADJUST_ALLOWED_BASE_STITCH_IDS.has(stitchId)
}

const isCustomDisabledByPositionSelection = computed(() => {
  if (!supportsPosition.value) return false
  // Custom stitch does not support position; disable it when a position is selected
  // to avoid accidental carry-over confusion.
  return !!selectedPosition.value
})

const positionTogglesDisabled = computed(() => {
  if (!supportsPosition.value) return true
  if (props.disabled) return true
  if (selectedStitchId.value === null) return false
  if (isSelfDefinedStitchId(selectedStitchId.value)) return true
  return POSITION_DISABLED_STITCH_IDS.has(selectedStitchId.value)
})

const isIncreaseSelected = computed(() => adjustMode.value === 'increase')
const isDecreaseSelected = computed(() => adjustMode.value === 'decrease')

const adjustDisabled = computed(() => props.disabled)

const increaseSymbol = 'V'
const decreaseSymbol = 'A'

const increaseText = computed(() => t('toolbar.addCrochet.adjust.increase'))
const decreaseText = computed(() => t('toolbar.addCrochet.adjust.decrease'))

const isSymbolMode = computed(() => {
  const lang = Number(crochetLang.value)
  return lang === CROCHET_LANG.symbol_jp || lang === CROCHET_LANG.symbol_uk
})
const decreaseButtonLabel = computed(() => (isSymbolMode.value ? decreaseSymbol : decreaseText.value))

const increaseButtonLabel = computed(() => (isSymbolMode.value ? increaseSymbol : increaseText.value))

const DECREASE_VARIANT_TO_BASE = computed(() => {
  const map = new Map()
  for (const baseId of ADJUST_ALLOWED_BASE_STITCH_IDS) {
    const variantId = getVariantStitchId(baseId, 'decrease')
    if (variantId !== null && variantId !== undefined) {
      map.set(variantId, baseId)
    }
  }
  return map
})

const INCREASE_VARIANT_TO_BASE = computed(() => {
  const map = new Map()
  for (const baseId of ADJUST_ALLOWED_BASE_STITCH_IDS) {
    const variantId = getVariantStitchId(baseId, 'increase')
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

const resolveBaseForAdjust = (stitchId) => {
  if (stitchId === null || stitchId === undefined) return null
  if (ADJUST_ALLOWED_BASE_STITCH_IDS.has(stitchId)) return stitchId
  const fromDecrease = DECREASE_VARIANT_TO_BASE.value.get(stitchId)
  if (fromDecrease !== null && fromDecrease !== undefined) return fromDecrease
  const fromIncrease = INCREASE_VARIANT_TO_BASE.value.get(stitchId)
  if (fromIncrease !== null && fromIncrease !== undefined) return fromIncrease
  return null
}

const toggleAdjust = (mode) => {
  if (adjustDisabled.value) return

  const nextMode = mode === 'decrease' ? 'decrease' : 'increase'
  const isTogglingOff = adjustMode.value === nextMode
  const current = selectedStitchId.value

  if (isTogglingOff) {
    adjustMode.value = 'none'

    // If we are currently on a variant, revert to base.
    const baseId = resolveBaseForAdjust(current)
    if (!props.emitOnDecreaseToggle) return
    if (baseId === null || baseId === undefined) return
    if (baseId === current) return
    selectedStitchId.value = baseId
    emitStitchSelection(baseId)
    return
  }

  // Switching ON (or switching modes): set mode first
  adjustMode.value = nextMode

  // In Change-stitch mode, toggling should immediately apply to the currently
  // selected stitch to avoid requiring an extra click.
  if (!props.emitOnDecreaseToggle) return

  const baseId = resolveBaseForAdjust(current)
  if (baseId === null || baseId === undefined) return
  if (!ADJUST_ALLOWED_BASE_STITCH_IDS.has(baseId)) return

  const variantId = getVariantStitchId(baseId, nextMode)
  if (variantId === null || variantId === undefined) return
  selectedStitchId.value = variantId
  emitStitchSelection(variantId)
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

const iconPosition = computed(() => {
  // We only have dedicated icons for FP/BP (post stitches). FL/BL falls back to base icons.
  const pos = normalizePosition(selectedPosition.value)
  return pos === 'FP' || pos === 'BP' ? pos : ''
})

const getStitchIconUrl = (stitch) => {
  if (!stitch || typeof stitch !== 'object') return ''
  const stitchId = getStitchId(stitch)
  if (stitchId === null || stitchId === undefined) return ''
  if (isSelfDefinedStitchId(stitchId)) return ''
  return getCrochetIconUrl({ stitch, position: iconPosition.value })
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

  // Non-crochet craft: no position/adjust logic.
  if (!supportsPosition.value) {
    selectedStitchId.value = stitchId
    emit('stitch-click', { stitch_id: stitchId, position: '' })
    return
  }

  // Adjust mode: only allow X/T/F/E. Clicking them emits increase/decrease variants.
  if (adjustMode.value !== 'none') {
    if (!ADJUST_ALLOWED_BASE_STITCH_IDS.has(stitchId)) return
    const variantId = getVariantStitchId(stitchId, adjustMode.value)
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

  // Non-crochet crafts: prefer i18n nameKey, fallback to symbols.
  if (!supportsPosition.value) {
    const key = typeof stitch.nameKey === 'string' ? String(stitch.nameKey).trim() : ''
    if (key) {
      const translated = t(key)
      if (translated && translated !== key) return translated
    }
    const symbolJp = typeof stitch.symbol_jp === 'string' ? String(stitch.symbol_jp).trim() : ''
    const symbolUk = typeof stitch.symbol_uk === 'string' ? String(stitch.symbol_uk).trim() : ''
    return symbolJp || symbolUk || String(getStitchId(stitch) ?? '')
  }

  // Self-defined stitches may provide per-mode display text.
  // Fallback to raw name if not provided.
  const id = getStitchId(stitch)
  if (id !== null && id !== undefined && isSelfDefinedStitchId(id)) {
    const name = typeof stitch.name === 'string' ? String(stitch.name).trim() : ''
    const symbolJp = typeof stitch.symbol_jp === 'string' ? String(stitch.symbol_jp).trim() : ''
    const symbolUk = typeof stitch.symbol_uk === 'string' ? String(stitch.symbol_uk).trim() : ''
    const textZh = typeof stitch.text_zh === 'string' ? String(stitch.text_zh).trim() : ''

    const lang = Number(crochetLang.value)
    if (lang === CROCHET_LANG.symbol_uk) return symbolUk || symbolJp || name
    if (lang === CROCHET_LANG.symbol_jp) return symbolJp || name
    if (lang === CROCHET_LANG.text_zh || lang === CROCHET_LANG.icon) return textZh || name
    return name
  }
  return getStitchDisplayText(stitch, crochetLang.value)
}

watch(
  () => [props.presetStitchId, props.presetPosition],
  ([nextId, nextPos]) => {
    if (typeof nextId === 'number' && Number.isFinite(nextId)) {
      selectedStitchId.value = nextId
      if (supportsPosition.value) {
        const normalized = normalizePosition(nextPos)
        selectedPosition.value = POSITION_SUPPORTED_STITCH_IDS.has(nextId) ? normalized : ''

        // If preset is an adjustment variant, reflect it in the UI.
        if (new Set([5, 8, 11, 14, 17]).has(nextId)) {
          adjustMode.value = 'increase'
        } else if (new Set([6, 9, 12, 15, 18]).has(nextId)) {
          adjustMode.value = 'decrease'
        } else {
          adjustMode.value = 'none'
        }
      } else {
        selectedPosition.value = ''
        adjustMode.value = 'none'
      }
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
  gap: 0.5rem;
}

.crochet-adjust-group {
  display: flex;
  flex-direction: column;
}

.crochet-adjust-button {
  width: 100%;
  height: 70px;
  min-width: 54px;
  padding: 0;
  background: white;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}

.crochet-adjust-button--top {
  border-bottom: none;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.crochet-adjust-button--bottom {
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}

.crochet-adjust-button.active {
  background: #dbeafe;
  border-color: #93c5fd;
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
  justify-content: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: calc((100% - 1.5rem) / 4);
  width: fit-content;
  padding: 0.5rem;
}

/* Side panel buttons behave like a vertical button-group */
.crochet-position-button {
  width: 100%;
  min-width: 4rem;
  border-radius: 0;
  border: 0;
  border-bottom: 1px solid #e5e7eb;
  background: transparent;
  padding: 0.55rem 0.35rem;
}

.crochet-position-button:last-child {
  border-bottom: 0;
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
  border-color: transparent;
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

.crochet-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.crochet-button:hover:not(:disabled) .crochet-symbol,
.crochet-position-button.active .crochet-symbol {
  color: white;
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
  width: 4rem;
  border-radius: 14px;
  overflow: hidden;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
}

.crochet-position-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.crochet-position-button:hover:not(:disabled):not(.active) {
  background: #f3f4f6;
}
</style>
