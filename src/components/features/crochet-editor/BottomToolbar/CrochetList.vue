<template>
  <div class="crochet-list-wrapper">
    <div class="crochet-list">
      <button
        v-for="crochet in stitchesBeforeUser"
        :key="getStitchId(crochet)"
        type="button"
        class="crochet-button"
        :class="{ 'is-selected': selectedStitchId === getStitchId(crochet) }"
        :disabled="disabled || isStitchDisabledByPositionSelection(getStitchId(crochet)) || isStitchDisabledByAdjustMode(getStitchId(crochet))"
        v-on="longPressHandlers(getStitchId(crochet))"
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
        v-for="sd in userDefinedStitches"
        :key="`user-${getStitchId(sd)}`"
        type="button"
        class="crochet-button crochet-button--self-defined crochet-button--user-defined"
        :class="{ 'is-selected': selectedStitchId === getStitchId(sd) }"
        :disabled="disabled || isStitchDisabledByPositionSelection(getStitchId(sd)) || isStitchDisabledByAdjustMode(getStitchId(sd))"
        v-on="longPressHandlers(getStitchId(sd))"
        @click="handleStitchClick(getStitchId(sd))"
      >
        <div class="crochet-symbol">{{ getStitchLabel(sd) }}</div>
      </button>

      <button
        v-for="crochet in stitchesAfterUser"
        :key="`after-${getStitchId(crochet)}`"
        type="button"
        class="crochet-button"
        :class="{ 'is-selected': selectedStitchId === getStitchId(crochet) }"
        :disabled="disabled || isStitchDisabledByPositionSelection(getStitchId(crochet)) || isStitchDisabledByAdjustMode(getStitchId(crochet))"
        v-on="longPressHandlers(getStitchId(crochet))"
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
        :disabled="disabled || isStitchDisabledByPositionSelection(getStitchId(sd)) || isStitchDisabledByAdjustMode(getStitchId(sd))"
        v-on="longPressHandlers(getStitchId(sd))"
        @click="handleStitchClick(getStitchId(sd))"
      >
        <div class="crochet-symbol">{{ getStitchLabel(sd) }}</div>
      </button>

      <button
        v-for="p in ropePresets"
        :key="`rope-${p.chainCount}`"
        type="button"
        class="crochet-button crochet-button--self-defined"
        :disabled="disabled || isCustomDisabledByPositionSelection || adjustMode !== 'none' || disableRope"
        @click="$emit('rope-preset-click', p)"
      >
        <div class="crochet-symbol">{{ formatRopePresetLabel(p) }}</div>
      </button>

      <button
        v-if="showCustomButton"
        type="button"
        class="crochet-button custom-button"
        :disabled="disabled || isCustomDisabledByPositionSelection || adjustMode !== 'none' || disableRope"
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
import { computed, onBeforeUnmount, ref } from 'vue'
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
import { getSelfDefinedCustomDisplayText, splitGeneralStitchesAroundTreble } from '@/utils/userCrochetDisplay'

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
  // Rope (縄束) cannot go inside a same-stitch group.
  disableRope: {
    type: Boolean,
    default: false
  },
  selfDefinedStitches: {
    type: Array,
    default: () => []
  },
  userDefinedStitches: {
    type: Array,
    default: () => []
  },
  ropePresets: {
    type: Array,
    default: () => []
  },
  stitches: {
    type: Array,
    default: () => BasicStitchGeneral
  },
  showCustomButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['stitch-click', 'stitch-long-press', 'bundle-click', 'raised-click', 'custom-click', 'rope-preset-click', 'position-change'])

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

const stitchesBeforeUser = computed(() => {
  return splitGeneralStitchesAroundTreble(props.stitches).before
})

const stitchesAfterUser = computed(() => {
  return splitGeneralStitchesAroundTreble(props.stitches).after
})

const selfDefinedIdSet = computed(() => {
  const set = new Set()
  const lists = [
    props.userDefinedStitches,
    props.selfDefinedStitches
  ]
  for (const raw of lists) {
    const list = Array.isArray(raw) ? raw : []
    for (const s of list) {
      const id = Number(s?.stitch_id)
      if (Number.isFinite(id)) set.add(id)
    }
  }
  return set
})

const isSelfDefinedStitchId = (stitchId) => {
  const id = Number(stitchId)
  if (!Number.isFinite(id)) return false
  return selfDefinedIdSet.value.has(id)
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

const toggleAdjust = (mode) => {
  if (adjustDisabled.value) return
  const nextMode = mode === 'decrease' ? 'decrease' : 'increase'
  // Toggling only arms the mode; the next stitch tap adds the increase/decrease variant.
  adjustMode.value = adjustMode.value === nextMode ? 'none' : nextMode
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

// The stitch a button adds right now (applies adjust mode / position), or null.
const resolveStitchPayload = (stitchId) => {
  if (stitchId === null || stitchId === undefined) return null

  // Non-crochet craft: no position/adjust logic.
  if (!supportsPosition.value) {
    selectedStitchId.value = stitchId
    return { stitch_id: stitchId, position: '' }
  }

  // Adjust mode: only allow X/T/F/E. They resolve to their increase/decrease variants.
  if (adjustMode.value !== 'none') {
    if (!ADJUST_ALLOWED_BASE_STITCH_IDS.has(stitchId)) return null
    const variantId = getVariantStitchId(stitchId, adjustMode.value)
    if (variantId === null || variantId === undefined) return null
    selectedStitchId.value = variantId
    return {
      stitch_id: variantId,
      position: POSITION_SUPPORTED_STITCH_IDS.has(variantId) ? selectedPosition.value : ''
    }
  }

  selectedStitchId.value = stitchId
  // Selecting a stitch must NOT change the current position selection; position only
  // changes via the position toggle buttons (which never add a stitch by themselves).
  return {
    stitch_id: stitchId,
    position: POSITION_SUPPORTED_STITCH_IDS.has(stitchId) ? selectedPosition.value : ''
  }
}

// Long press (0.5s) on a stitch button: ask for a count instead of adding one stitch.
const LONG_PRESS_MS = 500
let longPressTimer = 0
let longPressFired = false

const cancelLongPress = () => {
  if (longPressTimer) clearTimeout(longPressTimer)
  longPressTimer = 0
}

const longPressHandlers = (stitchId) => ({
  pointerdown: (e) => {
    if (e?.button !== undefined && e.button !== 0) return
    cancelLongPress()
    longPressFired = false
    longPressTimer = setTimeout(() => {
      longPressTimer = 0
      longPressFired = true
      const payload = resolveStitchPayload(stitchId)
      if (payload) emit('stitch-long-press', payload)
    }, LONG_PRESS_MS)
  },
  pointerup: cancelLongPress,
  pointerleave: cancelLongPress,
  pointercancel: cancelLongPress,
  // iOS / Android would otherwise open the text callout / context menu on long press.
  contextmenu: (e) => e.preventDefault()
})

onBeforeUnmount(cancelLongPress)

const handleStitchClick = (stitchId) => {
  // The click that ends a long press must not also add a single stitch.
  if (longPressFired) {
    longPressFired = false
    return
  }
  const payload = resolveStitchPayload(stitchId)
  if (payload) emit('stitch-click', payload)
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
    if (lang === CROCHET_LANG.custom) return getSelfDefinedCustomDisplayText(stitch)
    if (lang === CROCHET_LANG.symbol_uk) return symbolUk || symbolJp || name
    if (lang === CROCHET_LANG.symbol_jp) return symbolJp || name
    if (lang === CROCHET_LANG.text_zh || lang === CROCHET_LANG.icon) return textZh || name
    return name
  }
  return getStitchDisplayText(stitch, crochetLang.value)
}
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
  /* Span the side panel so the V / A buttons fill it like FL / BL / FP / BP. */
  align-self: stretch;
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
  /* Long press asks for a count: no text selection / callout while holding. */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

/* Side panel buttons behave like a vertical button-group */
.crochet-position-button {
  width: 100%;
  /* Fill the side panel (4rem incl. its 2px border); a 4rem minimum overflowed it and the
     panel's overflow:hidden cut the right edge of every button. */
  min-width: 0;
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
  color: var(--color-font-option);
}

.crochet-button:hover:not(:disabled), .crochet-position-button.active {
  background: var(--color-icon-add);
  border-color: transparent;
  color: white;
}

.crochet-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.crochet-symbol {
  font-size: 0.75rem;
  line-height: 1.1;
  color: var(--color-font-option);
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
