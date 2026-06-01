<template>
  <div
    class="button-group"
    role="toolbar"
    :aria-label="computedAriaLabel"
    :style="{ '--item-count': itemCount, '--active-index': activeIndex }"
  >
    <div class="button-group__slider" aria-hidden="true" />

    <template v-for="(item, idx) in normalizedItems" :key="item.key || idx">
      <button
        class="button-group__btn"
        type="button"
        :class="{ 'is-active': item.key === activeKey }"
        :disabled="Boolean(item.disabled)"
        :aria-pressed="String(item.key === activeKey)"
        :aria-label="item.ariaLabel || item.label || item.key || t('common.action')"
        :title="item.title || item.ariaLabel || ''"
        @click="() => handleClick(item)"
      >
        <component
          v-if="item.icon"
          :is="item.icon"
          v-bind="item.iconProps"
          class="button-group__icon"
        />
        <span v-else-if="item.label" class="button-group__label">{{ item.label }}</span>
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const computedAriaLabel = computed(() => props.ariaLabel || t('common.actions'))

const normalizedItems = computed(() => {
  const raw = Array.isArray(props.items) ? props.items : []
  return raw
    .map((item) => {
      if (!item) return null
      const icon = item.icon
      const label = typeof item.label === 'string' ? item.label : ''
      if ((!icon && !label) || typeof item.key !== 'string' || !item.key) return null

      return {
        key: item.key,
        icon,
        label,
        iconProps: (item.iconProps && typeof item.iconProps === 'object') ? item.iconProps : null,
        ariaLabel: typeof item.ariaLabel === 'string' ? item.ariaLabel : '',
        title: typeof item.title === 'string' ? item.title : '',
        disabled: Boolean(item.disabled),
        onClick: typeof item.onClick === 'function' ? item.onClick : null
      }
    })
    .filter(Boolean)
})

const firstEnabledKey = computed(() => {
  const first = normalizedItems.value.find((i) => !i.disabled)
  return first?.key || ''
})

// Local fallback state so multiple toggle groups can coexist
// even when parent doesn't bind v-model.
const localActiveKey = ref('')

watch(
  () => normalizedItems.value,
  () => {
    const keys = new Set(normalizedItems.value.map((i) => i.key))
    if (localActiveKey.value && keys.has(localActiveKey.value)) return
    localActiveKey.value = firstEnabledKey.value
  },
  { immediate: true, deep: true }
)

const activeKey = computed(() => {
  const keys = new Set(normalizedItems.value.map((i) => i.key))
  if (props.modelValue && keys.has(props.modelValue)) return props.modelValue
  return localActiveKey.value || firstEnabledKey.value
})

const itemCount = computed(() => Math.max(1, normalizedItems.value.length))

const activeIndex = computed(() => {
  const idx = normalizedItems.value.findIndex((i) => i.key === activeKey.value)
  return idx >= 0 ? idx : 0
})

const handleClick = (item) => {
  if (!item || item.disabled) return
  localActiveKey.value = item.key
  emit('update:modelValue', item.key)
  if (typeof item.onClick === 'function') {
    item.onClick(item.key)
  }
}
</script>

<style scoped>
.button-group {
  /* Neutral style (used by all toggle groups now)
     - active pill: white
     - background: light gray
     - no border
     - text: dark gray
  */
  --bg: #f3f4f6;
  --border: none;
  --slider-bg: #fff;
  --slider-shadow: none;
  --text: #374151;
  --text-active: #374151;
  --hover-bg: rgba(255, 255, 255, 0.55);
  --btn-height: 34px;

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0;
  padding: 3px;
  border-radius: 999px;
  border: var(--border);
  background: var(--bg);
  overflow: hidden;
}

.button-group__slider {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / var(--item-count));
  background: var(--slider-bg);
  border-radius: 999px;
  box-shadow: var(--slider-shadow);
  transform: translateX(calc(var(--active-index) * 100%));
  transition: transform 0.3s ease-out, background 0.2s ease;
  z-index: 0;
}

.button-group__btn {
  width: fit-content;
  min-width: 40px;
  height: var(--btn-height);
  padding: 0 12px;
  border-radius: 999px;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    background 0.12s ease,
    box-shadow 0.12s ease,
    color 0.12s ease;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text);
}

.button-group__btn:hover {
  background: var(--hover-bg);
}

.button-group__btn.is-active {
  color: var(--text-active);
}

.button-group__btn.is-active:hover {
  background: transparent;
}

.button-group__btn:active {
  transform: scale(0.98);
}

.button-group__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.button-group__label {
  line-height: 1.1;
  white-space: nowrap;
  font-weight: inherit;
  font-size: inherit;
}

/* Ensure clicks go to the button wrapper, not the icon component. */
.button-group__icon {
  pointer-events: none;
  display: block;
}

.button-group__btn.is-active .button-group__icon {
  color: currentColor;
}
</style>
