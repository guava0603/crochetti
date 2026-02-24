import { db } from '@/firebaseConfig'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore'

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
  // Do not allow callers to overwrite created_at.
  delete payload.created_at
  payload.updated_at = serverTimestamp()

  return updateDoc(doc(db, 'projects', String(projectId)), payload)
}

export async function deleteProject(projectId) {
  if (!projectId) throw new Error('deleteProject: missing projectId')
  return deleteDoc(doc(db, 'projects', String(projectId)))
}
