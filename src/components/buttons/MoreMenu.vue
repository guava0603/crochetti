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

    <Teleport to="body">
      <div v-if="open" class="more-menu__sheet-layer" @keydown.esc.stop.prevent="close">
        <div class="more-menu__sheet-backdrop" @click="close" />

        <div class="more-menu__sheet" role="dialog" aria-modal="true" :aria-label="label" @click.stop>
          <div
            ref="sheetContentRef"
            class="more-menu__sheet-content"
            role="menu"
            @touchstart.passive="onSheetTouchStart"
            @touchmove="onSheetTouchMove"
            @touchend="onSheetTouchEnd"
            @touchcancel="onSheetTouchEnd"
          >
            <div class="more-menu__sheet-grabber" aria-hidden="true">
              <div class="more-menu__sheet-grabber-bar" />
            </div>
            <template v-if="hasAnyItems">
              <div
                v-for="(section, sIdx) in normalizedSections"
                :key="section.key || sIdx"
                class="more-menu__section"
              >
                <div v-if="section.label" class="more-menu__section-label">
                  {{ section.label }}
                </div>

                <div class="more-menu__section-items">
                  <button
                    v-for="item in section.items"
                    :key="item.key || item.action || item.label"
                    class="more-menu__sheet-item"
                    :class="{ 'more-menu__sheet-item--danger': item.danger }"
                    type="button"
                    role="menuitem"
                    :disabled="disabled || item.disabled || busyAction === (item.action || item.key)"
                    @click="() => handleItemClick(item)"
                  >
                    <span class="more-menu__sheet-item-name">{{ item.label }}</span>
                    <span v-if="item.icon" class="more-menu__sheet-item-icon" aria-hidden="true">
                      <component :is="item.icon" />
                    </span>
                    <img
                      v-else-if="item.iconUrl"
                      class="more-menu__sheet-item-img"
                      :src="item.iconUrl"
                      alt=""
                      aria-hidden="true"
                      draggable="false"
                    />
                  </button>
                </div>
              </div>
            </template>

            <slot v-else :close="close" />
          </div>
        </div>
      </div>
    </Teleport>
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
  },
  sections: {
    type: Array,
    default: () => []
  }
})

const type = computed(() => props.type)

const emit = defineEmits(['select'])

const rootRef = ref(null)
const sheetContentRef = ref(null)
const open = ref(false)
const busyAction = ref('')

const pullState = {
  active: false,
  startY: 0,
  startX: 0
}

const PULL_CLOSE_THRESHOLD_PX = 64
const PULL_VERTICAL_SLOP_PX = 6

function getTouchPoint(event) {
  const t = event?.touches?.[0] || event?.changedTouches?.[0]
  if (!t) return null
  return { x: t.clientX, y: t.clientY }
}

function onSheetTouchStart(event) {
  if (!open.value) return
  if (!event?.touches || event.touches.length !== 1) return

  const p = getTouchPoint(event)
  if (!p) return

  pullState.active = false
  pullState.startX = p.x
  pullState.startY = p.y
}

function onSheetTouchMove(event) {
  if (!open.value) return
  if (!event?.touches || event.touches.length !== 1) return

  const el = sheetContentRef.value
  if (!el) return

  const p = getTouchPoint(event)
  if (!p) return

  // Only enable pull-to-close when the scroll view is already at the top.
  // We start measuring from the moment we are at the top to avoid closing
  // when the user is merely scrolling back to top.
  if (el.scrollTop > 0) {
    pullState.active = false
    return
  }

  const deltaX = Math.abs(p.x - pullState.startX)
  const deltaY = p.y - pullState.startY

  if (!pullState.active) {
    if (deltaY < PULL_VERTICAL_SLOP_PX) return
    if (deltaX > Math.abs(deltaY)) return
    // Activate pull tracking and reset start point at the top.
    pullState.active = true
    pullState.startX = p.x
    pullState.startY = p.y
    return
  }

  if (deltaY <= 0) return

  // Prevent rubber-band / scroll chaining while pulling.
  event.preventDefault()

  if (deltaY >= PULL_CLOSE_THRESHOLD_PX) {
    pullState.active = false
    close()
  }
}

function onSheetTouchEnd() {
  pullState.active = false
}

function normalizeItems(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((i) => i && typeof i.label === 'string' && i.label.length)
    .map((i) => ({
      ...i,
      iconUrl: typeof i.iconUrl === 'string' ? i.iconUrl : ''
    }))
}

const normalizedSections = computed(() => {
  // Preferred API: explicit sections.
  if (Array.isArray(props.sections) && props.sections.length) {
    return props.sections
      .filter((s) => s && Array.isArray(s.items) && s.items.length)
      .map((s) => ({
        key: s.key || s.label || '',
        label: typeof s.label === 'string' ? s.label : '',
        items: normalizeItems(s.items)
      }))
      .filter((s) => s.items.length)
  }

  // Back-compat: single implicit section from `items`.
  const list = normalizeItems(props.items)
  return list.length ? [{ key: 'default', label: '', items: list }] : []
})

const hasAnyItems = computed(() => normalizedSections.value.length > 0)

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

function handleDocumentKeydown(event) {
  if (!open.value) return
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', handleDocumentKeydown)
})

onUnmounted(() => {
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

.more-menu__sheet-layer {
  --more-menu-z: calc(var(--z-bottom-toolbar) + 50);

  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: var(--more-menu-z);
}

.more-menu__sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, 0.28);
  backdrop-filter: blur(2px);
}

.more-menu__sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  max-width: 100vw;
  background: var(--color-surface-sheet);
  border-top: 1px solid rgba(17, 24, 39, 0.10);
  border-radius: 18px 18px 0 0;
  box-shadow: 0 -18px 34px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.more-menu__sheet-content {
  padding: 0.75rem 1.25rem calc(2rem + var(--safe-area-bottom));
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: min(70vh, calc(var(--safe-viewport-height) - 2rem));
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
  background: white;
}

.more-menu__sheet-grabber {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding: 0.25rem 0 0.5rem;
  margin: 0;
  background: white;
}

.more-menu__sheet-grabber-bar {
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.18);
}

.more-menu__section-label {
  font-size: 0.85rem;
  font-weight: 800;
  color: rgba(17, 24, 39, 0.70);
  margin: 0 0 0.4rem;
}

.more-menu__section-items {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.more-menu__sheet-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 0.75rem;
  border: 1px solid rgba(17, 24, 39, 0.10);
  background: rgba(255, 255, 255, 0.55);
  color: #111827;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;
}

.more-menu__sheet-item-name {
  flex: 1;
  text-align: left;
  font-weight: inherit;
}

.more-menu__sheet-item-icon,
.more-menu__sheet-item-img {
  flex: none;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.92;
  transform: scale(2.2);
}

.more-menu__sheet-item-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.more-menu__sheet-item:active {
  transform: translateY(1px);
}

.more-menu__sheet-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.more-menu__sheet-item--danger {
  color: white;
  background-color: var(--color-warning);
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
