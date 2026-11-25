<template>
  <div class="carousel" :class="{ 'carousel--bleed': bleed }" :style="bleedStyle">
    <div v-if="count > 1" class="carousel__dots" role="tablist">
      <button
        v-for="(_, i) in items"
        :key="`dot-${i}`"
        type="button"
        class="carousel__dot"
        :class="{
          'is-active': i === activeIndex,
          'carousel__dot--outline': dotVariantFor(items[i], i) === 'outline'
        }"
        :aria-label="t('carousel.goToItem', { n: i + 1 })"
        :aria-current="i === activeIndex ? 'true' : undefined"
        @click="scrollToIndex(i)"
      />
    </div>

    <div
      class="carousel__viewport"
      :class="{ 'carousel__viewport--fit-active-height': fitHeightToActiveItem }"
      :style="viewportStyle"
    >
      <div
        ref="rowEl"
        class="carousel__row"
        :class="{
          'carousel__row--no-gesture': disableGesture,
          'carousel__row--fit-active-height': fitHeightToActiveItem
        }"
        role="region"
        @scroll.passive="handleScroll"
      >
        <div
          v-for="(item, i) in items"
          :key="keyFor(item, i)"
          class="carousel__item"
          :style="{ width: itemWidth }"
          :ref="(el) => setItemEl(el, i)"
        >
          <slot :item="item" :index="i" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const emit = defineEmits(['active-index-change'])

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  itemKey: {
    type: [Function, String],
    default: null
  },
  itemWidth: {
    type: String,
    default: 'calc(100vw - 20px)'
  },
  bleed: {
    type: Boolean,
    default: false
  },
  bleedX: {
    type: String,
    default: '2rem'
  },
  getDotVariant: {
    type: Function,
    default: null
  },
  disableGesture: {
    type: Boolean,
    default: false
  },
  /** Size the viewport to the active slide height (slides may differ). */
  fitHeightToActiveItem: {
    type: Boolean,
    default: false
  },
  /** Scroll the page to the top when the active slide index changes. */
  scrollPageToTopOnIndexChange: {
    type: Boolean,
    default: false
  }
})

const rowEl = ref(null)
const itemEls = ref([])
const activeIndex = ref(0)
const activeItemHeightPx = ref(null)

let programmaticScroll = null
let programmaticScrollTimeout = 0
let itemResizeObserver = null

const viewportStyle = computed(() => {
  if (!props.fitHeightToActiveItem) return {}
  const h = Number(activeItemHeightPx.value)
  if (!Number.isFinite(h) || h <= 0) return {}
  return { height: `${h}px` }
})

const count = computed(() => (Array.isArray(props.items) ? props.items.length : 0))

const bleedStyle = computed(() => {
  if (!props.bleed) return {}

  // Full-bleed pattern for centered layouts (e.g. ProjectWizardLayout has max-width + padding).
  // This makes the carousel span the viewport while keeping its center aligned with the screen.
  // Ref: https://css-tricks.com/full-width-containers-limited-width-parents/
  return {
    width: '100vw',
    maxWidth: '100vw',
    marginLeft: 'calc(50% - 50vw)',
    marginRight: 'calc(50% - 50vw)'
  }
})

function keyFor(item, index) {
  if (!props.itemKey) return index
  if (typeof props.itemKey === 'function') return props.itemKey(item, index)
  return item?.[props.itemKey] ?? index
}

function setItemEl(el, index) {
  if (!el) return
  itemEls.value[index] = el
}

function dotVariantFor(item, index) {
  if (typeof props.getDotVariant === 'function') {
    const v = props.getDotVariant(item, index)
    return v === 'outline' ? 'outline' : 'solid'
  }
  return 'solid'
}

function updateActiveIndexFromScroll() {
  const row = rowEl.value
  if (!row) return

  // When we programmatically scroll (e.g. clicking a dot), ignore intermediate
  // scroll positions to avoid emitting multiple active-index changes.
  if (programmaticScroll) {
    const targetLeft = Number(programmaticScroll?.targetLeft)
    if (Number.isFinite(targetLeft) && Math.abs(row.scrollLeft - targetLeft) <= 2) {
      programmaticScroll = null
    } else {
      return
    }
  }

  const viewportCenterX = row.scrollLeft + row.clientWidth / 2
  const els = Array.isArray(itemEls.value) ? itemEls.value : []

  let bestIndex = 0
  let bestDist = Number.POSITIVE_INFINITY

  for (let i = 0; i < els.length; i += 1) {
    const el = els[i]
    if (!el) continue
    const itemCenterX = el.offsetLeft + el.clientWidth / 2
    const dist = Math.abs(itemCenterX - viewportCenterX)
    if (dist < bestDist) {
      bestDist = dist
      bestIndex = i
    }
  }

  const max = Math.max(0, count.value - 1)
  activeIndex.value = Math.min(max, Math.max(0, bestIndex))
}

let scrollRaf = 0
function handleScroll() {
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    updateActiveIndexFromScroll()
  })
}

let lastTouch = null

const handleTouchStart = (e) => {
  if (!props.disableGesture) return
  const t = e?.touches?.[0]
  if (!t) return
  lastTouch = { x: t.clientX, y: t.clientY }
}

const handleTouchMove = (e) => {
  if (!props.disableGesture) return
  const t = e?.touches?.[0]
  if (!t || !lastTouch) return
  const dx = t.clientX - lastTouch.x
  const dy = t.clientY - lastTouch.y

  // If user is attempting a horizontal swipe, block it so only dots/arrows can change slides.
  if (Math.abs(dx) > Math.abs(dy) + 2) {
    e.preventDefault()
    e.stopPropagation()
  }
}

const handleTouchEnd = () => {
  lastTouch = null
}

const handleWheel = (e) => {
  if (!props.disableGesture) return
  const dx = Math.abs(Number(e?.deltaX || 0))
  const dy = Math.abs(Number(e?.deltaY || 0))
  const isHorizontal = dx > dy + 1 || e?.shiftKey
  if (!isHorizontal) return
  e.preventDefault()
  e.stopPropagation()
}

async function scrollToIndex(index) {
  const max = Math.max(0, count.value - 1)
  const target = Math.min(max, Math.max(0, Number(index)))

  await nextTick()

  const row = rowEl.value
  const el = itemEls.value?.[target]
  if (row && el && typeof row.scrollTo === 'function') {
    const itemCenterX = el.offsetLeft + el.clientWidth / 2
    const desiredLeft = itemCenterX - row.clientWidth / 2
    const maxLeft = Math.max(0, row.scrollWidth - row.clientWidth)
    const left = Math.max(0, Math.min(maxLeft, desiredLeft))

    // Lock scroll-derived activeIndex updates while the smooth scroll animates.
    // This prevents active-index-change from bouncing during animation.
    programmaticScroll = { targetIndex: target, targetLeft: left }
    if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout)
    programmaticScrollTimeout = setTimeout(() => {
      programmaticScroll = null
      updateActiveIndexFromScroll()
    }, 900)

    row.scrollTo({ left, behavior: 'smooth' })
    activeIndex.value = target
    return
  }

  // Fallback
  if (el && typeof el.scrollIntoView === 'function') {
    programmaticScroll = { targetIndex: target, targetLeft: NaN }
    if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout)
    programmaticScrollTimeout = setTimeout(() => {
      programmaticScroll = null
      updateActiveIndexFromScroll()
    }, 900)

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    activeIndex.value = target
    return
  }
}

async function scrollToEnd() {
  await nextTick()
  const row = rowEl.value
  if (row && typeof row.scrollTo === 'function') {
    const left = row.scrollWidth
    programmaticScroll = { targetIndex: activeIndex.value, targetLeft: left }
    if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout)
    programmaticScrollTimeout = setTimeout(() => {
      programmaticScroll = null
      updateActiveIndexFromScroll()
    }, 900)
    row.scrollTo({ left: row.scrollWidth, behavior: 'smooth' })
  }
}

function scrollPageToTop() {
  if (typeof window === 'undefined') return
  const el = document.scrollingElement || document.documentElement || document.body
  if (el?.scrollTo) {
    el.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function measureActiveItemHeight() {
  if (!props.fitHeightToActiveItem) return
  const el = itemEls.value?.[activeIndex.value]
  if (!el) {
    activeItemHeightPx.value = null
    return
  }
  const row = rowEl.value
  let padTop = 0
  let padBottom = 0
  if (row && typeof window !== 'undefined') {
    const style = window.getComputedStyle(row)
    padTop = Number.parseFloat(style.paddingTop) || 0
    padBottom = Number.parseFloat(style.paddingBottom) || 0
  }
  activeItemHeightPx.value = padTop + el.offsetHeight + padBottom
}

function observeItemHeights() {
  if (!props.fitHeightToActiveItem || typeof ResizeObserver === 'undefined') return
  itemResizeObserver?.disconnect()
  itemResizeObserver = new ResizeObserver(() => {
    measureActiveItemHeight()
  })
  const els = Array.isArray(itemEls.value) ? itemEls.value : []
  for (const el of els) {
    if (el) itemResizeObserver.observe(el)
  }
  measureActiveItemHeight()
}

function handleResize() {
  updateActiveIndexFromScroll()
  measureActiveItemHeight()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  nextTick(() => {
    updateActiveIndexFromScroll()
    observeItemHeights()
  })

  const row = rowEl.value
  if (row) {
    row.addEventListener('wheel', handleWheel, { passive: false })
    row.addEventListener('touchstart', handleTouchStart, { passive: true })
    row.addEventListener('touchmove', handleTouchMove, { passive: false })
    row.addEventListener('touchend', handleTouchEnd, { passive: true })
    row.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  }

})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  itemResizeObserver?.disconnect()
  itemResizeObserver = null
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout)

  const row = rowEl.value
  if (row) {
    row.removeEventListener('wheel', handleWheel)
    row.removeEventListener('touchstart', handleTouchStart)
    row.removeEventListener('touchmove', handleTouchMove)
    row.removeEventListener('touchend', handleTouchEnd)
    row.removeEventListener('touchcancel', handleTouchEnd)
  }
})

watch(
  () => count.value,
  async (len) => {
    await nextTick()
    if (Array.isArray(itemEls.value)) itemEls.value = itemEls.value.slice(0, len)
    const max = Math.max(0, len - 1)
    if (activeIndex.value > max) activeIndex.value = max
    updateActiveIndexFromScroll()
    observeItemHeights()
  }
)

watch(
  () => props.fitHeightToActiveItem,
  async (enabled) => {
    if (!enabled) {
      activeItemHeightPx.value = null
      itemResizeObserver?.disconnect()
      itemResizeObserver = null
      return
    }
    await nextTick()
    observeItemHeights()
  }
)

watch(
  () => activeIndex.value,
  async (index, prev) => {
    emit('active-index-change', index)
    if (props.scrollPageToTopOnIndexChange && prev !== undefined && index !== prev) {
      scrollPageToTop()
    }
    await nextTick()
    measureActiveItemHeight()
  }
)

defineExpose({
  scrollToIndex,
  scrollToEnd,
	getActiveIndex: () => activeIndex.value
})
</script>

<style scoped>
.carousel {
  position: relative;
}

.carousel__dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.25rem 10px 0.4rem;
}

.carousel__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  box-sizing: border-box;
  padding: 0;
  background: var(--color-border-warm);
  cursor: pointer;
}

.carousel__dot.is-active {
  background: var(--color-warm-brown);
}

.carousel__dot.carousel__dot--outline {
  background: transparent;
  border: 2px solid var(--color-border-warm);
}

.carousel__dot.carousel__dot--outline.is-active {
  background: transparent;
  border-color: var(--color-warm-brown);
}

.carousel__viewport {
  position: relative;
}

.carousel__viewport--fit-active-height {
  overflow: hidden;
  transition: height 0.25s ease;
}

.carousel__row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 1.2rem 10px 0;
  scroll-snap-type: x mandatory;
  scroll-padding-left: 5%;
  scroll-padding-right: 5%;
  -webkit-overflow-scrolling: touch;

  /* Hide scrollbar (still scrollable) */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}

.carousel__row--no-gesture {
  touch-action: pan-y;
}

.carousel__row--fit-active-height {
  align-items: flex-start;
}

.carousel__row::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.carousel__item {
  flex: 0 0 auto;
  scroll-snap-align: center;
  scroll-snap-stop: always;
}
</style>
