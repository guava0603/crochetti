<template>
  <div
    class="spring-print-card"
    :class="{ 'spring-print-card--static': disableAnimations }"
  >
    <div v-if="loading" class="spring-print-card__empty">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="!hasData" class="spring-print-card__empty">
      {{ t('record.noTimeSlots') }}
    </div>

    <div v-else class="spring-print-card__content">
      <slot name="extra-images" />
      <slot name="project-title" />

      <header v-if="showSummaryBlock" class="spring-print-card__header">
        <p class="spring-print-card__time-span">{{ t('recordResult.spanLine', { span: spanText }) }}</p>
        <h1 class="spring-print-card__effort-title">
          <span>{{ effortLineParts.before }}</span><span class="spring-print-card__effort-time">{{ effortText }}</span><span>{{ effortLineParts.after }}</span>
        </h1>
      </header>

      <section v-if="topGroup" class="spring-print-card__main-box">
        <div class="spring-print-card__chart-wrap">
          <svg
            class="spring-print-card__chart-svg"
            :width="chartSize"
            :height="chartSize"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <defs>
              <linearGradient :id="ringGradientId" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#c3da99" />
                <stop offset="100%" stop-color="#8cb972" />
              </linearGradient>
            </defs>
            <g transform="rotate(-90 50 50)">
              <circle
                class="spring-print-card__chart-bg"
                cx="50"
                cy="50"
                :r="ringRadius"
                :stroke-width="ringStrokeVb"
              />
              <circle
                class="spring-print-card__chart-progress"
                cx="50"
                cy="50"
                :r="ringRadius"
                :stroke-width="ringStrokeVb"
                :stroke="`url(#${ringGradientId})`"
                :stroke-dasharray="ringCircumference"
                :stroke-dashoffset="ringDashOffset"
              />
            </g>
          </svg>
          <div class="spring-print-card__chart-text">
            <p class="spring-print-card__chart-label">{{ topGroup.label }}</p>
            <p class="spring-print-card__chart-duration">{{ formatDuration(topGroup.durationMs) }}</p>
          </div>
        </div>

        <ul v-if="topGroupNoteLines.length" class="spring-print-card__sub-list">
          <li
            v-for="line in topGroupNoteLines"
            :key="line.key"
            class="spring-print-card__sub-item"
          >
            <span class="spring-print-card__sub-name">{{ line.note }}</span>
            <div class="spring-print-card__track-bar">
              <div
                class="spring-print-card__fill-bar"
                :class="{ 'spring-print-card__fill-bar--ready': barsReady }"
                :style="{ '--target-width': `${line.percent}%` }"
              />
            </div>
            <span class="spring-print-card__sub-time">{{ formatDuration(line.durationMs) }}</span>
          </li>
        </ul>
      </section>

      <section
        v-if="restGroups.length && showMoreStatusBlock"
        class="spring-print-card__other-section"
      >
        <h2 v-if="showMoreStatusTitleBlock" class="spring-print-card__section-title">
          {{ t('recordResult.nextStatuses') }}
        </h2>

        <div
          v-for="(group, index) in restGroups"
          :key="group.key"
          class="spring-print-card__other-card"
        >
          <div class="spring-print-card__other-info">
            <div
              class="spring-print-card__mini-circle"
              :style="{ borderTopColor: accentColor(index) }"
            />
            <span class="spring-print-card__other-name">{{ group.label }}</span>
          </div>
          <span class="spring-print-card__other-time">{{ formatDuration(group.durationMs) }}</span>
        </div>
      </section>

      <slot name="extra-note" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordResultData } from '@/composables/useRecordResultData'

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null },
  sectionVisibility: {
    type: Object,
    default: undefined
  },
  disableAnimations: {
    type: Boolean,
    default: false
  }
})

const { t } = useI18n({ useScope: 'global' })

const {
  loading,
  hasData,
  topGroup,
  topGroupPercent,
  topGroupNoteLines,
  restGroups,
  formatDuration,
  spanText,
  effortText,
  effortLineParts,
  showSummary,
  isSectionVisible
} = useRecordResultData(props)

const chartSize = 130
const ringStrokePx = 12
const ringStrokeVb = (ringStrokePx / chartSize) * 100
const ringRadius = 50 - ringStrokeVb / 2

const ringGradientId = `spring-ring-gradient-${Math.random().toString(36).slice(2, 9)}`
const ringCircumference = 2 * Math.PI * ringRadius

const ringReady = ref(false)
const barsReady = ref(false)

const ringDashOffset = computed(() => {
  if (!ringReady.value) return ringCircumference
  const progress = topGroupPercent.value / 100
  return ringCircumference * (1 - progress)
})

const accentColors = ['#e09d82', '#f0cf97', '#8cb972', '#c3da99']

function accentColor(index) {
  return accentColors[index % accentColors.length]
}

onMounted(() => {
  if (props.disableAnimations) {
    ringReady.value = true
    barsReady.value = true
    return
  }

  setTimeout(() => {
    ringReady.value = true
  }, 300)

  setTimeout(() => {
    barsReady.value = true
  }, 600)
})

const showSummaryBlock = computed(() => showSummary.value && isSectionVisible('resultSummary'))

const showMoreStatusBlock = computed(() => isSectionVisible('moreStatus'))

const showMoreStatusTitleBlock = computed(() => isSectionVisible('resultHeader'))
</script>

<style scoped>
.spring-print-card {
  width: 100%;
  min-width: 0;
}

.spring-print-card__content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  z-index: 1;
}

.spring-print-card__empty {
  color: #6e8576;
  font-weight: 600;
  text-align: center;
  padding: 1rem 0;
}

.spring-print-card__header {
  text-align: center;
  margin-bottom: 0.25rem;
}

.spring-print-card__time-span {
  font-size: 0.875rem;
  color: #7fa08c;
  font-weight: 500;
  letter-spacing: 0.5px;
  margin: 0 0 0.375rem;
  background: rgba(255, 255, 255, 0.4);
  padding: 0.125rem 0.625rem;
  border-radius: 0.75rem;
  display: inline-block;
}

.spring-print-card__effort-title {
  margin: 0;
  font-size: 1.5rem;
  color: #2f3e34;
  font-weight: 700;
  line-height: 1.35;
}

.spring-print-card__effort-time {
  color: #df9877;
  position: relative;
  display: inline-block;
  padding: 0 0.25rem;
}

.spring-print-card__effort-time::after {
  content: '';
  position: absolute;
  bottom: 0.25rem;
  left: 0;
  width: 100%;
  height: 0.5rem;
  background-color: rgba(243, 219, 182, 0.5);
  z-index: -1;
}

.spring-print-card__main-box {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 1.5rem;
  padding: 1.5rem 1.25rem;
  border: 1px dashed #c2dac7;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spring-print-card__chart-wrap {
  position: relative;
  width: 8.125rem;
  height: 8.125rem;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.25rem;
}

.spring-print-card__chart-svg {
  display: block;
  overflow: visible;
}

.spring-print-card__chart-bg {
  fill: none;
  stroke: rgba(230, 240, 233, 0.7);
}

.spring-print-card__chart-progress {
  fill: none;
  stroke-linecap: round;
  transition: stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.spring-print-card__chart-text {
  position: absolute;
  text-align: center;
  pointer-events: none;
}

.spring-print-card__chart-label {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #233328;
  letter-spacing: 0.06em;
}

.spring-print-card__chart-duration {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  color: #6e8576;
}

.spring-print-card__sub-list {
  width: 100%;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.spring-print-card__sub-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  gap: 0.5rem;
}

.spring-print-card__sub-name {
  color: #3b4d42;
  font-weight: 500;
  width: 3.75rem;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spring-print-card__track-bar {
  flex-grow: 1;
  height: 0.5rem;
  background: rgba(230, 240, 233, 0.7);
  border-radius: 0.25rem;
  overflow: hidden;
}

.spring-print-card__fill-bar {
  height: 100%;
  background: linear-gradient(90deg, #c3da99 0%, #8cb972 100%);
  border-radius: 0.25rem;
  width: 0;
}

.spring-print-card__fill-bar--ready {
  width: var(--target-width);
  transition: width 1s ease-out;
}

.spring-print-card--static .spring-print-card__fill-bar {
  width: var(--target-width);
}

.spring-print-card__sub-time {
  color: #6e8576;
  font-size: 0.8125rem;
  min-width: 2.8rem;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.spring-print-card__other-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.spring-print-card__section-title {
  margin: 0;
  font-size: 0.9375rem;
  color: #556c5c;
  font-weight: 700;
  padding-left: 0.25rem;
  border-left: 3px solid #8cb972;
  line-height: 1;
}

.spring-print-card__other-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(230, 242, 234, 0.8);
  border-radius: 1.125rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 15px rgba(140, 185, 114, 0.04);
}

.spring-print-card__other-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.spring-print-card__mini-circle {
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid rgba(230, 240, 233, 0.8);
  border-top: 3px solid #e09d82;
  border-radius: 50%;
  flex-shrink: 0;
}

.spring-print-card__other-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #2f3e34;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spring-print-card__other-time {
  font-size: 0.875rem;
  color: #6e8576;
  font-weight: 500;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.spring-print-card--static .spring-print-card__chart-progress,
.spring-print-card--static .spring-print-card__fill-bar--ready {
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .spring-print-card__chart-progress,
  .spring-print-card__fill-bar--ready {
    transition: none !important;
  }
}
</style>
