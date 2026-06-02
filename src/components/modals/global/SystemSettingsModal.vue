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
      <div class="control control--stack">
        <ButtonTranslate
          v-model="draftCrochetKey"
          :aria-label="t('user.systemSettings.crochetDisplayLabel')"
          :disabled="saving"
          :is-always-open="true"
        />
        <button
          type="button"
          class="custom-display-settings-btn"
          :disabled="saving"
          @click="showCustomDisplayModal = true"
        >
          {{ t('user.systemSettings.customDisplayButton') }}
        </button>
      </div>
    </div>
  </ModalShell>

  <CustomCrochetDisplayModal
    v-model:show="showCustomDisplayModal"
    @saved="handleCustomDisplaySaved"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectionButtonGroup from '@/components/shared/selection/ButtonGroup.vue'
import ButtonTranslate from '@/components/shared/buttons/svg/ButtonTranslate.vue'
import CustomCrochetDisplayModal from '@/components/modals/global/CustomCrochetDisplayModal.vue'
import { useUserCrochetDisplay } from '@/composables/useUserCrochetDisplay'
import { setI18nLocale } from '@/i18n'
import { CROCHET_LANG } from '@/constants/crochetData'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { openConfirmation } from '@/services/ui/confirmation'
import ModalShell from '@/components/modals/shell/ModalShell/ModalShell.vue'

const props = defineProps({
  show: { type: Boolean, required: true }
})

const emit = defineEmits(['close'])

const { t, locale } = useI18n({ useScope: 'global' })
const { crochetLang, setCrochetLang } = useCrochetLang()
const { hasCustomDisplay } = useUserCrochetDisplay()

const saving = ref(false)
const showCustomDisplayModal = ref(false)
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
          : crochetId === CROCHET_LANG.custom
            ? 'custom'
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
        : draftCrochetKey.value === 'custom'
          ? 'custom'
          : 'jp'
  return l !== initialLocale.value || c !== initialCrochetKey.value
})

function handleCustomDisplaySaved() {
  if (!hasCustomDisplay.value && draftCrochetKey.value === 'custom') {
    draftCrochetKey.value = initialCrochetKey.value === 'custom' ? 'text' : initialCrochetKey.value
  }
}

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
          : draftCrochetKey.value === 'custom'
            ? CROCHET_LANG.custom
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

.control--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
}

.custom-display-settings-btn {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
}

.custom-display-settings-btn:hover:not(:disabled) {
  background: #f9fafb;
}

.custom-display-settings-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
