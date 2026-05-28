<template>
  <section v-if="enabled && sourceImages.length" class="extra-images-settings">
    <h3 class="settings-group-title">{{ t(titleKey) }}</h3>

    <ul class="image-toggle-list">
      <li v-for="(url, idx) in sourceImages" :key="url" class="image-toggle-row">
        <img
          class="image-toggle-row__thumb"
          :src="url"
          :alt="t('recordResult.imageAlt', { n: idx + 1 })"
        />
        <span class="image-toggle-row__label">
          {{ t('recordResult.imageAlt', { n: idx + 1 }) }}
        </span>
        <label class="modal-toggle">
          <input
            :checked="isImageSelected(url)"
            type="checkbox"
            class="modal-toggle__input"
            @change="setImageSelected(url, $event.target.checked)"
          />
          <span class="modal-toggle__track" aria-hidden="true" />
        </label>
      </li>
    </ul>

    <div class="size-picker">
      <p class="settings-group-subtitle">{{ t('recordPrint.extraImages.sizeLabel') }}</p>
      <div class="size-options">
        <button
          v-for="option in sizeOptions"
          :key="option.value"
          type="button"
          class="size-option"
          :class="{ 'size-option--active': settings.size === option.value }"
          @click="settings.size = option.value"
        >
          <span class="size-option__label">{{ option.label }}</span>
          <span
            class="size-option__preview"
            :style="{ aspectRatio: option.previewRatio }"
            aria-hidden="true"
          />
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
  EXTRA_IMAGE_ASPECT_RATIOS,
  EXTRA_IMAGE_DISPLAY_ORDERS,
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

const sizeOptions = computed(() =>
  EXTRA_IMAGE_ASPECT_RATIOS.map((value) => ({
    value,
    label: t(`recordPrint.extraImages.sizes.${value.replace(':', '_')}`),
    previewRatio: value.replace(':', ' / ')
  }))
)

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
  flex-direction: column;
  gap: 0.55rem;
}

.image-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.image-toggle-row__thumb {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  flex: none;
}

.image-toggle-row__label {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  color: #374151;
  font-size: 0.9rem;
}

.size-options {
  display: flex;
  gap: 0.65rem;
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

.size-option {
  flex: 1;
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  padding: 0.55rem 0.45rem 0.65rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.size-option--active {
  border-color: var(--color-icon-add);
  background: rgb(var(--color-icon-add-rgb) / 0.08);
}

.size-option__label {
  font-size: 0.8rem;
  font-weight: 800;
  color: #374151;
}

.size-option__preview {
  width: 100%;
  max-width: 56px;
  border-radius: 6px;
  border: 2px solid rgba(17, 24, 39, 0.12);
  background: rgba(243, 244, 246, 0.95);
}

.extra-images-option-row {
  margin-top: 0.15rem;
}
</style>