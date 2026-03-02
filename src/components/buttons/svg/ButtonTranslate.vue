<template>
  <div class="translate-root" ref="root">
    <button
      type="button"
      class="translate-button"
      :aria-label="t('toolbar.editRow.crochetLang')"
      aria-haspopup="menu"
      :aria-expanded="String(isOpen)"
      @click="toggle"
    >
      <svg
        class="translate-icon"
        stroke-width="2.7"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        color="#fa5c5c"
      >
        <path
          d="M2 5H9M16 5H13.5M9 5L13.5 5M9 5V3M13.5 5C12.6795 7.73513 10.9612 10.3206 9 12.5929M4 17.5C5.58541 16.1411 7.376 14.4744 9 12.5929M9 12.5929C8 11.5 6.4 9.3 6 8.5M9 12.5929L12 15.5"
          stroke="#fa5c5c"
          stroke-width="2.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M13.5 21L14.6429 18M21.5 21L20.3571 18M14.6429 18L17.5 10.5L20.3571 18M14.6429 18H20.3571"
          stroke="#fa5c5c"
          stroke-width="2.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div v-if="isOpen" class="translate-menu" role="menu">
      <button
        type="button"
        class="translate-option"
        :class="{ selected: crochetLang === 0 }"
        role="menuitem"
        @click="selectLang(0)"
      >
        {{ t('toolbar.editRow.crochetLangSymbolJp') }}
      </button>
      <button
        type="button"
        class="translate-option"
        :class="{ selected: crochetLang === 1 }"
        role="menuitem"
        @click="selectLang(1)"
      >
        {{ t('toolbar.editRow.crochetLangTextZh') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCrochetLang } from '@/composables/useCrochetLang'

const { t } = useI18n({ useScope: 'global' })
const { crochetLang: crochetLangRef, setCrochetLang } = useCrochetLang()

const crochetLang = computed(() => Number(crochetLangRef.value) || 0)
const isOpen = ref(false)
const root = ref(null)

const toggle = () => {
  isOpen.value = !isOpen.value
}

const selectLang = async (langId) => {
  await setCrochetLang(langId)
  isOpen.value = false
}

const handleOutsidePointerDown = (event) => {
  if (!isOpen.value) return
  const el = root.value
  if (!el) return
  if (el.contains(event.target)) return
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
})
</script>

<style scoped>
.translate-root {
  position: relative;
  display: inline-flex;
  z-index: 100;
}

.translate-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
}

.translate-button:hover {
  background: #f9fafb;
}

.translate-icon {
  width: 20px;
  height: 20px;
}

.translate-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  padding: 0.25rem;
  z-index: 30;
}

.translate-option {
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.translate-option:hover {
  background: #f3f4f6;
}

.translate-option.selected {
  background: #ecfdf5;
  color: #065f46;
}
</style>
