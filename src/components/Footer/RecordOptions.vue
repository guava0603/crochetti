<template>
  <div
    v-if="shouldRender"
    class="bottom-footer-dock"
    role="contentinfo"
    :aria-label="t('record.record')"
  >
    <div class="bottom-footer-dock__inner">
      <div class="bottom-footer-dock__side bottom-footer-dock__side--left">
        <button
          type="button"
          class="bottom-footer-dock__icon-btn"
          :aria-label="t('common.home')"
          :title="t('common.home')"
          @click="goHome"
        >
          <img class="bottom-footer-dock__icon" :src="homeIconUrl" alt="" aria-hidden="true" draggable="false" />
        </button>
      </div>

      <div class="bottom-footer-dock__center">
        <RecordOptions
          :context="context"
          :actions="actions"
          docked
          overlay-clickable
          @overlay-click="openLatestRecord"
        />
      </div>

      <div class="bottom-footer-dock__side bottom-footer-dock__side--right">
        <button
          type="button"
          class="bottom-footer-dock__icon-btn"
          :aria-label="t('wishPool.openFabAria')"
          :title="t('wishPool.title')"
          @click="openWishPool"
        >
          <img class="bottom-footer-dock__icon" :src="wishIconUrl" alt="" aria-hidden="true" draggable="false" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { auth } from '@/firebaseConfig'

import RecordOptions from '@/components/FloatingTransparentBox/RecordOptions.vue'

import { useLatestRecordStore } from '@/stores/latestRecordStore'
import { mergeUserRecord } from '@/services/firestore/records'
import { openToast } from '@/services/ui/toast'
import { originalStatuses } from '@/constants/status'

defineOptions({ name: 'FooterRecordOptions' })

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const latestRecordStore = useLatestRecordStore()

const record = computed(() => {
  const r = latestRecordStore.latestRecordData
  return r && typeof r === 'object' ? r : null
})

const recordId = computed(() => String(record.value?.id || '').trim() || null)

const shouldRender = computed(() => Boolean(recordId.value))

const homeIconUrl = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/settings/101__home.svg`
})

const wishIconUrl = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/settings/048__chat.svg`
})

function goHome() {
  router.push({ name: 'home' })
}

function openWishPool() {
  router.push({ name: 'wish-pool' })
}

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
    status: {
      id: Number(lastSlot?.status_id ?? 0),
      note: String(lastSlot?.status_note || ''),
      originalStatuses,
      selfDefinedStatuses: Array.isArray(r?.self_defined_status) ? r.self_defined_status : []
    },
    selected: {
      name: String(selected?.name || r?.project_name || r?.projectName || ''),
      endAt: selected?.end_at ?? null,
      isCompleted: Boolean(selected?.is_completed)
    }
  }
})

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
    latestRecordStore.setLatestRecordData({ ...r, time_slots: slots })
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

  toggling.value = true
  try {
    slots.push({
      start: new Date().toISOString(),
      end: null,
      status_id: Number(last?.status_id ?? 0),
      status_note: String(last?.status_note || ''),
      end_at_list: list.map((comp) => (comp?.end_at ? { ...comp.end_at } : null))
    })
    await mergeUserRecord(String(uid), String(id), { time_slots: slots })
    latestRecordStore.setLatestRecordData({ ...r, time_slots: slots })
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
.bottom-footer-dock {
  height: var(--app-footer-height);
  background: var(--color-background-soft);
  padding: 0 1.25rem;
  pointer-events: none;
}

.bottom-footer-dock__inner {
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.bottom-footer-dock__side {
  flex: 0 0 var(--bottom-footer-dock-side-width);
  width: var(--bottom-footer-dock-side-width);
  display: flex;
  align-items: flex-end;
  gap: 12px;
  pointer-events: none;
  min-width: 0;
}

.bottom-footer-dock__icon-btn {
  pointer-events: auto;
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.bottom-footer-dock__icon-btn:active {
  transform: translateY(1px);
}

.bottom-footer-dock__icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
  transform: scale(2.5);
}

.bottom-footer-dock__side--left {
  justify-content: flex-start;
}

.bottom-footer-dock__side--right {
  justify-content: flex-end;
}

.bottom-footer-dock__center {
  flex: 1 1 auto;
  width: auto;
  height: 56px;
  border-radius: 999px 999px 0 0;
  background: var(--color-background-soft);
  border: 1px solid rgba(17, 24, 39, 0.10);
  border-bottom: 0;
  box-shadow: 0 -10px 22px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: visible;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0.75rem;
  pointer-events: auto;
  min-width: 0;
  align-self: flex-end;
}
</style>
