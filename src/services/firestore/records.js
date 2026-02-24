import { db } from '@/firebaseConfig'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, Timestamp } from 'firebase/firestore'
import { normalizeRecordForComponentCountsInPlace } from '@/utils/componentInstances'

function recordRef(uid, recordId) {
  if (!uid) throw new Error('recordRef: missing uid')
  if (!recordId) throw new Error('recordRef: missing recordId')
  return doc(db, 'users', String(uid), 'records', String(recordId))
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

  if (Object.keys(patch).length) {
    try {
      await updateDoc(ref, patch)
      const next = { ...data, ...patch }
      normalizeRecordForComponentCountsInPlace(next)
      return next
    } catch (error) {
      console.warn('fetchUserRecord: failed to repair timestamps', error)
      const next = { ...data, ...patch }
      normalizeRecordForComponentCountsInPlace(next)
      return next
    }
  }

  normalizeRecordForComponentCountsInPlace(data)
  return data
}

export async function setUserRecord(uid, recordId, recordData) {
  const payload = { ...recordData }
  const hasCreatedAt = Object.prototype.hasOwnProperty.call(payload, 'created_at')
  if (!hasCreatedAt || payload.created_at == null) payload.created_at = serverTimestamp()
  payload.updated_at = serverTimestamp()
  return setDoc(recordRef(uid, recordId), payload)
}

export async function mergeUserRecord(uid, recordId, partial) {
  const payload = { ...partial }
  // Don't overwrite created_at on merges.
  delete payload.created_at
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

  const records = snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
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

  const records = snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
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
    const slots = Array.isArray(data?.time_slots) ? data.time_slots : []
    const latestMs = slots.length
      ? Math.max(
          ...slots
            .map((s) => (s?.start ? new Date(s.start).getTime() : 0))
            .filter((n) => Number.isFinite(n))
        )
      : 0

    // Keep only what the user page list needs.
    return {
      id: d.id,
      project_id: data?.project_id ? String(data.project_id) : '',
      project_name: String(data?.project_name || data?.projectName || ''),
      latest_start_ms: latestMs
    }
  })

  records.sort((a, b) => (b.latest_start_ms || 0) - (a.latest_start_ms || 0))
  return records
}
