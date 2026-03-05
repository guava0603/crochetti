<template>
  <button
    type="button"
    class="wish-fab"
    :aria-label="$t('wishPool.openFabAria')"
    @click="$emit('click')"
  >
    <img class="wish-fab__icon" :src="iconUrl" alt="" aria-hidden="true" />
  </button>
</template>

<script setup>
import { computed } from 'vue'

defineEmits(['click'])

const iconUrl = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/settings/048__chat.svg`
})
</script>

<style scoped>
.wish-fab__icon {
  display: block;
}
</style>
