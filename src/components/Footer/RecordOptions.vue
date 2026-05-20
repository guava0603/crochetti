<template>
  <div
    v-if="shouldRender"
    class="footer-record-option"
    role="contentinfo"
    :aria-label="t('record.record')"
  >
    <div>
      <div
        :class="[
          'top-overlay-box',
          {
            'is-idle': !isRecording,
            'is-docked': true,
            'is-recording': isRecording,
            'is-compact': compact
          }
        ]"
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
            @click.stop="handleToggleAndMaybeNavigate"
          />
          <PlayButton
            v-else
            class="record-toggle-btn record-toggle-btn--play"
            @click.stop="handleToggleAndMaybeNavigate"
          />

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
                  {{
                    t('record.selectedPosition', {
                      row: selectedComponentEndAt.row_index,
                      stitch: selectedComponentEndAt.crochet_count
                    })
                  }}
                </template>
                <template v-else>
                  {{ t('record.notStartedYet') }}
                </template>
              </div>
            </div>

            <div class="status-select-section">
              <div class="status-display">
                <div class="status-label-row">
                  <span class="status-currently">{{ t('record.currently') }}</span>
                  <div class="status-value-row">
                    <span
                      class="status-text-wrap"
                      :title="currentStatusNoteDisplay ? `${currentStatus}(${currentStatusNoteDisplay})` : currentStatus"
                    >
                      <span class="status-text">{{ currentStatus }}</span>
                      <template v-if="currentStatusNoteDisplay">
                        <span class="status-note-wrap">
                          &nbsp;-&nbsp; <span class="status-note">{{ currentStatusNoteDisplay }}</span>
                        </span>
                      </template>
                    </span>

                    <button
                      type="button"
                      class="edit-status-btn"
                      @click.stop="openStatusModal"
                      :title="t('record.editStatus')"
                      :aria-label="t('record.editStatus')"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-8.5 8.5a2 2 0 0 1-.878.515l-3 1a1 1 0 0 1-1.263-1.263l1-3a2 2 0 0 1 .515-.878l8.5-8.5ZM15 5l-1-1"
                          stroke="#888"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { auth } from '@/firebaseConfig'

import PlayButton from '@/components/buttons/PlayButton.vue'
import RecordPauseButton from '@/components/buttons/RecordPauseButton.vue'

import { useLatestRecordStore } from '@/stores/latestRecordStore'
import { mergeUserRecord } from '@/services/firestore/records'
import { openToast } from '@/services/ui/toast'
import { originalStatuses } from '@/constants/status'
import { getRecordPreferredStatus } from '@/utils/recordStatus'

defineOptions({ name: 'FooterRecordOptions' })

const router = useRouter()
const route = useRoute()
const { t } = useI18n({ useScope: 'global' })

const isRecordPage = computed(() => route.name === 'record')

const latestRecordStore = useLatestRecordStore()

const record = computed(() => {
  const r = latestRecordStore.latestRecordData
  return r && typeof r === 'object' ? r : null
})

const recordId = computed(() => String(record.value?.id || '').trim() || null)

const shouldRender = computed(() => Boolean(recordId.value))

function openLatestRecord() {
  const id = recordId.value
  if (!id) return
  router.push({ name: 'record', params: { record_id: id } })
}

function openLatestRecordWithQuery(query) {
  const id = recordId.value
  if (!id) return
  router.push({ name: 'record', params: { record_id: id }, query })
}

const context = computed(() => {
  const r = record.value
  if (!r) return null

  const slots = Array.isArray(r?.time_slots) ? r.time_slots : []
  const lastSlot = slots.length ? slots[slots.length - 1] : null
  const isRecording = Boolean(lastSlot && lastSlot.end === null)

  const list = Array.isArray(r?.component_list) ? r.component_list : []
  const idx = Number(r?.last_selected_component_index ?? 0)
  const safeIdx = Number.isFinite(idx) ? Math.max(0, Math.min(list.length - 1, idx)) : 0
  const selected = list[safeIdx] || null

  return {
    project: {
      name: String(r?.project_name || r?.projectName || '')
    },
    recording: {
      isRecording,
      timeSlot: lastSlot
    },
    status: (() => {
      const preferred = getRecordPreferredStatus(r)
      return {
        id: preferred.statusId,
        note: preferred.statusNote,
        originalStatuses,
        selfDefinedStatuses: Array.isArray(r?.self_defined_status) ? r.self_defined_status : []
      }
    })(),
    selected: {
      name: String(selected?.name || r?.project_name || r?.projectName || ''),
      endAt: selected?.end_at ?? null,
      isCompleted: Boolean(selected?.is_completed)
    }
  }
})

const overlayClickable = computed(() => !isRecordPage.value)
const compact = computed(() => !isRecordPage.value)

const isRecording = computed(() => Boolean(context.value?.recording?.isRecording))

const timeSlot = computed(() => {
  const slot = context.value?.recording?.timeSlot ?? context.value?.recording?.currentTimeSlot
  return slot || null
})

const projectName = computed(() => {
  const name = context.value?.project?.name ?? context.value?.project_name ?? context.value?.projectName
  return String(name || '').trim()
})

const selectedComponentName = computed(() => String(context.value?.selected?.name || context.value?.centered?.name || ''))
const selectedComponentEndAt = computed(() => context.value?.selected?.endAt || context.value?.centered?.endAt || null)
const selectedComponentIsCompleted = computed(() => Boolean(context.value?.selected?.isCompleted))

const statusId = computed(() => Number(context.value?.status?.id))
const statusNote = computed(() => String(context.value?.status?.note || '').trim())

const originalStatusesList = computed(() => {
  const list = context.value?.status?.originalStatuses ?? context.value?.status?.original
  return Array.isArray(list) ? list : []
})

const selfDefinedStatuses = computed(() => {
  const list = context.value?.status?.selfDefinedStatuses ?? context.value?.status?.selfDefined
  return Array.isArray(list) ? list : []
})

const openStatusModal = () => actions.openStatusModal?.()

const handleOverlayClick = () => {
  if (!overlayClickable.value) return
  openLatestRecord()
}

const handleOverlayKeydown = (e) => {
  if (!overlayClickable.value) return
  if (e?.target !== e?.currentTarget) return
  openLatestRecord()
}

const handleToggleAndMaybeNavigate = async () => {
  if (isRecording.value) actions.pauseRecording?.()
  else actions.startRecording?.()

  if (compact.value && overlayClickable.value) {
    openLatestRecord()
  }
}

const formatDurationParts = (ms) => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return { parts: [{ value: seconds, label: t('common.timeUnitSecond') }], type: 'second', raw: ms }
  }
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return {
      parts: [
        { value: m, label: t('common.timeUnitMinute') },
        { value: s, label: t('common.timeUnitSecond') }
      ],
      type: 'minute-second',
      raw: ms
    }
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return {
      parts: [
        { value: h, label: t('common.timeUnitHour') },
        { value: m, label: t('common.timeUnitMinute') }
      ],
      type: 'hour-minute',
      raw: ms
    }
  }
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return {
    parts: [
      { value: d, label: t('common.timeUnitDay') },
      { value: h, label: t('common.timeUnitHour') }
    ],
    type: 'day-hour',
    raw: ms
  }
}

const now = ref(Date.now())
let timer = null

watch(
  () => isRecording.value,
  (val) => {
    if (val) {
      timer = setInterval(() => {
        now.value = Date.now()
      }, 1000)
    } else if (timer) {
      clearInterval(timer)
      timer = null
    }
  },
  { immediate: true }
)

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

  const original = (originalStatusesList.value || []).find((s) => Number(s?.id) === id)
  if (original) {
    return original?.nameKey ? t(original.nameKey) : (original?.name ?? '')
  }

  const custom = (selfDefinedStatuses.value || []).find((s) => Number(s?.id) === id)
  if (custom) {
    return custom?.name ?? ''
  }

  const idle = (originalStatusesList.value || []).find((s) => Number(s?.id) === 0)
  if (idle) return idle?.nameKey ? t(idle.nameKey) : (idle?.name ?? '')

  return ''
})

const currentStatusNoteDisplay = computed(() => statusNote.value)

const toggling = ref(false)

function toggleErrorToast(message) {
  openToast({ message: String(message || '').trim() || t('common.saveFailed') })
}

const pauseLatestRecord = async () => {
  const uid = auth.currentUser?.uid
  const id = recordId.value
  const r = record.value
  if (!uid || !id || !r || toggling.value) return

  const slots = Array.isArray(r?.time_slots) ? [...r.time_slots] : []
  if (!slots.length) return

  const last = slots[slots.length - 1]
  if (!last || last.end != null) return

  toggling.value = true
  try {
    slots[slots.length - 1] = { ...last, end: new Date().toISOString() }
    await mergeUserRecord(String(uid), String(id), { time_slots: slots })

    // Keep the dock record in sync without replacing the object reference.
    r.time_slots = slots
  } catch (e) {
    console.error('FooterRecordOptions: pauseLatestRecord failed', e)
    toggleErrorToast(t('common.saveFailed'))
  } finally {
    toggling.value = false
  }
}

const startLatestRecord = async () => {
  const uid = auth.currentUser?.uid
  const id = recordId.value
  const r = record.value
  if (!uid || !id || !r || toggling.value) return

  const slots = Array.isArray(r?.time_slots) ? [...r.time_slots] : []
  const last = slots.length ? slots[slots.length - 1] : null
  if (last && last.end == null) return

  const list = Array.isArray(r?.component_list) ? r.component_list : []

  const preferredStatus = getRecordPreferredStatus(r)

  toggling.value = true
  try {
    slots.push({
      start: new Date().toISOString(),
      end: null,
      status_id: preferredStatus.statusId,
      status_note: preferredStatus.statusNote,
      end_at_list: list.map((comp) => (comp?.end_at ? { ...comp.end_at } : null))
    })
    await mergeUserRecord(String(uid), String(id), { time_slots: slots })

    // Keep the dock record in sync without replacing the object reference.
    r.time_slots = slots
  } catch (e) {
    console.error('FooterRecordOptions: startLatestRecord failed', e)
    toggleErrorToast(t('common.saveFailed'))
  } finally {
    toggling.value = false
  }
}

const actions = {
  startRecording: () => startLatestRecord(),
  pauseRecording: () => pauseLatestRecord(),
  openStatusModal: () => openLatestRecordWithQuery({ 'update-status': '1' }),
  finishComponent: () => openLatestRecord()
}
</script>

<style scoped>
.footer-record-option {
  width: 100%;
  pointer-events: auto;

  /* Tell RecordOptions how much horizontal space is occupied by side buttons
    so the pill can leave room for FooterBar left/right buttons. */
  --record-options-side-inset: var(--bottom-footer-dock-side-width);
}

/* Overlay box for recording */
.top-overlay-box {
  position: fixed;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100vw - 10rem);
  height: 13vh;
  min-height: calc(var(--bottom-footer-padding-bottom) + var(--app-banner-height) + 1rem);
  max-width: 1200px;
  z-index: var(--z-float);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem calc(1.25rem + var(--bottom-footer-padding-bottom));
}

/* Recording mode: make it taller and stack time above status. */
.top-overlay-box.is-recording {
  height: 25vh;
}

.top-overlay-box.is-recording .overlay-row {
  flex-direction: column;
  align-items: stretch;
  gap: 1.2rem;
}

.top-overlay-box.is-recording .overlay-row > * {
  flex: none;
}

/* Docked mode: render as a normal element inside the dock. */
.top-overlay-box.is-docked {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  transform: none;

  width: 100%;
  height: 100%;
  max-width: none;
  border-radius: 40% 40% 0 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* While paused/not recording: keep it half width and aligned right (non-docked only). */
.top-overlay-box.is-idle {
  left: 36px;
  right: auto;
  transform: none;
  bottom: var(--bottom-floating-button);
}

/* In docked mode, idle should not override positioning. */
.top-overlay-box.is-docked.is-idle {
  left: auto;
  right: auto;
  bottom: auto;
  align-items: flex-end;
}

.record-toggle-btn {
  position: absolute;
  width: 3rem;
  height: 3rem;
  top: -1.5rem;
  left: calc(50% - 1.5rem);
  z-index: 110;
  transition: background 0.2s, transform 0.05s;
  box-shadow: 0px 2px 2px #5a524b;
}

.record-toggle-btn:hover {
  background: rgba(255, 255, 255, 1);
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
  line-height: 1.2;
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

.project-name,
.selected-component-name {
  min-width: 0;
  max-width: 100%;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-warm-brown);
}

.selected-component-info {
  padding: 0.3rem 0.5rem;
  color: var(--color-warm-brown);
  background-color: var(--color-surface-sheet);
  border-radius: 1rem;
  border: 1px solid var(--color-warm-brown);
  font-weight: 600;
  text-align: center;
  font-size: 0.8rem;
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

.status-text-wrap {
  display: flex;
  align-items: baseline;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
}

.status-text {
  flex: 0 0 auto;
  white-space: nowrap;
}

.status-note-wrap {
  flex: 1 1 auto;
  min-width: 0;
  display: inline-flex;
  white-space: nowrap;
}

.status-note {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
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
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.status-currently {
  color: gray;
  white-space: nowrap;
  flex: 0 0 auto;
}
</style>
