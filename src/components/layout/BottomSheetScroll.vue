<template>
  <div class="bottom-sheet" :class="{ 'bottom-sheet--resizing': isResizing }" :style="sheetStyle">
    <div
      class="bottom-sheet__scroll"
    >
      <div
        class="bottom-sheet__body"
      >
        <div v-if="$slots.header" class="bottom-sheet__header">
          <slot name="header" />
        </div>

        <div
          ref="scrollEl"
          class="bottom-sheet__content"
          :class="{ 'bottom-sheet__content--locked': isScrollLocked }"
        >
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  minVh: { type: Number, default: 40 },
  maxVh: { type: Number, default: 80 },
  initialVh: { type: Number, default: undefined },

  /**
   * When true, the first wheel/touch gesture only expands/collapses the sheet
   * (snaps to min/max) and locks inner scrolling until the gesture ends.
   */
  snapOnFirstGesture: { type: Boolean, default: true }
})

function clampNumber(v, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

const minVhProp = computed(() => Math.min(props.minVh, props.maxVh))
const maxVhProp = computed(() => Math.max(props.minVh, props.maxVh))

// The sheet should never collapse below its initial height.
const effectiveMinVh = computed(() => {
  const init = Number(props.initialVh)
  if (!Number.isFinite(init)) return minVhProp.value
  return clampNumber(init, minVhProp.value, maxVhProp.value)
})

const effectiveMaxVh = computed(() => maxVhProp.value)

const currentVh = ref(
  clampNumber(
    props.initialVh ?? props.minVh,
    effectiveMinVh.value,
    effectiveMaxVh.value
  )
)

watch(
  () => [props.minVh, props.maxVh, props.initialVh],
  () => {
    currentVh.value = clampNumber(currentVh.value, effectiveMinVh.value, effectiveMaxVh.value)
  }
)

const sheetStyle = computed(() => ({
  '--bottom-sheet-vh': String(currentVh.value),
  '--bottom-sheet-min-vh': String(effectiveMinVh.value),
  '--bottom-sheet-max-vh': String(effectiveMaxVh.value)
}))

const scrollEl = ref(null)

const isCollapsed = computed(() => currentVh.value <= effectiveMinVh.value + 0.01)
const isExpanded = computed(() => currentVh.value >= effectiveMaxVh.value - 0.01)

// While not fully expanded, keep content from scrolling; wheel/touch should resize the sheet.
const isScrollLocked = computed(() => props.snapOnFirstGesture && !isExpanded.value)

function viewportHeightPx() {
  const vv = window?.visualViewport
  if (vv && typeof vv.height === 'number' && vv.height > 0) return vv.height
  const h = window?.innerHeight
  return typeof h === 'number' && h > 0 ? h : 1
}

function applySheetDeltaPx(deltaPx) {
  const px = Number(deltaPx)
  if (!Number.isFinite(px) || px === 0) return
  const vh = (px / viewportHeightPx()) * 100
  if (!Number.isFinite(vh) || vh === 0) return
  currentVh.value = clampNumber(currentVh.value + vh, effectiveMinVh.value, effectiveMaxVh.value)
}

function sheetAtTop() {
  const el = scrollEl.value
  const st = el && typeof el.scrollTop === 'number' ? el.scrollTop : 0
  return st <= 0
}

function sheetAtBottom() {
  const el = scrollEl.value
  if (!el) return false
  const st = typeof el.scrollTop === 'number' ? el.scrollTop : 0
  const ch = typeof el.clientHeight === 'number' ? el.clientHeight : 0
  const sh = typeof el.scrollHeight === 'number' ? el.scrollHeight : 0
  return st + ch >= sh - 1
}

let wheelUnlockTimer = null
const wheelLocked = ref(false)

function lockWheelUntilIdle(idleMs = 160) {
  wheelLocked.value = true
  if (wheelUnlockTimer) window.clearTimeout(wheelUnlockTimer)
  wheelUnlockTimer = window.setTimeout(() => {
    wheelLocked.value = false
    wheelUnlockTimer = null
  }, idleMs)
}

function handleWheel(e) {
  if (!e) return

  const deltaY = typeof e.deltaY === 'number' ? e.deltaY : 0
  if (!props.snapOnFirstGesture) return

  // While a single wheel gesture is ongoing, keep consuming events so content doesn't scroll.
  if (wheelLocked.value) {
    e.preventDefault?.()
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    applySheetDeltaPx(deltaY)
    lockWheelUntilIdle()
    return
  }

  // Prevent wheel chaining to the page when the sheet can't scroll.
  if (sheetAtTop() && isCollapsed.value && deltaY < 0) {
    e.preventDefault?.()
    // Don't allow the page behind to scroll.
    return
  }
  if (sheetAtBottom() && isExpanded.value && deltaY > 0) {
    e.preventDefault?.()
    // At bottom: block page scroll chaining but NEVER jump to top.
    return
  }

  // If not fully expanded, interpret wheel as resizing (smooth).
  if (!isExpanded.value) {
    e.preventDefault?.()
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    applySheetDeltaPx(deltaY)
    lockWheelUntilIdle()
    return
  }

  // When fully expanded, allow inner scrolling; but at top, wheel-up collapses smoothly.
  if (sheetAtTop() && deltaY < 0 && currentVh.value > effectiveMinVh.value) {
    e.preventDefault?.()
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    applySheetDeltaPx(deltaY)
    lockWheelUntilIdle()
  }
}

let lastTouchY = null
const touchLocked = ref(false)

const isResizing = computed(() => wheelLocked.value || touchLocked.value)

function handleTouchStart(e) {
  const y = e?.touches?.[0]?.clientY
  lastTouchY = typeof y === 'number' ? y : null
  touchLocked.value = false
}

function handleTouchEnd() {
  lastTouchY = null
  touchLocked.value = false
}

function handleTouchMove(e) {
  if (!props.snapOnFirstGesture) return

  const y = e?.touches?.[0]?.clientY
  if (typeof y !== 'number' || typeof lastTouchY !== 'number') return

  const deltaY = lastTouchY - y
  lastTouchY = y

  // Prevent touch chaining to the page when the sheet can't scroll.
  if (sheetAtTop() && isCollapsed.value && deltaY < 0) {
    e.preventDefault?.()
    return
  }
  if (sheetAtBottom() && isExpanded.value && deltaY > 0) {
    e.preventDefault?.()
    return
  }

  // If not expanded, treat this gesture as resizing; keep consuming moves.
  if (!isExpanded.value || touchLocked.value) {
    e.preventDefault?.()
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    applySheetDeltaPx(deltaY)
    touchLocked.value = true
    return
  }

  // Fully expanded: at top, pulling down collapses smoothly.
  if (sheetAtTop() && deltaY < 0 && currentVh.value > effectiveMinVh.value) {
    e.preventDefault?.()
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    applySheetDeltaPx(deltaY)
    touchLocked.value = true
  }
}

function addGestureListeners() {
  const el = scrollEl.value
  if (!el?.addEventListener) return

  el.addEventListener('wheel', handleWheel, { passive: false })
  el.addEventListener('touchstart', handleTouchStart, { passive: true })
  el.addEventListener('touchmove', handleTouchMove, { passive: false })
  el.addEventListener('touchend', handleTouchEnd, { passive: true })
  el.addEventListener('touchcancel', handleTouchEnd, { passive: true })
}

function removeGestureListeners() {
  const el = scrollEl.value
  if (!el?.removeEventListener) return

  el.removeEventListener('wheel', handleWheel)
  el.removeEventListener('touchstart', handleTouchStart)
  el.removeEventListener('touchmove', handleTouchMove)
  el.removeEventListener('touchend', handleTouchEnd)
  el.removeEventListener('touchcancel', handleTouchEnd)
}

onMounted(addGestureListeners)

onBeforeUnmount(() => {
  removeGestureListeners()
  if (wheelUnlockTimer) window.clearTimeout(wheelUnlockTimer)
})
</script>

<style scoped>
.bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  bottom: 0;
  width: min(var(--bottom-sheet-max-width, 1200px), 100vw);
  height: calc(
    clamp(
        var(--bottom-sheet-min-vh, 40),
        var(--bottom-sheet-vh, var(--bottom-sheet-min-vh, 40)),
        var(--bottom-sheet-max-vh, 80)
      ) * 1vh
  );
  z-index: var(--bottom-sheet-z, 55);
  overflow: hidden;
  transition: height 120ms ease-out;
  /* Ensure this sheet doesn't sit under the iOS home indicator. */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.bottom-sheet--resizing {
  transition: none;
}


.bottom-sheet__handle {
  position: absolute;
}
.bottom-sheet__scroll {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.bottom-sheet__content--locked {
  overflow: hidden;
}

.bottom-sheet__content::-webkit-scrollbar {
  display: none;
}

.bottom-sheet__header {
  position: relative;
  z-index: 1000;
  min-width: 0;
}

.bottom-sheet__body {
  min-width: 0;
  height: 100%;
  position: relative;
  z-index: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  /* Create a local stacking context so header z-index is authoritative.
     Prevent content (e.g. carousels with z-index) from drawing over the header. */
  isolation: isolate;
  /* padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px)); */
}

.bottom-sheet__content {
  min-width: 0;
  background: var(--color-surface-sheet);
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
