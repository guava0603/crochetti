import { db } from '@/firebaseConfig'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export async function createWish({ description, userId, email } = {}) {
  const uid = String(userId || '').trim()
  if (!uid) throw new Error('createWish: missing userId')

  const desc = String(description || '').trim()
  if (!desc) throw new Error('createWish: missing description')

  const payload = {
    description: desc,
    user_id: uid,
    status: 'new',
    is_completed: false,
    reply: '',
    email: String(email || '').trim(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  }

  const ref = await addDoc(collection(db, 'wishes'), payload)
  return ref.id
}
