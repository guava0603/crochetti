import { getDoc, getDocFromCache, getDocs, getDocsFromCache } from 'firebase/firestore'

function refreshDocInBackground(docRef) {
  void getDoc(docRef).catch(() => {})
}

function refreshQueryInBackground(queryRef) {
  void getDocs(queryRef).catch(() => {})
}

/**
 * Read a document from the local cache first, then refresh from the server in the background.
 * Falls back to a server read when the document is not cached yet.
 */
export async function getDocLocalFirst(docRef) {
  let cachedSnap = null

  try {
    cachedSnap = await getDocFromCache(docRef)
    refreshDocInBackground(docRef)
    return cachedSnap
  } catch {
    // Not in cache yet.
  }

  try {
    return await getDoc(docRef)
  } catch (error) {
    if (cachedSnap) return cachedSnap

    try {
      return await getDocFromCache(docRef)
    } catch {
      throw error
    }
  }
}

/**
 * Read a query from the local cache first, then refresh from the server in the background.
 * Falls back to a server read when the query is not cached yet.
 */
export async function getDocsLocalFirst(queryRef) {
  let cachedSnap = null

  try {
    cachedSnap = await getDocsFromCache(queryRef)
    refreshQueryInBackground(queryRef)
    return cachedSnap
  } catch {
    // Not in cache yet.
  }

  try {
    return await getDocs(queryRef)
  } catch (error) {
    if (cachedSnap) return cachedSnap

    try {
      return await getDocsFromCache(queryRef)
    } catch {
      throw error
    }
  }
}
