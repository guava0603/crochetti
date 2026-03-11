<template>
  <div
    class="float-docked-button"
    :class="{ 'is-disabled': disabled }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <img
      v-if="resolvedSrc"
      class="float-docked-button__icon"
      :class="{ 'float-docked-button__icon--inverted': invertIcon }"
      :src="resolvedSrc"
      alt=""
      draggable="false"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: '' },
  imageSrc: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  invertIcon: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

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

const resolvedSrc = computed(() => {
  const direct = resolvePublicAssetUrl(props.imageSrc)
  if (direct) return direct

  const type = String(props.type || '').trim().toLowerCase()
  if (type === 'crochet') {
    return resolvePublicAssetUrl('assets/image/achievement/noun-crochet-5351977-FFFFFF.svg')
  }

  return ''
})

function handleClick(e) {
  if (props.disabled) {
    e.preventDefault?.()
    return
  }
  emit('click', e)
}

function handleKeydown(e) {
  if (props.disabled) return
  const key = e?.key
  if (key === 'Enter' || key === ' ') {
    e.preventDefault?.()
    emit('click', e)
  }
}
</script>

<style scoped>
.float-docked-button {
  width: 100%;
  height: 100%;
  border-radius: 999rem;
  border: none;
  background: var(--color-icon-add);
  box-shadow: 0 0.625rem 1.375rem rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.float-docked-button__icon {
  width: inherit;
  height: inherit;
  display: block;
  transform: scale(2);
}

.float-docked-button__icon--inverted {
  filter: brightness(0) invert(1);
}

.float-docked-button:active {
  transform: translateY(0.0625rem);
}

.float-docked-button:focus-visible {
  outline: 0.1875rem solid rgb(var(--color-icon-add-rgb) / 0.35);
  outline-offset: 0.1875rem;
}

.float-docked-button.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
