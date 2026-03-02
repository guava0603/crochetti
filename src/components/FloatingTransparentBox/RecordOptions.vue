<template>
  <div>
    <div :class="['top-overlay-box', { 'is-idle': !isRecording }]">
      <div v-if="isRecording && selectedComponentName && selectedComponentEndAt" class="selected-component-info-bar">
        <div class="selected-component-name">
          {{ selectedComponentName }}
        </div>
        <div class="selected-component-info">
          {{ t('record.selectedPosition', { row: selectedComponentEndAt.row_index, stitch: selectedComponentEndAt.crochet_count }) }}
        </div>
      </div>
      <div class="top-overlay-content">
        <RecordPauseButton
          v-if="isRecording"
          class="record-toggle-btn"
          :aria-label="t('record.pauseRecording')"
          :title="t('record.pause')"
          @click="pauseRecording"
        />
        <PlayButton v-else class="record-toggle-btn record-toggle-btn--play" @click="startRecording" />
        <div class="overlay-row">
          <div v-if="isRecording" class="time-display">
            <div class="time-part" v-for="(part, idx) in formattedConsumingTimeParts.parts" :key="idx">
              <span class="time-value">{{ part.value }}</span>
              <span class="time-label">{{ part.label }}</span>
            </div>
          </div>
          <div class="status-select-section">
            <div class="status-display">
              <div class="status-label-row">
                <span style="color: gray;">{{ t('record.currently') }}</span>
                <span class="short-text">
                  {{ currentStatus }}
                  <template v-if="currentStatusNoteDisplay">
                    ({{ currentStatusNoteDisplay }})
                  </template>
                </span>
              </div>
              <button
                class="edit-status-btn"
                @click="openStatusModal"
                :title="t('record.editStatus')"
                :aria-label="t('record.editStatus')"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-8.5 8.5a2 2 0 0 1-.878.515l-3 1a1 1 0 0 1-1.263-1.263l1-3a2 2 0 0 1 .515-.878l8.5-8.5ZM15 5l-1-1" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
            <!-- The select for editing status will be shown in a modal, triggered by parent -->
          </div>
        </div>
      </div>
      <div class="btn-finish" @click="finishComponent">
        <ButtonFinishIcon />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PlayButton from '@/components/buttons/PlayButton.vue'
import RecordPauseButton from '@/components/buttons/RecordPauseButton.vue'
import ButtonFinishIcon from '@/components/buttons/svg/ButtonFinish.vue'
const { t } = useI18n({ useScope: 'global' })
const props = defineProps({
  context: {
    type: Object,
    required: true
  },
  actions: {
    type: Object,
    required: true
  }
})

const isRecording = computed(() => Boolean(props.context?.recording?.isRecording))

const timeSlot = computed(() => {
  const slot = props.context?.recording?.timeSlot ?? props.context?.recording?.currentTimeSlot
  return slot || null
})

// Selected component info (preferred). Fallback to legacy `centered` for compatibility.
const selectedComponentName = computed(() => String(props.context?.selected?.name || props.context?.centered?.name || ''))
const selectedComponentEndAt = computed(() => props.context?.selected?.endAt || props.context?.centered?.endAt || null)

const statusId = computed(() => Number(props.context?.status?.id))
const statusNote = computed(() => String(props.context?.status?.note || '').trim())

const originalStatuses = computed(() => {
  const list = props.context?.status?.originalStatuses ?? props.context?.status?.original
  return Array.isArray(list) ? list : []
})

const selfDefinedStatuses = computed(() => {
  const list = props.context?.status?.selfDefinedStatuses ?? props.context?.status?.selfDefined
  return Array.isArray(list) ? list : []
})

const startRecording = () => props.actions?.startRecording?.()
const pauseRecording = () => props.actions?.pauseRecording?.()
const openStatusModal = () => props.actions?.openStatusModal?.()
const finishComponent = () => props.actions?.finishComponent?.()

// Returns { parts: [{value, label}], type: 'second'|'minute-second'|'hour-minute'|'day-hour', raw: ms }
const formatDurationParts = (ms) => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return { parts: [{ value: seconds, label: t('common.timeUnitSecond') }], type: 'second', raw: ms }
  }
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return { parts: [
      { value: m, label: t('common.timeUnitMinute') },
      { value: s, label: t('common.timeUnitSecond') }
    ], type: 'minute-second', raw: ms }
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return { parts: [
      { value: h, label: t('common.timeUnitHour') },
      { value: m, label: t('common.timeUnitMinute') }
    ], type: 'hour-minute', raw: ms }
  }
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return { parts: [
    { value: d, label: t('common.timeUnitDay') },
    { value: h, label: t('common.timeUnitHour') }
  ], type: 'day-hour', raw: ms }
}

// Timer for reactive updates
const now = ref(Date.now())
let timer = null

watch(() => isRecording.value, (val) => {
  if (val) {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  } else if (timer) {
    clearInterval(timer)
    timer = null
  }
}, { immediate: true })

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const formattedConsumingTimeParts = computed(() => {
  if (!timeSlot.value || !timeSlot.value.start) {
    return { parts: [{ value: 0, label: t('common.timeUnitSecond') }], type: 'second', raw: 0 }
  }
  const { start, end } = timeSlot.value
  const endTime = end ? new Date(end) : new Date(now.value)
  const duration = Math.max(0, Math.floor(endTime - new Date(start)))
  return formatDurationParts(duration)
})

const currentStatus = computed(() => {
  const id = statusId.value

  const original = (originalStatuses.value || []).find(s => Number(s?.id) === id)
  if (original) {
    return original?.nameKey ? t(original.nameKey) : (original?.name ?? '')
  }

  const custom = (selfDefinedStatuses.value || []).find(s => Number(s?.id) === id)
  if (custom) {
    return custom?.name ?? ''
  }

  // fallback to the first original status (id:0) if present
  const idle = (originalStatuses.value || []).find(s => Number(s?.id) === 0)
  if (idle) return idle?.nameKey ? t(idle.nameKey) : (idle?.name ?? '')

  return ''
})

const currentStatusNoteDisplay = computed(() => {
  return statusNote.value
})
</script>

<style scoped>
/* Overlay box for recording */
.top-overlay-box {
  position: fixed;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: 85vw;
  height: 15vh;
  min-height: 120px;
  max-width: 1200px;
  background: rgba(255,255,255,0.85);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 2rem;
}

/* While paused/not recording: keep it half width and aligned right */
.top-overlay-box.is-idle {
  left: 2.5rem;
  right: auto;
  transform: none;
  width: 50vw;
  max-width: 50vw;
}

.record-toggle-btn {
  position: absolute;
  width: 48px;
  height: 48px;
  top: -0.8rem;
  left: -0.8rem;
  z-index: 110;
  transition: background 0.2s, transform 0.05s;
}

.record-toggle-btn:hover {
  background: rgba(255,255,255,1);
  transform: translateY(-1px);
}

.record-toggle-btn:active {
  transform: translateY(0px);
}

.record-toggle-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.25);
}

/* Make play button 2x bigger */
.record-toggle-btn--play {
  width: 48px;
  height: 48px;
  top: -0.8rem;
  left: -0.8rem;
}
.top-overlay-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.overlay-row {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}
.overlay-row > * {
  flex: 1;
}
.overlay-play {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 10;
}
.overlay-row .time-display {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: #42b983;
  font-family: 'Courier New', monospace;
}
.overlay-row .status-select-section {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}
.status-display {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}
.edit-status-btn {
  position: absolute;
  bottom: -1rem;
  right: 0;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.edit-status-btn:hover {
  background: rgba(229, 231, 235, 0.95);
  box-shadow: 0 2px 6px rgba(0,0,0,0.10);
}

.edit-status-btn:active {
  transform: translateY(1px);
}

.edit-status-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.25);
}

.status-label-row {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.overlay-row .status-select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 0;
}
.overlay-row .status-select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.1);
}
.centered-component-info-bar,
.selected-component-info-bar {
  position: absolute;
  top: -1.5rem;
  right: 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: row;
}
.centered-component-info-bar > *,
.selected-component-info-bar > * {
  margin-left: 0.8rem;
  padding: 0.3rem 0.5rem;
  color: #9CAB84;
  background-color: #F6F0D7;
  border-radius: 1rem;
  border: 1px solid #C5D89D;
}
.centered-component-name,
.selected-component-name {
  font-weight:600;
}
.centered-component-info,
.selected-component-info {
  font-weight:600;
}

.short-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  max-width: 100%;
  white-space: normal;
  text-overflow: ellipsis;
}

.btn-finish {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 3rem;
  top: 0.5rem;
  z-index: 130;
  border-radius: 50%;
  padding: 0.3rem;
  background-color: #f0f0f0;
}
</style>
