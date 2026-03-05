import { db } from '@/firebaseConfig'
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  query,
  documentId
} from 'firebase/firestore'

import { normalizeEmptyNotesForSaveInPlace } from '@/utils/normalizeEmptyNotesForSave'

function normalizeEmptyNotesForSave(componentList) {
  const list = Array.isArray(componentList) ? componentList : []

  const cloned = list.map((c) => {
    if (!c || typeof c !== 'object') return c
    return { ...c }
  })

  normalizeEmptyNotesForSaveInPlace(cloned)

  return cloned
}

export async function fetchProject(projectId) {
  if (!projectId) return null
  const ref = doc(db, 'projects', String(projectId))
  const snap = await getDoc(ref)

  // Permission is enforced by Firestore Security Rules; unauthorized reads
  // will throw (permission-denied) and no data is returned to the client.
  if (!snap.exists()) return null

  const data = snap.data() || {}
  const patch = {}
  const now = Timestamp.now()

  if (data.created_at == null) patch.created_at = now
  if (data.updated_at == null) patch.updated_at = now

  if (Object.keys(patch).length) {
    try {
      await updateDoc(ref, patch)
      return { ...data, ...patch }
    } catch (error) {
      // If rules disallow updates, still return best-effort values for UI.
      console.warn('fetchProject: failed to repair timestamps', error)
      return { ...data, ...patch }
    }
  }

  return data
}

export async function createProject(projectData) {
  const projectsRef = collection(db, 'projects')

  const payload = { ...projectData }
  if (Array.isArray(payload.component_list)) {
    payload.component_list = normalizeEmptyNotesForSave(payload.component_list)
  }
  // Always set timestamps on create.
  delete payload.created_at
  delete payload.updated_at
  payload.created_at = serverTimestamp()
  payload.updated_at = serverTimestamp()

  const docRef = await addDoc(projectsRef, payload)
  return docRef.id
}

export async function updateProject(projectId, partial) {
  if (!projectId) throw new Error('updateProject: missing projectId')

  const payload = { ...partial }
  if (Array.isArray(payload.component_list)) {
    payload.component_list = normalizeEmptyNotesForSave(payload.component_list)
  }
  // Do not allow callers to overwrite created_at.
  delete payload.created_at
  payload.updated_at = serverTimestamp()

  return updateDoc(doc(db, 'projects', String(projectId)), payload)
}

export async function addRecordToProjectOngoing(projectId, recordId) {
  if (!projectId || !recordId) return
  const ref = doc(db, 'projects', String(projectId))
  return updateDoc(ref, {
    'record.ongoing_list': arrayUnion(String(recordId)),
    updated_at: serverTimestamp()
  })
}

export async function completeProjectRecord(projectId, recordId) {
  if (!projectId || !recordId) return
  const ref = doc(db, 'projects', String(projectId))
  return updateDoc(ref, {
    'record.ongoing_list': arrayRemove(String(recordId)),
    'record.completed_list': arrayUnion(String(recordId)),
    updated_at: serverTimestamp()
  })
}

export async function deleteProject(projectId) {
  if (!projectId) throw new Error('deleteProject: missing projectId')
  return deleteDoc(doc(db, 'projects', String(projectId)))
}

function normalizeProjectSummary(id, data) {
  const d = data || {}
  const images = Array.isArray(d?.images) ? d.images.filter(Boolean) : []
  const image = (typeof d?.image === 'string' && d.image.trim()) ? d.image.trim() : null

  return {
    id: String(id),
    name: d?.name || '',
    description: d?.description || '',
    authorId: d?.authorId || '',
    is_public: Boolean(d?.is_public),
    image: images[0] || image || null,
    created_at: d?.created_at ?? null,
    updated_at: d?.updated_at ?? null,
    createdAt: d?.createdAt || null
  }
}

export async function fetchProjectSummariesByIds(projectIds) {
  const ids = (Array.isArray(projectIds) ? projectIds : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)

  if (!ids.length) return []

  // Firestore 'in' query supports up to 10 values.
  const chunks = []
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10))

  const projectsRef = collection(db, 'projects')
  const results = []

  for (const chunk of chunks) {
    const q = query(projectsRef, where(documentId(), 'in', chunk))
    const snap = await getDocs(q)
    snap.forEach((d) => {
      results.push(normalizeProjectSummary(d.id, d.data()))
    })
  }

  // Preserve incoming ID order.
  const byId = new Map(results.map((p) => [String(p.id), p]))
  return ids.map((id) => byId.get(String(id))).filter(Boolean)
}
