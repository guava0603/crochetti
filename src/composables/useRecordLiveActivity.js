import { computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { auth } from '@/firebaseConfig'
import { DEFAULT_STATUS_ID, originalStatuses } from '@/constants/status'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
import { useUserRecordStatusCatalog } from '@/composables/useUserRecordStatusCatalog'
import { fetchUserRecord, mergeUserRecord } from '@/services/firestore/records'
import { isRecordLiveActivityPlatform, RecordLiveActivity } from '@/services/native/recordLiveActivity'
import { useLatestRecordStore } from '@/stores/latestRecordStore'
import { applyLiveActivityActionsToSlots } from '@/utils/recordLiveActivityActions'
import { getRecordPreferredStatus } from '@/utils/recordStatus'
import { resolveRecordStatusLabel } from '@/utils/recordStatusDisplay'

function toIso(value) {
  if (!value) return null
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

/**
 * Mirrors the dock record (`.top-overlay-box`) into an iOS Live Activity and applies
 * pause/start taps made on the Lock Screen / Dynamic Island back into Firestore time slots.
 * Call once from App.vue. No-op outside the iOS app.
 */
export function useRecordLiveActivity() {
  if (!isRecordLiveActivityPlatform()) return

  const { t } = useI18n({ useScope: 'global' })
  const latestRecordStore = useLatestRecordStore()
  const { currentUser, profile } = useCurrentUserProfile()
  const statusCatalog = useUserRecordStatusCatalog(profile, () => auth.currentUser?.uid)

  let supported = false
  let draining = false
  let lastSentKey = null
  let disposed = false
  let listenerHandle = null

  const payload = computed(() => {
    const r = latestRecordStore.latestRecordData
    const recordId = String(r?.id || '').trim()
    if (!r || !recordId || r.is_completed) return null

    const slots = Array.isArray(r.time_slots) ? r.time_slots : []
    const last = slots.length ? slots[slots.length - 1] : null
    const isPlaying = Boolean(last && last.end == null)

    const slotStart = isPlaying ? toIso(last.start) : null
    let elapsedSeconds = 0
    if (!isPlaying && last?.start && last?.end) {
      elapsedSeconds = Math.max(0, (new Date(toIso(last.end)) - new Date(toIso(last.start))) / 1000)
    }

    const list = Array.isArray(r.component_list) ? r.component_list : []
    const idx = Number(r.last_selected_component_index ?? 0)
    const safeIdx = Number.isFinite(idx) ? Math.max(0, Math.min(list.length - 1, idx)) : 0
    const selected = list[safeIdx] || null

    let positionText = ''
    if (selected?.is_completed) positionText = t('record.completed')
    else if (selected?.end_at?.row_index != null) positionText = t('record.liveActivityRow', { row: selected.end_at.row_index })
    else if (selected) positionText = t('record.notStartedYet')

    const preferred = getRecordPreferredStatus(r)
    let statusText = resolveRecordStatusLabel(preferred.statusId, {
      t,
      userCatalog: statusCatalog.catalog.value,
      recordLinked: Array.isArray(r.self_defined_status) ? r.self_defined_status : []
    })
    if (!statusText || statusText === '-' || statusText === String(preferred.statusId)) {
      const fallback = originalStatuses.find((s) => Number(s?.id) === DEFAULT_STATUS_ID)
      statusText = fallback ? (fallback.nameKey ? t(fallback.nameKey) : String(fallback.name ?? '')) : ''
    }

    return {
      recordId,
      projectName: String(r.project_name || r.projectName || selected?.name || '').trim(),
      positionText,
      statusText,
      statusNote: String(preferred.statusNote || '').replace(/\s+/g, ' ').trim(),
      isPlaying,
      slotStart,
      elapsedSeconds: Math.round(elapsedSeconds),
      pauseLabel: t('record.pause'),
      startLabel: t('record.liveActivityStart')
    }
  })

  // When there's no ongoing record, decide whether that's final (end the activity) or
  // just the store still loading after launch (keep it).
  const shouldEnd = computed(() => {
    if (payload.value) return false
    if (currentUser.value === undefined) return false
    if (currentUser.value === null) return true
    const r = latestRecordStore.latestRecordData
    if (r?.is_completed) return true
    return !r && !latestRecordStore.loading
  })

  async function syncNow() {
    if (!supported || draining || disposed) return

    if (shouldEnd.value) {
      if (lastSentKey !== '__ended__') {
        lastSentKey = '__ended__'
        await RecordLiveActivity.end({}).catch(() => {})
      }
      return
    }

    const p = payload.value
    if (!p) return
    const key = JSON.stringify(p)
    if (key === lastSentKey) return
    lastSentKey = key

    try {
      const res = await RecordLiveActivity.sync(p)
      if (res?.reason === 'pendingActions') {
        lastSentKey = null
        void drain()
      }
    } catch (e) {
      lastSentKey = null
      console.warn('useRecordLiveActivity: sync failed', e)
    }
  }

  async function drain() {
    if (!supported || draining || disposed) return
    const uid = String(auth.currentUser?.uid || '').trim()
    if (!uid) return

    draining = true
    try {
      const { actions = [] } = (await RecordLiveActivity.getPendingActions()) || {}
      if (!actions.length) return

      const byRecord = new Map()
      for (const a of actions) {
        const rid = String(a?.recordId || '').trim()
        if (!rid) continue
        if (!byRecord.has(rid)) byRecord.set(rid, [])
        byRecord.get(rid).push(a)
      }
      const invalidIds = actions.filter((a) => !String(a?.recordId || '').trim()).map((a) => a.id)
      if (invalidIds.length) await RecordLiveActivity.removePendingActions({ ids: invalidIds })

      for (const [rid, list] of byRecord) {
        const dock = latestRecordStore.latestRecordData
        const isDock = Boolean(dock && String(dock.id || '') === rid)
        const record = isDock ? dock : await fetchUserRecord(uid, rid)

        const nextSlots = record ? applyLiveActivityActionsToSlots(record, list) : null
        if (nextSlots) {
          // Update the in-memory record first (same object as the record page when it's open).
          if (isDock) record.time_slots = nextSlots
          // Offline, setDoc only resolves on server ack; the write is already in the persistent
          // local queue, so don't block on it (replaying actions later is a no-op anyway).
          const write = mergeUserRecord(uid, rid, { time_slots: nextSlots })
          write.catch((e) => console.warn('useRecordLiveActivity: saving time slots failed', e))
          await Promise.race([write, new Promise((resolve) => setTimeout(resolve, 4000))])
        }
        await RecordLiveActivity.removePendingActions({ ids: list.map((a) => a.id) })
      }
    } catch (e) {
      console.warn('useRecordLiveActivity: applying Live Activity actions failed', e)
    } finally {
      draining = false
      lastSentKey = null
      void syncNow()
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return
    void drain().then(() => {
      lastSentKey = null
      void syncNow()
    })
  }

  watch([payload, shouldEnd], () => void syncNow(), { deep: true })
  watch(
    () => currentUser.value?.uid,
    (uid) => {
      if (uid) void drain()
    }
  )

  void (async () => {
    try {
      const res = await RecordLiveActivity.isSupported()
      supported = Boolean(res?.supported)
    } catch {
      supported = false
    }
    if (!supported || disposed) return

    listenerHandle = await RecordLiveActivity.addListener('pendingActions', () => void drain())
    document.addEventListener('visibilitychange', onVisibilityChange)
    await drain()
    await syncNow()
  })()

  onUnmounted(() => {
    disposed = true
    document.removeEventListener('visibilitychange', onVisibilityChange)
    void listenerHandle?.remove?.()
  })
}
