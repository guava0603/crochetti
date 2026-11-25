<template>
  <ModalShell
    :show="open"
    :title="t('toolbar.addCrochet.moreWizard.options.raised')"
    max-width="560px"
    z-level="top"
    show-save-footer
    :save-disabled="!raisedType"
    @close="handleCancel"
    @save="handleSave"
  >
    <div class="add-raised-crochet-form">
      <div
        v-for="option in raisedOptions"
        :key="option.value"
        class="choice"
        :class="{ active: raisedType === option.value }"
        role="button"
        tabindex="0"
        @click="raisedType = option.value"
        @keydown.enter.prevent="raisedType = option.value"
        @keydown.space.prevent="raisedType = option.value"
      >
        {{ option.label }}
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'
import { CROCHET_LANG } from '@/constants/crochetData'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { buildCorkscrewRaisedSubmit } from '@/utils/addCrochetRaised'

defineOptions({ name: 'AddRaisedCrochetModal' })

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show', 'close', 'submit', 'request-details'])

const { t } = useI18n({ useScope: 'global' })
const { crochetLang } = useCrochetLang()

const open = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const raisedType = ref('')

watch(
  () => open.value,
  (next) => {
    if (!next) return
    raisedType.value = ''
  }
)

const isSymbolMode = computed(() => {
  const lang = Number(crochetLang.value)
  return lang === CROCHET_LANG.symbol_jp || lang === CROCHET_LANG.symbol_uk
})

const raisedOptions = computed(() => {
  const symbol = isSymbolMode.value
  return [
    {
      value: 'popcorn',
      label: symbol
        ? t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.popcorn')
        : t('toolbar.addCrochet.moreWizard.raised.popcorn')
    },
    {
      value: 'puff',
      label: symbol
        ? t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.puff')
        : t('toolbar.addCrochet.moreWizard.raised.puff')
    },
    {
      value: 'bobble',
      label: symbol
        ? t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.bobble')
        : t('toolbar.addCrochet.moreWizard.raised.bobble')
    },
    {
      value: 'corkscrew',
      label: symbol
        ? t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.corkscrew')
        : t('toolbar.addCrochet.moreWizard.raised.corkscrew')
    }
  ]
})

function handleCancel() {
  open.value = false
  emit('close')
}

function handleSave() {
  if (!raisedType.value) return

  if (raisedType.value === 'corkscrew') {
    emit('submit', buildCorkscrewRaisedSubmit(t))
    open.value = false
    emit('close')
    return
  }

  const type = raisedType.value
  open.value = false
  emit('close')
  emit('request-details', type)
}
</script>

<style scoped>
.add-raised-crochet-form {
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
  border-color: rgb(var(--color-icon-add-rgb, 34 197 94) / 0.55);
  background: rgb(var(--color-icon-add-rgb, 34 197 94) / 0.12);
}
</style>
