import { db } from '@/firebaseConfig'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  updateDoc
} from 'firebase/firestore'

export async function fetchProject(projectId) {
  if (!projectId) return null
  const snap = await getDocFromServer(doc(db, 'projects', String(projectId)))

  // Permission is enforced by Firestore Security Rules; unauthorized reads
  // will throw (permission-denied) and no data is returned to the client.
  return snap.exists() ? snap.data() : null
}

export async function createProject(projectData) {
  const projectsRef = collection(db, 'projects')
  const docRef = await addDoc(projectsRef, projectData)
  return docRef.id
}

export async function updateProject(projectId, partial) {
  if (!projectId) throw new Error('updateProject: missing projectId')
  return updateDoc(doc(db, 'projects', String(projectId)), partial)
}

export async function deleteProject(projectId) {
  if (!projectId) throw new Error('deleteProject: missing projectId')
  return deleteDoc(doc(db, 'projects', String(projectId)))
}
