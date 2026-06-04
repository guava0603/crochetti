<template>
  <div
    ref="rootRef"
    class="translate-toggle"
    :class="{ 'is-open': open }"
    @click.stop
    @mousedown.stop
    @pointerdown.stop
    @touchstart.stop
    @touchmove.stop.prevent
    @touchend.stop
    @wheel.stop.prevent
    @keydown.esc.stop.prevent="close"
  >
    <div class="translate-toggle__strip">
      <ThinIconButton
        class="translate-toggle__trigger"
        src="064__telephone directory"
        size="s"
        background="transparent"
        :class="{ 'is-disabled': disabled }"
        :disabled="disabled"
        :aria-label="ariaLabel"
        :title="ariaLabel"
        :aria-expanded="open ? 'true' : 'false'"
        aria-haspopup="true"
        @click="toggle"
      />

      <div
        class="translate-toggle__options"
        role="radiogroup"
        :aria-label="ariaLabel"
        :aria-hidden="open ? 'false' : 'true'"
        @mousedown.prevent
      >
        <button
          v-for="opt in langOptions"
          :key="opt.value"
          type="button"
          class="translate-toggle__option"
          :class="{ 'is-selected': opt.value === langKey }"
          role="radio"
          :aria-checked="opt.value === langKey"
          :tabindex="open ? 0 : -1"
          :disabled="disabled"
          @click="() => select(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'
import { useI18n } from 'vue-i18n'
import { useCrochetLang } from '@/composables/useCrochetLang'
import { useUserCrochetDisplay } from '@/composables/useUserCrochetDisplay'
import { CROCHET_LANG } from '@/constants/crochetData'

const props = defineProps({
  modelValue: { type: String, default: undefined },
  ariaLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  isAlwaysOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n({ useScope: 'global' })
const { crochetLang: crochetLangRef, setCrochetLang } = useCrochetLang()
const { hasCustomDisplay } = useUserCrochetDisplay()

const rootRef = ref(null)
const open = ref(props.isAlwaysOpen)

const ariaLabel = computed(() => props.ariaLabel || t('toolbar.editRow.crochetLang'))

const crochetLang = computed(() => Number(crochetLangRef.value) || CROCHET_LANG.symbol_jp)

const langKey = computed({
  get: () => {
    if (props.modelValue !== undefined) {
      if (props.modelValue === 'text') return 'text'
      if (props.modelValue === 'icon') return 'icon'
      if (props.modelValue === 'uk') return 'uk'
      if (props.modelValue === 'custom') return 'custom'
      return 'jp'
    }

    if (crochetLang.value === CROCHET_LANG.text_zh) return 'text'
    if (crochetLang.value === CROCHET_LANG.icon) return 'icon'
    if (crochetLang.value === CROCHET_LANG.symbol_uk) return 'uk'
    if (crochetLang.value === CROCHET_LANG.custom) return 'custom'
    return 'jp'
  },
  set: (next) => {
    const key = next === 'text'
      ? 'text'
      : next === 'icon'
        ? 'icon'
        : next === 'uk'
          ? 'uk'
          : next === 'custom'
            ? 'custom'
            : 'jp'

    if (props.modelValue !== undefined) {
      emit('update:modelValue', key)
      return
    }

    const nextId = key === 'text'
      ? CROCHET_LANG.text_zh
      : key === 'icon'
        ? CROCHET_LANG.icon
        : key === 'uk'
          ? CROCHET_LANG.symbol_uk
          : key === 'custom'
            ? CROCHET_LANG.custom
            : CROCHET_LANG.symbol_jp
    void setCrochetLang(nextId)
  }
})

const langOptions = computed(() => {
  const options = [
    { value: 'jp', label: t('toolbar.editRow.crochetLangSymbolJp') },
    { value: 'uk', label: t('toolbar.editRow.crochetLangSymbolUk') },
    { value: 'text', label: t('toolbar.editRow.crochetLangTextZh') },
    { value: 'icon', label: t('toolbar.editRow.crochetLangIcon') }
  ]
  if (hasCustomDisplay.value) {
    options.push({ value: 'custom', label: t('toolbar.editRow.crochetLangCustom') })
  }
  return options
})

function close() {
  if (props.isAlwaysOpen) return
  open.value = false
}

function toggle() {
  if (props.disabled) return
  if (props.isAlwaysOpen) return
  open.value = !open.value
}

function select(value) {
  langKey.value = value
  close()
}

function handleDocumentPointerDown(e) {
  if (!open.value) return
  const el = rootRef.value
  if (!el) return
  if (el.contains(e.target)) return
  close()
}

function handleDocumentKeydown(e) {
  if (!open.value) return
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<style scoped>
.translate-toggle {
  position: relative;
  display: inline-flex;
  flex: none;
  max-width: 100%;
}

.translate-toggle__strip {
  display: inline-flex;
  flex-direction: row;
  align-items: stretch;
  flex: none;
  max-width: 100%;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  padding: 1px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.translate-toggle__options {
  display: inline-flex;
  flex-direction: row;
  align-items: stretch;
  flex: none;
  overflow: hidden;
  max-width: 0;
  opacity: 0;
  pointer-events: none;
  transition:
    max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;
}

.translate-toggle.is-open .translate-toggle__options {
  max-width: min(18rem, calc(100vw - 5rem));
  opacity: 1;
  pointer-events: auto;
}

.translate-toggle__option {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0.15rem 0.5rem;
  font-family: inherit;
  font-size: 0.7rem;
  line-height: 1;
  color: var(--color-font-dark, #111827);
  cursor: pointer;
  white-space: nowrap;
  border-radius: 0;
  transition: background 0.15s ease, color 0.15s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.translate-toggle.is-open .translate-toggle__option:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.translate-toggle__option:not(.is-selected):hover:not(:disabled) {
  background-color: rgba(226, 232, 240, 0.5);
}

.translate-toggle__option.is-selected {
  background-color: rgba(17, 24, 39, 0.06);
  color: #1f2937;
  font-weight: 600;
  box-shadow:
    inset 1px 1px 4px rgba(0, 0, 0, 0.08),
    inset -1px -1px 2px rgba(255, 255, 255, 0.5);
}

.translate-toggle__option:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.translate-toggle__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  min-height: 26px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-icon-base, #374151);
  cursor: pointer;
  transition: background 0.15s, transform 0.05s, opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.translate-toggle.is-open .translate-toggle__trigger {
  border-right: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px 0 0 8px;
}

.translate-toggle__trigger:active:not(:disabled) {
  transform: translateY(1px);
}

.translate-toggle__trigger:disabled,
.translate-toggle__trigger.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.translate-toggle__trigger:focus-visible {
  outline: 0.1875rem solid rgb(var(--color-icon-add-rgb, 34 197 94) / 0.35);
  outline-offset: 0.125rem;
}

@media (prefers-reduced-motion: reduce) {
  .translate-toggle__options {
    transition-duration: 0.01ms;
  }
}
</style>
