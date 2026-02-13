import { auth } from '@/firebaseConfig'

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
