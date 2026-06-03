<template>
  <component
    :is="rootTag"
    :type="rootTag === 'button' ? 'button' : undefined"
    class="thin-icon-button"
    :class="rootClasses"
    :disabled="isDisabled"
    :aria-label="ariaLabel || undefined"
    :title="title || ariaLabel || undefined"
    v-bind="extraAttrs"
    @click="handleClick"
  >
    <img
      v-if="resolvedSrc"
      class="thin-icon-button__icon"
      :src="resolvedSrc"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  </component>
</template>

<script setup>
import { computed, useAttrs } from 'vue'
import { resolveSettingsIconUrl } from '@/utils/settingsIcon'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const extraAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const props = defineProps({
  /** Settings icon id or path, e.g. `010__arrow_anti-clockwise` or `assets/image/settings/010__arrow_anti-clockwise.svg` */
  src: {
    type: String,
    default: ''
  },
  /** @deprecated Use `src` */
  icon: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'm',
    validator: (v) => ['s', 'm', 'l'].includes(v)
  },
  background: {
    type: String,
    default: 'transparent',
    validator: (v) => ['transparent', 'soft', 'accent'].includes(v)
  },
  round: {
    type: String,
    default: 'none',
    validator: (v) => ['none', 'full'].includes(v)
  },
  invertIcon: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  rootTag: {
    type: String,
    default: 'button',
    validator: (v) => ['button', 'div'].includes(v)
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const isDisabled = computed(() => Boolean(props.disabled))

const resolvedSrc = computed(() => resolveSettingsIconUrl(props.src || props.icon))

const rootTag = computed(() => (props.rootTag === 'div' ? 'div' : 'button'))

const rootClasses = computed(() => ({
  'thin-icon-button--disabled': isDisabled.value,
  'thin-icon-button--inverted': props.invertIcon,
  [`thin-icon-button--${props.size}`]: true,
  [`thin-icon-button--bg-${props.background}`]: true,
  'thin-icon-button--round-full': props.round === 'full',
  'thin-icon-button--root-div': props.rootTag === 'div'
}))

function handleClick(e) {
  if (isDisabled.value) {
    e.preventDefault?.()
    return
  }
  emit('click', e)
}
</script>

<style scoped>
.thin-icon-button {
  appearance: none;
  border: 0;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease, opacity 0.15s ease;
  color: var(--color-font-dark);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.thin-icon-button--root-div {
  cursor: pointer;
}

.thin-icon-button--bg-transparent {
  background: transparent;
}

.thin-icon-button--bg-transparent:hover:not(.thin-icon-button--disabled) {
  background: rgba(243, 244, 246, 0.9);
}

.thin-icon-button--bg-soft {
  background: rgba(243, 244, 246, 0.95);
}

.thin-icon-button--bg-soft:hover:not(.thin-icon-button--disabled) {
  background: #e5e7eb;
}

.thin-icon-button--bg-accent {
  background: var(--color-icon-add);
}

.thin-icon-button--bg-accent:hover:not(.thin-icon-button--disabled) {
  filter: brightness(0.96);
}

.thin-icon-button--round-full {
  border-radius: 999px;
}

.thin-icon-button--s {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
}

.thin-icon-button--m {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.65rem;
}

/* Toolbar-sized control (matches legacy ToolbarButton). */
.thin-icon-button--l {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  transition: all 0.2s;
}

.thin-icon-button--l.thin-icon-button--bg-transparent:hover:not(.thin-icon-button--disabled) {
  background: rgba(243, 244, 246, 0.8);
}

.thin-icon-button--l:focus-visible {
  outline-offset: 0.1875rem;
}

.thin-icon-button--l.thin-icon-button--disabled,
.thin-icon-button--l[disabled] {
  opacity: 0.6;
}

.thin-icon-button--round-full.thin-icon-button--s,
.thin-icon-button--round-full.thin-icon-button--m,
.thin-icon-button--round-full.thin-icon-button--l {
  border-radius: 999px;
}

.thin-icon-button:active:not(.thin-icon-button--disabled) {
  transform: translateY(1px);
}

.thin-icon-button:focus-visible {
  outline: 0.1875rem solid rgb(var(--color-icon-add-rgb) / 0.35);
  outline-offset: 0.125rem;
}

.thin-icon-button--disabled,
.thin-icon-button[disabled] {
  opacity: 0.45;
  cursor: not-allowed;
}

.thin-icon-button__icon {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  object-fit: contain;
  transform: scale(2);
}

.thin-icon-button--s .thin-icon-button__icon {
  width: 1rem;
  height: 1rem;
}

.thin-icon-button--l .thin-icon-button__icon {
  width: auto;
  height: auto;
  transform: scale(1.5);
}

.thin-icon-button--inverted .thin-icon-button__icon {
  filter: brightness(0) invert(1);
}
</style>
