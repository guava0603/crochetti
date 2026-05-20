import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/firebaseConfig'
import { uniqueTrimmedStrings } from '@/utils/text'

const functions = getFunctions(app)

function callFunction(name) {
  const fnName = name != null ? String(name).trim() : ''
  if (!fnName) throw new Error('callFunction: missing function name')
  return httpsCallable(functions, fnName)
}

/**
 * Fetch user profile summaries (name/avatar/etc) for a list of user IDs.
 * Uses callable Cloud Function `getUsersPublicProfiles`.
 */
export async function fetchUsersPublicProfiles({ userIds }) {
  const ids = uniqueTrimmedStrings(userIds)
  if (ids.length === 0) return []

  const callable = callFunction('getUsersPublicProfiles')
  const result = await callable({ user_ids: ids })

  const users = result?.data?.users
  return Array.isArray(users) ? users : []
}
