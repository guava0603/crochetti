<template>
  <div ref="rootRef" class="selection-input" @keydown.esc.stop.prevent="close">
    <button
      type="button"
      class="selection-input__trigger"
      :class="{ 'is-open': open }"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="selection-input__trigger-text">
        {{ displayLabel }}
      </span>
      <span class="selection-input__caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="selection-input__menu" role="listbox" @mousedown.prevent>
      <template v-for="item in normalizedOptions" :key="item.key">
        <div v-if="item.kind === 'group'" class="selection-input__group">
          {{ item.label }}
        </div>

        <button
          v-else
          type="button"
          class="selection-input__option"
          :class="{ 'is-selected': item.isSelected }"
          :disabled="disabled || item.disabled"
          role="option"
          :aria-selected="item.isSelected"
          @click="() => select(item.value)"
        >
          {{ item.label }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  options: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const open = ref(false)

const normalizedOptions = computed(() => {
  const raw = Array.isArray(props.options) ? props.options : []
  const current = props.modelValue

  return raw
    .map((o, idx) => {
      if (!o) return null
      if (o.kind === 'group' || o.type === 'group') {
        const label = String(o.label || '').trim()
        if (!label) return null
        return {
          kind: 'group',
          label,
          key: `g-${label}-${idx}`
        }
      }

      const value = 'value' in o ? o.value : o.id
      const label = String(o.label ?? o.name ?? '').trim()
      if (!label) return null

      return {
        kind: 'option',
        value,
        label,
        disabled: Boolean(o.disabled),
        isSelected: String(value) === String(current),
        key: String(o.key || `o-${String(value)}-${idx}`)
      }
    })
    .filter(Boolean)
})

const displayLabel = computed(() => {
  const selected = normalizedOptions.value.find((o) => o.kind === 'option' && o.isSelected)
  if (selected) return selected.label
  return props.placeholder || ''
})

function close() {
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function select(value) {
  emit('update:modelValue', value)
  emit('change', value)
  close()
}

function handleDocumentPointerDown(e) {
  if (!open.value) return
  const el = rootRef.value
  if (!el) return
  if (el.contains(e.target)) return
  close()
}

function handleDocumentKeydown(e) {
  if (!open.value) return
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<style scoped>
.selection-input {
  position: relative;
  width: 100%;
}

.selection-input__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.selection-input__trigger:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}

.selection-input__trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selection-input__trigger-text {
  text-align: left;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selection-input__caret {
  color: #6b7280;
  font-size: 0.9rem;
  flex: none;
}

.selection-input__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
  padding: 0.25rem;
  max-height: 260px;
  overflow: auto;
}

.selection-input__group {
  text-align: center;
  padding: 0.45rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b7280;
  margin-top: 0.25rem;
  border-top: 1px solid #f3f4f6;
}

.selection-input__option {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #111827;
}

.selection-input__option:hover {
  background: #f3f4f6;
}

.selection-input__option:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selection-input__option.is-selected {
  background: rgba(66, 185, 131, 0.12);
}
</style>
