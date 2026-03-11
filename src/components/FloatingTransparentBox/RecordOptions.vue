<template>
  <div>
    <div
      :class="['top-overlay-box', { 'is-idle': !isRecording, 'is-docked': docked, 'is-recording': isRecording }]"
      @click="handleOverlayClick"
      :role="overlayClickable ? 'button' : undefined"
      :tabindex="overlayClickable ? 0 : undefined"
      @keydown.enter.prevent="handleOverlayKeydown"
      @keydown.space.prevent="handleOverlayKeydown"
    >
      <div class="top-overlay-content">
        <RecordPauseButton
          v-if="isRecording"
          class="record-toggle-btn"
          :aria-label="t('record.pauseRecording')"
          :title="t('record.pause')"
          @click.stop="pauseRecording"
        />
        <PlayButton v-else class="record-toggle-btn record-toggle-btn--play" @click.stop="startRecording" />
        <div class="overlay-row">
          <div v-if="isRecording" class="time-display">
            <div class="time-part" v-for="(part, idx) in formattedConsumingTimeParts.parts" :key="idx">
              <span class="time-value">{{ part.value }}</span>
              <span class="time-label">{{ part.label }}</span>
            </div>
          </div>
          <div v-if="projectName || (isRecording && selectedComponentName)" class="component-meta">
            <div class="component-meta__name-row">
              <span v-if="projectName && isRecording && selectedComponentName" class="project-name text-clamp-1">
                {{ projectName }} - {{ selectedComponentName }}
              </span>
              <span v-else-if="projectName" class="project-name text-clamp-1">{{ projectName }}</span>
              <span v-else-if="isRecording && selectedComponentName" class="selected-component-name text-clamp-1">
                {{ selectedComponentName }}
              </span>
            </div>

            <div v-if="isRecording && selectedComponentName" class="selected-component-info text-clamp-1">
              <template v-if="selectedComponentIsCompleted">
                {{ t('record.completed') }}
              </template>
              <template v-else-if="selectedComponentEndAt">
                {{ t('record.selectedPosition', { row: selectedComponentEndAt.row_index, stitch: selectedComponentEndAt.crochet_count }) }}
              </template>
              <template v-else>
                {{ t('record.notStartedYet') }}
              </template>
            </div>
          </div>
          <div class="status-select-section">
            <div class="status-display">
              <div class="status-label-row">
                <span style="color: gray;">{{ t('record.currently') }}</span>
                <div class="status-value-row">
                  <span class="short-text text-clamp-2">
                    {{ currentStatus }}
                    <template v-if="currentStatusNoteDisplay">
                      ({{ currentStatusNoteDisplay }})
                    </template>
                  </span>
                  <button
                    type="button"
                    class="edit-status-btn"
                    @click.stop="openStatusModal"
                    :title="t('record.editStatus')"
                    :aria-label="t('record.editStatus')"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-8.5 8.5a2 2 0 0 1-.878.515l-3 1a1 1 0 0 1-1.263-1.263l1-3a2 2 0 0 1 .515-.878l8.5-8.5ZM15 5l-1-1" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
              </div>
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
import PlayButton from '@/components/buttons/PlayButton.vue'
import RecordPauseButton from '@/components/buttons/RecordPauseButton.vue'
const { t } = useI18n({ useScope: 'global' })
const props = defineProps({
  context: {
    type: Object,
    required: true
  },
  actions: {
    type: Object,
    required: true
  },
  docked: {
    type: Boolean,
    default: false
  },
  overlayClickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['overlay-click'])

const isRecording = computed(() => Boolean(props.context?.recording?.isRecording))

const timeSlot = computed(() => {
  const slot = props.context?.recording?.timeSlot ?? props.context?.recording?.currentTimeSlot
  return slot || null
})

const projectName = computed(() => {
  const name = props.context?.project?.name ?? props.context?.project_name ?? props.context?.projectName
  return String(name || '').trim()
})

// Selected component info (preferred). Fallback to legacy `centered` for compatibility.
const selectedComponentName = computed(() => String(props.context?.selected?.name || props.context?.centered?.name || ''))
const selectedComponentEndAt = computed(() => props.context?.selected?.endAt || props.context?.centered?.endAt || null)
const selectedComponentIsCompleted = computed(() => Boolean(props.context?.selected?.isCompleted))

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

const handleOverlayClick = () => {
  if (!props.overlayClickable) return
  emit('overlay-click')
}

const handleOverlayKeydown = (e) => {
  if (!props.overlayClickable) return
  // Only trigger when the overlay itself is focused.
  // This prevents keyboard interaction on child controls (like the edit button)
  // from bubbling up and navigating unexpectedly.
  if (e?.target !== e?.currentTarget) return
  emit('overlay-click')
}

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
  width: calc(100vw - 10rem);
  height: 13vh;
  min-height: 120px;
  max-width: 1200px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  z-index: var(--z-float);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.5rem;
}

/* Recording mode: make it taller and stack time above status. */
.top-overlay-box.is-recording {
  height: 25vh;
  min-height: 170px;
}

.top-overlay-box.is-recording .overlay-row {
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.top-overlay-box.is-recording .overlay-row > * {
  flex: none;
}


/* Docked mode: render as a normal element inside the bottom-left dock. */
.top-overlay-box.is-docked {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  transform: none;

  /* Keep the same size/shape in docked mode (idle or recording). */

  border-radius: 0;
  border-top-left-radius: 50%;
  border-top-right-radius: 50%;
  background: var(--color-background-soft);
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.10);
}

/* While paused/not recording: keep it half width and aligned right */
.top-overlay-box.is-idle {
  left: 36px;
  right: auto;
  transform: none;
  /* Place it above the Wish FAB (64px) with a small gap. */
  bottom: var(--bottom-floating-button);
}

/* In docked mode, idle should not override positioning. */
.top-overlay-box.is-docked.is-idle {
  left: auto;
  right: auto;
  bottom: auto;
  align-items: flex-end;
}

.top-overlay-box.is-docked.is-recording {
  border-top-left-radius: 45%;
  border-top-right-radius: 45%;
}

.record-toggle-btn {
  position: absolute;
  width: 3rem;
  height: 3rem;
  top: -1.5rem;
  left: calc(50% - 1.5rem);
  z-index: 110;
  transition: background 0.2s, transform 0.05s;
  box-shadow: 0px 2px 2px #5A524B;;
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
  box-shadow: 0 0 0 3px rgb(var(--color-icon-add-rgb) / 0.25);
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
  flex-direction: column;
  gap: 0.3rem;
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
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow: hidden;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-icon-add);
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}

.overlay-row .time-display .time-part {
  display: inline-flex;
  flex-direction: row;
  align-items: baseline;
  gap: 0.35rem;
  min-width: 0;
}

.overlay-row .time-display .time-value,
.overlay-row .time-display .time-label {
  white-space: nowrap;
}

.overlay-row .time-display .time-label {
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.9;
}

.component-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 0;
}

.component-meta__name-row {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: center;
  gap: 0.6rem;
  min-width: 0;
}

/* Non-tag style: plain text. */
.project-name,
.selected-component-name {
  min-width: 0;
  max-width: 100%;
  font-weight: 700;
  color: #6b7280;
}

/* Second row keeps the original tag style. */
.selected-component-info {
  padding: 0.3rem 0.5rem;
  color: #9CAB84;
  background-color: #F6F0D7;
  border-radius: 1rem;
  border: 1px solid #C5D89D;
  font-weight: 600;
  text-align: center;
}
.overlay-row .status-select-section {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}
.status-display {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.status-value-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.status-value-row .short-text {
  min-width: 0;
}
.edit-status-btn {
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0.25rem;
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
  box-shadow: 0 0 0 3px rgb(var(--color-icon-add-rgb) / 0.25);
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
  border-color: var(--color-icon-add);
  box-shadow: 0 0 0 2px rgb(var(--color-icon-add-rgb) / 0.1);
}

.short-text {
  max-width: 100%;
}

</style>
