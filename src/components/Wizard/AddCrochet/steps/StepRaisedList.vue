<template>
  <div class="step">
    <div
      class="choice"
      :class="{ active: modelValue === 'popcorn' }"
      role="button"
      tabindex="0"
      @click="pick('popcorn')"
      @keydown.enter.prevent="pick('popcorn')"
      @keydown.space.prevent="pick('popcorn')"
    >
      {{ labelPopcorn }}
    </div>
    <div
      class="choice"
      :class="{ active: modelValue === 'puff' }"
      role="button"
      tabindex="0"
      @click="pick('puff')"
      @keydown.enter.prevent="pick('puff')"
      @keydown.space.prevent="pick('puff')"
    >
      {{ labelPuff }}
    </div>
    <div
      class="choice"
      :class="{ active: modelValue === 'bobble' }"
      role="button"
      tabindex="0"
      @click="pick('bobble')"
      @keydown.enter.prevent="pick('bobble')"
      @keydown.space.prevent="pick('bobble')"
    >
      {{ labelBobble }}
    </div>
    <div
      class="choice"
      :class="{ active: modelValue === 'corkscrew' }"
      role="button"
      tabindex="0"
      @click="pick('corkscrew')"
      @keydown.enter.prevent="pick('corkscrew')"
      @keydown.space.prevent="pick('corkscrew')"
    >
      {{ labelCorkscrew }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CROCHET_LANG } from '@/constants/crochetData'
import { useCrochetLang } from '@/composables/useCrochetLang'

const { t } = useI18n({ useScope: 'global' })
const { crochetLang } = useCrochetLang()

defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const pick = (v) => emit('update:modelValue', v)

const isSymbolMode = computed(() => {
  const lang = Number(crochetLang.value)
  return lang === CROCHET_LANG.symbol_jp || lang === CROCHET_LANG.symbol_uk
})

const labelPopcorn = computed(() => (isSymbolMode.value ? t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.popcorn') : t('toolbar.addCrochet.moreWizard.raised.popcorn')))
const labelPuff = computed(() => (isSymbolMode.value ? t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.puff') : t('toolbar.addCrochet.moreWizard.raised.puff')))
const labelBobble = computed(() => (isSymbolMode.value ? t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.bobble') : t('toolbar.addCrochet.moreWizard.raised.bobble')))
const labelCorkscrew = computed(() => (isSymbolMode.value ? t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.corkscrew') : t('toolbar.addCrochet.moreWizard.raised.corkscrew')))
</script>

<style scoped>
.step {
  display: grid;
  gap: 0.65rem;
}

.choice {
  width: 100%;
  border: 2px solid #e5e7eb;
  background: #fff;
  border-radius: 12px;
  padding: 0.8rem 0.95rem;
  font-size: 0.95rem;
  font-weight: 900;
  color: #111827;
  text-align: left;
  cursor: pointer;
}

.choice:hover {
  background: #f9fafb;
}

.choice.active {
  border-color: rgb(var(--color-icon-add-rgb) / 0.55);
  background: rgb(var(--color-icon-add-rgb) / 0.12);
}
</style>
