<template>
  <ModalShell
    :show="show"
    :title="t('user.systemSettings.title')"
    max-width="560px"
    show-save-footer
    :saving="saving"
    :save-disabled="!isDirty"
    @close="handleCancel"
    @save="handleConfirm"
  >
    <div class="modal-field">
      <div class="modal-label">{{ t('user.systemSettings.languageLabel') }}</div>
      <div class="control">
        <SelectionButtonGroup
          v-model="draftLocale"
          :options="uiLocaleItems"
          :aria-label="t('user.systemSettings.languageLabel')"
          :disabled="saving"
        />
      </div>
    </div>

    <div class="modal-field">
      <div class="modal-label">{{ t('user.systemSettings.crochetDisplayLabel') }}</div>
      <div class="control">
        <ButtonTranslate
          v-model="draftCrochetKey"
          :aria-label="t('user.systemSettings.crochetDisplayLabel')"
          :disabled="saving"
        />
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectionButtonGroup from '@/components/Selection/ButtonGroup.vue'
import ButtonTranslate from '@/components/buttons/svg/ButtonTranslate.vue'
import { setI18nLocale } from '@/i18n'
import { CROCHET_LANG } from '@/constants/crochetData'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { openConfirmation } from '@/services/ui/confirmation'
import ModalShell from '@/components/modals/ModalShell/ModalShell.vue'

const props = defineProps({
  show: { type: Boolean, required: true }
})

const emit = defineEmits(['close'])

const { t, locale } = useI18n({ useScope: 'global' })
const { crochetLang, setCrochetLang } = useCrochetLang()

const saving = ref(false)
const initialLocale = ref('en')
const initialCrochetKey = ref('jp')
const draftLocale = ref('en')
const draftCrochetKey = ref('jp')

watch(
  () => props.show,
  (next) => {
    if (!next) return
    const currentLocale = String(locale.value || 'en')
    const normalizedLocale = currentLocale === 'zh-TW' ? 'zh-TW' : 'en'
    const crochetId = Number(crochetLang.value)
    const currentCrochetKey = crochetId === CROCHET_LANG.text_zh
      ? 'text'
      : crochetId === CROCHET_LANG.icon
        ? 'icon'
        : crochetId === CROCHET_LANG.symbol_uk
          ? 'uk'
        : 'jp'

    initialLocale.value = normalizedLocale
    initialCrochetKey.value = currentCrochetKey
    draftLocale.value = normalizedLocale
    draftCrochetKey.value = currentCrochetKey
  },
  { immediate: true }
)

const isDirty = computed(() => {
  const l = draftLocale.value === 'zh-TW' ? 'zh-TW' : 'en'
  const c = draftCrochetKey.value === 'text'
    ? 'text'
    : draftCrochetKey.value === 'icon'
      ? 'icon'
      : draftCrochetKey.value === 'uk'
        ? 'uk'
        : 'jp'
  return l !== initialLocale.value || c !== initialCrochetKey.value
})

async function handleCancel() {
  if (!isDirty.value || saving.value) {
    emit('close')
    return
  }
  const ok = await openConfirmation({ type: 'discardChanges' })
  if (!ok) return
  emit('close')
}

async function handleConfirm() {
  if (saving.value) return
  if (!isDirty.value) return

  saving.value = true
  try {
    const nextLocale = draftLocale.value === 'zh-TW' ? 'zh-TW' : 'en'
    const nextCrochet = draftCrochetKey.value === 'text'
      ? CROCHET_LANG.text_zh
      : draftCrochetKey.value === 'icon'
        ? CROCHET_LANG.icon
        : draftCrochetKey.value === 'uk'
          ? CROCHET_LANG.symbol_uk
          : CROCHET_LANG.symbol_jp
    setI18nLocale(nextLocale)
    await setCrochetLang(nextCrochet)
    emit('close')
  } finally {
    saving.value = false
  }
}

const uiLocaleItems = computed(() => [
  { key: 'zh-TW', label: t('user.systemSettings.langZhTw'), ariaLabel: t('user.systemSettings.langZhTw') },
  { key: 'en', label: t('user.systemSettings.langEn'), ariaLabel: t('user.systemSettings.langEn') }
])
</script>

<style scoped>
.control {
  display: flex;
}
</style>
