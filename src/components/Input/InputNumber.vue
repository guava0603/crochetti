<template>
  <div
    ref="rootRef"
    class="selection-actions"
    :class="{ 'selection-actions--sm': props.size === 'sm' }"
    :style="cssVars"
    @click.stop
    @blur.capture="handleBlur"
    tabindex="-1"
  >
    <!-- 滾輪外層容器 -->
    <div class="picker-container">
      <!-- 選中區域的視覺指示器 -->
      <div class="picker-indicator"></div>

      <div
        ref="scrollRef"
        class="number-scroll no-scrollbar"
        role="listbox"
        :aria-label="'Number picker'"
        @scroll.passive="handleScroll"
        @wheel.passive="markUserInteracted"
        @touchstart.passive="markUserInteracted"
        @mousedown="startDrag"
      >
        <button
          v-for="n in numbers"
          :key="n"
          type="button"
          class="number-item"
          :class="{ 'is-selected': n === modelValue }"
          :aria-selected="n === modelValue"
          @click="selectNumber(n)"
        >
          {{ n }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v)
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 999
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const rootRef = ref(null)
const scrollRef = ref(null)
const isDragging = ref(false)
const isProgrammaticScroll = ref(true)
const hasUserInteracted = ref(false)
let programmaticScrollClearTimer = null
let expectedScrollTop = null

// Keep JS scroll math and CSS visuals in sync.
const ITEM_HEIGHT = computed(() => (props.size === 'sm' ? 22 : 28))

const cssVars = computed(() => {
  const itemHeight = ITEM_HEIGHT.value
  const containerHeight = props.size === 'sm' ? itemHeight * 2 : itemHeight * 3
  return {
    '--item-height': `${itemHeight}px`,
    '--container-height': `${containerHeight}px`
  }
})

const numbers = computed(() => {
  const min = Number.isFinite(props.min) ? props.min : 0
  const max = Number.isFinite(props.max) ? props.max : 999
  const size = Math.max(0, max - min + 1)
  return Array.from({ length: size }, (_, i) => min + i)
})

function clamp(value) {
  const min = Number.isFinite(props.min) ? props.min : 0
  const max = Number.isFinite(props.max) ? props.max : 999
  return Math.max(min, Math.min(max, value))
}

function scrollToValue(value, behavior = 'auto') {
  const el = scrollRef.value
  if (!el) return

  isProgrammaticScroll.value = true
  if (programmaticScrollClearTimer) clearTimeout(programmaticScrollClearTimer)

  const min = Number.isFinite(props.min) ? props.min : 0
  const target = (clamp(value) - min) * ITEM_HEIGHT.value
  expectedScrollTop = target
  el.scrollTo({ top: target, behavior })

  // Fallback: if scroll events never fire, unlock after a bit.
  programmaticScrollClearTimer = setTimeout(() => {
    isProgrammaticScroll.value = false
    expectedScrollTop = null
  }, behavior === 'smooth' ? 400 : 120)
}

// 滑鼠拖拽邏輯 (改善桌面端體驗)
let startY = 0
let startScrollTop = 0

function startDrag(e) {
  hasUserInteracted.value = true
  isDragging.value = true
  startY = e.pageY
  startScrollTop = scrollRef.value.scrollTop

  // 拖拽時改為即時滾動
  scrollRef.value.style.scrollBehavior = 'auto'

  const onMouseMove = (moveEvent) => {
    if (!isDragging.value) return
    const deltaY = moveEvent.pageY - startY
    scrollRef.value.scrollTop = startScrollTop - deltaY
  }

  const onMouseUp = () => {
    isDragging.value = false
    scrollRef.value.style.scrollBehavior = 'smooth'
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function markUserInteracted() {
  hasUserInteracted.value = true
}

let scrollRaf = null
function handleScroll() {
  // Ignore mount/programmatic scrolls until the user interacts.
  if (!hasUserInteracted.value && !isDragging.value) return

  if (isProgrammaticScroll.value) {
    const el = scrollRef.value
    if (!el) return

    // Wait until the programmatic scroll reaches its target, then unlock.
    if (typeof expectedScrollTop === 'number' && Math.abs(el.scrollTop - expectedScrollTop) <= 1) {
      if (programmaticScrollClearTimer) clearTimeout(programmaticScrollClearTimer)
      requestAnimationFrame(() => {
        isProgrammaticScroll.value = false
        expectedScrollTop = null
      })
    }
    return
  }
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    const el = scrollRef.value
    if (!el) return

    const idx = Math.round(el.scrollTop / ITEM_HEIGHT.value)
    const next = clamp((props.min || 0) + idx)
    if (next !== props.modelValue) {
      emit('update:modelValue', next)
    }
  })
}

function selectNumber(n) {
  const next = clamp(n)
  emit('update:modelValue', next)
  nextTick(() => scrollToValue(next, 'smooth'))
}

const handleBlur = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    emit('close')
  }
}

onMounted(async () => {
  await nextTick()
  scrollToValue(props.modelValue)
  rootRef.value?.focus?.()
})

watch(
  () => props.modelValue,
  async (value) => {
    if (isDragging.value) return
    await nextTick()
    scrollToValue(value)
  }
)
</script>

<style scoped>
.selection-actions {
  display: inline-flex;
  align-items: center;
  padding: 4px;
  background: #f8fafc;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  pointer-events: auto;
  z-index: 50;
  outline: none;
  border: 1px solid #e2e8f0;
}

.selection-actions.selection-actions--sm {
  max-width: 60px;
}

.picker-container {
  position: relative;
  width: 64px;
  height: var(--container-height); /* ITEM_HEIGHT * 3 */
  overflow: hidden;
  border-radius: 10px;
  background: white;
  /* 3D 滾輪效果遮罩 */
  mask-image: linear-gradient(
    to bottom,
    transparent,
    black 40%,
    black 60%,
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent,
    black 40%,
    black 60%,
    transparent
  );
}

.number-scroll {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: calc((var(--container-height) - var(--item-height)) / 2) 0;
  scroll-behavior: smooth;
}

.number-scroll::-webkit-scrollbar {
  display: none;
}

.number-item {
  height: var(--item-height);
  width: 100%;
  scroll-snap-align: center;
  border: none;
  background: transparent;
  cursor: grab;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  user-select: none;
}

.number-item:active {
  cursor: grabbing;
}

.number-item.is-selected {
  color: #2563eb;
  font-weight: 800;
  transform: scale(1.1);
}

.picker-indicator {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  height: var(--item-height);
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.05);
  border-top: 1px solid rgba(37, 99, 235, 0.1);
  border-bottom: 1px solid rgba(37, 99, 235, 0.1);
  pointer-events: none;
}

.selection-actions--sm .picker-container {
  width: 56px;
}

.selection-actions--sm .number-item {
  font-size: 13px;
}
</style>
