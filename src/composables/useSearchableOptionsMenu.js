import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { toTrimmedText as toText } from '@/utils/text'

export function useSearchableOptionsMenu({
  rootRef,
  searchRef,
  disabled,
  availableOptions,
  maxItems
}) {
  const isMenuOpen = ref(false)
  const query = ref('')

  const resolvedMaxItems = computed(() => {
    const raw = Number(maxItems?.value ?? maxItems)
    if (!Number.isFinite(raw)) return 12
    return Math.max(1, Math.trunc(raw))
  })

  const filteredOptions = computed(() => {
    const q = toText(query.value).toLowerCase()
    const list = Array.isArray(availableOptions?.value) ? availableOptions.value : []
    if (!q) return list.slice(0, resolvedMaxItems.value)

    return list
      .filter((o) => String(o?.label || '').toLowerCase().includes(q))
      .slice(0, resolvedMaxItems.value)
  })

  const showMenu = computed(() => {
    return Boolean(isMenuOpen.value && filteredOptions.value.length > 0)
  })

  function openMenu() {
    if (disabled?.value) return
    isMenuOpen.value = true
    query.value = ''
    nextTick(() => {
      searchRef?.value?.focus?.()
    })
  }

  function closeMenu() {
    isMenuOpen.value = false
    query.value = ''
  }

  function toggleMenu() {
    if (isMenuOpen.value) closeMenu()
    else openMenu()
  }

  function handleInput(e) {
    query.value = e?.target?.value ?? ''
  }

  function onGlobalPointerDown(e) {
    if (!isMenuOpen.value) return
    const root = rootRef?.value
    if (!root) return
    if (root.contains(e?.target)) return
    closeMenu()
  }

  onMounted(() => {
    window.addEventListener('pointerdown', onGlobalPointerDown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', onGlobalPointerDown)
  })

  return {
    query,
    filteredOptions,
    showMenu,
    openMenu,
    closeMenu,
    toggleMenu,
    handleInput
  }
}
