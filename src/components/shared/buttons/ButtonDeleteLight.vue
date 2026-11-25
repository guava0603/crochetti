<template>
  <ThinIconButton
    class="btn-delete-light"
    src="017__circle_close"
    size="s"
    background="soft"
    round="full"
    root-tag="div"
    :disabled="disabled"
    aria-label=""
    @click="handleClick"
  />
</template>

<script setup>
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'

const props = defineProps({
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

function handleClick(e) {
  if (props.disabled) return
  e?.stopPropagation?.()
  emit('click')
}
</script>

<style scoped>
.btn-delete-light {
  width: 28px;
  height: 28px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: none;
}

.btn-delete-light :deep(.thin-icon-button__icon) {
  transform: scale(2);
  transform-origin: center;
}
</style>
