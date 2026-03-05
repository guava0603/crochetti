<template>
  <div class="button-group" role="toolbar" :aria-label="computedAriaLabel">
    <template v-for="(item, idx) in normalizedItems" :key="item.key || idx">
      <button
        class="button-group__btn"
        type="button"
        :disabled="Boolean(item.disabled)"
        :aria-label="item.ariaLabel || item.label || item.key || t('common.action')"
        :title="item.title || item.ariaLabel || ''"
        @click="() => item.onClick()"
      >
        <component
          v-if="item.icon"
          :is="item.icon"
          v-bind="item.iconProps"
          class="button-group__icon"
        />
        <span v-else-if="item.label" class="button-group__label">{{ item.label }}</span>
      </button>
      <span
        v-if="idx < normalizedItems.length - 1"
        class="button-group__sep"
        aria-hidden="true"
      />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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
  }
})

const computedAriaLabel = computed(() => props.ariaLabel || t('common.actions'))

const normalizedItems = computed(() => {
  const raw = Array.isArray(props.items) ? props.items : []
  return raw
    .map((item) => {
      if (!item) return null
      const icon = item.icon
      const label = typeof item.label === 'string' ? item.label : ''
      const onClick = typeof item.onClick === 'function' ? item.onClick : null
      if ((!icon && !label) || !onClick) return null

      return {
        key: typeof item.key === 'string' ? item.key : '',
        icon,
        label,
        iconProps: (item.iconProps && typeof item.iconProps === 'object') ? item.iconProps : null,
        onClick,
        ariaLabel: typeof item.ariaLabel === 'string' ? item.ariaLabel : '',
        title: typeof item.title === 'string' ? item.title : '',
        disabled: Boolean(item.disabled)
      }
    })
    .filter(Boolean)
})
</script>

<style scoped>
.button-group {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0;
  padding: 3px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
}

.button-group__sep {
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: rgba(0, 0, 0, 0.14);
  border-radius: 999px;
  pointer-events: none;
}

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
</style>
