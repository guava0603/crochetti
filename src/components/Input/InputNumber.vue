<template>
  <div
    ref="rootRef"
    class="selection-actions"
    @click.stop
    @blur.capture="handleBlur"
    tabindex="-1"
  >
    <div
      ref="scrollRef"
      class="number-scroll"
      role="listbox"
      :aria-label="'Number picker'"
      @scroll.passive="handleScroll"
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
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
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

const ITEM_HEIGHT = 28

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
  const target = (clamp(value) - props.min) * ITEM_HEIGHT
  el.scrollTo({ top: target, behavior })
}

let scrollRaf = null
function handleScroll() {
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    const el = scrollRef.value
    if (!el) return

    const idx = Math.round(el.scrollTop / ITEM_HEIGHT)
    const next = clamp(props.min + idx)
    if (next !== props.modelValue) emit('update:modelValue', next)
  })
}

function selectNumber(n) {
  const next = clamp(n)
  emit('update:modelValue', next)
  nextTick(() => scrollToValue(next, 'smooth'))
}

const handleBlur = (event) => {
  // Check if the new focus target is outside this component
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
    await nextTick()
    scrollToValue(value)
  }
)
</script>

<style scoped>
.selection-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.25rem;
  background: #eff6ff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  z-index: 10;
  white-space: nowrap;
}

.number-scroll {
  --item-height: 28px;
  --picker-height: var(--item-height);
  --viewport-height: calc(var(--picker-height) * 1.5);
  --center-padding: calc((var(--viewport-height) - var(--item-height)) / 2);

  position: relative;
  height: var(--viewport-height);
  width: 64px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(59, 130, 246, 0.22);
  padding: var(--center-padding) 0;
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
  cursor: pointer;
  color: #1e3a8a;
  font-size: 0.9rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
}

.number-scroll::after {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  height: var(--item-height);
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.18);
  pointer-events: none;
}

.number-item.is-selected {
  background: rgba(59, 130, 246, 0.12);
  color: #1e40af;
}
</style>
