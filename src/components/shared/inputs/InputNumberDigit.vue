<template>
  <div
    ref="rootRef"
    class="input-number-digit"
    :class="{ 'input-number-digit--sm': props.size === 'sm' }"
    :style="cssVars"
    @click.stop
  >
    <div class="picker-container">
      <div class="picker-indicator"></div>

      <div
        ref="scrollRef"
        class="number-scroll no-scrollbar"
        role="listbox"
        :aria-label="t('input.numberPicker')"
        @scroll.passive="handleScroll"
        @wheel.passive="markUserInteracted"
        @touchstart.passive="markUserInteracted"
        @mousedown="startDrag"
      >
        <button
          v-for="n in normalizedOptions"
          :key="n"
          type="button"
          class="number-item"
          :class="{ 'is-selected': n === modelValue }"
          :aria-selected="n === modelValue"
          @click="selectDigit(n)"
        >
          {{ n }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  options: {
    type: Array,
    default: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  },
  autoFocus: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue'])

const rootRef = ref(null)
const scrollRef = ref(null)
const isDragging = ref(false)
const isProgrammaticScroll = ref(true)
const hasUserInteracted = ref(false)
let programmaticScrollClearTimer = null
let scrollEndTimer = null
let suppressEmitUntil = 0
let expectedScrollTop = null

const ITEM_HEIGHT = computed(() => (props.size === 'sm' ? 22 : 28))

const normalizedOptions = computed(() => {
  const list = Array.isArray(props.options)
    ? props.options.map((value) => Math.trunc(Number(value))).filter((value) => Number.isFinite(value))
    : []
  return list.length ? list : [0]
})

const cssVars = computed(() => {
  const itemHeight = ITEM_HEIGHT.value
  const containerHeight = props.size === 'sm' ? itemHeight * 2 : itemHeight * 3
  return {
    '--item-height': `${itemHeight}px`,
    '--container-height': `${containerHeight}px`
  }
})

function resolveSelectedIndex(value) {
  const idx = normalizedOptions.value.indexOf(Math.trunc(Number(value)))
  if (idx >= 0) return idx
  return 0
}

function clearPendingScrollEmit() {
  if (scrollRaf) {
    cancelAnimationFrame(scrollRaf)
    scrollRaf = null
  }
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer)
    scrollEndTimer = null
  }
}

function snapScrollToValue(value) {
  const el = scrollRef.value
  if (!el) return

  clearPendingScrollEmit()

  isProgrammaticScroll.value = true
  if (programmaticScrollClearTimer) clearTimeout(programmaticScrollClearTimer)

  const target = resolveSelectedIndex(value) * ITEM_HEIGHT.value
  expectedScrollTop = target
  suppressEmitUntil = Date.now() + 180

  el.style.scrollBehavior = 'auto'
  el.scrollTop = target

  programmaticScrollClearTimer = setTimeout(() => {
    isProgrammaticScroll.value = false
    expectedScrollTop = null
    el.style.scrollBehavior = 'smooth'
  }, 80)
}

function scrollToValue(value, behavior = 'auto') {
  if (behavior === 'smooth') {
    const el = scrollRef.value
    if (!el) return

    clearPendingScrollEmit()

    isProgrammaticScroll.value = true
    if (programmaticScrollClearTimer) clearTimeout(programmaticScrollClearTimer)

    const target = resolveSelectedIndex(value) * ITEM_HEIGHT.value
    expectedScrollTop = target
    suppressEmitUntil = Date.now() + 450
    el.scrollTo({ top: target, behavior: 'smooth' })

    programmaticScrollClearTimer = setTimeout(() => {
      isProgrammaticScroll.value = false
      expectedScrollTop = null
    }, 400)
    return
  }

  snapScrollToValue(value)
}

let startY = 0
let startScrollTop = 0

function startDrag(e) {
  hasUserInteracted.value = true
  isDragging.value = true
  startY = e.pageY
  startScrollTop = scrollRef.value.scrollTop
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

function emitValueFromScrollPosition() {
  if (isProgrammaticScroll.value) return
  if (Date.now() < suppressEmitUntil) return

  const el = scrollRef.value
  if (!el) return

  const idx = Math.round(el.scrollTop / ITEM_HEIGHT.value)
  const clampedIdx = Math.max(0, Math.min(normalizedOptions.value.length - 1, idx))
  const next = normalizedOptions.value[clampedIdx]
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
}

function handleScroll() {
  if (isProgrammaticScroll.value) {
    const el = scrollRef.value
    if (!el) return

    if (typeof expectedScrollTop === 'number' && Math.abs(el.scrollTop - expectedScrollTop) <= 1) {
      if (programmaticScrollClearTimer) clearTimeout(programmaticScrollClearTimer)
      requestAnimationFrame(() => {
        isProgrammaticScroll.value = false
        expectedScrollTop = null
      })
    }
    return
  }

  if (!hasUserInteracted.value && !isDragging.value) return

  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    if (scrollEndTimer) clearTimeout(scrollEndTimer)
    scrollEndTimer = setTimeout(() => {
      scrollEndTimer = null
      emitValueFromScrollPosition()
    }, 80)
  })
}

function selectDigit(n) {
  const next = normalizedOptions.value.includes(n) ? n : normalizedOptions.value[0]
  emit('update:modelValue', next)
  nextTick(() => scrollToValue(next, 'smooth'))
}

async function syncToModelValue() {
  if (!normalizedOptions.value.includes(Math.trunc(Number(props.modelValue)))) {
    const fallback = normalizedOptions.value[0]
    if (fallback !== undefined && fallback !== props.modelValue) {
      emit('update:modelValue', fallback)
      return
    }
  }

  if (isDragging.value) return
  await nextTick()
  snapScrollToValue(props.modelValue)
}

onMounted(async () => {
  await syncToModelValue()
  if (props.autoFocus) rootRef.value?.focus?.()
})

watch(
  () => props.modelValue,
  () => {
    void syncToModelValue()
  }
)

watch(
  normalizedOptions,
  () => {
    void syncToModelValue()
  },
  { deep: true }
)
</script>

<style scoped>
.input-number-digit {
  display: inline-flex;
  align-items: center;
  padding: 4px 1px;
  background: #f8fafc;
  border-radius: 14px;
  pointer-events: auto;
  border: 1px solid #e2e8f0;
}

.picker-container {
  position: relative;
  width: 52px;
  height: var(--container-height);
  overflow: hidden;
  border-radius: 10px;
  background: white;
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
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  overscroll-behavior-x: none;
  touch-action: pan-y;
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
  color: var(--color-icon-add);
  font-weight: 800;
  transform: scale(1.1);
}

.picker-indicator {
  position: absolute;
  left: 2px;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  height: var(--item-height);
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.05);
  border-top: 1px solid rgba(37, 99, 235, 0.1);
  border-bottom: 1px solid rgba(37, 99, 235, 0.1);
  pointer-events: none;
}

.input-number-digit--sm .picker-container {
  width: 36px;
}

.input-number-digit--sm .number-item {
  font-size: 13px;
}
</style>
