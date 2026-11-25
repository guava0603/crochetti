<template>
  <ThinIconButton
    class="toolbar-button btn"
    :class="{
      [`toolbar-button--${size}`]: true
    }"
    :src="iconSrc"
    size="l"
    :background="resolvedBackground"
    :disabled="disabled"
    :invert-icon="invertIcon"
    :aria-label="ariaLabel"
    :title="title || ariaLabel"
    @click="$emit('click', $event)"
  />
</template>

<script setup>
import { computed } from 'vue'
import ThinIconButton from '@/components/shared/buttons/ThinIconButton.vue'
import { useBannerThinIconBackground } from '@/composables/appBanner'

const props = defineProps({
  iconSrc: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  invertIcon: { type: Boolean, default: false },
  background: {
    type: String,
    default: ''
  },
  inheritBannerStyle: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

defineEmits(['click'])

const bannerBackground = useBannerThinIconBackground(() => '')

const resolvedBackground = computed(() => {
  const explicit = String(props.background || '').trim()
  if (explicit) return explicit
  if (props.inheritBannerStyle) return bannerBackground.value
  return 'transparent'
})
</script>
