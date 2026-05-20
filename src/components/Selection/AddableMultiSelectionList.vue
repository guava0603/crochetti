<template>
  <div
    ref="rootRef"
    class="addable-multi-selection"
    :class="{
      'addable-multi-selection--yarn': isYarn,
      'addable-multi-selection--open': showMenu
    }"
    @keydown.esc.prevent="closeMenu"
  >
    <div
      class="addable-multi-selection__control"
      :class="{ 'addable-multi-selection__control--disabled': disabled }"
    >
      <div v-if="isYarn && selected.length" class="addable-multi-selection__items">
        <div
          v-for="(v, idx) in selected"
          :key="`${v}-${idx}`"
          class="addable-multi-selection__item"
        >
          <div class="addable-multi-selection__chip">
            <span class="addable-multi-selection__chip-text">{{ labelForValue(v) }}</span>
            <button
              type="button"
              class="addable-multi-selection__chip-remove"
              :disabled="disabled"
              @click.stop="removeValue(v)"
            >
              ×
            </button>
          </div>

          <div class="addable-multi-selection__amount">
            <SelectionInputCombineList
              :model-value="String(yarnAmountMap[v] || '')"
              :placeholder="amountPlaceholder"
              :suggestions="amountSuggestions"
              :disabled="disabled"
              @update:modelValue="(next) => setAmount(v, next)"
            />
          </div>
        </div>
      </div>

      <template v-else>
        <span
          v-for="(v, idx) in selected"
          :key="`${v}-${idx}`"
          class="addable-multi-selection__chip"
        >
          <span class="addable-multi-selection__chip-text">{{ labelForValue(v) }}</span>
          <button
            type="button"
            class="addable-multi-selection__chip-remove"
            :disabled="disabled"
            @click.stop="removeValue(v)"
          >
            ×
          </button>
        </span>
      </template>

      <button
        type="button"
        class="addable-multi-selection__add"
        :class="{ 'addable-multi-selection__add--only': selected.length === 0 }"
        :disabled="disabled"
        :aria-label="placeholder || ariaLabel || 'Add'"
        @click="toggleMenu"
      >
        +
      </button>
    </div>

    <div v-if="showMenu" class="addable-multi-selection__menu" @mousedown.prevent>
      <input
        ref="searchRef"
        class="addable-multi-selection__search"
        :placeholder="placeholder"
        :value="query"
        :disabled="disabled"
        autocomplete="off"
        @input="handleInput"
      />

      <button
        v-for="(opt, idx) in filteredOptions"
        :key="`${opt.value}-${idx}`"
        type="button"
        class="addable-multi-selection__option"
        :class="{ 'addable-multi-selection__option--selected': isSelected(opt.value) }"
        @click="toggleValue(opt.value)"
      >
        <span class="addable-multi-selection__option-text">{{ opt.label }}</span>
        <span v-if="isSelected(opt.value)" class="addable-multi-selection__check" aria-hidden="true">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useSearchableOptionsMenu } from '@/composables/useSearchableOptionsMenu'
import { toTrimmedText as toText } from '@/utils/text'
import { buildValueLabelMap, getAvailableSelectionOptions } from '@/utils/selectionOptions'

import SelectionInputCombineList from '@/components/Input/SelectionInputCombineList.vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'multi',
    validator: (v) => ['multi', 'yarn'].includes(String(v))
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  // Yarn variant: track per-selected-id amount
  yarnAmountById: {
    type: Object,
    default: () => ({})
  },
  amountPlaceholder: {
    type: String,
    default: ''
  },
  amountSuggestions: {
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
  ariaLabel: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  maxItems: {
    type: Number,
    default: 12
  }
})

const emit = defineEmits(['update:modelValue', 'update:yarnAmountById'])

const rootRef = ref(null)
const searchRef = ref(null)

const isYarn = computed(() => String(props.variant) === 'yarn')

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

const availableOptions = computed(() => {
  return getAvailableSelectionOptions({ options: props.options, suggestions: props.suggestions })
})

const yarnAmountMap = computed(() => {
  if (!isYarn.value) return {}
  const raw = props.yarnAmountById
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
})

const { query, filteredOptions, showMenu, closeMenu, toggleMenu, handleInput } = useSearchableOptionsMenu({
  rootRef,
  searchRef,
  disabled: computed(() => props.disabled),
  availableOptions,
  maxItems: computed(() => props.maxItems)
})

const valueLabelMap = computed(() => buildValueLabelMap(availableOptions.value))

function labelForValue(v) {
  const value = toText(v)
  if (!value) return ''
  return valueLabelMap.value.get(value) || value
}

function isSelected(v) {
  return selected.value.includes(toText(v))
}

function toggleValue(v) {
  const value = toText(v)
  if (!value || props.disabled) return

  const current = selected.value
  let next
  if (current.includes(value)) next = current.filter((x) => x !== value)
  else next = [...current, value]

  emit('update:modelValue', next)
  if (isYarn.value) cleanupAmountMapForSelection(next)

  query.value = ''
  nextTick(() => searchRef.value?.focus?.())
}

function removeValue(v) {
  const value = toText(v)
  const current = selected.value
  const next = current.filter((x) => x !== value)
  emit('update:modelValue', next)
  if (isYarn.value) cleanupAmountMapForSelection(next)
}

function cleanupAmountMapForSelection(nextSelected) {
  if (!isYarn.value) return

  const keep = new Set(Array.isArray(nextSelected) ? nextSelected.map((x) => toText(x)).filter(Boolean) : [])
  const prev = yarnAmountMap.value
  const next = {}
  for (const key of Object.keys(prev)) {
    const k = toText(key)
    if (!k || !keep.has(k)) continue
    const v = toText(prev[k])
    if (!v) continue
    next[k] = v
  }

  const prevKeys = Object.keys(prev)
  const nextKeys = Object.keys(next)
  const same = prevKeys.length === nextKeys.length && prevKeys.every((k) => next[k] === prev[k])
  if (!same) emit('update:yarnAmountById', next)
}

function setAmount(id, nextValue) {
  if (!isYarn.value) return
  const key = toText(id)
  if (!key) return
  const value = toText(nextValue)

  const prev = yarnAmountMap.value
  if (!value) {
    if (prev[key] == null) return
    const next = { ...prev }
    delete next[key]
    emit('update:yarnAmountById', next)
    return
  }

  if (prev[key] === value) return
  emit('update:yarnAmountById', { ...prev, [key]: value })
}
</script>

<style scoped>
.addable-multi-selection {
  position: relative;
  width: 100%;
}

.addable-multi-selection--open {
  z-index: var(--z-dropdown);
}

.addable-multi-selection__control {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  width: 100%;
}

.addable-multi-selection--yarn .addable-multi-selection__control {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
  flex-wrap: nowrap;
}

.addable-multi-selection__items {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.addable-multi-selection__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.addable-multi-selection--yarn .addable-multi-selection__chip {
  width: fit-content;
  max-width: 50%;
  flex: 0 1 auto;
  min-width: 0;
}

.addable-multi-selection__amount {
  flex: 1;
  min-width: 0;
}

.addable-multi-selection__control--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.addable-multi-selection__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.06);
  color: #111827;
  font-size: 0.85rem;
  font-weight: 800;
  max-width: 100%;
  overflow: hidden;
}

.addable-multi-selection__chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 16rem;
}

.addable-multi-selection__chip-remove {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  color: #6b7280;
}

.addable-multi-selection__chip-remove:disabled {
  cursor: not-allowed;
}

.addable-multi-selection__add {
  border: 2px dotted var(--color-icon-add);
  background: white;
  cursor: pointer;
  border-radius: 999px;
  font-weight: 900;
  font-size: 1rem;
  line-height: 1;
  padding: 0.25rem 0.7rem;
  color: var(--color-icon-add);
}

.addable-multi-selection__add--only {
  padding: 0.35rem 0.85rem;
  font-size: 1.1rem;
}

.addable-multi-selection__add:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.addable-multi-selection__menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: var(--z-dropdown-menu);
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
  padding: 0.35rem;
  max-height: 260px;
  overflow: auto;
}

.addable-multi-selection__search {
  width: 100%;
  border: 1px solid var(--color-border-edit-project, var(--color-border));
  border-radius: 10px;
  outline: none;
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.35rem 0.6rem;
  margin-bottom: 0.25rem;
}

.addable-multi-selection__option {
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

.addable-multi-selection__option:hover {
  background: #f3f4f6;
}

.addable-multi-selection__option--selected {
  background: rgba(17, 24, 39, 0.06);
}

.addable-multi-selection__check {
  font-weight: 900;
  color: var(--color-icon-add);
}
</style>
