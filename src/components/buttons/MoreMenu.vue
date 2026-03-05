<template>
  <div
    ref="rootRef"
    class="more-menu"
    :class="{ 'more-menu--sm': type === 'sm' }"
    @keydown.esc.stop.prevent="close"
  >
    <button
      class="more-menu__button"
      type="button"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <slot name="icon">
        <span class="more-menu__icon" aria-hidden="true">
          <ButtonSettingIcon />
        </span>
      </slot>
      <span class="sr-only">{{ label }}</span>
    </button>

    <div v-if="open" class="more-menu__panel" role="menu" @mousedown.prevent>
      <template v-if="hasItems">
        <button
          v-for="item in items"
          :key="item.key || item.action || item.label"
          class="more-menu__item"
          :class="{ 'more-menu__item--danger': item.danger }"
          type="button"
          role="menuitem"
          :disabled="disabled || item.disabled || busyAction === (item.action || item.key)"
          @click="() => handleItemClick(item)"
        >
          {{ item.label }}
        </button>
      </template>

      <slot v-else :close="close" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ButtonSettingIcon from '@/components/buttons/svg/ButtonSetting.vue'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  type: {
    type: String,
    default: 'md',
    validator: (v) => ['md', 'sm'].includes(v)
  },
  label: { type: String, default: 'More' },
  items: {
    type: Array,
    default: () => []
  }
})

const type = computed(() => props.type)

const emit = defineEmits(['select'])

const rootRef = ref(null)
const open = ref(false)
const busyAction = ref('')

const hasItems = computed(() => Array.isArray(props.items) && props.items.length > 0)

const items = computed(() => {
  if (!Array.isArray(props.items)) return []
  return props.items.filter((i) => i && typeof i.label === 'string' && i.label.length)
})

function close() {
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

async function handleItemClick(item) {
  if (props.disabled) return
  if (!item || item.disabled) return

  // Close immediately so the panel never stays stuck under overlays.
  close()

  const action = String(item.action || item.key || '')
  busyAction.value = action
  try {
    if (typeof item.onSelect === 'function') {
      await item.onSelect()
      return
    }
    if (action) emit('select', action)
  } finally {
    busyAction.value = ''
  }
}

function handleDocumentClick(event) {
  if (!open.value) return
  const root = rootRef.value
  if (!root) return
  if (!root.contains(event.target)) close()
}

function handleDocumentKeydown(event) {
  if (!open.value) return
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<style scoped>
.more-menu {
  position: relative;
  display: inline-flex;
}

.more-menu__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s, opacity 0.15s;
}

.more-menu__button:hover {
  background: rgba(243, 244, 246, 0.98);
}

.more-menu__button:active {
  transform: translateY(1px);
}

.more-menu__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.more-menu__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #111827;
}

/* Flatten ButtonSettingIcon when used inside this button */
.more-menu__icon :deep(.svg-button-block) {
  width: 20px;
  height: 20px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.more-menu__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  min-width: 160px;
  padding: 0.35rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  z-index: 2000;
}

.more-menu--sm .more-menu__panel {
  min-width: unset;
  width: max-content;
  max-width: calc(100vw - 24px);
}

.more-menu__panel :deep(.more-menu__item) {
  display: flex;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.2rem;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
}

.more-menu__panel :deep(.more-menu__item:hover) {
  background: rgba(0, 0, 0, 0.05);
}

.more-menu__panel :deep(.more-menu__item:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

.more-menu__panel :deep(.more-menu__item--danger) {
  color: #b91c1c;
  border-top: 1px solid #eaeaea;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
