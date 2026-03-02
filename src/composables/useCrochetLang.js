import { ref } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebaseConfig'
import { subscribeUserProfile, updateUserProfile } from '@/services/firestore/user'
import { CROCHET_LANG } from '@/constants/crochetData'

const STORAGE_KEY = 'corchetti.crochet_lang'

const crochetLang = ref(loadInitial())
const isReady = ref(false)
const isAuthed = ref(false)

let initStarted = false
let _unsubscribeAuth = null
let unsubscribeProfile = null
let currentUserId = null

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : CROCHET_LANG.symbol_jp
  } catch {
    return CROCHET_LANG.symbol_jp
  }
}

function saveLocal(next) {
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // ignore
  }
}


function cleanupProfileSub() {
  if (typeof unsubscribeProfile === 'function') unsubscribeProfile()
  unsubscribeProfile = null
}

function start() {
  if (initStarted) return
  initStarted = true

  _unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    cleanupProfileSub()

    currentUserId = user?.uid || null
    isAuthed.value = Boolean(currentUserId)

    if (!currentUserId) {
      isReady.value = true
      return
    }

    try {
      unsubscribeProfile = subscribeUserProfile({
        userId: currentUserId,
        fallbackProfile: {},
        onData: (profile) => {
          const next = Number(profile?.crochet_lang)
          if (Number.isFinite(next)) {
            crochetLang.value = next
            saveLocal(next)
          }
          isReady.value = true
        },
        onError: () => {
          isReady.value = true
        }
      })
    } catch {
      isReady.value = true
    }
  })
}

export function useCrochetLang() {
  start()

  const setCrochetLang = async (nextValue) => {
    const next = Number(nextValue)
    const safe = Number.isFinite(next) ? next : CROCHET_LANG.symbol_jp

    crochetLang.value = safe
    saveLocal(safe)

    if (!currentUserId) return true

    try {
      await updateUserProfile({
        userId: currentUserId,
        profileData: {
          crochet_lang: safe
        }
      })
    } catch {
      // Keep local preference even if remote save fails.
      return false
    }

    return true
  }

  return {
    crochetLang,
    setCrochetLang,
    isReady,
    isAuthed
  }
}
