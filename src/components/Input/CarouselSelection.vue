<template>
  <div
    v-if="items.length > 1"
    ref="carouselRef"
    class="carousel"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <div
      v-for="(item, index) in items"
      :key="getKey(item, index)"
      :ref="setItemRef(index)"
      class="carousel-card"
      :class="{ 'carousel-card--active': modelIndex === index }"
      :style="getCardStyle(index)"
      role="tab"
      :aria-selected="modelIndex === index"
      @click="handleClick(index)"
    >
      <slot
        name="item"
        :item="item"
        :index="index"
        :active="modelIndex === index"
        :progress="getProgressSafe(index)"
      >
        <div class="carousel-card-top">
          <span class="carousel-card-name">{{ getLabel(item, index) }}</span>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Number,
    default: 0,
  },
  ariaLabel: {
    type: String,
    default: 'Carousel',
  },
  getItemKey: {
    type: Function,
    default: null,
  },
  getItemLabel: {
    type: Function,
    default: null,
  },
  getProgress: {
    type: Function,
    default: null,
  },
  settleDelay: {
    type: Number,
    default: 120,
  },
  centerOnModelChange: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'settle', 'click'])

const carouselRef = ref(null)
const itemRefs = ref([])
const setItemRef = (idx) => (el) => {
  if (!el) return
  itemRefs.value[idx] = el
}

const clampIndex = (idx) => {
  const len = props.items.length
  if (len <= 0) return 0
  const n = Number(idx)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(len - 1, n)
}

const modelIndex = computed(() => clampIndex(props.modelValue))

const getKey = (item, index) => {
  if (typeof props.getItemKey === 'function') return props.getItemKey(item, index)
  return index
}

const getLabel = (item, index) => {
  if (typeof props.getItemLabel === 'function') return props.getItemLabel(item, index)
  return item?.name || `Component ${index + 1}`
}

const getProgressSafe = (index) => {
  if (typeof props.getProgress !== 'function') return 0
  const raw = Number(props.getProgress(index))
  if (!Number.isFinite(raw)) return 0
  return Math.min(100, Math.max(0, Math.round(raw)))
}

const getCardStyle = (index) => ({
  '--progress': `${getProgressSafe(index)}%`,
})

const getScrollBehavior = (preferred = 'smooth') => {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'auto'
    }
  } catch {
    // ignore
  }
  return preferred
}

const scrollToIndex = async (idx, behavior = 'smooth') => {
  await nextTick()
  const container = carouselRef.value
  const el = itemRefs.value[idx]
  if (!container || !el) return

  const rect = el.getBoundingClientRect()
  const viewportCenterX = window.innerWidth / 2
  const itemCenterX = rect.left + rect.width / 2
  const deltaX = itemCenterX - viewportCenterX
  container.scrollTo({ left: container.scrollLeft + deltaX, behavior })
}

defineExpose({ scrollToIndex })

const handleClick = async (idx) => {
  const next = clampIndex(idx)
  emit('click', next)
  emit('update:modelValue', next)
  await scrollToIndex(next, 'smooth')
  emit('settle', next)
}

let rafId = null
let settleTimer = null

const updateSelectedByCenter = () => {
  const items = itemRefs.value
  if (!items || items.length === 0) return

  const viewportCenterX = window.innerWidth / 2
  let bestIdx = null
  let bestDist = Infinity

  for (let i = 0; i < items.length; i += 1) {
    const el = items[i]
    if (!el) continue
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const dist = Math.abs(centerX - viewportCenterX)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }

  if (bestIdx === null) return
  const nextIdx = clampIndex(bestIdx)
  if (nextIdx === modelIndex.value) return

  emit('update:modelValue', nextIdx)

  if (settleTimer) clearTimeout(settleTimer)
  settleTimer = setTimeout(() => emit('settle', nextIdx), props.settleDelay)
}

const scheduleUpdateByCenter = () => {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    updateSelectedByCenter()
  })
}

onMounted(() => {
  window.addEventListener('resize', scheduleUpdateByCenter)
  const el = carouselRef.value
  if (el) el.addEventListener('scroll', scheduleUpdateByCenter, { passive: true })

  // Initial alignment.
  if (props.centerOnModelChange) {
    scrollToIndex(modelIndex.value, getScrollBehavior('smooth'))
  }
  scheduleUpdateByCenter()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleUpdateByCenter)
  const el = carouselRef.value
  if (el) el.removeEventListener('scroll', scheduleUpdateByCenter)
  if (rafId !== null) cancelAnimationFrame(rafId)
  if (settleTimer) clearTimeout(settleTimer)
})

watch(
  () => [props.items.length, props.modelValue],
  async () => {
    const next = clampIndex(props.modelValue)
    if (next !== props.modelValue) emit('update:modelValue', next)

    if (props.centerOnModelChange) {
      await scrollToIndex(next, getScrollBehavior('smooth'))
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.carousel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 0.5rem max(0px, calc(50vw - 110px));
  margin: 0.25rem 0 0.75rem;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  scroll-padding-left: max(0px, calc(50vw - 110px));
  scroll-padding-right: max(0px, calc(50vw - 110px));
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/old Edge */
}

@media (prefers-reduced-motion: reduce) {
  .carousel {
    scroll-behavior: auto;
  }
}

.carousel::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.carousel-card {
  flex: 0 0 auto;
  width: 15vw;
  height: 15vw;
  --progress: 0%;
  background: linear-gradient(
    to top,
    #A5C89E 0%,
    #A5C89E var(--progress),
    rgba(255, 255, 255, 0.92) var(--progress),
    rgba(255, 255, 255, 0.92) 100%
  );
  border: none;
  border-radius: 50%;
  padding: 0.55rem 0.65rem;
  cursor: pointer;
  text-align: left;
  scroll-snap-align: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}

.carousel-card:active {
  transform: translateY(1px);
}

.carousel-card--active {
  width: 25vw;
  height: 25vw;
  background: linear-gradient(
    to top,
    #D8E983 0%,
    #D8E983 var(--progress),
    rgba(255, 255, 255, 0.92) var(--progress),
    rgba(255, 255, 255, 0.92) 100%
  );
  box-shadow: 0 6px 18px rgba(17, 24, 39, 0.08), 0 0 0 2px rgba(66, 185, 131, 0.12);
}

.carousel-card-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.carousel-card-name {
  font-size: 0.85rem;
  font-weight: 800;
  color: #111827;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.carousel-card-ratio {
  font-size: 0.72rem;
  font-weight: 900;
  color: #065f46;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
  white-space: nowrap;
}
</style>
