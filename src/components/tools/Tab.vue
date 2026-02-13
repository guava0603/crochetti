<template>
  <div class="tab">
    <div class="tab__header" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab__title"
        :class="{ 'tab__title--active': t.key === activeKey }"
        type="button"
        role="tab"
        :aria-selected="t.key === activeKey"
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
  if (!key || key === internalKey.value) return
  internalKey.value = key
  emit('update:modelValue', key)
  emit('change', key)
}
</script>

<style scoped>
.tab {
  display: grid;
}

.tab__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.25rem 0;
}

.tab__title {
  border: none;
  background: transparent;
  color: #374151;
  font-weight: 800;
  padding: 0.55rem 0.9rem;
  border-top: 3px solid transparent;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  font-size: 1rem;
}

.tab__title--active {
  border-top-color: #42b983;
  background: white;
  color: #0f5132;
}

.tab__content {
  min-width: 0;
}
</style>
