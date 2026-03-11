<template>
  <div
    class="translate-toggle"
    @click.stop
    @mousedown.stop
    @pointerdown.stop
    @touchstart.stop
    @touchmove.stop.prevent
    @touchend.stop
    @wheel.stop.prevent
  >
    <SelectionButtonGroup
      v-model="langKey"
      :options="langItems"
      :aria-label="ariaLabel"
      :disabled="disabled"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectionButtonGroup from '@/components/Selection/ButtonGroup.vue'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { CROCHET_LANG } from '@/constants/crochetData'

const props = defineProps({
  modelValue: { type: String, default: undefined },
  ariaLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n({ useScope: 'global' })
const { crochetLang: crochetLangRef, setCrochetLang } = useCrochetLang()

const ariaLabel = computed(() => props.ariaLabel || t('toolbar.editRow.crochetLang'))

const crochetLang = computed(() => Number(crochetLangRef.value) || CROCHET_LANG.symbol_jp)

const langKey = computed({
  get: () => {
    // Controlled mode: used by SystemSettings draft state.
    if (props.modelValue !== undefined) {
      if (props.modelValue === 'text') return 'text'
      if (props.modelValue === 'icon') return 'icon'
      return 'jp'
    }

    // Uncontrolled mode: reflect global crochetLang.
    if (crochetLang.value === CROCHET_LANG.text_zh) return 'text'
    if (crochetLang.value === CROCHET_LANG.icon) return 'icon'
    return 'jp'
  },
  set: (next) => {
    const key = next === 'text' ? 'text' : next === 'icon' ? 'icon' : 'jp'

    // Controlled: only emit.
    if (props.modelValue !== undefined) {
      emit('update:modelValue', key)
      return
    }

    // Uncontrolled: persist immediately.
    const nextId = key === 'text'
      ? CROCHET_LANG.text_zh
      : key === 'icon'
        ? CROCHET_LANG.icon
        : CROCHET_LANG.symbol_jp
    void setCrochetLang(nextId)
  }
})

const langItems = computed(() => ([
  {
    key: 'jp',
    label: t('toolbar.editRow.crochetLangSymbolJp')
  },
  {
    key: 'text',
    label: t('toolbar.editRow.crochetLangTextZh')
  },
  {
    key: 'icon',
    label: t('toolbar.editRow.crochetLangIcon')
  }
]))
</script>

<style scoped>
.translate-toggle {
  display: flex;
  flex: none;
}
</style>
