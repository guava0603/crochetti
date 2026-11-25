<template>
  <section v-if="enabled" class="completed-time-precision">
    <p class="settings-group-subtitle">{{ t('recordPrint.completedTime.precisionLabel') }}</p>

    <p
      class="completed-time-precision__preview"
      :aria-label="t('recordPrint.completedTime.previewLabel', { time: previewTimeText })"
    >
      {{ previewTimeText }}
    </p>

    <div class="completed-time-precision__controls">
      <input
        v-model.number="precisionIndex"
        class="completed-time-precision__range"
        type="range"
        :min="0"
        :max="precisionUnits.length - 1"
        step="1"
        :aria-label="t('recordPrint.completedTime.precisionSliderLabel')"
        :aria-valuetext="precisionTickLabel"
      />
    </div>

    <div class="completed-time-precision__ticks" aria-hidden="true">
      <span
        v-for="(unit, idx) in precisionUnits"
        :key="unit"
        class="completed-time-precision__tick"
        :class="{ 'completed-time-precision__tick--active': precisionIndex === idx }"
      >
        {{ t(`recordPrint.completedTime.units.${unit}`) }}
      </span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  COMPLETED_TIME_PRECISION_UNITS,
  completedTimeIndexToPrecision,
  completedTimePrecisionToIndex,
  formatCompletedTimeForPrint,
  normalizeCompletedTimeSettings
} from '@/constants/recordPrintCompletedTime'

defineOptions({ name: 'PrintCompletedTimePrecisionSection' })

const props = defineProps({
  enabled: { type: Boolean, default: true },
  completedAtMs: { type: Number, default: null }
})

const settings = defineModel({ type: Object, required: true })

const { t, locale } = useI18n({ useScope: 'global' })

const precisionUnits = COMPLETED_TIME_PRECISION_UNITS

const precisionIndex = computed({
  get: () => completedTimePrecisionToIndex(settings.value?.precision),
  set: (index) => {
    settings.value.precision = completedTimeIndexToPrecision(index)
  }
})

const precisionTickLabel = computed(() =>
  t(`recordPrint.completedTime.units.${settings.value?.precision || 'minute'}`)
)

const previewTimeText = computed(() => {
  const ms = props.completedAtMs
  if (ms == null || !Number.isFinite(ms)) {
    return t('recordPrint.completedTime.previewEmpty')
  }

  const normalized = normalizeCompletedTimeSettings(settings.value)
  return formatCompletedTimeForPrint(ms, normalized.precision, { locale: locale.value })
})
</script>

<style scoped>
.completed-time-precision {
  margin-top: 0.65rem;
  margin-left: 0.5rem;
  padding: 0 0 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.settings-group-subtitle {
  margin: 0 0 0.65rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #6b7280;
}

.completed-time-precision__preview {
  margin: 0;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: rgba(243, 244, 246, 0.98);
  border: 1px solid rgba(17, 24, 39, 0.1);
  font-size: 0.85rem;
  font-weight: 800;
  color: #374151;
  text-align: center;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
}

.completed-time-precision__controls {
  display: flex;
  align-items: center;
}

.completed-time-precision__range {
  width: 100%;
  accent-color: var(--color-icon-add);
}

.completed-time-precision__ticks {
  display: flex;
  justify-content: space-between;
  gap: 0.15rem;
}

.completed-time-precision__tick {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #9ca3af;
}

.completed-time-precision__tick--active {
  color: var(--color-icon-add);
  font-weight: 900;
}
</style>
