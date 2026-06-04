<template>
  <div
    class="scroll-list selectable-scroll-list"
    :style="containerStyle"
    role="listbox"
    :aria-label="ariaLabel || undefined"
  >
    <div class="selectable-scroll-list__items">
      <button
        v-for="opt in normalizedOptions"
        :key="opt.id"
        type="button"
        role="option"
        class="selectable-scroll-list__option"
        :class="{ 'is-selected': isSelected(opt.id) }"
        :aria-selected="isSelected(opt.id)"
        :disabled="disabled || opt.disabled"
        @click="select(opt.id)"
      >
        <span class="selectable-scroll-list__label">{{ opt.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  maxHeight: {
    type: String,
    default: '25vh'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const normalizedOptions = computed(() => {
  const list = Array.isArray(props.options) ? props.options : []
  return list
    .map((o) => {
      const id = o?.id ?? o?.value ?? o?.key
      return {
        id: id != null ? String(id) : '',
        label: o?.label != null ? String(o.label) : '',
        disabled: Boolean(o?.disabled)
      }
    })
    .filter((o) => o.id && o.label)
})

const containerStyle = computed(() => ({
  '--scroll-list-max-height': props.maxHeight
}))

const selectedId = computed(() => {
  const raw = props.modelValue
  return raw != null ? String(raw) : ''
})

function isSelected(id) {
  return String(id || '') === selectedId.value
}

function select(id) {
  const next = String(id || '')
  if (!next || props.disabled) return
  if (next === selectedId.value) return
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<style scoped>
.selectable-scroll-list {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
}

.selectable-scroll-list__items {
  display: grid;
}

.selectable-scroll-list__option {
  width: 100%;
  border: 2px solid transparent;
  background: #fff;
  border-radius: 12px;
  padding: 0.6rem 0.8rem;
  font-size: 1rem;
  font-weight: 900;
  color: #111827;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.selectable-scroll-list__option:hover:not(:disabled) {
  border-color: rgb(var(--color-icon-add-rgb) / 0.55);
  background: rgb(var(--color-icon-add-rgb) / 0.12);
}

.selectable-scroll-list__option.is-selected {
  border-color: rgb(var(--color-icon-add-rgb) / 0.85);
  background: rgb(var(--color-icon-add-rgb) / 0.16);
}

.selectable-scroll-list__option:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selectable-scroll-list__label {
  display: block;
  line-height: 1.25;
}
</style>
