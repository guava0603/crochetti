<template>
  <div
    ref="rootRef"
    class="scroll-list selectable-scroll-list"
    :style="containerStyle"
    role="listbox"
    :aria-label="ariaLabel || undefined"
  >
    <!-- Opt-in search (`searchable`): a small search icon pinned at the top-left of the list,
         with the input right after it (placeholder shows once tapped). -->
    <div v-if="searchable" class="selectable-scroll-list__search-row">
      <div
        class="selectable-scroll-list__search"
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
          @keydown.esc.prevent="clearSearch"
        />
      </div>
      <hr class="split-line" />
    </div>

    <p v-if="searchable && searchQuery && !visibleOptions.length" class="selectable-scroll-list__empty">
      {{ t('common.noSearchResults') }}
    </p>

    <div class="selectable-scroll-list__items">
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
    default: '40vh'
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

// Esc: empty the search and close it.
async function clearSearch() {
  searchQuery.value = ''
  await nextTick()
  searchInputRef.value?.blur()
  closeSearch()
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
  color: var(--color-font-option);
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
/* Sticky row at the top of the list; items scroll underneath it. */
.selectable-scroll-list__search-row {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
  background: #fff;
  box-shadow: 0 -0.5rem 0 #fff; /* also covers the list's top padding */
}

/* One look whether searching or not: a small left-aligned icon with the input right after
   it, no background. The whole row is tappable; the placeholder shows once it is opened. */
.selectable-scroll-list__search {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem;
  height: 1.5rem;
  /* Line the icon up with the option labels (option padding + 2px border). */
  padding: 0 calc(0.4rem + 2px);
  color: var(--color-font-note);
  cursor: pointer;
}

.selectable-scroll-list__search-icon {
  flex: none;
  width: 0.9rem;
  height: 0.9rem;
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
  color: var(--color-font-dark);
  -webkit-appearance: none;
  appearance: none;
}

.selectable-scroll-list__search-input::-webkit-search-cancel-button {
  display: none;
}

.selectable-scroll-list__empty {
  margin: 0.5rem 0.25rem;
  font-size: 0.875rem;
  color: var(--color-font-note);
}
</style>
