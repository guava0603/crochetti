<template>
  <ButtonGroupToggle
    v-if="resolvedType === 'toggle'"
    v-model="model"
    :items="items"
    :aria-label="ariaLabel"
  />
  <ButtonGroupActions
    v-else
    :items="items"
    :aria-label="ariaLabel"
  />
</template>

<script setup>
import { computed } from 'vue'
import ButtonGroupActions from '@/components/buttons/ButtonGroupActions.vue'
import ButtonGroupToggle from '@/components/buttons/ButtonGroupToggle.vue'

const props = defineProps({
  type: {
    type: String,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const resolvedType = computed(() => (props.type === 'toggle' ? 'toggle' : 'actions'))

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>
