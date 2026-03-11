<template>
  <div
    class="selection-button-group"
    :role="groupRole"
    :aria-label="ariaLabel"
  >
    <button
      v-for="opt in normalizedOptions"
      :key="opt.id"
      type="button"
      class="selection-button-group__btn"
      :class="{ 'is-selected': isSelected(opt.id) }"
      :role="buttonRole"
      :aria-checked="ariaChecked(opt.id)"
      :aria-pressed="ariaPressed(opt.id)"
      :disabled="disabled || opt.disabled"
      @click="() => onClick(opt.id)"
    >
      <span class="selection-button-group__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, Array], default: '' },
  options: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  type: {
    type: String,
    default: 'single'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const normalizedOptions = computed(() => {
  const list = Array.isArray(props.options) ? props.options : []
  return list
    .map((o) => {
      const id = o?.id ?? o?.key ?? o?.value
      return {
        id: id != null ? String(id) : '',
        label: o?.label != null ? String(o.label) : '',
        disabled: Boolean(o?.disabled)
      }
    })
    .filter((o) => o.id && o.label)
})

const isMultiple = computed(() => props.type === 'multiple')

const groupRole = computed(() => (isMultiple.value ? 'group' : 'radiogroup'))
const buttonRole = computed(() => (isMultiple.value ? 'button' : 'radio'))

const selectedId = computed(() => {
  const raw = props.modelValue
  const id = raw != null ? String(raw) : ''
  return id
})

const selectedSet = computed(() => {
  const raw = props.modelValue
  const list = Array.isArray(raw) ? raw : []
  return new Set(list.map((v) => (v != null ? String(v) : '')).filter(Boolean))
})

function isSelected(id) {
  const key = String(id || '')
  if (!key) return false
  return isMultiple.value ? selectedSet.value.has(key) : key === selectedId.value
}

function ariaChecked(id) {
  if (isMultiple.value) return null
  return isSelected(id)
}

function ariaPressed(id) {
  if (!isMultiple.value) return null
  return isSelected(id)
}

function select(id) {
  const next = String(id || '')
  if (!next) return
  if (props.disabled) return
  if (next === selectedId.value) return
  emit('update:modelValue', next)
  emit('change', next)
}

function toggle(id) {
  const key = String(id || '')
  if (!key) return
  if (props.disabled) return

  const set = new Set(selectedSet.value)
  if (set.has(key)) set.delete(key)
  else set.add(key)

  const next = Array.from(set)
  emit('update:modelValue', next)
  emit('change', next)
}

function onClick(id) {
  if (isMultiple.value) toggle(id)
  else select(id)
}
</script>

<style scoped>
/*
  Default theme vars (can be overridden by parent styles).
  Matches the SystemSettingsModal palette.
*/
.selection-button-group {
  --text-main: var(--color-font-dark);
  --border-color: var(--color-border);
  --active-bg: rgba(17, 24, 39, 0.06);
  --accent-color: #1f2937;

  display: inline-flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  width: fit-content;
  background-color: transparent;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2px;
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.selection-button-group__btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0.3rem 0.8rem;
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  border-radius: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
  margin: 0 1px;
}

.selection-button-group__btn:first-child {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}

.selection-button-group__btn:last-child {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

.selection-button-group__btn:not(.is-selected):hover {
  background-color: rgba(226, 232, 240, 0.4);
}

.selection-button-group__btn.is-selected {
  background-color: var(--active-bg);
  color: var(--accent-color);
  font-weight: 600;
  box-shadow:
    inset 1px 1px 5px rgba(0, 0, 0, 0.08),
    inset -1px -1px 2px rgba(255, 255, 255, 0.5);
}

.selection-button-group__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.selection-button-group__label {
  display: inline-block;
  line-height: 1.1;
  white-space: nowrap;
  font-weight: inherit;
  color: var(--text-main);
}
</style>
