<template>
  <button
    type="button"
    class="toolbar-button btn"
    :class="{
      'toolbar-button--disabled': disabled,
      'toolbar-button--inverted': invertIcon,
      [`toolbar-button--${size}`]: true
    }"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :title="title || ariaLabel"
    @click="$emit('click', $event)"
  >
    <img
      v-if="resolvedIconSrc"
      class="toolbar-button__icon"
      :src="resolvedIconSrc"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
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

function resolvePublicAssetUrl(path) {
  const raw = String(path || '').trim()
  if (!raw) return ''

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw
  }

  if (raw.startsWith('/')) return raw

  const base = import.meta.env.BASE_URL || '/'
  return `${base}${raw}`
}

const resolvedIconSrc = computed(() => resolvePublicAssetUrl(props.iconSrc))
</script>

<style scoped>
.toolbar-button {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-font-dark);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  width: 2.5rem;
  height: 2.5rem;
}

.toolbar-button:hover {
  background: rgba(243, 244, 246, 0.8);
}

.toolbar-button:active {
  transform: translateY(1px);
}

.toolbar-button:focus-visible {
  outline: 0.1875rem solid rgb(var(--color-icon-add-rgb) / 0.35);
  outline-offset: 0.1875rem;
}

.toolbar-button[disabled],
.toolbar-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar-button__icon {
  display: block;
  object-fit: contain;
}

.toolbar-button--inverted .toolbar-button__icon {
  filter: brightness(0) invert(1);
}

:deep(img) {
  transform: scale(1.5);
}
</style>
