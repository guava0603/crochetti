<template>
  <div class="selection-combine" @keydown.esc.prevent="closeMenu">
    <input
      ref="inputRef"
      :value="modelValue"
      class="selection-combine__input"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      @focus="openMenu"
      @input="handleInput"
      @blur="handleBlur"
    />

    <div
      v-if="showMenu"
      class="selection-combine__menu"
      @mousedown.prevent
    >
      <button
        v-for="(s, idx) in filteredSuggestions"
        :key="`${s}-${idx}`"
        type="button"
        class="selection-combine__option"
        @click="selectSuggestion(s)"
      >
        {{ s }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  suggestions: {
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
  maxItems: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const inputRef = ref(null)
const isMenuOpen = ref(false)

function openMenu(e) {
  if (props.disabled) return
  isMenuOpen.value = true
  emit('focus', e)
}

function closeMenu() {
  isMenuOpen.value = false
}

function handleInput(e) {
  isMenuOpen.value = true
  emit('update:modelValue', e?.target?.value ?? '')
}

function handleBlur(e) {
  // Allow click selection from menu before closing.
  window.setTimeout(() => {
    closeMenu()
  }, 0)
  emit('blur', e)
}

function selectSuggestion(s) {
  emit('update:modelValue', String(s ?? ''))
  closeMenu()
  // Keep focus for quick edits
  inputRef.value?.focus?.()
}

const normalizedSuggestions = computed(() => {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(props.suggestions) ? props.suggestions : []) {
    const v = String(raw ?? '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
})

const filteredSuggestions = computed(() => {
  const q = String(props.modelValue ?? '').trim().toLowerCase()
  const list = normalizedSuggestions.value
  if (!q) return list.slice(0, props.maxItems)
  return list
    .filter((s) => s.toLowerCase().includes(q))
    .slice(0, props.maxItems)
})

const showMenu = computed(() => {
  return isMenuOpen.value && filteredSuggestions.value.length > 0
})
</script>

<style scoped>
.selection-combine {
  position: relative;
  flex: 1;
}

.selection-combine__input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
}

.selection-combine__input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}

.selection-combine__menu {
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

.selection-combine__option {
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

.selection-combine__option:hover {
  background: #f3f4f6;
}
</style>
