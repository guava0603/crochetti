import { auth, db } from '@/firebaseConfig'
import { getAppId } from '@/utils/appId'
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'

const FRIEND_CODE_LENGTH = 6
const FRIEND_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // exclude 0,O,I,1,L

function normalizeCode(rawCode) {
  if (rawCode == null) return ''
  return String(rawCode)
    .trim()
    .toUpperCase()
    .replace(/-/g, '')
    .replace(/\s+/g, '')
}

function isLikelyFriendCode(rawCode) {
  const c = normalizeCode(rawCode)
  if (c.length !== FRIEND_CODE_LENGTH) return false
  return /^[A-Z0-9]+$/.test(c)
}

function generateCleanCode() {
  let code = ''
  for (let i = 0; i < FRIEND_CODE_LENGTH; i += 1) {
    code += FRIEND_CODE_CHARS.charAt(Math.floor(Math.random() * FRIEND_CODE_CHARS.length))
  }
  return code
}

function shortcutDocRef(appId, code) {
  return doc(db, 'artifacts', String(appId), 'public', 'data', 'short_ids', String(code))
}

function userProfileDocRef(appId, userId) {
  return doc(db, 'artifacts', String(appId), 'users', String(userId), 'profile', 'info')
}

function pickSafePublicName(profileData) {
  const name = String(profileData?.name || '').trim()
  return name || '織友'
}

function pickSafePublicAvatar(profileData) {
  const avatar = profileData?.avatar
  if (avatar == null) return null
  const raw = String(avatar).trim()
  return raw || null
}

function getProfileFriendCode(profileData) {
  const a = profileData?.friend_code != null ? String(profileData.friend_code).trim() : ''
  if (a) return a
  const b = profileData?.friendCode != null ? String(profileData.friendCode).trim() : ''
  return b
}

/**
 * Fast friend-code lookup.
 * Reads: artifacts/{appId}/public/data/short_ids/{CODE}
 */
export async function searchUserByFriendCode(rawCode, { appId } = {}) {
  const resolvedAppId = appId || getAppId()
  const code = normalizeCode(rawCode)
  if (!resolvedAppId) throw new Error('searchUserByFriendCode: missing appId')
  if (!code) throw new Error('searchUserByFriendCode: missing code')

  const snap = await getDoc(shortcutDocRef(resolvedAppId, code))
  if (!snap.exists()) return null

  const data = snap.data() || {}
  const uid = String(data?.uid || '').trim()
  if (!uid) return null

  return {
    uid,
    name: data?.name != null ? String(data.name) : '',
    avatar: data?.avatar ?? null
  }
}

/**
 * Ensure the signed-in user has a friend code.
 * - If missing: generates a new unique code.
 * - If exists: repairs the shortcut mapping (if missing/wrong).
 */
export async function getOrCreateCurrentUserFriendCode(profileData = {}, { appId } = {}) {
  const user = auth.currentUser
  if (!user?.uid) return null

  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('getOrCreateCurrentUserFriendCode: missing appId')

  const uid = String(user.uid)
  const profileRef = userProfileDocRef(resolvedAppId, uid)

  // If the profile snapshot already has a valid code, prefer it.
  const existingFromMemory = normalizeCode(getProfileFriendCode(profileData))
  if (existingFromMemory && isLikelyFriendCode(existingFromMemory)) {
    // Repair shortcut mapping opportunistically (best effort).
    // IMPORTANT: never overwrite a mapping that belongs to another uid.
    let canKeepExisting = true
    try {
      await runTransaction(db, async (tx) => {
        const codeRef = shortcutDocRef(resolvedAppId, existingFromMemory)
        const codeSnap = await tx.get(codeRef)
        const mappedUid = codeSnap.exists() ? String(codeSnap.data()?.uid || '') : ''

        if (codeSnap.exists() && mappedUid && mappedUid !== uid) {
          // This code is already taken by someone else; don't try to "repair" it.
          canKeepExisting = false
          return
        }

        const createdAt = codeSnap.exists() ? (codeSnap.data()?.created_at ?? serverTimestamp()) : serverTimestamp()

        // Write the full document (no merge) so rules based on keys() stay stable.
        tx.set(codeRef, {
          uid,
          name: pickSafePublicName(profileData),
          avatar: pickSafePublicAvatar(profileData),
          created_at: createdAt,
          updated_at: serverTimestamp()
        })

        tx.set(profileRef, { friend_code: existingFromMemory }, { merge: true })
      })
    } catch {
      // ignore repair failures
    }

    if (canKeepExisting) {
      return existingFromMemory
    }
    // Otherwise fall through and allocate a new code.
  }

  // Otherwise, allocate a new code with collision retries.
  const MAX_TRIES = 12
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const candidate = generateCleanCode()

    try {
      await runTransaction(db, async (tx) => {
        const codeRef = shortcutDocRef(resolvedAppId, candidate)
        const codeSnap = await tx.get(codeRef)
        if (codeSnap.exists()) {
          throw new Error('friend-code-collision')
        }

        tx.set(codeRef, {
          uid,
          name: pickSafePublicName(profileData),
          avatar: pickSafePublicAvatar(profileData),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        })

        tx.set(
          profileRef,
          {
            friend_code: candidate,
            friend_code_updated_at: serverTimestamp()
          },
          { merge: true }
        )
      })

      return candidate
    } catch (err) {
      // Retry on collision only.
      const msg = String(err?.message || '')
      if (msg.includes('friend-code-collision')) continue
      // For other errors, bail.
      return null
    }
  }

  return null
}

/**
 * Regenerate (update) the signed-in user's friend code.
 * - Creates a new shortcut doc
 * - Updates profile.friend_code
 * - Deletes the old shortcut doc if it belonged to the same user
 */
export async function regenerateCurrentUserFriendCode(profileData = {}, { appId } = {}) {
  const user = auth.currentUser
  if (!user?.uid) return null

  const resolvedAppId = appId || getAppId()
  if (!resolvedAppId) throw new Error('regenerateCurrentUserFriendCode: missing appId')

  const uid = String(user.uid)
  const profileRef = userProfileDocRef(resolvedAppId, uid)

  const MAX_TRIES = 12
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const candidate = generateCleanCode()

    try {
      let assigned = null

      await runTransaction(db, async (tx) => {
        const profileSnap = await tx.get(profileRef)
        const currentProfile = profileSnap.exists() ? (profileSnap.data() || {}) : {}
        const prevCode = normalizeCode(getProfileFriendCode(currentProfile))

        const nextCodeRef = shortcutDocRef(resolvedAppId, candidate)
        const nextSnap = await tx.get(nextCodeRef)
        if (nextSnap.exists()) {
          throw new Error('friend-code-collision')
        }

        tx.set(nextCodeRef, {
          uid,
          name: pickSafePublicName(profileData),
          avatar: pickSafePublicAvatar(profileData),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        })

        tx.set(
          profileRef,
          {
            friend_code: candidate,
            friend_code_updated_at: serverTimestamp()
          },
          { merge: true }
        )

        if (prevCode && prevCode !== candidate) {
          const prevRef = shortcutDocRef(resolvedAppId, prevCode)
          const prevSnap = await tx.get(prevRef)
          const prevUid = prevSnap.exists() ? String(prevSnap.data()?.uid || '') : ''
          if (prevUid === uid) {
            tx.delete(prevRef)
          }
        }

        assigned = candidate
      })

      return assigned
    } catch (err) {
      const msg = String(err?.message || '')
      if (msg.includes('friend-code-collision')) continue
      return null
    }
  }

  return null
}

export const friendCodeUtils = {
  normalizeCode,
  isLikelyFriendCode
}
