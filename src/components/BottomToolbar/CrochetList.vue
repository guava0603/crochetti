<template>
  <div class="crochet-list-wrapper">
    <div class="crochet-list">
      <button
        v-for="crochet in stitches"
        :key="crochet.index"
        type="button"
        class="crochet-button"
        :class="{ 'is-selected': selectedStitchId === crochet.index }"
        :disabled="disabled || !isStitchEnabled(crochet.index) || isStitchDisabledByPositionSelection(crochet.index)"
        @click="handleStitchClick(crochet.index)"
      >
        <div class="crochet-symbol">{{ getStitchDisplayText(crochet, crochetLang) }}</div>
      </button>

      <button
        v-if="showCustomButton"
        type="button"
        class="crochet-button custom-button"
        :disabled="disabled || isCustomDisabledByPositionSelection"
        @click="$emit('custom-click')"
      >
        <div class="crochet-symbol">{{ t('toolbar.addCrochet.custom') }}</div>
      </button>
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
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BasicStitchGeneral,
  CrochetPositionOptions,
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

const isStitchEnabled = (stitchId) => {
  const list = props.enabledStitchIds
  if (!Array.isArray(list) || list.length === 0) return true
  return list.includes(stitchId)
}

const selectedStitchId = ref(null)
const selectedPosition = ref('')

const POSITION_SUPPORTED_STITCH_IDS = new Set([4, 7, 10, 13]) // X, T, F, E
const POSITION_DISABLED_STITCH_IDS = new Set([0, 1, 2, 3]) // sl, ch, skip

const isStitchDisabledByPositionSelection = (stitchId) => {
  // If a position toggle is selected, prevent clicking stitches that don't make sense with positions.
  // This avoids confusing UX where a selected position appears to "do nothing" for these stitches.
  if (!selectedPosition.value) return false
  return POSITION_DISABLED_STITCH_IDS.has(stitchId)
}

const isCustomDisabledByPositionSelection = computed(() => {
  // Custom stitch does not support position; disable it when a position is selected
  // to avoid accidental carry-over confusion.
  return !!selectedPosition.value
})

const positionTogglesDisabled = computed(() => {
  if (props.disabled) return true
  if (selectedStitchId.value === null) return false
  return POSITION_DISABLED_STITCH_IDS.has(selectedStitchId.value)
})

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
  console.log('Position toggled:', updated)
  emit('position-change', updated)
}

const handleStitchClick = (stitchId) => {
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

watch(
  () => [props.presetStitchId, props.presetPosition],
  ([nextId, nextPos]) => {
    if (typeof nextId === 'number' && Number.isFinite(nextId)) {
      selectedStitchId.value = nextId
      const normalized = normalizePosition(nextPos)
      selectedPosition.value = POSITION_SUPPORTED_STITCH_IDS.has(nextId) ? normalized : ''
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

.crochet-button:hover:not(:disabled), .crochet-position-button.active {
  background: #42b983;
  border-color: #42b983;
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
  color: #6b7280;
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
  gap: 0.4rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.65);
}
</style>
