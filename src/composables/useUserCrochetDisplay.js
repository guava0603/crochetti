import { computed, ref } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebaseConfig'
import { subscribeUserProfile, updateUserProfile } from '@/services/firestore/user'
import { USER_CROCHET_PROFILE_FIELDS } from '@/constants/userCrochetDisplay'
import {
  getNextUserSelfDefinedStitchId,
  hasCustomDisplaySettings,
  normalizeStitchDisplayAliases,
  normalizeUserSelfDefinedStitches,
  setUserCrochetDisplayCache
} from '@/utils/userCrochetDisplay'

const stitchDisplayAliases = ref({})
const userSelfDefinedStitches = ref([])
const isReady = ref(false)

let initStarted = false
let unsubscribeAuth = null
let unsubscribeProfile = null
let currentUserId = null

function applyProfile(profile) {
  const aliases = normalizeStitchDisplayAliases(profile?.[USER_CROCHET_PROFILE_FIELDS.stitchDisplayAliases])
  const stitches = normalizeUserSelfDefinedStitches(profile?.[USER_CROCHET_PROFILE_FIELDS.userSelfDefinedStitches])
  stitchDisplayAliases.value = aliases
  userSelfDefinedStitches.value = stitches
  setUserCrochetDisplayCache({ aliases, userStitches: stitches })
}

function cleanupProfileSub() {
  if (typeof unsubscribeProfile === 'function') unsubscribeProfile()
  unsubscribeProfile = null
}

function start() {
  if (initStarted) return
  initStarted = true

  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    cleanupProfileSub()
    currentUserId = user?.uid || null

    if (!currentUserId) {
      applyProfile(null)
      isReady.value = true
      return
    }

    try {
      unsubscribeProfile = subscribeUserProfile({
        userId: currentUserId,
        fallbackProfile: {},
        onData: (profile) => {
          applyProfile(profile)
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

export function useUserCrochetDisplay() {
  start()

  const hasCustomDisplay = computed(() => {
    return hasCustomDisplaySettings(stitchDisplayAliases.value, userSelfDefinedStitches.value)
  })

  async function saveUserCrochetDisplaySettings({ aliases, userStitches } = {}) {
    const nextAliases = normalizeStitchDisplayAliases(aliases)
    const nextStitches = normalizeUserSelfDefinedStitches(userStitches)

    stitchDisplayAliases.value = nextAliases
    userSelfDefinedStitches.value = nextStitches
    setUserCrochetDisplayCache({ aliases: nextAliases, userStitches: nextStitches })

    if (!currentUserId) return true

    try {
      await updateUserProfile({
        userId: currentUserId,
        profileData: {
          [USER_CROCHET_PROFILE_FIELDS.stitchDisplayAliases]: nextAliases,
          [USER_CROCHET_PROFILE_FIELDS.userSelfDefinedStitches]: nextStitches
        }
      })
      return true
    } catch {
      return false
    }
  }

  function createDraftUserStitchFromWizard(draft) {
    const name = String(draft?.name || '').trim()
    if (!name) return null

    const symbolJp = typeof draft?.symbol_jp === 'string' ? String(draft.symbol_jp).trim() : ''
    const textZh = typeof draft?.text_zh === 'string' ? String(draft.text_zh).trim() : ''

    return {
      stitch_id: getNextUserSelfDefinedStitchId(userSelfDefinedStitches.value),
      name,
      symbol_jp: symbolJp || undefined,
      text_zh: textZh || undefined,
      display_label: name,
      description: String(draft?.description || '').trim(),
      consume: Number(draft?.consume) || 1,
      generate: Number(draft?.generate) || 0
    }
  }

  return {
    stitchDisplayAliases,
    userSelfDefinedStitches,
    hasCustomDisplay,
    isReady,
    saveUserCrochetDisplaySettings,
    createDraftUserStitchFromWizard
  }
}
