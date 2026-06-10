<template>
  <div
    class="horizontal-style-picker"
    role="listbox"
    :aria-label="ariaLabel"
  >
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="horizontal-style-picker__option"
      :class="{ 'horizontal-style-picker__option--selected': modelValue === item.id }"
      role="option"
      :aria-selected="modelValue === item.id"
      @click="select(item.id)"
    >
      <span class="horizontal-style-picker__label">{{ item.label }}</span>
      <span
        class="horizontal-style-picker__swatch"
        :style="swatchStyle(item)"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup>
defineOptions({ name: 'HorizontalStylePicker' })

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

function select(id) {
  if (id === props.modelValue) return
  emit('update:modelValue', id)
}

function swatchStyle(item) {
  const colors = Array.isArray(item?.swatchColors) ? item.swatchColors.filter(Boolean) : []
  if (!colors.length) {
    return { background: '#e5e7eb' }
  }
  if (colors.length === 1) {
    return { background: colors[0] }
  }
  const step = 100 / colors.length
  const stops = colors.map((color, index) => {
    const start = (index * step).toFixed(2)
    const end = ((index + 1) * step).toFixed(2)
    return `${color} ${start}% ${end}%`
  })
  return { background: `linear-gradient(135deg, ${stops.join(', ')})` }
}
</script>

<style scoped>
.horizontal-style-picker {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.65rem;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0.5rem 0.75rem 0.55rem;
  box-sizing: border-box;
}

.horizontal-style-picker::-webkit-scrollbar {
  display: none;
}

.horizontal-style-picker__option {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-width: 4.25rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.horizontal-style-picker__label {
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1.2;
  color: #374151;
  text-align: center;
  max-width: 4.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.horizontal-style-picker__swatch {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 0.5rem;
  box-sizing: border-box;
  border: 0.125rem solid rgba(17, 24, 39, 0.12);
  box-shadow: 0 0.15rem 0.4rem rgba(0, 0, 0, 0.08);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.horizontal-style-picker__option--selected .horizontal-style-picker__label {
  color: #111827;
}

.horizontal-style-picker__option--selected .horizontal-style-picker__swatch {
  border-color: #111827;
  box-shadow:
    0 0 0 0.125rem #fff,
    0 0 0 0.25rem #111827;
  transform: scale(1.04);
}

.horizontal-style-picker__option:active .horizontal-style-picker__swatch {
  transform: scale(0.98);
}
</style>
