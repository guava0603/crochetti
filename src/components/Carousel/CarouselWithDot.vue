<template>
  <div class="carousel" :class="{ 'carousel--bleed': bleed }" :style="bleedStyle">
    <div v-if="count > 1" class="carousel__dots" role="tablist">
      <button
        v-for="(_, i) in items"
        :key="`dot-${i}`"
        type="button"
        class="carousel__dot"
        :class="{ 'is-active': i === activeIndex }"
        :aria-label="`Go to item ${i + 1}`"
        :aria-current="i === activeIndex ? 'true' : undefined"
        @click="scrollToIndex(i)"
      />
    </div>

    <div class="carousel__viewport">
      <button
        v-if="showPrevArrow"
        type="button"
        class="carousel__arrow carousel__arrow--left"
        aria-label="Previous"
        @click="scrollToIndex(activeIndex - 1)"
      >
        ‹
      </button>
      <button
        v-if="showNextArrow"
        type="button"
        class="carousel__arrow carousel__arrow--right"
        aria-label="Next"
        @click="scrollToIndex(activeIndex + 1)"
      >
        ›
      </button>

      <div
        ref="rowEl"
        class="carousel__row"
        role="region"
        :aria-label="ariaLabel"
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

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: ''
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
  }
})

const rowEl = ref(null)
const itemEls = ref([])
const activeIndex = ref(0)

const count = computed(() => (Array.isArray(props.items) ? props.items.length : 0))

const showPrevArrow = computed(() => count.value > 1 && activeIndex.value > 0)
const showNextArrow = computed(() => count.value > 1 && activeIndex.value < count.value - 1)

const bleedStyle = computed(() => {
  if (!props.bleed) return {}
  return { marginLeft: `-${props.bleedX}`, marginRight: `-${props.bleedX}` }
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

function updateActiveIndexFromScroll() {
  const row = rowEl.value
  if (!row) return

  const left = row.scrollLeft
  const els = Array.isArray(itemEls.value) ? itemEls.value : []

  let bestIndex = 0
  let bestDist = Number.POSITIVE_INFINITY

  for (let i = 0; i < els.length; i += 1) {
    const el = els[i]
    if (!el) continue
    const dist = Math.abs(el.offsetLeft - left)
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

async function scrollToIndex(index) {
  const max = Math.max(0, count.value - 1)
  const target = Math.min(max, Math.max(0, Number(index)))

  await nextTick()

  const el = itemEls.value?.[target]
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    activeIndex.value = target
    return
  }

  const row = rowEl.value
  if (row && typeof row.scrollTo === 'function') {
    row.scrollTo({ left: row.clientWidth * target, behavior: 'smooth' })
    activeIndex.value = target
  }
}

async function scrollToEnd() {
  await nextTick()
  const row = rowEl.value
  if (row && typeof row.scrollTo === 'function') {
    row.scrollTo({ left: row.scrollWidth, behavior: 'smooth' })
  }
}

function handleResize() {
  updateActiveIndexFromScroll()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  nextTick(() => updateActiveIndexFromScroll())
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
})

watch(
  () => count.value,
  async (len) => {
    await nextTick()
    if (Array.isArray(itemEls.value)) itemEls.value = itemEls.value.slice(0, len)
    const max = Math.max(0, len - 1)
    if (activeIndex.value > max) activeIndex.value = max
    updateActiveIndexFromScroll()
  }
)

defineExpose({
  scrollToIndex,
  scrollToEnd
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
  padding: 0;
  background: rgba(107, 114, 128, 0.35);
  cursor: pointer;
}

.carousel__dot.is-active {
  background: #42b983;
}

.carousel__viewport {
  position: relative;
}

.carousel__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  color: #111827;
  font-size: 22px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.carousel__arrow--left {
  left: 8px;
}

.carousel__arrow--right {
  right: 8px;
}

.carousel__arrow:active {
  transform: translateY(-50%) scale(0.96);
}

.carousel__row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem 10px 1rem;
  scroll-snap-type: x proximity;
  scroll-padding-left: 5%;
  scroll-padding-right: 5%;
  -webkit-overflow-scrolling: touch;

  /* Hide scrollbar (still scrollable) */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}

.carousel__row::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.carousel__item {
  flex: 0 0 auto;
  scroll-snap-align: start;
}
</style>
