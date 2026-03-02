<template>
  <div v-if="urls.length" class="image-carousel" :aria-label="computedAriaLabel">
    <div
      ref="trackEl"
      class="image-carousel__track"
      role="region"
      :aria-label="computedAriaLabel"
      @scroll.passive="onScroll"
    >
      <div
        v-for="(url, idx) in urls"
        :key="`${idx}-${url}`"
        class="image-carousel__slide"
      >
        <ImageBox
          class="image-carousel__image"
          :image-url="url"
          alt=""
          :aria-label="t('image.openImage')"
          :openable="true"
          :stop-propagation="true"
          :show-delete="false"
        />
      </div>
    </div>

    <div
      v-if="urls.length > 1"
      class="image-carousel__thumbs"
      role="tablist"
      :aria-label="t('image.images')"
    >
      <button
        v-for="(url, idx) in urls"
        :key="`thumb-${idx}-${url}`"
        type="button"
        class="image-carousel__thumb"
        :class="{ 'is-active': idx === activeIndex }"
        :aria-label="t('image.goToImage', { n: idx + 1 })"
        :aria-current="idx === activeIndex ? 'true' : undefined"
        @click="scrollToIndex(idx)"
      >
        <img class="image-carousel__thumb-img" :src="url" alt="" loading="lazy" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ImageBox from '@/components/Image/ImageBox.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: ''
  }
})

const computedAriaLabel = computed(() => props.ariaLabel || t('image.projectImages'))

const urls = computed(() => {
  const raw = Array.isArray(props.images) ? props.images : []
  return raw
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
})

const trackEl = ref(null)
const activeIndex = ref(0)

function clampIndex(i) {
  const max = Math.max(0, urls.value.length - 1)
  const n = Number(i)
  if (!Number.isFinite(n)) return 0
  return Math.min(max, Math.max(0, Math.round(n)))
}

function updateActiveFromScroll() {
  const track = trackEl.value
  if (!track) return
  const w = track.clientWidth
  if (!w) return
  activeIndex.value = clampIndex(track.scrollLeft / w)
}

let scrollRaf = 0
function onScroll() {
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(updateActiveFromScroll)
}

async function scrollToIndex(index) {
  const track = trackEl.value
  if (!track) return

  const target = clampIndex(index)
  await nextTick()

  const w = track.clientWidth
  if (!w || typeof track.scrollTo !== 'function') return
  track.scrollTo({ left: target * w, behavior: 'smooth' })
  activeIndex.value = target
}

function handleResize() {
  updateActiveFromScroll()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  nextTick(() => updateActiveFromScroll())
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
})

watch(
  () => urls.value.length,
  (len) => {
    const max = Math.max(0, len - 1)
    if (activeIndex.value > max) activeIndex.value = max
    nextTick(() => updateActiveFromScroll())
  }
)
</script>

<style scoped>
.image-carousel {
  position: relative;
  width: 100vw;
  height: min(100vw, 40vh);
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  background: rgba(0, 0, 0, 0.04);
}

.image-carousel__track {
  height: 100%;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.image-carousel__track::-webkit-scrollbar {
  display: none;
}

.image-carousel__slide {
  flex: 0 0 100%;
  height: 100%;
  scroll-snap-align: center;
}

.image-carousel__image {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

/* Override ImageBox's default 1:1 square crop for the carousel. */
.image-carousel :deep(.image-box__cut) {
  aspect-ratio: auto !important;
  width: 100%;
  height: 100%;
}

.image-carousel :deep(.image-box__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0;
}

.image-carousel__thumbs {
  position: absolute;
  right: 4px;
  bottom: 6px;
  display: flex;
  gap: 6px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(6px);
}

.image-carousel__thumb {
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  overflow: hidden;
  background: transparent;
  cursor: pointer;
}

.image-carousel__thumb.is-active {
  border-color: rgba(66, 185, 131, 0.9);
  box-shadow: 0 0 0 1px rgba(66, 185, 131, 0.25);
}

.image-carousel__thumb-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
</style>
