<template>
  <div>
    <div :class="['top-overlay-box', { 'is-idle': !isRecording }]">
      <div v-if="isRecording && centeredComponentName && centeredComponentEndAt" class="centered-component-info-bar">
        <div class="centered-component-name">
          {{ centeredComponentName }}
        </div>
        <div class="centered-component-info">
          第{{ centeredComponentEndAt.row_index }}行，第{{ centeredComponentEndAt.crochet_count }}針
        </div>
      </div>
      <div class="top-overlay-content">
        <RecordPauseButton
          v-if="isRecording"
          class="record-toggle-btn"
          :aria-label="'Pause recording'"
          :title="'Pause'"
          @click="pauseRecording"
        />
        <RecordPlayButton
          v-else
          class="record-toggle-btn record-toggle-btn--play"
          :aria-label="'Start recording'"
          :title="'Start'"
          :iconSize="56"
          @click="startRecording"
        />
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
                <span style="color: gray;">正在</span>
                <span class="short-text">
                  {{ currentStatus }}
                  <template v-if="currentStatusNoteDisplay">
                    ({{ currentStatusNoteDisplay }})
                  </template>
                </span>
              </div>
              <button class="edit-status-btn" @click="openModal" title="Edit Statuses">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-8.5 8.5a2 2 0 0 1-.878.515l-3 1a1 1 0 0 1-1.263-1.263l1-3a2 2 0 0 1 .515-.878l8.5-8.5ZM15 5l-1-1" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
            <!-- The select for editing status will be shown in a modal, triggered by parent -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import RecordPlayButton from '@/components/buttons/RecordPlayButton.vue'
import RecordPauseButton from '@/components/buttons/RecordPauseButton.vue'
const { t } = useI18n({ useScope: 'global' })
const props = defineProps({
  isRecording: {
    type: Boolean,
    required: true
  },
  currentTimeSlot: {
    type: Object,
    default: () => ({ start: null, end: null })
  },
  currentStatusId: [Number, String],
  currentStatusNote: {
    type: String,
    default: ''
  },
  originalStatuses: Array,
  selfDefinedStatuses: Array,
  startRecording: Function,
  pauseRecording: Function,
  openModal: Function,
  centeredComponentName: {
    type: String,
    default: ''
  },
  centeredComponentEndAt: {
    type: Object,
    default: null
  }
})

// Returns { parts: [{value, label}], type: 'second'|'minute-second'|'hour-minute'|'day-hour', raw: ms }
const formatDurationParts = (ms) => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return { parts: [{ value: seconds, label: '秒' }], type: 'second', raw: ms }
  }
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return { parts: [
      { value: m, label: '分' },
      { value: s, label: '秒' }
    ], type: 'minute-second', raw: ms }
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return { parts: [
      { value: h, label: '時' },
      { value: m, label: '分' }
    ], type: 'hour-minute', raw: ms }
  }
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return { parts: [
    { value: d, label: '天' },
    { value: h, label: '時' }
  ], type: 'day-hour', raw: ms }
}

// Timer for reactive updates
const now = ref(Date.now())
let timer = null

watch(() => props.isRecording, (val) => {
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
  if (!props.currentTimeSlot || !props.currentTimeSlot.start) {
    return { parts: [{ value: 0, label: '秒' }], type: 'second', raw: 0 }
  }
  const { start, end } = props.currentTimeSlot
  const endTime = end ? new Date(end) : new Date(now.value)
  const duration = Math.max(0, Math.floor(endTime - new Date(start)))
  return formatDurationParts(duration)
})

const currentStatus = computed(() => {
  const statusId = Number(props.currentStatusId)

  const original = (props.originalStatuses || []).find(s => Number(s?.id) === statusId)
  if (original) {
    return original?.nameKey ? t(original.nameKey) : (original?.name ?? '')
  }

  const custom = (props.selfDefinedStatuses || []).find(s => Number(s?.id) === statusId)
  if (custom) {
    return custom?.name ?? ''
  }

  // fallback to the first original status (id:0) if present
  const idle = (props.originalStatuses || []).find(s => Number(s?.id) === 0)
  if (idle) return idle?.nameKey ? t(idle.nameKey) : (idle?.name ?? '')

  return ''
})

const currentStatusNoteDisplay = computed(() => {
  return String(props.currentStatusNote || '').trim()
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
  border-radius: 50%;
  background: rgba(255,255,255,0.95);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
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
.time-part {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
}
.time-display {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.2em;
}
.time-value {
  font-size: 2.2rem;
  font-weight: 800;
}
.time-label {
  font-size: 0.5em;
  font-weight: 600;
  vertical-align: super;
  margin-left: 0.1em;
  opacity: 0.7;
}

.centered-component-info-bar {
  position: absolute;
  top: -1.5rem;
  right: 1.5rem;
  text-align:center;

  display: flex;
  flex-direction: row;
}
.centered-component-info-bar > * {
  margin-left: 0.8rem;
  padding: 0.3rem 0.5rem;
  color: #9CAB84;
  background-color: #F6F0D7;
  border-radius: 1rem;
  border: 1px solid #C5D89D;
}
.centered-component-name {
  font-weight:600;
}
.centered-component-info {
  font-weight:600;
}

.short-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: 100%;
  white-space: normal;
  text-overflow: ellipsis;
}
</style>
