import { auth, db } from '@/firebaseConfig'
import { getAppId } from '@/utils/appId'
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where
} from 'firebase/firestore'

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
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('subscribeUserProfile: missing appId')
  if (!userId) throw new Error('subscribeUserProfile: missing userId')
  if (typeof onData !== 'function') throw new Error('subscribeUserProfile: missing onData callback')

  const profileDocRef = doc(
    db,
    'artifacts',
    String(resolvedAppId),
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
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('updateUserProfile: missing appId')
  if (!userId) throw new Error('updateUserProfile: missing userId')

  const profileDocRef = doc(
    db,
    'artifacts',
    String(resolvedAppId),
    'users',
    String(userId),
    'profile',
    'info'
  )

  await setDoc(profileDocRef, profileData || {}, { merge: true })
  return true
}

function userProfileDocRef(appId, userId) {
  return doc(
    db,
    'artifacts',
    String(appId),
    'users',
    String(userId),
    'profile',
    'info'
  )
}

export async function saveProjectToSaveList({ appId, userId, projectId }) {
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('saveProjectToSaveList: missing appId')
  if (!userId) throw new Error('saveProjectToSaveList: missing userId')
  if (!projectId) throw new Error('saveProjectToSaveList: missing projectId')

  await setDoc(
    userProfileDocRef(resolvedAppId, userId),
    { save_project_list: arrayUnion(String(projectId)) },
    { merge: true }
  )
  return true
}

export async function unsaveProjectFromSaveList({ appId, userId, projectId }) {
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('unsaveProjectFromSaveList: missing appId')
  if (!userId) throw new Error('unsaveProjectFromSaveList: missing userId')
  if (!projectId) throw new Error('unsaveProjectFromSaveList: missing projectId')

  await setDoc(
    userProfileDocRef(resolvedAppId, userId),
    { save_project_list: arrayRemove(String(projectId)) },
    { merge: true }
  )
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
    const images = Array.isArray(data?.images) ? data.images.filter(Boolean) : []
    return {
      id: d.id,
      name: data?.name || '',
      description: data?.description || '',
      authorId: data?.authorId || '',
      is_public: Boolean(data?.is_public),
      image: images[0] || null,
      created_at: data?.created_at ?? null,
      updated_at: data?.updated_at ?? null,
      createdAt: data?.createdAt || null
    }
  })
}

export async function fetchUsers({ appId, userIds }) {
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('fetchUsers: missing appId')

  const ids = Array.isArray(userIds) ? userIds.map((x) => String(x)).filter(Boolean) : []
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length === 0) return []

  const snapshots = await Promise.all(
    uniqueIds.map((id) => getDoc(userProfileDocRef(resolvedAppId, id)))
  )

  return snapshots.map((snap, idx) => {
    const id = uniqueIds[idx]
    const data = snap.exists() ? (snap.data() || {}) : null
    return {
      id,
      ...data
    }
  })
}

export async function followUser({ appId, currentUserId, targetUserId }) {
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('followUser: missing appId')
  if (!currentUserId) throw new Error('followUser: missing currentUserId')
  if (!targetUserId) throw new Error('followUser: missing targetUserId')

  const currentId = String(currentUserId)
  const targetId = String(targetUserId)
  if (currentId === targetId) throw new Error('followUser: cannot follow self')

  const currentRef = userProfileDocRef(resolvedAppId, currentId)
  const targetRef = userProfileDocRef(resolvedAppId, targetId)

  await runTransaction(db, async (tx) => {
    tx.set(currentRef, { following_list: arrayUnion(targetId) }, { merge: true })
    tx.set(targetRef, { fan_list: arrayUnion(currentId) }, { merge: true })
  })

  return true
}

export async function unfollowUser({ appId, currentUserId, targetUserId }) {
  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('unfollowUser: missing appId')
  if (!currentUserId) throw new Error('unfollowUser: missing currentUserId')
  if (!targetUserId) throw new Error('unfollowUser: missing targetUserId')

  const currentId = String(currentUserId)
  const targetId = String(targetUserId)
  if (currentId === targetId) throw new Error('unfollowUser: cannot unfollow self')

  const currentRef = userProfileDocRef(resolvedAppId, currentId)
  const targetRef = userProfileDocRef(resolvedAppId, targetId)

  await runTransaction(db, async (tx) => {
    tx.set(currentRef, { following_list: arrayRemove(targetId) }, { merge: true })
    tx.set(targetRef, { fan_list: arrayRemove(currentId) }, { merge: true })
  })

  return true
}
