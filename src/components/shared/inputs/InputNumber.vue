<template>
  <div class="input-number" @click.stop>
    <button
      type="button"
      class="input-number__trigger"
      :class="[
        `input-number__trigger--${size}`,
        { 'input-number__trigger--disabled': disabled }
      ]"
      :disabled="disabled"
      :aria-label="ariaLabel || t('input.numberPicker')"
      @click="openModal"
    >
      {{ displayValue }}
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="input-number-modal-overlay"
        @click="cancelModal"
      >
        <div
          class="input-number-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="ariaLabel || t('input.numberPicker')"
          @click.stop
        >
          <div class="input-number-modal__picker">
            <button
              type="button"
              class="input-number-modal__step"
              :disabled="!canDecrease"
              :aria-label="t('input.decrease')"
              @click.stop="decrease"
            >
              <span aria-hidden="true">−</span>
            </button>

            <InputNumberWheels
              v-model="draftValue"
              :size="size"
              :min="min"
              :max="max"
              :auto-focus="true"
            />

            <button
              type="button"
              class="input-number-modal__step"
              :disabled="!canIncrease"
              :aria-label="t('input.increase')"
              @click.stop="increase"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>

          <div class="input-number-modal__actions">
            <button
              type="button"
              class="input-number-modal__btn input-number-modal__btn--secondary"
              @click="cancelModal"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="input-number-modal__btn input-number-modal__btn--primary"
              @click="saveModal"
            >
              {{ t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import InputNumberWheels from '@/components/shared/inputs/InputNumberWheels.vue'
import { clampInputNumber } from '@/utils/inputNumberDigits'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v)
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 999
  },
  disabled: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const isOpen = ref(false)
const draftValue = ref(props.modelValue)

const displayValue = computed(() => {
  const clamped = clampInputNumber(props.modelValue, { min: props.min, max: props.max })
  return String(clamped)
})

const clampedDraftValue = computed(() => (
  clampInputNumber(draftValue.value, { min: props.min, max: props.max })
))

const canDecrease = computed(() => clampedDraftValue.value > props.min)
const canIncrease = computed(() => clampedDraftValue.value < props.max)

watch(
  () => props.modelValue,
  (value) => {
    if (!isOpen.value) {
      draftValue.value = clampInputNumber(value, { min: props.min, max: props.max })
    }
  }
)

function openModal() {
  if (props.disabled) return
  draftValue.value = clampInputNumber(props.modelValue, { min: props.min, max: props.max })
  isOpen.value = true
}

function cancelModal() {
  isOpen.value = false
  draftValue.value = clampInputNumber(props.modelValue, { min: props.min, max: props.max })
  emit('close')
}

function saveModal() {
  const next = clampInputNumber(draftValue.value, { min: props.min, max: props.max })
  isOpen.value = false
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
  emit('close')
}

function decrease() {
  if (!canDecrease.value) return
  const base = clampInputNumber(draftValue.value, { min: props.min, max: props.max })
  draftValue.value = clampInputNumber(base - 1, { min: props.min, max: props.max })
}

function increase() {
  if (!canIncrease.value) return
  const base = clampInputNumber(draftValue.value, { min: props.min, max: props.max })
  draftValue.value = clampInputNumber(base + 1, { min: props.min, max: props.max })
}
</script>

<style scoped>
.input-number {
  display: inline-flex;
  vertical-align: middle;
}

.input-number__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #111827;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.05s;
}

.input-number__trigger:hover:not(:disabled) {
  background: #eef2ff;
  border-color: rgb(var(--color-icon-add-rgb) / 0.35);
}

.input-number__trigger:active:not(:disabled) {
  transform: translateY(1px);
}

.input-number__trigger--sm {
  min-width: 2rem;
  padding: 0.3rem 0.5rem;
  font-size: 0.875rem;
  border-radius: 8px;
}

.input-number__trigger--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.input-number-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-top);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
}

.input-number-modal {
  width: min(100%, 320px);
  padding: 1rem 1rem 0.85rem;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.12);
}

.input-number-modal__picker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.25rem 0 0.75rem;
}

.input-number-modal__step {
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #111827;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s, transform 0.05s;
}

.input-number-modal__step:hover:not(:disabled) {
  background: #eef2ff;
  border-color: rgb(var(--color-icon-add-rgb) / 0.35);
}

.input-number-modal__step:active:not(:disabled) {
  transform: translateY(1px);
}

.input-number-modal__step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-number-modal__actions {
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
}

.input-number-modal__btn {
  min-width: 5rem;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.input-number-modal__btn--secondary {
  background: #f3f4f6;
  color: #374151;
}

.input-number-modal__btn--primary {
  background: var(--color-icon-add);
  color: #fff;
}
</style>
