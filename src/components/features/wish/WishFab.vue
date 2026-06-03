<template>
  <ThinIconButton
    class="wish-fab"
    src="048__chat"
    size="l"
    background="transparent"
    round="full"
    :aria-label="$t('wishPool.openFabAria')"
    @click="$emit('click')"
  />
</template>

<script setup>
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'

defineEmits(['click'])
</script>

<style scoped>
.wish-fab {
  width: 4rem;
  height: 4rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
}

.wish-fab.thin-icon-button--bg-transparent:hover:not(.thin-icon-button--disabled) {
  background: rgba(255, 255, 255, 0.92);
}
</style>
