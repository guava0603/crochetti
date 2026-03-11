<template>
  <div
    class="record-card"
    role="button"
    tabindex="0"
    :data-completed="record?.is_completed ? '1' : '0'"
    @click="emit('open', record)"
    @keydown.enter.prevent="emit('open', record)"
  >
    <div class="record-card__mark" aria-hidden="true">
      <ProgressRing
        v-if="!record?.is_completed"
        class="record-card__mark-ring"
        :value="markPercent"
        :size="44"
        :stroke="6"
      />

      <img
        v-else
        class="record-card__mark-icon"
        :src="completeIconUrl"
        style="transform: scale(2);"
        alt=""
        loading="lazy"
        decoding="async"
      />
    </div>

    <div class="record-card__inner">
      <div class="record-card__media">
        <img
          v-if="coverImageUrl"
          class="record-card__image"
          :src="coverImageUrl"
          :alt="title"
          loading="lazy"
          decoding="async"
        />

        <DefaultImage v-else :src="defaultMediaUrl" />
      </div>

      <div class="record-card__bottom">
        <div class="record-card__title">{{ title }}</div>
        <div v-if="timeText" class="record-card__time">{{ timeText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTimeCompact } from '@/utils/dateTime'
import { getRecordProgressPercent } from '@/utils/recordProgressGenerate'
import { toMs } from '@/utils/toMs'
import ProgressRing from '@/components/ui/ProgressRing.vue'
import DefaultImage from '@/components/Image/DefaultImage.vue'

const props = defineProps({
  record: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open'])

const record = computed(() => props.record)

const title = computed(() => record.value?.project_name || record.value?.projectName || 'Record')

const completeIconUrl = '/assets/image/settings/noun-success-8303342-FFFFFF.svg'
const defaultMediaUrl = '/assets/image/achievement/noun-crochet-5351977-FFFFFF.svg'

const percentage = computed(() => {
  const raw = record.value?.percentage
  const n = (typeof raw === 'number')
    ? raw
    : (typeof raw === 'string' && raw.trim() !== '')
        ? Number(raw)
        : NaN

  if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)))

  if (record.value?.is_completed) return 100
  if (Array.isArray(record.value?.component_list) && record.value.component_list.length) {
    return getRecordProgressPercent(record.value)
  }

  return null
})

const markPercent = computed(() => {
  // For incomplete cards, always show a ring.
  if (record.value?.is_completed) return 100
  return percentage.value == null ? 0 : percentage.value
})

const coverImageUrl = computed(() => {
  return record.value?.coverImageUrl
})

const recordTimeMs = computed(() => {
  const r = record.value
  if (!r || typeof r !== 'object') return null

  const directUpdated = toMs(r.updated_at) ?? toMs(r.updatedAt)
  if (directUpdated != null) return directUpdated

  const updatedMs = toMs(r.updated_at_ms) ?? toMs(r.updatedAtMs)
  if (updatedMs != null) return updatedMs

  const latestStart = toMs(r.latest_start_ms)
  if (latestStart != null) return latestStart

  const slots = Array.isArray(r.time_slots) ? r.time_slots : []
  if (slots.length) {
    const latest = Math.max(
      ...slots
        .map((s) => toMs(s?.start))
        .filter((n) => typeof n === 'number' && Number.isFinite(n))
    )
    if (Number.isFinite(latest) && latest > 0) return latest
  }

  return toMs(r.created_at) ?? toMs(r.createdAt)
})

const timeText = computed(() => {
  const ms = recordTimeMs.value
  if (ms == null) return ''
  return formatDateTimeCompact(ms)
})
</script>

<style scoped>
.record-card {
  --rc-bg: var(--color-white);
  --rc-text: #5a524b;
  --rc-sub: #9c948a;
  --rc-accent-pink: rgba(232, 168, 156, 0.45);
  --rc-border: rgba(90, 82, 75, 0.75);
  --rc-mark-green: var(--color-completed-green);

  --rc-mark-size: 44px;
  --rc-mark-top: clamp(0.3rem, 1.2vw, 0.4rem);
  --rc-mark-pad: clamp(0.3rem, 1.2vw, 0.4rem);

  position: relative;
  width: 100%;
  text-align: left;
  padding-top: calc(var(--rc-mark-size) * 0.56);
  padding-bottom: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.record-card[data-completed='1'] {
  padding-top: 0;
  padding-bottom: calc(var(--rc-mark-size) * 0.56);
}

.record-card:active {
  transform: scale(0.97) rotate(-0.6deg);
}

.record-card:focus-visible {
  outline: 0.125rem solid rgb(var(--color-icon-add-rgb) / 0.55);
  outline-offset: 0.125rem;
  border-radius: 1.125rem;
}

.record-card__mark {
  position: absolute;
  top: var(--rc-mark-top);
  left: 50%;
  transform: translateX(-50%);
  border-radius: 999px;
  border: 2px solid white;
  background: var(--rc-bg);
  z-index: 2;
  display: grid;
  place-items: center;
}

.record-card[data-completed='1'] .record-card__mark {
  top: auto;
  width: var(--rc-mark-size);
  height: var(--rc-mark-size);
  bottom: var(--rc-mark-top);
}

.record-card[data-completed='1'] .record-card__mark {
  background: var(--rc-mark-green);
  padding: var(--rc-mark-pad);
}

.record-card__mark-ring {
  display: block;
}

.record-card__mark-icon {
  width: 100%;
  height: 100%;
  display: block;
}

.record-card__inner {
  position: relative;
  z-index: 1;
  background: var(--rc-bg);
  border: 0.125rem solid var(--rc-border);
  border-radius: 0.9375rem 1.5625rem 1.25rem 1.875rem / 1.5625rem 0.9375rem 1.875rem 1.25rem;
  box-shadow: 0.25rem 0.375rem 1rem rgba(149, 133, 119, 0.12);
  padding: 0.75rem 0.85rem;
  display: grid;
  grid-template-rows: auto auto;
  gap: 0.6rem;
}

.record-card__media {
  height: clamp(6.5rem, 22vw, 7.25rem);
  width: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: rgba(226, 232, 206, 0.25);
  border: 0.0625rem solid rgba(90, 82, 75, 0.18);
}

.record-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.record-card__bottom {
  min-height: 1.75rem;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  row-gap: 0.15rem;
  align-content: end;
}

.record-card__title {
  font-weight: 900;
  color: var(--rc-text);
  margin: 0;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-card__time {
  justify-self: end;
  font-size: 0.72rem;
  line-height: 1;
  font-weight: 800;
  color: var(--rc-sub);
  opacity: 0.9;
  white-space: nowrap;
}



@media (prefers-reduced-motion: reduce) {
  .record-card {
    transition: none;
  }

  .record-card:active {
    transform: none;
  }
}
</style>
