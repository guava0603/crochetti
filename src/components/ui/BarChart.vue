<template>
  <div
    class="bar-chart"
    :class="orientationClass"
    :style="cssVars"
    role="img"
    :aria-label="ariaLabel"
  >
    <template v-if="orientation === 'horizontal'">
      <div
        v-for="(pct, idx) in displayValues"
        :key="`bar-row-${idx}`"
        class="bar-chart__row"
      >
        <div v-if="showLabels" class="bar-chart__row-title" :title="titlesForBars[idx] || undefined">
          {{ titlesForBars[idx] || '-' }}
        </div>

        <div
          class="bar-chart__row-track"
          :style="{ '--bar-pct': String(pct) }"
          aria-hidden="true"
        >
          <div class="bar-chart__row-fill" />
        </div>

        <div v-if="showValueLabel" class="bar-chart__row-value">
          {{ valueLabelsForBars[idx] }}
        </div>
      </div>
    </template>

    <template v-else>
      <div
        v-for="(pct, idx) in displayValues"
        :key="`bar-${idx}`"
        class="bar-chart__bar"
        :style="{ '--bar-pct': String(pct) }"
        :title="titlesForBars[idx] || undefined"
        aria-hidden="true"
      >
        <div class="bar-chart__fill" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const BAR_COLOR = 'rgb(224 157 127)'

const props = defineProps({
  values: {
    type: Array,
    default: () => []
  },
  animateOnMount: {
    type: Boolean,
    default: true
  },
  animationMs: {
    type: Number,
    default: 1200
  },
  titles: {
    type: Array,
    default: () => []
  },
  valueLabels: {
    type: Array,
    default: () => []
  },
  orientation: {
    type: String,
    default: 'vertical'
  },
  showLabels: {
    type: Boolean,
    default: false
  },
  showValueLabel: {
    type: Boolean,
    default: false
  },
  height: {
    type: Number,
    default: 48
  },
  barWidth: {
    type: Number,
    default: 8
  },
  gap: {
    type: Number,
    default: 6
  }
})

function clampPercent(value) {
  const n = Number(value)
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

const normalizedValues = computed(() => {
  const arr = Array.isArray(props.values) ? props.values : []
  return arr.map(clampPercent)
})

const reducedMotion = prefersReducedMotion()
const hasMounted = ref(false)

const useRafTween = computed(() => !reducedMotion && props.animateOnMount && Math.max(0, Number(props.animationMs) || 0) > 0)

const animatedValues = ref(
  props.animateOnMount && !reducedMotion ? normalizedValues.value.map(() => 0) : [...normalizedValues.value]
)
const displayValues = computed(() => {
  if (reducedMotion || !props.animateOnMount) return normalizedValues.value
  if (!Array.isArray(animatedValues.value) || animatedValues.value.length !== normalizedValues.value.length) {
    return normalizedValues.value
  }
  return animatedValues.value
})

const titlesForBars = computed(() => {
  const titles = Array.isArray(props.titles) ? props.titles : []
  return normalizedValues.value.map((_, idx) => {
    const raw = titles[idx]
    if (raw == null) return ''
    const s = String(raw).trim()
    return s
  })
})

const valueLabelsForBars = computed(() => {
  const labels = Array.isArray(props.valueLabels) ? props.valueLabels : []
  return normalizedValues.value.map((pct, idx) => {
    const raw = labels[idx]
    if (raw == null) return ''
    const s = String(raw).trim()
    return s
  })
})

const ariaLabel = computed(() => {
  if (!normalizedValues.value.length) return 'bar chart'
  if (orientation.value === 'horizontal' && titlesForBars.value.some(Boolean)) {
    const parts = normalizedValues.value.map((pct, idx) => {
      const title = titlesForBars.value[idx]
      const label = valueLabelsForBars.value[idx] || `${pct}%`
      return title ? `${title} ${label}` : label
    })
    return `bar chart: ${parts.join(', ')}`
  }
  return `bar chart: ${normalizedValues.value.join('%, ')}%`
})

const orientation = computed(() => {
  const o = String(props.orientation || '').toLowerCase()
  return o === 'horizontal' ? 'horizontal' : 'vertical'
})

const orientationClass = computed(() => {
  return orientation.value === 'horizontal' ? 'bar-chart--horizontal' : 'bar-chart--vertical'
})

const cssVars = computed(() => ({
  '--chart-height': `${Math.max(16, Number(props.height) || 48)}px`,
  '--bar-width': `${Math.max(2, Number(props.barWidth) || 8)}px`,
  '--bar-gap': `${Math.max(0, Number(props.gap) || 6)}px`,
  '--bar-color': BAR_COLOR,
  '--bar-transition-ms': useRafTween.value ? '0ms' : `${Math.max(0, Number(props.animationMs) || 0)}ms`
}))

const syncAnimatedValues = (target) => {
  animatedValues.value = target.map(clampPercent)
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

let rafId = 0
const cancelTween = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

const tweenTo = (target) => {
  cancelTween()

  const to = target.map(clampPercent)
  const duration = Math.max(0, Number(props.animationMs) || 0)

  if (!useRafTween.value || duration === 0) {
    syncAnimatedValues(to)
    return
  }

  const from = Array.isArray(animatedValues.value) && animatedValues.value.length === to.length
    ? animatedValues.value.map(clampPercent)
    : to.map(() => 0)

  const start = performance.now()

  const step = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = easeOutCubic(t)
    animatedValues.value = to.map((v, idx) => from[idx] + (v - from[idx]) * eased)
    if (t < 1) {
      rafId = requestAnimationFrame(step)
    } else {
      rafId = 0
      syncAnimatedValues(to)
    }
  }

  rafId = requestAnimationFrame(step)
}

onMounted(() => {
  hasMounted.value = true

  if (reducedMotion || !props.animateOnMount) {
    syncAnimatedValues(normalizedValues.value)
    return
  }

  // Always start at 0 then tween to the real values.
  syncAnimatedValues(normalizedValues.value.map(() => 0))
  tweenTo(normalizedValues.value)
})

watch(
  normalizedValues,
  (next) => {
    if (reducedMotion || !props.animateOnMount) {
      syncAnimatedValues(next)
      return
    }

    if (!hasMounted.value) {
      // Before mount, keep the initial 0s (or initial values if animation disabled).
      return
    }

    // Smoothly transition to updated values (length changes handled too).
    if (!Array.isArray(animatedValues.value) || animatedValues.value.length !== next.length) {
      syncAnimatedValues(next.map(() => 0))
    }

    tweenTo(next)
  }
)
</script>

<style scoped>
.bar-chart {
  --chart-height: 48px;
  --bar-width: 8px;
  --bar-gap: 6px;
  --bar-color: rgb(224 157 127);
}

.bar-chart--vertical {
  display: flex;
  align-items: flex-end;
  gap: var(--bar-gap);
  height: var(--chart-height);
  width: fit-content;
}

.bar-chart--horizontal {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  column-gap: 0.75rem;
  row-gap: var(--bar-gap);
  align-items: center;
  width: 100%;
}

.bar-chart__bar {
  width: var(--bar-width);
  height: 100%;
  background: rgba(17, 24, 39, 0.12);
  border-radius: 999px;
  position: relative;
  overflow: hidden;
}

.bar-chart__fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(var(--bar-pct) * 1%);
  background: var(--bar-color);
  border-radius: 999px;
  transition: height var(--bar-transition-ms, 220ms) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.bar-chart__row {
  display: contents;
}

.bar-chart__row-title {
  font-weight: 800;
  font-size: 0.9rem;
  color: rgba(17, 24, 39, 0.82);
  justify-self: start;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-chart__row-track {
  width: 100%;
  height: var(--bar-width);
  background: rgba(17, 24, 39, 0.12);
  border-radius: 999px;
  position: relative;
  overflow: hidden;
}

.bar-chart__row-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(var(--bar-pct) * 1%);
  background: var(--bar-color);
  border-radius: 999px;
  transition: width var(--bar-transition-ms, 220ms) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.bar-chart__row-value {
  font-weight: 900;
  color: var(--color-font-invisible);
  font-size: 0.7rem;
  justify-self: end;
  text-align: right;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .bar-chart__fill {
    transition: none;
  }

  .bar-chart__row-fill {
    transition: none;
  }
}
</style>
