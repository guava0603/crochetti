<template>
  <ThinIconButton
    class="float-docked-button"
    :src="imageSrc"
    root-tag="button"
    size="xl"
    background="accent"
    round="full"
    :invert-icon="invertIcon"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :title="title"
    @click="handleClick"
  />
</template>

<script setup>
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'

const props = defineProps({
  type: { type: String, default: '' },
  imageSrc: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  invertIcon: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['click'])

function handleClick(e) {
  if (props.disabled) {
    e.preventDefault?.()
    return
  }
  emit('click', e)
}
</script>

