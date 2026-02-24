import { auth, db } from '@/firebaseConfig'
import { collection, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore'

/**
 * Returns true if `userId` matches the currently authenticated user.
 *
 * Note: this is synchronous; ensure auth state is ready if you need
 * deterministic results on first load.
 */
export function isCurrentUser(userId) {
  const uid = auth.currentUser?.uid
  if (!uid || userId == null) return false
  return String(uid) === String(userId)
}

export function subscribeUserProfile({ appId, userId, fallbackProfile = null, onData, onError }) {
  if (!appId) throw new Error('subscribeUserProfile: missing appId')
  if (!userId) throw new Error('subscribeUserProfile: missing userId')
  if (typeof onData !== 'function') throw new Error('subscribeUserProfile: missing onData callback')

  const profileDocRef = doc(
    db,
    'artifacts',
    String(appId),
    'users',
    String(userId),
    'profile',
    'info'
  )

  return onSnapshot(
    profileDocRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        onData(docSnapshot.data())
      } else {
        onData(fallbackProfile)
      }
    },
    (error) => {
      if (typeof onError === 'function') onError(error)
    }
  )
}

export async function updateUserProfile({ appId, userId, profileData }) {
  if (!appId) throw new Error('updateUserProfile: missing appId')
  if (!userId) throw new Error('updateUserProfile: missing userId')

  const profileDocRef = doc(
    db,
    'artifacts',
    String(appId),
    'users',
    String(userId),
    'profile',
    'info'
  )

  await setDoc(profileDocRef, profileData || {}, { merge: true })
  return true
}

export async function fetchUserProjectSummaries({ userId, includePrivate = false }) {
  if (!userId) throw new Error('fetchUserProjectSummaries: missing userId')

  const projectsRef = collection(db, 'projects')
  const q = includePrivate
    ? query(projectsRef, where('authorId', '==', String(userId)))
    : query(projectsRef, where('authorId', '==', String(userId)), where('is_public', '==', true))

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((d) => {
    const data = d.data() || {}
    return {
      id: d.id,
      name: data?.name || '',
      description: data?.description || '',
      authorId: data?.authorId || '',
      is_public: Boolean(data?.is_public),
      created_at: data?.created_at ?? null,
      updated_at: data?.updated_at ?? null,
      createdAt: data?.createdAt || null
    }
  })
}
