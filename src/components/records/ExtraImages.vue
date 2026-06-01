<template>
  <div
    v-if="images.length"
    class="extra-images"
    :class="[
      `extra-images--${displayOrder}`,
      { 'extra-images--rounded': roundedCorners }
    ]"
    :style="rootStyle"
  >
    <ImageBox
      v-for="(url, idx) in images"
      :key="url"
      class="extra-images__item"
      :class="{ 'extra-images__item--rounded': itemRounded }"
      :image-url="url"
      :alt="t('recordResult.imageAlt', { n: idx + 1 })"
      :aria-label="t('recordResult.imageAlt', { n: idx + 1 })"
      :openable="true"
      :stop-propagation="true"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ImageBox from '@/components/Image/ImageBox.vue'
import { EXTRA_IMAGE_DISPLAY_ORDERS } from '@/constants/recordPrintExtraImages'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  aspectRatioCss: {
    type: String,
    default: '1.25 / 1'
  },
  displayOrder: {
    type: String,
    default: 'horizontal',
    validator: (value) => EXTRA_IMAGE_DISPLAY_ORDERS.includes(value)
  },
  gapPx: {
    type: Number,
    default: 0
  },
  roundedCorners: {
    type: Boolean,
    default: false
  }
})

const { t } = useI18n({ useScope: 'global' })

const effectiveGapPx = computed(() => (props.images.length > 1 ? props.gapPx : 0))

const containerRadius = computed(() => (props.roundedCorners ? '10px' : '0'))

const itemRounded = computed(() => props.roundedCorners && effectiveGapPx.value > 0)

const rootStyle = computed(() => ({
  '--extra-images-aspect-ratio': props.aspectRatioCss || '1.25 / 1',
  '--extra-images-gap': `${effectiveGapPx.value}px`,
  '--extra-images-radius': containerRadius.value
}))
</script>

<style scoped>
/* Print layout: aspect ratio lives on `.extra-images` only; ImageBox fills each grid cell. */
.extra-images {
  width: 100%;
  aspect-ratio: var(--extra-images-aspect-ratio);
  border-radius: var(--extra-images-radius, 0);
  overflow: hidden;
  margin-bottom: 1rem;
}

.extra-images--horizontal {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: var(--extra-images-gap, 0);
}

.extra-images--vertical {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: var(--extra-images-gap, 0);
}

.extra-images__item {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: 0;
}

.extra-images__item--rounded {
  border-radius: var(--extra-images-radius, 10px);
  overflow: hidden;
}

.extra-images__item :deep(.image-box) {
  width: 100%;
  height: 100%;
}

.extra-images__item :deep(.image-box__cut) {
  width: 100%;
  height: 100%;
  aspect-ratio: auto !important;
}

.extra-images__item :deep(.image-box__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.extra-images--rounded {
  border-radius: var(--extra-images-radius, 10px);
}
</style>
