<template>
  <div
    class="progress-ring"
    :style="{
      '--pr-size': `${sizePx}px`,
      '--pr-stroke': `${strokePx}px`,
      '--pr-track': trackColor,
      '--pr-progress': computedProgressColor,
      '--pr-text': textColor,
      '--pr-transition-ms': useRafTween ? '0ms' : `${Math.max(0, Number(props.animationMs) || 0)}ms`,
    }"
    role="img"
    :aria-label="ariaLabel"
  >
    <svg class="progress-ring__svg" :width="sizePx" :height="sizePx" viewBox="0 0 100 100">
      <circle
        class="progress-ring__track"
        cx="50"
        cy="50"
        :r="r"
        fill="transparent"
        :stroke-width="strokeVb"
      />
      <circle
        class="progress-ring__progress"
        cx="50"
        cy="50"
        :r="r"
        fill="transparent"
        :stroke-width="strokeVb"
        :stroke-dasharray="dashArray"
        :stroke-dashoffset="dashOffset"
      />
    </svg>

    <div class="progress-ring__center" aria-hidden="true">
      <span v-if="showPercentNumber" class="progress-ring__number">{{ displayNumber }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    required: true
  },
  animateOnMount: {
    type: Boolean,
    default: true
  },
  animationMs: {
    type: Number,
    default: 1200
  },
  size: {
    type: Number,
    default: 40
  },
  stroke: {
    type: Number,
    default: 6
  },
  trackColor: {
    type: String,
    default: 'rgba(0, 0, 0, 0.05)'
  },
  // If provided, overrides percentage-based coloring.
  progressColor: {
    type: String,
    default: ''
  },
  // Percentage-based coloring: low % uses `lightColor`, high % uses `darkColor`.
  lightColor: {
    type: String,
    default: '#FFF3C4'
  },
  darkColor: {
    type: String,
    default: '#B17A00'
  },
  textColor: {
    type: String,
    default: 'rgba(110, 80, 52, 0.95)'
  },
  showPercentNumber: {
    type: Boolean,
    default: true
  },
  showPercentSign: {
    type: Boolean,
    default: false
  }
})

const clamp = (n) => {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

const prefersReducedMotion = () => {
  try {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const animatedValue = ref(0)
const valueClamped = computed(() => clamp(animatedValue.value))

const reducedMotion = prefersReducedMotion()
const useRafTween = computed(() => !reducedMotion && props.animateOnMount && Math.max(0, Number(props.animationMs) || 0) > 0)

const parseHexColor = (input) => {
  const s = String(input || '').trim()
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s)
  if (!m) return null
  const hex = m[1]
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  if (![r, g, b].every((n) => Number.isFinite(n))) return null
  return { r, g, b }
}

const mixRgb = (a, b, t) => {
  const p = Math.max(0, Math.min(1, Number(t)))
  const r = Math.round(a.r + (b.r - a.r) * p)
  const g = Math.round(a.g + (b.g - a.g) * p)
  const b2 = Math.round(a.b + (b.b - a.b) * p)
  return `rgb(${r} ${g} ${b2})`
}

const computedProgressColor = computed(() => {
  const forced = String(props.progressColor || '').trim()
  if (forced) return forced

  const light = parseHexColor(props.lightColor)
  const dark = parseHexColor(props.darkColor)
  if (!light || !dark) return '#41431B'

  const t = valueClamped.value / 100
  // Bigger percentage -> darker.
  return mixRgb(light, dark, t)
})

const sizePx = computed(() => Math.max(18, Number(props.size) || 40))
const strokePx = computed(() => Math.max(2, Math.min(20, Number(props.stroke) || 6)))

// We draw in a 100x100 viewBox. Convert stroke px to viewBox units.
const strokeVb = computed(() => (strokePx.value / sizePx.value) * 100)

// Keep the stroke entirely inside the viewBox.
const r = computed(() => 50 - strokeVb.value / 2)

const circumference = computed(() => 2 * Math.PI * r.value)
const dashArray = computed(() => `${circumference.value} ${circumference.value}`)
const dashOffset = computed(() => {
  const progress = valueClamped.value / 100
  return circumference.value * (1 - progress)
})

const displayNumber = computed(() => {
  const n = valueClamped.value
  return props.showPercentSign ? `${n}%` : String(n)
})

const ariaLabel = computed(() => `progress ${valueClamped.value}%`)

const syncAnimatedValue = (next) => {
  animatedValue.value = clamp(next)
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

let rafId = 0
const cancelTween = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

const tweenTo = (target) => {
  cancelTween()

  const to = clamp(target)
  const from = clamp(animatedValue.value)
  const duration = Math.max(0, Number(props.animationMs) || 0)

  if (!useRafTween.value || duration === 0 || from === to) {
    syncAnimatedValue(to)
    return
  }

  const start = performance.now()

  const step = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = easeOutCubic(t)
    syncAnimatedValue(from + (to - from) * eased)
    if (t < 1) {
      rafId = requestAnimationFrame(step)
    } else {
      rafId = 0
    }
  }

  rafId = requestAnimationFrame(step)
}

onMounted(() => {
  if (!props.animateOnMount || reducedMotion) {
    syncAnimatedValue(props.value)
    return
  }

  // Always start at 0 on mount then tween to the real value.
  syncAnimatedValue(0)
  tweenTo(props.value)
})

watch(
  () => props.value,
  (next) => {
    // After mount, updates tween as well.
    tweenTo(next)
  }
)
</script>

<style scoped>
.progress-ring {
  width: var(--pr-size);
  height: var(--pr-size);
  position: relative;
  display: inline-grid;
  place-items: center;
}

.progress-ring__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring__track {
  stroke: var(--pr-track);
}

.progress-ring__progress {
  stroke: var(--pr-progress);
  stroke-linecap: round;
  transition: stroke-dashoffset var(--pr-transition-ms, 220ms) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.progress-ring__center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.progress-ring__number {
  color: var(--pr-text);
  font-weight: 900;
  font-size: calc(var(--pr-size) * 0.34);
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .progress-ring__progress {
    transition: none;
  }
}
</style>
