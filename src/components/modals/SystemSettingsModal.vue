<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="handleCancel">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h2>{{ t('user.systemSettings.title') }}</h2>
            <button class="close-button" type="button" @click="handleCancel">×</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <div class="label">{{ t('user.systemSettings.languageLabel') }}</div>
              <div class="control">
                <SelectionButtonGroup
                  v-model="draftLocale"
                  :options="uiLocaleItems"
                  :aria-label="t('user.systemSettings.languageLabel')"
                  :disabled="saving"
                />
              </div>
            </div>

            <div class="field">
              <div class="label">{{ t('user.systemSettings.crochetDisplayLabel') }}</div>
              <div class="control">
                <ButtonTranslate
                  v-model="draftCrochetKey"
                  :aria-label="t('user.systemSettings.crochetDisplayLabel')"
                  :disabled="saving"
                />
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="btn-secondary" type="button" :disabled="saving" @click="handleCancel">
              {{ t('common.cancel') }}
            </button>
            <button class="btn-primary" type="button" :disabled="saving || !isDirty" @click="handleConfirm">
              {{ t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
  const c = draftCrochetKey.value === 'text' ? 'text' : draftCrochetKey.value === 'icon' ? 'icon' : 'jp'
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
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.modal-container {
  background: white;
  border-radius: 12px;
  max-width: 560px;
  width: 92%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(229, 231, 235, 0.9);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
}

.modal-body {
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-weight: 700;
  color: #111827;
}

.control {
  display: flex;
}

.actions {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.25rem 1.25rem;
  border-top: 1px solid rgba(229, 231, 235, 0.9);
  background: white;
}
</style>
