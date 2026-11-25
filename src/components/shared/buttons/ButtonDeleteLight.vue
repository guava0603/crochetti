<template>
  <button
    type="button"
    class="btn-delete-light"
    :class="{ 'btn-delete-light--small': resolvedSize === 'small' }"
    :disabled="disabled"
    :aria-label="ariaLabel || undefined"
    :title="ariaLabel || undefined"
    @click="handleClick"
  >
    <img
      class="btn-delete-light__icon"
      :src="iconSrc"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { resolveSettingsIconUrl } from '@/utils/settingsIcon'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'small'].includes(v)
  },
  /** @deprecated Use `size="small"` */
  variant: { type: String, default: '' },
  ariaLabel: { type: String, default: '' }
})

const emit = defineEmits(['click'])

const resolvedSize = computed(() => {
  if (props.size !== 'default') return props.size
  if (props.variant === 'small') return 'small'
  return 'default'
})

const iconSrc = resolveSettingsIconUrl('017__circle_close')

function handleClick(e) {
  if (props.disabled) return
  e?.stopPropagation?.()
  emit('click', e)
}
</script>

<style scoped>
.btn-delete-light {
  appearance: none;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 999px;
  background: #ffffff;
  overflow: hidden;
  display: inline-flex;
  align-items: stretch;
  justify-content: stretch;
  flex-shrink: 0;
  cursor: pointer;
  line-height: 0;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.btn-delete-light--small {
  width: 1.5rem;
  height: 1.5rem;
}

.btn-delete-light__icon {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  object-fit: fill;
  pointer-events: none;
}

.btn-delete-light:hover:not(:disabled) {
  filter: brightness(0.98);
}

.btn-delete-light:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-delete-light:focus-visible {
  outline: 0.1875rem solid rgb(var(--color-icon-add-rgb) / 0.35);
  outline-offset: 0.125rem;
}

.btn-delete-light:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
