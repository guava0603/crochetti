<template>
  <button
    class="button-group__btn"
    type="button"
    :disabled="Boolean(item.disabled)"
    :aria-label="item.ariaLabel || item.label || item.key || t('common.action')"
    :title="item.title || item.ariaLabel || ''"
    @click="handleClick"
  >
    <component
      v-if="isComponentIcon"
      :is="item.icon"
      v-bind="item.iconProps"
      class="button-group__icon"
    />

    <img
      v-else-if="isImageIcon"
      class="button-group__icon button-group__icon--img"
      :src="item.icon"
      :style="isSettingsIcon ? { transform: 'scale(2)' } : null"
      alt=""
      aria-hidden="true"
    />

    <span v-else-if="item.label" class="button-group__label">{{ item.label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const isImageIcon = computed(() => typeof props.item?.icon === 'string' && props.item.icon.length > 0)
const isComponentIcon = computed(() => Boolean(props.item?.icon) && !isImageIcon.value)

const isSettingsIcon = computed(() => {
  if (!isImageIcon.value) return false
  const src = String(props.item?.icon || '')
  return src.includes('assets/image/settings/')
})

function handleClick() {
  const fn = props.item?.onClick
  if (typeof fn === 'function') fn()
}
</script>

<style scoped>
.button-group__btn {
  width: fit-content;
  min-width: 34px;
  height: 34px;
  padding: 0 6px;
  border-radius: 9px;
  border: none;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}

.button-group__btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.button-group__btn:active {
  transform: scale(0.98);
}

.button-group__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Ensure clicks go to the button wrapper, not the icon component. */
.button-group__icon {
  pointer-events: none;
  display: block;
}

.button-group__icon--img {
  width: 18px;
  height: 18px;
}
</style>
