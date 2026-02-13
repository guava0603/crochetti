import { db } from '@/firebaseConfig'
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'

function recordRef(uid, recordId) {
  if (!uid) throw new Error('recordRef: missing uid')
  if (!recordId) throw new Error('recordRef: missing recordId')
  return doc(db, 'users', String(uid), 'records', String(recordId))
}

export async function fetchUserRecord(uid, recordId) {
  const snap = await getDoc(recordRef(uid, recordId))
  return snap.exists() ? snap.data() : null
}

export async function setUserRecord(uid, recordId, recordData) {
  return setDoc(recordRef(uid, recordId), recordData)
}

export async function mergeUserRecord(uid, recordId, partial) {
  return setDoc(recordRef(uid, recordId), partial, { merge: true })
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
