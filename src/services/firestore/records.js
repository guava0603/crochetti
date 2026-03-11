import { db } from '@/firebaseConfig'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, Timestamp } from 'firebase/firestore'
import { normalizeRecordForComponentCountsInPlace } from '@/utils/componentInstances'
import { getRecordProgressPercent } from '@/utils/recordProgressGenerate'
import { getAppId } from '@/utils/appId'

const clampPercent = (value) => {
  let n
  if (typeof value === 'number') n = value
  else if (typeof value === 'string' && value.trim() !== '') n = Number(value)
  else n = NaN

  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

function recordRef(uid, recordId) {
  if (!uid) throw new Error('recordRef: missing uid')
  if (!recordId) throw new Error('recordRef: missing recordId')
  return doc(db, 'users', String(uid), 'records', String(recordId))
}

function publicRecordSummaryRef({ appId, userId, recordId }) {
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('publicRecordSummaryRef: missing appId')
  if (!userId) throw new Error('publicRecordSummaryRef: missing userId')
  if (!recordId) throw new Error('publicRecordSummaryRef: missing recordId')

  return doc(
    db,
    'artifacts',
    String(resolvedAppId),
    'users',
    String(userId),
    'records',
    String(recordId)
  )
}

function publicRecordSummariesCol({ appId, userId }) {
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('publicRecordSummariesCol: missing appId')
  if (!userId) throw new Error('publicRecordSummariesCol: missing userId')

  return collection(db, 'artifacts', String(resolvedAppId), 'users', String(userId), 'records')
}

/**
 * Publish a sanitized record summary for public user pages.
 *
 * Stored at: artifacts/{appId}/users/{uid}/records/{recordId}
 * Security: anyone can read; only the owner can write.
 */
export async function upsertPublicUserRecordSummary({
  appId,
  userId,
  recordId,
  project_id,
  project_name,
  percentage,
  result,
}) {
  const safePercent = clampPercent(percentage)
  const payload = {
    project_id: String(project_id || ''),
    project_name: String(project_name || ''),
    result: result && typeof result === 'object' ? result : null,
  }

  if (safePercent != null) payload.percentage = safePercent

  return setDoc(publicRecordSummaryRef({ appId, userId, recordId }), payload, { merge: true })
}

export async function deletePublicUserRecordSummary({ appId, userId, recordId }) {
  return deleteDoc(publicRecordSummaryRef({ appId, userId, recordId }))
}

export async function listPublicUserRecordSummaries(userId, { appId } = {}) {
  const snaps = await getDocs(publicRecordSummariesCol({ appId, userId }))

  return snaps.docs.map((d) => {
    const data = d.data() || {}
    const safePercent = clampPercent(data?.percentage)
    return {
      id: d.id,
      project_id: data?.project_id ? String(data.project_id) : '',
      project_name: String(data?.project_name || ''),
      project_image: data?.result?.images?.[0] ? String(data.result.images[0]) : null,
      result: data?.result && typeof data.result === 'object' ? data.result : null,

      // Public summaries are only published for completed records.
      percentage: safePercent != null ? safePercent : 100,

      // Keep existing UI components happy (RecordList groups by completion).
      // These public summaries are only published for completed records/results.
      is_completed: true,
    }
  })
}

export async function fetchUserRecord(uid, recordId) {
  const ref = recordRef(uid, recordId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null

  const data = snap.data() || {}
  const patch = {}
  const now = Timestamp.now()

  if (data.created_at == null) patch.created_at = now
  if (data.updated_at == null) patch.updated_at = now

  // Normalize first so percentage calculation is stable.
  normalizeRecordForComponentCountsInPlace(data)
  const computedPercent = getRecordProgressPercent(data)
  if (clampPercent(data?.percentage) == null) patch.percentage = computedPercent

  if (Object.keys(patch).length) {
    try {
      await updateDoc(ref, patch)
      return { ...data, ...patch }
    } catch (error) {
      console.warn('fetchUserRecord: failed to repair timestamps', error)
      return { ...data, ...patch }
    }
  }
  return data
}

export async function setUserRecord(uid, recordId, recordData) {
  const payload = { ...recordData }
  normalizeRecordForComponentCountsInPlace(payload)
  payload.percentage = getRecordProgressPercent(payload)
  const hasCreatedAt = Object.prototype.hasOwnProperty.call(payload, 'created_at')
  if (!hasCreatedAt || payload.created_at == null) payload.created_at = serverTimestamp()
  payload.updated_at = serverTimestamp()
  return setDoc(recordRef(uid, recordId), payload)
}

export async function mergeUserRecord(uid, recordId, partial) {
  const payload = { ...partial }
  // Don't overwrite created_at on merges.
  delete payload.created_at

  // When finishing a record, record a stable completion timestamp.
  // This makes retroactive achievement evaluation based on completion dates reliable.
  if (payload.is_completed === true && !Object.prototype.hasOwnProperty.call(payload, 'completed_at')) {
    payload.completed_at = serverTimestamp()
  }

  // Normalize component instances when caller provides component_list.
  if (Object.prototype.hasOwnProperty.call(payload, 'component_list')) {
    normalizeRecordForComponentCountsInPlace(payload)
    payload.percentage = getRecordProgressPercent(payload)
  } else if (payload.is_completed === true && !Object.prototype.hasOwnProperty.call(payload, 'percentage')) {
    payload.percentage = 100
  }

  payload.updated_at = serverTimestamp()
  return setDoc(recordRef(uid, recordId), payload, { merge: true })
}

export async function deleteUserRecord(uid, recordId) {
  return deleteDoc(recordRef(uid, recordId))
}

export async function listUserRecordsByProjectId(uid, projectId) {
  if (!uid) throw new Error('listUserRecordsByProjectId: missing uid')
  if (!projectId) throw new Error('listUserRecordsByProjectId: missing projectId')

  const recordsCol = collection(db, 'users', String(uid), 'records')
  const q = query(recordsCol, where('project_id', '==', String(projectId)))
  const snaps = await getDocs(q)

  const records = snaps.docs.map((d) => {
    const data = d.data() || {}
    normalizeRecordForComponentCountsInPlace(data)
    return { id: d.id, ...data }
  })
  records.sort((a, b) => {
    const aStart = a?.time_slots?.[0]?.start ? new Date(a.time_slots[0].start).getTime() : 0
    const bStart = b?.time_slots?.[0]?.start ? new Date(b.time_slots[0].start).getTime() : 0
    return bStart - aStart
  })
  return records
}

export async function listUserRecords(uid) {
  if (!uid) throw new Error('listUserRecords: missing uid')

  const recordsCol = collection(db, 'users', String(uid), 'records')
  const snaps = await getDocs(recordsCol)

  const records = snaps.docs.map((d) => {
    const data = d.data() || {}
    normalizeRecordForComponentCountsInPlace(data)
    return { id: d.id, ...data }
  })
  records.sort((a, b) => {
    const aLatest = Array.isArray(a?.time_slots) && a.time_slots.length
      ? Math.max(
          ...a.time_slots
            .map((s) => (s?.start ? new Date(s.start).getTime() : 0))
            .filter((n) => Number.isFinite(n))
        )
      : 0
    const bLatest = Array.isArray(b?.time_slots) && b.time_slots.length
      ? Math.max(
          ...b.time_slots
            .map((s) => (s?.start ? new Date(s.start).getTime() : 0))
            .filter((n) => Number.isFinite(n))
        )
      : 0
    return bLatest - aLatest
  })
  return records
}

export async function listUserRecordSummaries(uid) {
  if (!uid) throw new Error('listUserRecordSummaries: missing uid')

  const recordsCol = collection(db, 'users', String(uid), 'records')
  const snaps = await getDocs(recordsCol)

  const records = snaps.docs.map((d) => {
    const data = d.data() || {}
    normalizeRecordForComponentCountsInPlace(data)
    const slots = Array.isArray(data?.time_slots) ? data.time_slots : []
    const latestMs = slots.length
      ? Math.max(
          ...slots
            .map((s) => (s?.start ? new Date(s.start).getTime() : 0))
            .filter((n) => Number.isFinite(n))
        )
      : 0

    const percentage = clampPercent(data?.percentage) ?? getRecordProgressPercent(data)

    const updatedAtRaw = data?.updated_at
    const updatedAtMs = updatedAtRaw && typeof updatedAtRaw?.toMillis === 'function'
      ? updatedAtRaw.toMillis()
      : (updatedAtRaw ? new Date(updatedAtRaw).getTime() : NaN)

    const imagesRaw = Array.isArray(data?.images)
      ? data.images
      : Array.isArray(data?.result?.images)
        ? data.result.images
        : []
    const firstImage = imagesRaw.find((u) => typeof u === 'string' && u.trim() !== '')
    const projectImage = data?.project_image

    // Keep only what the user page list needs.
    return {
      id: d.id,
      project_id: data?.project_id ? String(data.project_id) : '',
      project_name: String(data?.project_name || data?.projectName || ''),
      latest_start_ms: latestMs,
      updated_at_ms: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
      percentage,
      is_completed: Boolean(data?.is_completed),
      coverImageUrl: firstImage || projectImage || null
    }
  })

  // Sort by last update time (fallback to latest time slot start).
  records.sort((a, b) => {
    const aKey = Number(a?.updated_at_ms || 0) || Number(a?.latest_start_ms || 0) || 0
    const bKey = Number(b?.updated_at_ms || 0) || Number(b?.latest_start_ms || 0) || 0
    return bKey - aKey
  })
  return records
}
