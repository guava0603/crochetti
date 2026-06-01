<template>
  <section v-if="enabled && sourceImages.length" class="extra-images-settings">

    <ul class="image-toggle-list">
      <li v-for="(url, idx) in sourceImages" :key="url" class="image-toggle-item">
        <button
          type="button"
          class="image-toggle-thumb"
          :class="{ 'image-toggle-thumb--selected': isImageSelected(url) }"
          :aria-label="t('recordResult.imageAlt', { n: idx + 1 })"
          :aria-pressed="isImageSelected(url)"
          @click="toggleImageSelected(url)"
        >
          <img class="image-toggle-thumb__img" :src="url" alt="" />
        </button>
      </li>
    </ul>

    <div v-if="selectedCount > 1" class="aspect-picker">
      <p class="settings-group-subtitle">{{ t('recordPrint.extraImages.sizeLabel') }}</p>

      <div
        class="aspect-preview"
        :style="aspectPreviewStyle"
        :aria-label="t('recordPrint.extraImages.aspectPreviewLabel', { ratio: aspectRatioLabel })"
      >
        <span class="aspect-preview__label">{{ aspectRatioLabel }}</span>
      </div>

      <div class="aspect-controls">
        <input
          v-model.number="aspectRatioSlider"
          class="aspect-controls__range"
          type="range"
          :min="EXTRA_IMAGE_ASPECT_RATIO_MIN"
          :max="EXTRA_IMAGE_ASPECT_RATIO_MAX"
          :step="EXTRA_IMAGE_ASPECT_RATIO_STEP"
          :aria-label="t('recordPrint.extraImages.aspectSliderLabel')"
        />
        <button
          type="button"
          class="aspect-controls__rotate"
          :aria-label="t('recordPrint.extraImages.rotateAspectLabel')"
          :title="t('recordPrint.extraImages.rotateAspectLabel')"
          @click="toggleAspectLandscape"
        >
          <span class="aspect-controls__rotate-icon" aria-hidden="true">↻</span>
        </button>
      </div>
    </div>

    <div v-if="selectedCount > 1" class="display-order-picker">
      <p class="settings-group-subtitle">{{ t('recordPrint.extraImages.orderLabel') }}</p>
      <div class="order-options">
        <button
          v-for="option in orderOptions"
          :key="option.value"
          type="button"
          class="order-option"
          :class="{ 'order-option--active': settings.displayOrder === option.value }"
          @click="settings.displayOrder = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="selectedCount > 1" class="modal-section-row extra-images-option-row">
      <span class="modal-section-row__label">{{ t('recordPrint.extraImages.spacingLabel') }}</span>
      <label class="modal-toggle">
        <input v-model="spacingEnabled" type="checkbox" class="modal-toggle__input" />
        <span class="modal-toggle__track" aria-hidden="true" />
      </label>
    </div>

    <div class="modal-section-row extra-images-option-row">
      <span class="modal-section-row__label">{{ t('recordPrint.extraImages.roundedCornersLabel') }}</span>
      <label class="modal-toggle">
        <input v-model="settings.roundedCorners" type="checkbox" class="modal-toggle__input" />
        <span class="modal-toggle__track" aria-hidden="true" />
      </label>
    </div>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  EXTRA_IMAGE_ASPECT_RATIO_MAX,
  EXTRA_IMAGE_ASPECT_RATIO_MIN,
  EXTRA_IMAGE_ASPECT_RATIO_STEP,
  EXTRA_IMAGE_DISPLAY_ORDERS,
  clampAspectRatio,
  formatExtraImagesAspectRatioCss,
  formatExtraImagesAspectRatioLabel,
  normalizeExtraImagesSettings,
  normalizeSourceImageUrls
} from '@/constants/recordPrintExtraImages'

defineOptions({ name: 'PrintImageOptionsSection' })

const props = defineProps({
  enabled: { type: Boolean, default: true },
  titleKey: { type: String, default: 'recordPrint.extraImages.title' },
  sourceImages: { type: Array, default: () => [] }
})

const settings = defineModel({ type: Object, required: true })

const { t } = useI18n({ useScope: 'global' })

const sourceImages = computed(() => normalizeSourceImageUrls(props.sourceImages))

const DEFAULT_GAP_PX = 10

watch(
  () => sourceImages.value.join('\0'),
  () => {
    const normalized = normalizeExtraImagesSettings(settings.value, sourceImages.value)
    settings.value.selectedUrls = normalized.selectedUrls
  },
  { immediate: true }
)

function isImageSelected(url) {
  return Array.isArray(settings.value?.selectedUrls) && settings.value.selectedUrls.includes(url)
}

function setImageSelected(url, selected) {
  const selectedSet = new Set(settings.value?.selectedUrls || [])
  if (selected) selectedSet.add(url)
  else selectedSet.delete(url)
  settings.value.selectedUrls = sourceImages.value.filter((entry) => selectedSet.has(entry))
}

function toggleImageSelected(url) {
  setImageSelected(url, !isImageSelected(url))
}

const aspectRatioCss = computed(() =>
  formatExtraImagesAspectRatioCss(settings.value?.aspectRatio, settings.value?.aspectLandscape)
)

const aspectRatioLabel = computed(() =>
  formatExtraImagesAspectRatioLabel(settings.value?.aspectRatio, settings.value?.aspectLandscape)
)

const ASPECT_PREVIEW_SHORT_SIDE = '3.5rem'

const aspectPreviewStyle = computed(() => {
  const landscape = settings.value?.aspectLandscape !== false
  return {
    aspectRatio: aspectRatioCss.value,
    width: landscape ? 'auto' : ASPECT_PREVIEW_SHORT_SIDE,
    height: landscape ? ASPECT_PREVIEW_SHORT_SIDE : 'auto'
  }
})

const aspectRatioSlider = computed({
  get: () => clampAspectRatio(settings.value?.aspectRatio),
  set: (value) => {
    settings.value.aspectRatio = clampAspectRatio(value)
  }
})

function toggleAspectLandscape() {
  settings.value.aspectLandscape = !settings.value?.aspectLandscape
}

const orderOptions = computed(() =>
  EXTRA_IMAGE_DISPLAY_ORDERS.map((value) => ({
    value,
    label: t(`recordPrint.extraImages.orders.${value}`)
  }))
)

const selectedCount = computed(() => {
  if (!Array.isArray(settings.value?.selectedUrls)) return 0
  return settings.value.selectedUrls.filter((url) => sourceImages.value.includes(url)).length
})

const spacingEnabled = computed({
  get: () => (settings.value?.gapPx ?? 0) > 0,
  set: (enabled) => {
    settings.value.gapPx = enabled ? DEFAULT_GAP_PX : 0
  }
})
</script>

<style scoped>
.extra-images-settings {
  margin-top: 0.65rem;
  margin-left: 0.5rem;
  padding: 0.75rem 0 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-group-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 900;
  color: #111827;
}

.settings-group-subtitle {
  margin: 0 0 0.65rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #6b7280;
}

.image-toggle-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.image-toggle-item {
  flex: none;
}

.image-toggle-thumb {
  display: block;
  padding: 0;
  border: 0.2rem solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  transition: border-color 0.15s;
}

.image-toggle-thumb--selected {
  border-color: var(--color-icon-add);
}

.image-toggle-thumb:focus-visible {
  outline: 2px solid rgb(var(--color-icon-add-rgb) / 0.45);
  outline-offset: 2px;
}

.image-toggle-thumb__img {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.aspect-picker {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.aspect-preview {
  margin-inline: auto;
  flex: none;
  border-radius: 10px;
  background: rgba(243, 244, 246, 0.98);
  border: 1px solid rgba(17, 24, 39, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.aspect-preview__label {
  font-size: 0.85rem;
  font-weight: 900;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.aspect-controls {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.aspect-controls__range {
  flex: 1;
  min-width: 0;
  accent-color: var(--color-icon-add);
}

.aspect-controls__rotate {
  flex: none;
  width: 44px;
  height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.05s;
}

.aspect-controls__rotate:hover {
  background: rgba(243, 244, 246, 0.98);
}

.aspect-controls__rotate:active {
  transform: translateY(1px);
}

.aspect-controls__rotate-icon {
  font-size: 1.25rem;
  line-height: 1;
  color: #374151;
}

.order-options {
  display: flex;
  gap: 0.65rem;
}

.order-option {
  flex: 1;
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  padding: 0.7rem 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.05s;
}

.order-option:hover {
  background: rgba(243, 244, 246, 0.98);
}

.order-option:active {
  transform: translateY(1px);
}

.order-option--active {
  border-color: var(--color-icon-add);
  background: rgb(var(--color-icon-add-rgb) / 0.08);
}

.extra-images-option-row {
  margin-top: 0.15rem;
}
</style>
