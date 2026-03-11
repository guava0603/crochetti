<template>
  <ButtonGroup
    :model-value="modelValue"
    type="multiple"
    :options="options"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @change="(v) => emit('change', v)"
  />
</template>

<script setup>
import ButtonGroup from '@/components/Selection/ButtonGroup.vue'

defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])
</script>
