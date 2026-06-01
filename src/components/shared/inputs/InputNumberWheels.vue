<template>
  <div
    class="input-number-wheels selection-actions"
    :class="[
      { 'selection-actions--sm': props.size === 'sm' },
      `input-number-wheels--digits-${digitCount}`
    ]"
    @click.stop
  >
    <InputNumberDigit
      v-for="(digit, index) in digitValues"
      :key="`${digitCount}-${index}-${digitOptions[index]?.join('-') || ''}`"
      :model-value="digit"
      :options="digitOptions[index] || [0]"
      :size="size"
      :auto-focus="autoFocus && index === 0"
      @update:model-value="(value) => handleDigitUpdate(index, value)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

import InputNumberDigit from '@/components/shared/inputs/InputNumberDigit.vue'
import {
  clampInputNumber,
  composeDigits,
  decomposeDigits,
  getAllowedDigitsForPosition,
  resolveDigitCount
} from '@/utils/inputNumberDigits'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  autoFocus: {
    type: Boolean,
    default: true
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
  }
})

const emit = defineEmits(['update:modelValue'])

const digitCount = computed(() => resolveDigitCount(props.max))

const digitValues = computed(() => {
  const clamped = clampInputNumber(props.modelValue, { min: props.min, max: props.max })
  return decomposeDigits(clamped, digitCount.value)
})

const digitOptions = computed(() => {
  const count = digitCount.value
  const digits = digitValues.value

  return Array.from({ length: count }, (_, index) => getAllowedDigitsForPosition({
    min: props.min,
    max: props.max,
    digitCount: count,
    digitIndex: index,
    digits
  }))
})

function handleDigitUpdate(index, digit) {
  const nextDigits = [...digitValues.value]
  nextDigits[index] = Number(digit) || 0

  const composed = composeDigits(nextDigits)
  const clamped = clampInputNumber(composed, { min: props.min, max: props.max })

  if (clamped !== props.modelValue) {
    emit('update:modelValue', clamped)
  }
}
</script>

<style scoped>
.input-number-wheels {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  background: transparent;
  border: none;
  outline: none;
  pointer-events: auto;
}

.input-number-wheels--digits-1 :deep(.input-number-digit) {
  border-radius: 14px;
}

.input-number-wheels--digits-2 :deep(.input-number-digit:first-child) {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.input-number-wheels--digits-2 :deep(.input-number-digit:last-child) {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.input-number-wheels--digits-3 :deep(.input-number-digit:not(:first-child):not(:last-child)) {
  border-radius: 8px;
}

.input-number-wheels--digits-3 :deep(.input-number-digit:first-child) {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.input-number-wheels--digits-3 :deep(.input-number-digit:last-child) {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}
</style>
