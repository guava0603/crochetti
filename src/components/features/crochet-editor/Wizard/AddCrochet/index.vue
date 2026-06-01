<template>
  <div v-if="open" class="bundle-wizard-overlay" @click="onCancel">
    <div class="bundle-wizard" role="dialog" aria-modal="true" @click.stop>
      <div class="wizard-header">
        <button
          v-if="canGoBack"
          type="button"
          class="wizard-back"
          :aria-label="t('common.back')"
          @click="goBack"
        >
          {{ t('common.back') }}
        </button>
        <div class="wizard-title">{{ title }}</div>
        <div class="wizard-header-spacer" />
      </div>

      <div class="wizard-body">
        <StepRoot
          v-if="step === 'root'"
          v-model="rootChoice"
        />

        <StepCustom
          v-else-if="step === 'custom'"
          v-model:name="customName"
          v-model:description="customDescription"
          v-model:consume="customConsume"
          v-model:generate="customGenerate"
        />

        <StepRopeDetails
          v-else-if="step === 'rope-details'"
          v-model:chainCount="ropeChainCount"
        />

        <StepRaisedList
          v-else-if="step === 'raised-list'"
          v-model="raisedType"
        />

        <StepRaisedDetails
          v-else-if="step === 'raised-details'"
          v-model:count="raisedCount"
          v-model:baseStitch="raisedBaseStitch"
        />
      </div>

      <div class="wizard-footer">
        <button type="button" class="btn-cancel" @click="onCancel">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn-confirm"
          :disabled="confirmDisabled"
          @click="onConfirm"
        >
          {{ t('common.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'AddCrochetWizard' })

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import StepRoot from './steps/StepRoot.vue'
import StepCustom from './steps/StepCustom.vue'
import StepRopeDetails from './steps/StepRopeDetails.vue'
import StepRaisedList from './steps/StepRaisedList.vue'
import StepRaisedDetails from './steps/StepRaisedDetails.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  startAt: {
    type: String,
    default: 'root'
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const step = ref('root')
const rootChoice = ref('')

const customName = ref('')
const customDescription = ref('')
const customConsume = ref(1)
const customGenerate = ref(0)

const ropeChainCount = ref(1)

const raisedType = ref('')
const raisedCount = ref(2)
const raisedBaseStitch = ref('F')

const resetState = () => {
  step.value = 'root'
  rootChoice.value = ''

  customName.value = ''
  customDescription.value = ''
  customConsume.value = 1
  customGenerate.value = 0

  ropeChainCount.value = 1

  raisedType.value = ''
  raisedCount.value = 2
  raisedBaseStitch.value = 'F'
}

watch(
  () => open.value,
  (isOpen) => {
    if (!isOpen) return
    resetState()

    const target = String(props.startAt || 'root')
    if (target === 'custom') {
      step.value = 'custom'
      rootChoice.value = 'custom'
      return
    }
    if (target === 'rope-details') {
      step.value = 'rope-details'
      rootChoice.value = 'rope'
      return
    }
    if (target === 'raised-list') {
      step.value = 'raised-list'
      rootChoice.value = 'raised'
    }
  }
)

const canGoBack = computed(() => step.value !== 'root')

const raisedTypeTitle = computed(() => {
  if (raisedType.value === 'popcorn') return t('toolbar.addCrochet.moreWizard.raised.popcorn')
  if (raisedType.value === 'puff') return t('toolbar.addCrochet.moreWizard.raised.puff')
  if (raisedType.value === 'bobble') return t('toolbar.addCrochet.moreWizard.raised.bobble')
  if (raisedType.value === 'corkscrew') return t('toolbar.addCrochet.moreWizard.raised.corkscrew')
  return ''
})

const title = computed(() => {
  if (step.value === 'root') return t('toolbar.addCrochet.custom')
  if (step.value === 'custom') return t('toolbar.addCrochet.moreWizard.options.custom')
  if (step.value === 'rope-details') return t('toolbar.addCrochet.ropeBundle.title')
  if (step.value === 'raised-list') return t('toolbar.addCrochet.moreWizard.options.raised')
  if (step.value === 'raised-details') return raisedTypeTitle.value || t('toolbar.addCrochet.moreWizard.options.raised')
  return t('toolbar.addCrochet.custom')
})

const confirmDisabled = computed(() => {
  if (step.value === 'root') return !rootChoice.value
  if (step.value === 'custom') return !String(customName.value || '').trim()
  if (step.value === 'raised-list') return !raisedType.value
  return false
})

const goBack = () => {
  if (step.value === 'custom' || step.value === 'raised-list' || step.value === 'rope-details') {
    step.value = 'root'
    return
  }
  if (step.value === 'raised-details') {
    step.value = 'raised-list'
  }
}

const onCancel = () => {
  open.value = false
}

const toBaseLabelKey = (base) => {
  if (base === 'X') return 'crochet.stitches.singleCrochet'
  if (base === 'T') return 'crochet.stitches.halfDoubleCrochet'
  if (base === 'F') return 'crochet.stitches.doubleCrochet'
  return 'crochet.stitches.trebleCrochet'
}

const raisedSymbolPrefix = (type) => {
  if (type === 'popcorn') return t('toolbar.addCrochet.moreWizard.raisedSymbolPrefix.popcorn')
  if (type === 'puff') return t('toolbar.addCrochet.moreWizard.raisedSymbolPrefix.puff')
  if (type === 'bobble') return t('toolbar.addCrochet.moreWizard.raisedSymbolPrefix.bobble')
  if (type === 'corkscrew') return t('toolbar.addCrochet.moreWizard.raisedSymbolPrefix.corkscrew')
  return ''
}

const raisedPlainSymbol = (type) => {
  if (type === 'popcorn') return t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.popcorn')
  if (type === 'puff') return t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.puff')
  if (type === 'bobble') return t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.bobble')
  if (type === 'corkscrew') return t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.corkscrew')
  return ''
}

const onConfirm = () => {
  if (confirmDisabled.value) return

  if (step.value === 'root') {
    if (rootChoice.value === 'raised') step.value = 'raised-list'
    else if (rootChoice.value === 'rope') step.value = 'rope-details'
    else step.value = 'custom'
    return
  }

  if (step.value === 'custom') {
    emit('submit', {
      kind: 'custom',
      name: String(customName.value || '').trim(),
      description: String(customDescription.value || ''),
      consume: Number(customConsume.value) || 1,
      generate: Number(customGenerate.value) || 0
    })
    open.value = false
    return
  }

  if (step.value === 'rope-details') {
    const chainCount = Math.max(1, Math.min(99, Number(ropeChainCount.value) || 1))
    emit('submit', {
      kind: 'rope',
      chainCount
    })
    open.value = false
    return
  }

  if (step.value === 'raised-list') {
    if (raisedType.value === 'corkscrew') {
      const symbol = raisedPlainSymbol('corkscrew') || raisedSymbolPrefix('corkscrew')
      const textZh = t('toolbar.addCrochet.moreWizard.raised.corkscrew')
      emit('submit', {
        kind: 'raised',
        raisedType: 'corkscrew',
        name: textZh,
        symbol_jp: symbol,
        text_zh: textZh,
        description: '',
        consume: 1,
        generate: 1
      })
      open.value = false
      return
    }

    raisedCount.value = 2
    raisedBaseStitch.value = 'F'
    step.value = 'raised-details'
    return
  }

  if (step.value === 'raised-details') {
    const typeName = raisedTypeTitle.value || t('toolbar.addCrochet.moreWizard.options.raised')
    const count = Math.max(2, Math.min(7, Number(raisedCount.value) || 2))
    const base = ['X', 'T', 'F', 'E'].includes(String(raisedBaseStitch.value)) ? String(raisedBaseStitch.value) : 'F'
    const baseLabel = t(toBaseLabelKey(base))

    const prefix = raisedSymbolPrefix(String(raisedType.value))
    const symbolJp = prefix ? `${prefix}(${count}${base})` : `${count}${base}`
    const textZh = `${typeName}(${count}{${baseLabel}})`

    emit('submit', {
      kind: 'raised',
      raisedType: String(raisedType.value),
      count,
      base,
      name: `${typeName} (${count}${base})`,
      symbol_jp: symbolJp,
      text_zh: textZh,
      description: baseLabel,
      consume: 1,
      generate: 1
    })
    open.value = false
  }
}
</script>

<style scoped>
.bundle-wizard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 9999);
}

.bundle-wizard {
  background: #fff;
  border-radius: 14px;
  width: min(600px, 92vw);
  max-height: 82vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.wizard-header {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.wizard-back {
  justify-self: start;
  border: 0;
  background: transparent;
  color: #374151;
  font-weight: 800;
  cursor: pointer;
  padding: 0.25rem 0.35rem;
}

.wizard-title {
  justify-self: center;
  font-weight: 900;
  color: #111827;
}

.wizard-header-spacer {
  justify-self: end;
}

.wizard-body {
  padding: 1rem;
  overflow: auto;
  min-height: 0;
}

.wizard-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-confirm {
  background: var(--color-icon-add);
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #359268;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
