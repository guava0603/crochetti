<template>
  <ThinIconButton
    class="toolbar-button btn"
    :class="{
      [`toolbar-button--${size}`]: true
    }"
    :src="iconSrc"
    size="l"
    background="transparent"
    :disabled="disabled"
    :invert-icon="invertIcon"
    :aria-label="ariaLabel"
    :title="title || ariaLabel"
    @click="$emit('click', $event)"
  />
</template>

<script setup>
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'

defineProps({
  iconSrc: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  invertIcon: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

defineEmits(['click'])
</script>
