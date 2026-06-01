<template>
  <div class="add-crochet">
    <div class="add-crochet__body">
      <CrochetList
        :disabled="disabled"
        :craft-key="craftKey"
        :preset-stitch-id="presetStitchId"
        :preset-position="presetPosition"
        :default-position="defaultPosition"
        :stitches="stitchesForList"
        :self-defined-stitches="selfDefinedStitchesForList"
        :rope-presets="ropePresets"
        :enabled-stitch-ids="null"
        :show-custom-button="resolvedShowCustomButton"
        :emit-on-decrease-toggle="emitOnDecreaseToggle"
        @stitch-click="handleCrochetClick"
        @position-change="handlePositionChange"
        @bundle-click="openRopeBundleWizard"
        @raised-click="openRaisedWizard"
        @custom-click="openCustomWizard"
        @rope-preset-click="handleRopePresetClick"
      />
    </div>

    <Teleport v-if="enableWizard" to="body">
      <AddCrochetWizard v-model="showMoreWizard" :start-at="wizardStartAt" @submit="handleWizardSubmit" />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BasicStitchGeneral, createRope } from '@/constants/crochetData'
import CrochetList from './CrochetList.vue'
import AddCrochetWizard from '@/components/features/crochet-editor/Wizard/AddCrochet/index.vue'
import { useSelfDefinedStitchesContext } from '@/composables/selfDefinedStitchesContext'
import { openError } from '@/services/ui/notice'
import { normalizeRopeChainCount } from '@/utils/ropeChainCount'

const { t } = useI18n({ useScope: 'global' })

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
  }
})

const emit = defineEmits(['add-crochet', 'add-bundle', 'add-rope', 'position-change'])

// mode: 'normal' => append stitches as usual
// mode: 'same-stitch' => append into a top-level bundle (consume must be 1)
const mode = ref('normal')

const { list: selfDefinedStitches, addStitch: addSelfDefinedStitch } = useSelfDefinedStitchesContext()

const stitchesForList = computed(() => {
  return Array.isArray(props.stitches) ? props.stitches : BasicStitchGeneral
})

const resolvedShowCustomButton = computed(() => {
  if (!props.enableWizard) return false
  return Boolean(props.showCustomButton)
})

const selfDefinedStitchesForList = computed(() => {
  if (!props.enableSelfDefinedStitches) return []
  return Array.isArray(selfDefinedStitches.value) ? selfDefinedStitches.value : []
})


const handleCrochetClick = (payload) => {
  const stitchId = typeof payload === 'number'
    ? payload
    : (payload?.stitchId ?? payload?.stitch_id)
  if (stitchId === null || stitchId === undefined) return

  const position = typeof payload === 'object' ? String(payload?.position ?? '') : ''

  if (mode.value === 'same-stitch') {
    emit('add-crochet', { stitchId, position, mode: 'same-stitch' })
    return
  }

  emit('add-crochet', { stitchId, position, mode: 'normal' })
}

const handlePositionChange = (pos) => {
  emit('position-change', pos)
}

const showMoreWizard = ref(false)

const wizardStartAt = ref('root')

const openRaisedWizard = () => {
  if (props.disabled || !props.enableWizard) return
  wizardStartAt.value = 'raised-list'
  showMoreWizard.value = true
}

const openCustomWizard = () => {
  if (props.disabled || !props.enableWizard) return
  wizardStartAt.value = 'custom'
  showMoreWizard.value = true
}

const ropePresets = ref([])

const normalizeChainCount = (v) => {
  return normalizeRopeChainCount(v)
}

const pushRopePreset = (chainCount) => {
  const safe = normalizeChainCount(chainCount)
  const next = [{ chainCount: safe }, ...(Array.isArray(ropePresets.value) ? ropePresets.value : [])]
  // Dedupe + cap
  const seen = new Set()
  ropePresets.value = next.filter((p) => {
    const k = String(p?.chainCount)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, 12)
}

const openRopeBundleWizard = () => {
  if (props.disabled || !props.enableWizard) return
  wizardStartAt.value = 'rope-details'
  showMoreWizard.value = true
}

const handleRopePresetClick = (payload) => {
  if (props.disabled || !props.enableWizard) return
  const count = typeof payload === 'number' ? payload : payload?.chainCount
  const safe = normalizeChainCount(count)
  const node = createRope(safe)
  emit('add-rope', node)
}

const getNextSelfDefinedStitchId = () => {
  const list = Array.isArray(selfDefinedStitches.value) ? selfDefinedStitches.value : []
  const ids = list
    .map((s) => Number(s?.stitch_id))
    .filter((n) => Number.isFinite(n))
  const minId = ids.length ? Math.min(...ids) : 0
  return minId < 0 ? minId - 1 : -1
}

const ensureCanAddSelfDefined = () => {
  if (!props.enableSelfDefinedStitches) return false
  if (addSelfDefinedStitch) return true
  openError({
    title: t('common.error'),
    message: t('common.saveFailed'),
    confirmText: t('common.ok')
  })
  return false
}

const handleWizardSubmit = (draft) => {
  if (!props.enableWizard) return
  if (!draft || typeof draft !== 'object') return

  if (draft.kind === 'rope') {
    const safe = normalizeChainCount(draft.chainCount)
    const node = createRope(safe)
    pushRopePreset(safe)
    emit('add-rope', node)
    return
  }

  if (!ensureCanAddSelfDefined()) return

  const symbolJp = typeof draft.symbol_jp === 'string' ? String(draft.symbol_jp).trim() : ''
  const textZh = typeof draft.text_zh === 'string' ? String(draft.text_zh).trim() : ''

  const nextId = getNextSelfDefinedStitchId()

  addSelfDefinedStitch({
    stitch_id: nextId,
    name: String(draft.name || '').trim(),
    symbol_jp: symbolJp || undefined,
    text_zh: textZh || undefined,
    description: String(draft.description || ''),
    consume: Number(draft.consume) || 1,
    generate: Number(draft.generate) || 0
  })

  // Auto-insert once after creating it.
  emit('add-crochet', { stitchId: nextId, position: '', mode: 'normal' })
}
</script>

<style scoped>
.add-crochet {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.add-crochet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

.add-tabs {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.75rem;
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
</style>
