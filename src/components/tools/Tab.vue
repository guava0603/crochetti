<template>
  <div class="tab">
    <div class="tab__header" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab__title"
        :class="{ 'tab__title--active': t.key === activeKey, 'tab__title--disabled': Boolean(t.disabled) }"
        type="button"
        role="tab"
        :aria-selected="t.key === activeKey"
        :disabled="Boolean(t.disabled)"
        @click="setActive(t.key)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="tab__content" role="tabpanel">
      <slot :name="activeKey" />
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'ToolsTab' })
import { computed, ref, watch } from 'vue'

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
    validator: (arr) => Array.isArray(arr) && arr.every((t) => t && typeof t.key === 'string')
  },
  modelValue: {
    type: String,
    default: ''
  },
  defaultKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const firstKey = computed(() => props.tabs?.[0]?.key || '')
const internalKey = ref(props.modelValue || props.defaultKey || firstKey.value)

watch(
  () => props.modelValue,
  (next) => {
    if (next && next !== internalKey.value) internalKey.value = next
  }
)

watch(
  () => props.tabs,
  () => {
    const keys = new Set((props.tabs || []).map((t) => t.key))
    if (!keys.has(internalKey.value)) {
      internalKey.value = props.defaultKey || firstKey.value
      emit('update:modelValue', internalKey.value)
      emit('change', internalKey.value)
    }
  },
  { deep: true }
)

const activeKey = computed(() => internalKey.value)

function setActive(key) {
  const target = (props.tabs || []).find((t) => t && t.key === key) || null
  if (target && target.disabled) return
  if (!key || key === internalKey.value) return
  internalKey.value = key
  emit('update:modelValue', key)
  emit('change', key)
}
</script>

<style scoped>
.tab {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-top: 1rem;
}

.tab__header {
  display: flex;
  align-items: flex-end;
  gap: 0;
  width: 100%;
  padding: 0.35rem 0.5rem 0;
  background: var(--color-border);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  box-shadow: inset 0 -1px 0 rgba(17, 24, 39, 0.08);
}

.tab__header::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.tab__title {
  flex: 1;
  position: relative;
  border: none;
  background: transparent;
  color: var(--color-icon-base);
  font-weight: 850;
  height: 40px;
  padding: 0 1.15rem;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.08s ease;
  white-space: nowrap;
  font-size: 0.95rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.tab__title::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 18px;
  background: rgba(17, 24, 39, 0.26);
  opacity: 0;
  pointer-events: none;
}

.tab__title:not(.tab__title--active):not(.tab__title--disabled):not(:last-child)::after {
  opacity: 1;
}

.tab__title.tab__title--active + .tab__title::after {
  opacity: 0;
}

.tab__title:hover:not(.tab__title--disabled):not(.tab__title--active) {
  background: rgba(255, 255, 255, 0.6);
  color: var(--color-font-dark);
}

.tab__title:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.22);
}

.tab__title--active {
  background-color: var(--color-background);
  color: var(--color-font-dark);
  font-weight: 900;
  box-shadow: 0 -6px 18px rgba(17, 24, 39, 0.08);
  transform: translateY(1px) translateX(-1px);
}

.tab__title--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tab__content {
  min-width: 0;
  display: flex;
  flex: 1;
}
</style>
