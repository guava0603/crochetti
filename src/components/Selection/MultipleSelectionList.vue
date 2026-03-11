<template>
  <div class="multiple-selection" @keydown.esc.prevent="closeMenu">
    <div
      class="multiple-selection__control"
      :class="{ 'multiple-selection__control--disabled': disabled }"
      @mousedown.prevent="focusInput"
    >
      <div v-if="selected.length" class="multiple-selection__chips" aria-hidden="true">
        <span v-for="(v, idx) in selected" :key="`${v}-${idx}`" class="multiple-selection__chip">
          <span class="multiple-selection__chip-text">{{ labelForValue(v) }}</span>
          <button
            type="button"
            class="multiple-selection__chip-remove"
            :disabled="disabled"
            @click.stop="removeValue(v)"
          >
            ×
          </button>
        </span>
      </div>

      <input
        ref="inputRef"
        :id="inputId || null"
        :aria-label="ariaLabel || null"
        class="multiple-selection__input"
        :placeholder="selected.length ? '' : placeholder"
        :disabled="disabled"
        autocomplete="off"
        :value="query"
        @focus="openMenu"
        @input="handleInput"
        @blur="handleBlur"
      />
    </div>

    <div v-if="showMenu" class="multiple-selection__menu" @mousedown.prevent>
      <button
        v-for="(opt, idx) in filteredOptions"
        :key="`${opt.value}-${idx}`"
        type="button"
        class="multiple-selection__option"
        :class="{ 'multiple-selection__option--selected': isSelected(opt.value) }"
        @click="toggleValue(opt.value)"
      >
        <span class="multiple-selection__option-text">{{ opt.label }}</span>
        <span v-if="isSelected(opt.value)" class="multiple-selection__check" aria-hidden="true">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  suggestions: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  inputId: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  maxItems: {
    type: Number,
    default: 12
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const inputRef = ref(null)
const isMenuOpen = ref(false)
const query = ref('')

function toText(v) {
  return String(v ?? '').trim()
}

const selected = computed(() => {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(props.modelValue) ? props.modelValue : []) {
    const v = toText(raw)
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
})

function normalizeOption(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const v = toText(raw)
    return v ? { value: v, label: v } : null
  }
  if (typeof raw !== 'object') return null
  const value = toText(raw.value)
  const label = toText(raw.label)
  if (!value) return null
  return { value, label: label || value }
}

const normalizedOptions = computed(() => {
  const rawOptions = Array.isArray(props.options) ? props.options : []
  if (rawOptions.length === 0) return []

  const seen = new Set()
  const out = []
  for (const raw of rawOptions) {
    const opt = normalizeOption(raw)
    if (!opt) continue
    if (seen.has(opt.value)) continue
    seen.add(opt.value)
    out.push(opt)
  }
  return out
})

const normalizedSuggestions = computed(() => {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(props.suggestions) ? props.suggestions : []) {
    const v = toText(raw)
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push({ value: v, label: v })
  }
  return out
})

const availableOptions = computed(() => {
  return normalizedOptions.value.length ? normalizedOptions.value : normalizedSuggestions.value
})

const valueLabelMap = computed(() => {
  const map = new Map()
  for (const opt of availableOptions.value) {
    if (!opt?.value) continue
    if (!map.has(opt.value)) map.set(opt.value, opt.label || opt.value)
  }
  return map
})

function labelForValue(v) {
  const value = toText(v)
  if (!value) return ''
  return valueLabelMap.value.get(value) || value
}

const filteredOptions = computed(() => {
  const q = toText(query.value).toLowerCase()
  const list = availableOptions.value
  if (!q) return list.slice(0, props.maxItems)
  return list
    .filter((o) => String(o?.label || '').toLowerCase().includes(q))
    .slice(0, props.maxItems)
})

const showMenu = computed(() => {
  return isMenuOpen.value && filteredOptions.value.length > 0
})

function isSelected(v) {
  return selected.value.includes(toText(v))
}

function openMenu(e) {
  if (props.disabled) return
  isMenuOpen.value = true
  emit('focus', e)
}

function closeMenu() {
  isMenuOpen.value = false
}

function focusInput() {
  if (props.disabled) return
  inputRef.value?.focus?.()
}

function handleInput(e) {
  isMenuOpen.value = true
  query.value = e?.target?.value ?? ''
}

function handleBlur(e) {
  window.setTimeout(() => {
    closeMenu()
    query.value = ''
  }, 0)
  emit('blur', e)
}

function toggleValue(v) {
  const value = toText(v)
  if (!value || props.disabled) return

  const current = selected.value
  if (current.includes(value)) {
    emit('update:modelValue', current.filter((x) => x !== value))
  } else {
    emit('update:modelValue', [...current, value])
  }

  query.value = ''
  inputRef.value?.focus?.()
}

function removeValue(v) {
  const value = toText(v)
  const current = selected.value
  emit('update:modelValue', current.filter((x) => x !== value))
}
</script>

<style scoped>
.multiple-selection {
  position: relative;
  flex: 1;
}

.multiple-selection__control {
  width: 100%;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.multiple-selection__control--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.multiple-selection__chips {
  display: inline-flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.multiple-selection__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.06);
  color: #111827;
  font-size: 0.85rem;
  font-weight: 800;
}

.multiple-selection__chip-remove {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  color: #6b7280;
}

.multiple-selection__chip-remove:disabled {
  cursor: not-allowed;
}

.multiple-selection__input {
  flex: 1;
  min-width: 120px;
  border: none;
  background: white;
  border: 1px solid var(--color-border-edit-project, var(--color-border));
  border-radius: 2rem;
  outline: none;
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.3rem 0.8rem;
}

.multiple-selection__control:focus-within {
  border-color: var(--color-icon-add);
  box-shadow: 0 0 0 2px rgb(var(--color-icon-add-rgb) / 0.1);
}

.multiple-selection__menu {
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
  max-height: 220px;
  overflow: auto;
}

.multiple-selection__option {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.multiple-selection__option:hover {
  background: #f3f4f6;
}

.multiple-selection__option--selected {
  background: rgba(17, 24, 39, 0.06);
}

.multiple-selection__check {
  font-weight: 900;
  color: var(--color-icon-add);
}
</style>
