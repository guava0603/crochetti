import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useRecordContext } from '@/composables/recordContext'
import { useUserRecordStatusCatalog } from '@/composables/useUserRecordStatusCatalog'
import { resolveRecordStatusLabel } from '@/utils/recordStatusDisplay'
import { normalizeSectionVisibility } from '@/constants/recordResultSharingSections'

export function useRecordResultData(props) {
  const { t } = useI18n({ useScope: 'global' })
  const route = useRoute()

  const recordCtx = useRecordContext()
  const currentRecord = recordCtx?.recordData || ref(null)
  const authPending = computed(() => props.currentUser === undefined)
  const currentTime = ref(Date.now())
  const loading = computed(() => authPending.value || Boolean(recordCtx?.recordLoading?.value))

  const statusCatalog = useUserRecordStatusCatalog(
    () => props.profile,
    () => props.currentUser?.uid
  )

  const sectionVisibilityNormalized = computed(() => normalizeSectionVisibility(props.sectionVisibility))

  function isSectionVisible(key) {
    return sectionVisibilityNormalized.value[key] !== false
  }

  let timerInterval = null

  const timeSlots = computed(() => {
    const slots = currentRecord.value?.time_slots
    return Array.isArray(slots) ? slots : []
  })

  const parseIsoToMs = (iso) => {
    if (!iso) return null
    const ms = new Date(iso).getTime()
    return Number.isFinite(ms) ? ms : null
  }

  const earliestStartMs = computed(() => {
    let earliest = null
    for (const slot of timeSlots.value) {
      const ms = parseIsoToMs(slot?.start)
      if (ms == null) continue
      if (earliest == null || ms < earliest) earliest = ms
    }
    return earliest
  })

  const latestEndMs = computed(() => {
    let latest = null
    for (const slot of timeSlots.value) {
      const endIso = slot?.end || null
      const ms = endIso ? parseIsoToMs(endIso) : currentTime.value
      if (ms == null || !Number.isFinite(ms)) continue
      if (latest == null || ms > latest) latest = ms
    }
    return latest
  })

  const recordSpanMs = computed(() => {
    if (earliestStartMs.value == null || latestEndMs.value == null) return null
    return Math.max(0, latestEndMs.value - earliestStartMs.value)
  })

  const getSlotDurationMs = (slot) => {
    const startIso = slot?.start
    if (!startIso) return 0
    const startMs = new Date(startIso).getTime()
    if (!Number.isFinite(startMs)) return 0

    const endMs = slot?.end ? new Date(slot.end).getTime() : currentTime.value
    if (!Number.isFinite(endMs)) return 0

    return Math.max(0, endMs - startMs)
  }

  const totalEffortMs = computed(() => {
    let sum = 0
    for (const slot of timeSlots.value) sum += getSlotDurationMs(slot)
    return sum
  })

  const getStatusLabel = (statusId) => {
    return resolveRecordStatusLabel(statusId, {
      t,
      userCatalog: statusCatalog.catalog.value,
      recordLinked: currentRecord.value?.self_defined_status
    })
  }

  const getGroupPercent = (group) => {
    const total = totalEffortMs.value
    if (!Number.isFinite(total) || total <= 0) return 0
    const part = Number(group?.durationMs)
    if (!Number.isFinite(part) || part <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
  }

  const rankedGroups = computed(() => {
    const byKey = new Map()

    for (const slot of timeSlots.value) {
      const statusId = slot?.status_id ?? null
      const key = statusId == null ? '__none__' : String(statusId)
      const durationMs = getSlotDurationMs(slot)

      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          statusId,
          label: getStatusLabel(statusId),
          durationMs: 0,
          count: 0
        })
      }

      const group = byKey.get(key)
      group.durationMs += durationMs
      group.count += 1
    }

    return Array.from(byKey.values())
      .filter((g) => g.durationMs > 0 || g.count > 0)
      .sort((a, b) => b.durationMs - a.durationMs)
  })

  const topGroup = computed(() => rankedGroups.value?.[0] || null)

  const topGroupPercent = computed(() => {
    if (!topGroup.value) return 0
    return getGroupPercent(topGroup.value)
  })

  const topGroupNoteLines = computed(() => {
    const group = topGroup.value
    if (!group) return []
    if (!group.durationMs || group.durationMs <= 0) return []

    const totalsByNote = new Map()

    for (const slot of timeSlots.value) {
      const statusId = slot?.status_id ?? null
      const sameStatus = statusId == null
        ? group.statusId == null
        : Number(statusId) === Number(group.statusId)

      if (!sameStatus) continue

      const noteRaw = slot?.status_note
      const note = typeof noteRaw === 'string' ? noteRaw.trim() : ''
      if (!note) continue

      const durationMs = getSlotDurationMs(slot)
      if (durationMs <= 0) continue

      totalsByNote.set(note, (totalsByNote.get(note) || 0) + durationMs)
    }

    return Array.from(totalsByNote.entries())
      .map(([note, durationMs]) => {
        const percent = Math.max(0, Math.min(100, Math.round((durationMs / group.durationMs) * 100)))
        return { key: note, note, percent, durationMs }
      })
      .filter((l) => l.percent > 0)
      .sort((a, b) => b.percent - a.percent)
  })

  const restGroups = computed(() => rankedGroups.value.slice(1, 5))

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000)

    if (totalSeconds < 60) {
      return t('recordResult.durationSecond', { n: totalSeconds })
    }

    const totalMinutes = Math.floor(totalSeconds / 60)
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60

    const parts = []
    if (days > 0) parts.push(t('recordResult.durationDay', { n: days }))
    if (hours > 0) parts.push(t('recordResult.durationHour', { n: hours }))
    if (minutes > 0) parts.push(t('recordResult.durationMinute', { n: minutes }))

    return parts.join(t('recordResult.durationJoiner'))
  }

  const splitI18nLine = (key, paramName) => {
    const token = `__${String(paramName).toUpperCase()}__`
    const msg = t(key, { [paramName]: token })
    const idx = msg.indexOf(token)

    if (idx === -1) {
      return { before: msg, after: '' }
    }

    return {
      before: msg.slice(0, idx),
      after: msg.slice(idx + token.length)
    }
  }

  const spanText = computed(() => {
    if (recordSpanMs.value == null) return '-'
    return formatDuration(recordSpanMs.value)
  })

  const effortText = computed(() => formatDuration(totalEffortMs.value))

  const effortLineParts = computed(() => splitI18nLine('recordResult.effortLine', 'effort'))

  const showSummary = computed(() => !loading.value && timeSlots.value.length > 0 && recordSpanMs.value != null)

  const hasData = computed(() => rankedGroups.value.length > 0)

  onMounted(() => {
    timerInterval = setInterval(() => {
      currentTime.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval)
  })

  return {
    route,
    loading,
    hasData,
    rankedGroups,
    topGroup,
    topGroupPercent,
    topGroupNoteLines,
    restGroups,
    getGroupPercent,
    formatDuration,
    spanText,
    effortText,
    effortLineParts,
    showSummary,
    isSectionVisible
  }
}
