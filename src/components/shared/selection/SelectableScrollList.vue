<template>
  <div
    ref="rootRef"
    class="scroll-list selectable-scroll-list"
    :style="containerStyle"
    role="listbox"
    :aria-label="ariaLabel || undefined"
  >
    <!-- Opt-in search (`searchable`): a round icon button at the top-right that expands
         into a full-width input when tapped. The row has no height while collapsed. -->
    <div
      v-if="searchable"
      class="selectable-scroll-list__search-row"
      :class="{ 'is-expanded': isSearchExpanded }"
    >
      <div
        class="selectable-scroll-list__search"
        :class="{ 'is-expanded': isSearchExpanded }"
        role="search"
        @click="focusSearch"
      >
        <svg class="selectable-scroll-list__search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" />
          <path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          class="selectable-scroll-list__search-input"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          :placeholder="isSearchExpanded ? resolvedSearchPlaceholder : ''"
          :aria-label="resolvedSearchPlaceholder"
          :disabled="disabled"
          @focus="openSearch"
          @keydown.esc.prevent="clearSearch(true)"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="selectable-scroll-list__search-clear"
          :aria-label="t('common.clearSearch')"
          @mousedown.prevent
          @click.stop="clearSearch(false)"
        >
          ×
        </button>
      </div>
    </div>

    <p v-if="searchable && searchQuery && !visibleOptions.length" class="selectable-scroll-list__empty">
      {{ t('common.noSearchResults') }}
    </p>

    <div
      class="selectable-scroll-list__items"
      :class="{ 'has-search-button': searchable && !isSearchExpanded }"
    >
      <button
        v-for="opt in visibleOptions"
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
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

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
  },
  /** Show the collapsible search bar above the list. Off by default so other screens are unchanged. */
  searchable: {
    type: Boolean,
    default: false
  },
  searchPlaceholder: {
    type: String,
    default: ''
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

const rootRef = ref(null)
const searchInputRef = ref(null)
const searchQuery = ref('')
const searchOpen = ref(false)

const resolvedSearchPlaceholder = computed(() => props.searchPlaceholder || t('common.search'))
const isSearchExpanded = computed(() => searchOpen.value || Boolean(searchQuery.value))

// Once opened, the search stays open while the user works inside the list. Collapsing on
// blur moved every item up mid-tap, so the first tap on a design after searching was lost.
// It collapses only on a tap outside the list (with an empty query) or on Esc.
function handleOutsidePointer(e) {
  if (rootRef.value?.contains(e.target)) return
  if (searchQuery.value) return
  closeSearch()
}

function openSearch() {
  if (searchOpen.value) return
  searchOpen.value = true
  document.addEventListener('pointerdown', handleOutsidePointer, true)
}

function closeSearch() {
  searchOpen.value = false
  document.removeEventListener('pointerdown', handleOutsidePointer, true)
}

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointer, true)
})

// Case-insensitive match on the label; the selected item is never changed by filtering.
const visibleOptions = computed(() => {
  if (!props.searchable) return normalizedOptions.value
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return normalizedOptions.value
  return normalizedOptions.value.filter((o) => o.label.toLowerCase().includes(q))
})

function focusSearch() {
  if (props.disabled) return
  searchInputRef.value?.focus()
}

async function clearSearch(close) {
  searchQuery.value = ''
  await nextTick()
  if (close) {
    searchInputRef.value?.blur()
    closeSearch()
  } else {
    searchInputRef.value?.focus()
  }
}

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

/* ---- Search (only rendered when `searchable`) ---- */
/* Sticky row with zero height while collapsed: the round button floats over the
   top-right corner of the list instead of taking a row of its own. */
.selectable-scroll-list__search-row {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  height: 0;
  overflow: visible;
}

.selectable-scroll-list__search-row.is-expanded {
  height: auto;
  margin-bottom: 0.4rem;
  background: #fff;
  box-shadow: 0 0 0 0.5rem #fff; /* covers items scrolling underneath */
}

.selectable-scroll-list__search {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex: none;
  width: 2rem;
  height: 2rem;
  margin-top: 0.3rem;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
  transition: width 0.18s ease, height 0.18s ease, background 0.18s ease;
}

.selectable-scroll-list__search.is-expanded {
  flex: 1;
  justify-content: flex-start;
  width: auto;
  height: 2.25rem;
  margin-top: 0;
  padding: 0 0.6rem;
  background: #fff;
  cursor: text;
  box-shadow: inset 0 0 0 1px rgb(var(--color-icon-add-rgb) / 0.55);
}

.selectable-scroll-list__search-icon {
  flex: none;
  width: 1rem;
  height: 1rem;
}

/* Leave room on the first option so the collapsed button never covers it. */
.selectable-scroll-list__items.has-search-button .selectable-scroll-list__option:first-child {
  width: calc(100% - 2.5rem);
}

/* Input text stays 16px even while collapsed so iOS Safari does not zoom on focus. */
.selectable-scroll-list__search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 16px;
  color: #111827;
  -webkit-appearance: none;
  appearance: none;
}

.selectable-scroll-list__search:not(.is-expanded) .selectable-scroll-list__search-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.selectable-scroll-list__search-input::-webkit-search-cancel-button {
  display: none;
}

.selectable-scroll-list__search-clear {
  flex: none;
  width: 1.4rem;
  height: 1.4rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #e5e7eb;
  color: #4b5563;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
}

.selectable-scroll-list__empty {
  margin: 0.5rem 0.25rem;
  font-size: 0.875rem;
  color: #9ca3af;
}
</style>
