<template>
  <div
    class="btn-delete-light"
    :class="{ 'btn-delete-light--disabled': disabled }"
    role="button"
    :aria-disabled="disabled ? 'true' : 'false'"
    :tabindex="disabled ? -1 : 0"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <img class="btn-delete-light__icon" :src="iconUrl" alt="" aria-hidden="true" style="transform: scale(2);" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

const iconUrl = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}assets/image/settings/017__circle_close.svg`
})

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
  border-radius: 999px;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
}

.btn-delete-light:active {
  transform: scale(0.98);
}

.btn-delete-light__icon {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  object-fit: contain;
  transform: scale(2);
  transform-origin: center;
}

.btn-delete-light--disabled,
.btn-delete-light--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
