<template>
  <div ref="sheetRef" class="bottom-sheet" :class="{ 'bottom-sheet--resizing': isResizing }" :style="sheetStyle">
    <div
      class="bottom-sheet__scroll"
      ref="gestureEl"
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
  /**
   * Percentage of the sheet's available container height.
   * (Container = viewport height minus safe-top minus the sheet's bottom offset.)
   */
  minPct: { type: Number, default: undefined },
  maxPct: { type: Number, default: undefined },
  initialPct: { type: Number, default: undefined },

  /**
   * Back-compat aliases (historical name used "vh" when the container matched the viewport).
   * These are now treated as percentages as well.
   */
  minVh: { type: Number, default: 40 },
  maxVh: { type: Number, default: 80 },
  initialVh: { type: Number, default: undefined },

  /**
   * When true, the sheet height only snaps between min/max.
   * Useful when the sheet contains horizontal carousels (avoid gesture conflicts).
   */
  binarySnap: { type: Boolean, default: false },

  /**
   * When true, the first wheel/touch gesture only expands/collapses the sheet
   * (snaps to min/max) and locks inner scrolling until the gesture ends.
   */
  snapOnFirstGesture: { type: Boolean, default: true },

  /**
   * Optional prefix to expose live sizing info as global CSS variables.
   * Example: cssVarPrefix="project" ->
   *   --project-bottom-sheet-height: <px>
   *   --project-bottom-sheet-pct: <number>
   */
  cssVarPrefix: { type: String, default: '' }
})

function clampNumber(v, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function resolveNumber(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const minPctProp = computed(() => {
  const min = resolveNumber(props.minPct, props.minVh)
  const max = resolveNumber(props.maxPct, props.maxVh)
  return Math.min(min, max)
})

const maxPctProp = computed(() => {
  const min = resolveNumber(props.minPct, props.minVh)
  const max = resolveNumber(props.maxPct, props.maxVh)
  return Math.max(min, max)
})

// The sheet should never collapse below its initial height.
const effectiveMinPct = computed(() => {
  if (props.binarySnap) return minPctProp.value
  const init = resolveNumber(props.initialPct, props.initialVh)
  if (!Number.isFinite(init)) return minPctProp.value
  return clampNumber(init, minPctProp.value, maxPctProp.value)
})

const effectiveMaxPct = computed(() => maxPctProp.value)

function midpointVh() {
  return (effectiveMinPct.value + effectiveMaxPct.value) / 2
}

function snapToMin() {
  currentPct.value = effectiveMinPct.value
}

function snapToMax() {
  currentPct.value = effectiveMaxPct.value
}

function snapToNearestEndpoint() {
  const mid = midpointVh()
  if (currentPct.value >= mid) snapToMax()
  else snapToMin()
}

function getInitialSheetPct() {
  const initial = clampNumber(
    resolveNumber(props.initialPct, props.initialVh ?? props.minVh),
    minPctProp.value,
    maxPctProp.value
  )

  if (!props.binarySnap) {
    return clampNumber(initial, effectiveMinPct.value, effectiveMaxPct.value)
  }

  // Binary snap: start at nearest endpoint.
  return initial >= (minPctProp.value + maxPctProp.value) / 2
    ? effectiveMaxPct.value
    : effectiveMinPct.value
}

const currentPct = ref(getInitialSheetPct())

watch(
  () => [props.minPct, props.maxPct, props.initialPct, props.minVh, props.maxVh, props.initialVh],
  () => {
    currentPct.value = clampNumber(currentPct.value, effectiveMinPct.value, effectiveMaxPct.value)
    if (props.binarySnap) snapToNearestEndpoint()
  }
)

const sheetStyle = computed(() => ({
  '--bottom-sheet-pct': String(currentPct.value),
  '--bottom-sheet-min-pct': String(effectiveMinPct.value),
  '--bottom-sheet-max-pct': String(effectiveMaxPct.value),
  height: `${Math.max(1, (containerHeightPx.value * currentPct.value) / 100)}px`
}))

const sheetRef = ref(null)
const scrollEl = ref(null)
const gestureEl = ref(null)

const isCollapsed = computed(() => currentPct.value <= effectiveMinPct.value + 0.01)
const isExpanded = computed(() => currentPct.value >= effectiveMaxPct.value - 0.01)

// While not fully expanded, keep content from scrolling; wheel/touch should resize the sheet.
const isScrollLocked = computed(() => props.snapOnFirstGesture && !isExpanded.value)

function viewportHeightPx() {
  const vv = window?.visualViewport
  if (vv && typeof vv.height === 'number' && vv.height > 0) return vv.height
  const h = window?.innerHeight
  return typeof h === 'number' && h > 0 ? h : 1
}

const cssVarResolverEl = ref(null)

function ensureCssVarResolverEl() {
  if (cssVarResolverEl.value) return
  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.left = '0'
  el.style.width = '0'
  el.style.height = '0'
  el.style.visibility = 'hidden'
  el.style.pointerEvents = 'none'
  document.body.appendChild(el)
  cssVarResolverEl.value = el
}

function resolveCssVarPx(varName) {
  try {
    ensureCssVarResolverEl()
    const el = cssVarResolverEl.value
    if (!el) return 0
    el.style.top = `var(${varName})`
    const raw = window.getComputedStyle(el).top
    const n = Number.parseFloat(String(raw || '').trim())
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

const containerHeightPx = ref(1)

function exposedVarName(suffix) {
  const prefix = String(props.cssVarPrefix || '').trim()
  if (!prefix) return ''
  return `--${prefix}-${suffix}`
}

function updateExposedCssVars() {
  const prefix = String(props.cssVarPrefix || '').trim()
  if (!prefix) return
  const root = document?.documentElement
  if (!root?.style?.setProperty) return

  const heightPx = Math.max(1, (containerHeightPx.value * currentPct.value) / 100)
  root.style.setProperty(exposedVarName('bottom-sheet-height'), `${heightPx}px`)
  root.style.setProperty(exposedVarName('bottom-sheet-pct'), String(currentPct.value))
}

function clearExposedCssVars() {
  const prefix = String(props.cssVarPrefix || '').trim()
  if (!prefix) return
  const root = document?.documentElement
  if (!root?.style?.removeProperty) return
  root.style.removeProperty(exposedVarName('bottom-sheet-height'))
  root.style.removeProperty(exposedVarName('bottom-sheet-pct'))
}

watch(
  () => [props.cssVarPrefix, currentPct.value, containerHeightPx.value],
  () => updateExposedCssVars(),
  { immediate: true }
)

function bottomOffsetPx() {
  try {
    const el = sheetRef.value
    if (!el) return 0
    const raw = window.getComputedStyle(el).bottom
    const n = Number.parseFloat(String(raw || '').trim())
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function updateContainerHeight() {
  const h = viewportHeightPx()
  const safeTop = resolveCssVarPx('--safe-area-top')
  const bottom = bottomOffsetPx()
  // Container = vertical space between safe-top and the sheet baseline (bottom offset).
  containerHeightPx.value = Math.max(1, h - safeTop - bottom)
}

function applySheetDeltaPx(deltaPx) {
  const px = Number(deltaPx)
  if (!Number.isFinite(px) || px === 0) return
  const base = containerHeightPx.value
  const pct = base > 0 ? (px / base) * 100 : 0
  if (!Number.isFinite(pct) || pct === 0) return
  currentPct.value = clampNumber(currentPct.value + pct, effectiveMinPct.value, effectiveMaxPct.value)
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

function preventDefaultIfCancelable(e) {
  if (e?.cancelable) e.preventDefault()
}

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

  const deltaX = typeof e.deltaX === 'number' ? e.deltaX : 0
  const deltaY = typeof e.deltaY === 'number' ? e.deltaY : 0

  // Let horizontal trackpad scroll gestures through (e.g. carousels in the sheet).
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 0) return

  if (!props.snapOnFirstGesture) return

  // While a single wheel gesture is ongoing, keep consuming events so content doesn't scroll.
  if (wheelLocked.value) {
    preventDefaultIfCancelable(e)
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    applySheetDeltaPx(deltaY)
    lockWheelUntilIdle()
    return
  }

  // Prevent wheel chaining to the page when the sheet can't scroll.
  if (sheetAtTop() && isCollapsed.value && deltaY < 0) {
    preventDefaultIfCancelable(e)
    // Don't allow the page behind to scroll.
    return
  }
  if (sheetAtBottom() && isExpanded.value && deltaY > 0) {
    preventDefaultIfCancelable(e)
    // At bottom: block page scroll chaining but NEVER jump to top.
    return
  }

  // If not fully expanded, interpret wheel as resizing.
  if (!isExpanded.value) {
    preventDefaultIfCancelable(e)
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    if (props.binarySnap) {
      if (deltaY > 0) snapToMax()
      else if (deltaY < 0) snapToMin()
    } else {
      applySheetDeltaPx(deltaY)
    }
    lockWheelUntilIdle()
    return
  }

  // When fully expanded, allow inner scrolling; but at top, wheel-up collapses smoothly.
  if (sheetAtTop() && deltaY < 0 && currentPct.value > effectiveMinPct.value) {
    preventDefaultIfCancelable(e)
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    if (props.binarySnap) snapToMin()
    else applySheetDeltaPx(deltaY)
    lockWheelUntilIdle()
  }
}

let lastTouchY = null
let lastTouchX = null
let touchStartX = null
let touchStartY = null
let touchAxis = null
const touchLocked = ref(false)

const isResizing = computed(() => wheelLocked.value || touchLocked.value)

function handleTouchStart(e) {
  const x = e?.touches?.[0]?.clientX
  const y = e?.touches?.[0]?.clientY
  lastTouchX = typeof x === 'number' ? x : null
  lastTouchY = typeof y === 'number' ? y : null
  touchStartX = lastTouchX
  touchStartY = lastTouchY
  touchAxis = null
  touchLocked.value = false
}

function handleTouchEnd() {
  lastTouchY = null
  lastTouchX = null
  touchStartX = null
  touchStartY = null
  touchAxis = null
  touchLocked.value = false
}

function handleTouchMove(e) {
  if (!props.snapOnFirstGesture) return

  const x = e?.touches?.[0]?.clientX
  const y = e?.touches?.[0]?.clientY
  if (typeof y !== 'number' || typeof lastTouchY !== 'number') return
  if (typeof x !== 'number' || typeof lastTouchX !== 'number') return

  if (touchAxis == null && typeof touchStartX === 'number' && typeof touchStartY === 'number') {
    const totalDx = x - touchStartX
    const totalDy = y - touchStartY
    const movedEnough = Math.abs(totalDx) > 6 || Math.abs(totalDy) > 6
    if (movedEnough) touchAxis = Math.abs(totalDx) > Math.abs(totalDy) ? 'x' : 'y'
  }

  // Let horizontal swipe gestures through (e.g. carousels in the sheet).
  if (touchAxis === 'x') {
    lastTouchX = x
    lastTouchY = y
    return
  }

  const deltaY = lastTouchY - y
  lastTouchX = x
  lastTouchY = y

  // Prevent touch chaining to the page when the sheet can't scroll.
  if (sheetAtTop() && isCollapsed.value && deltaY < 0) {
    preventDefaultIfCancelable(e)
    return
  }
  if (sheetAtBottom() && isExpanded.value && deltaY > 0) {
    preventDefaultIfCancelable(e)
    return
  }

  // If not expanded, treat this gesture as resizing; keep consuming moves.
  if (!isExpanded.value || touchLocked.value) {
    preventDefaultIfCancelable(e)
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    if (props.binarySnap) {
      if (deltaY > 0) snapToMax()
      else if (deltaY < 0) snapToMin()
    } else {
      applySheetDeltaPx(deltaY)
    }
    touchLocked.value = true
    return
  }

  // Fully expanded: at top, pulling down collapses smoothly.
  if (sheetAtTop() && deltaY < 0 && currentPct.value > effectiveMinPct.value) {
    preventDefaultIfCancelable(e)
    if (scrollEl.value) scrollEl.value.scrollTop = 0
    if (props.binarySnap) snapToMin()
    else applySheetDeltaPx(deltaY)
    touchLocked.value = true
  }
}

function addGestureListeners() {
  const el = gestureEl.value || scrollEl.value
  if (!el?.addEventListener) return

  el.addEventListener('wheel', handleWheel, { passive: false })
  el.addEventListener('touchstart', handleTouchStart, { passive: true })
  el.addEventListener('touchmove', handleTouchMove, { passive: false })
  el.addEventListener('touchend', handleTouchEnd, { passive: true })
  el.addEventListener('touchcancel', handleTouchEnd, { passive: true })
}

function removeGestureListeners() {
  const el = gestureEl.value || scrollEl.value
  if (!el?.removeEventListener) return

  el.removeEventListener('wheel', handleWheel)
  el.removeEventListener('touchstart', handleTouchStart)
  el.removeEventListener('touchmove', handleTouchMove)
  el.removeEventListener('touchend', handleTouchEnd)
  el.removeEventListener('touchcancel', handleTouchEnd)
}

function addViewportListeners() {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
  window.visualViewport?.addEventListener?.('resize', updateContainerHeight)
}

function removeViewportListeners() {
  window.removeEventListener('resize', updateContainerHeight)
  window.visualViewport?.removeEventListener?.('resize', updateContainerHeight)
}

onMounted(() => {
  ensureCssVarResolverEl()
  addGestureListeners()
  addViewportListeners()
})

onBeforeUnmount(() => {
  removeGestureListeners()
  removeViewportListeners()
  if (wheelUnlockTimer) window.clearTimeout(wheelUnlockTimer)

  clearExposedCssVars()

  if (cssVarResolverEl.value?.remove) cssVarResolverEl.value.remove()
  cssVarResolverEl.value = null
})
</script>

<style scoped>
.bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  bottom: var(--bottom-sheet-bottom, 0px);
  width: min(var(--bottom-sheet-max-width, 1200px), 100vw);
  z-index: var(--bottom-sheet-z, 55);
  overflow: hidden;
  transition: height 120ms ease-out;
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

  /* Fill the safe-area with the sheet background (no visible gap),
     while keeping content out of the home indicator. */
  padding-bottom: var(--padding-bottom-record-options);

  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
