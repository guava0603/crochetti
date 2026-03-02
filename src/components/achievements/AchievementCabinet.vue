<template>
  <section class="cabinet">
    <div class="cabinet__header">
      <h3 class="cabinet__title">{{ title }}</h3>
      <div v-if="subtitle" class="cabinet__subtitle">{{ subtitle }}</div>
    </div>

    <div v-if="loading" class="cabinet__state">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="cabinet__state cabinet__state--error">{{ error }}</div>

    <div v-else-if="visible.length === 0" class="cabinet__state">{{ t('achievement.empty') }}</div>

    <div v-else class="cabinet__body">
      <div class="cabinet__row-wrap">
        <div class="cabinet__row" role="list">
          <div
            v-for="a in visible"
            :key="a.id"
            class="cabinet__icon"
            :class="[
              tierClass(a),
              { 'cabinet__item--locked': !a.isEarned }
            ]"
            role="listitem"
            @click="openAchievement(a)"
          >
            <img class="cabinet__icon-img" :src="achievementIconUrl(a)" alt="" draggable="false" />
          </div>
        </div>

        <button v-if="hasMore" class="cabinet__more" type="button" @click="openFull">
          {{ t('achievement.more') }}
        </button>
      </div>
    </div>

    <AchievementGridModal
      :open="detailOpen"
      :achievement="detail"
      :title="detailTitle"
      :description="detailDescription"
      @close="closeAchievement"
    />

    <AchievementCabinetFullModal
      :open="fullOpen"
      :grouped="grouped"
      :is-my-page="isMyPage"
      :tier-class="tierClass"
      :display-name="displayName"
      :icon-url="achievementIconUrl"
      @close="closeFull"
      @open-achievement="openAchievement"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { fetchAchievementCabinet } from '@/services/firestore/achievements'
import { achievementIconUrl } from '@/services/achievements/icons'
import { resolveAchievementDescription, resolveAchievementName } from '@/services/achievements/text'
import AchievementCabinetFullModal from '@/components/achievements/AchievementCabinetFullModal.vue'
import AchievementGridModal from '@/components/achievements/AchievementGridModal.vue'

defineOptions({
  name: 'AchievementCabinet'
})

const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  isMyPage: {
    type: Boolean,
    default: false
  },
  earnedOnly: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  fallbackName: {
    type: String,
    default: 'Achievement'
  },
  maxVisible: {
    type: Number,
    default: 6
  }
})

const { t, te } = useI18n({ useScope: 'global' })

const loading = ref(false)
const error = ref('')
const items = ref([])

const merged = computed(() => (Array.isArray(items.value) ? items.value : []))

const displayItems = computed(() => {
  const list = merged.value
  if (!props.earnedOnly) return list
  return list.filter((a) => Boolean(a?.isEarned))
})

const TIER_ORDER = Object.freeze({ brown: 0, silver: 1, gold: 2, special: 3 })

function toStr(v) {
  return v != null ? String(v) : ''
}

function normalizeTier(v) {
  return toStr(v).trim().toLowerCase()
}

function tierRank(a) {
  const tier = normalizeTier(a?.tier)
  return Object.prototype.hasOwnProperty.call(TIER_ORDER, tier) ? TIER_ORDER[tier] : 99
}

function idStr(a) {
  return toStr(a?.id)
}

function compareByTierThenId(aa, bb) {
  const ao = tierRank(aa)
  const bo = tierRank(bb)
  if (ao !== bo) return ao - bo
  return idStr(aa).localeCompare(idStr(bb))
}

function earnedMs(a) {
  if (!a?.isEarned) return -1
  if (!a?.earnedAt) return 0
  const ms = new Date(String(a.earnedAt)).getTime()
  return Number.isFinite(ms) ? ms : 0
}

function tierClass(a) {
  const tier = normalizeTier(a?.tier)
  if (tier === 'brown' || tier === 'silver' || tier === 'gold' || tier === 'special') return `tier--${tier}`
  return ''
}

function displayName(a) {
  return resolveAchievementName(a, { t, te }, props.fallbackName)
}

function displayDescription(a) {
  return resolveAchievementDescription(a, { t, te }, '')
}

const sorted = computed(() => {
  const list = displayItems.value.slice()

  list.sort((aa, bb) => {
    const ams = earnedMs(aa)
    const bms = earnedMs(bb)
    if (ams !== bms) return bms - ams

    const ae = aa?.isEarned ? 1 : 0
    const be = bb?.isEarned ? 1 : 0
    if (ae !== be) return be - ae

    return compareByTierThenId(aa, bb)
  })

  return list
})

const visible = computed(() => {
  const n = Math.max(0, Number(props.maxVisible) || 0)

  // Cabinet preview row should only show earned achievements.
  // (Locked items are still available in the full modal.)
  const earned = sorted.value.filter((a) => Boolean(a?.isEarned))
  return earned.slice(0, n)
})

const hasMore = computed(() => {
  const n = Math.max(0, Number(props.maxVisible) || 0)
  const earnedCount = sorted.value.reduce((acc, a) => (a?.isEarned ? acc + 1 : acc), 0)
  return earnedCount > n
})

const grouped = computed(() => {
  /** @type {Map<string, any[]>} */
  const byCategory = new Map()

  for (const a of displayItems.value) {
    const category = toStr(a?.category).trim()
    const key = category || 'misc'
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key).push(a)
  }

  for (const list of byCategory.values()) {
    list.sort(compareByTierThenId)
  }

  const preferred = ['special', 'projects', 'time', 'misc']
  const keys = Array.from(byCategory.keys())
  keys.sort((a, b) => {
    const ai = preferred.indexOf(a)
    const bi = preferred.indexOf(b)
    const ao = ai === -1 ? 999 : ai
    const bo = bi === -1 ? 999 : bi
    if (ao !== bo) return ao - bo
    return a.localeCompare(b)
  })

  return keys.map((id) => {
    const titleKey = `achievement.categories.${id}`
    const title = typeof te === 'function' && te(titleKey) ? t(titleKey) : id
    return {
      id,
      title,
      items: byCategory.get(id) || []
    }
  })
})

async function load() {
  const uid = String(props.userId || '').trim()
  if (!uid) return

  loading.value = true
  error.value = ''

  try {
    items.value = await fetchAchievementCabinet(uid)
  } catch (e) {
    console.warn('AchievementCabinet.load failed:', e)
    error.value = e?.message ? String(e.message) : 'Failed to load achievements'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.userId, load)

const detailOpen = ref(false)
const detail = ref(null)

const detailTitle = computed(() => (detail.value ? displayName(detail.value) : ''))
const detailDescription = computed(() => (detail.value ? displayDescription(detail.value) : ''))

function openAchievement(a) {
  detail.value = a
  detailOpen.value = true
}

function closeAchievement() {
  detailOpen.value = false
  detail.value = null
}

const fullOpen = ref(false)
const previousBodyOverflow = ref('')

function setVisualViewportVars() {
  const vv = window?.visualViewport
  const height = (vv && typeof vv.height === 'number' ? vv.height : window?.innerHeight) || 0
  const offsetTop = vv && typeof vv.offsetTop === 'number' ? vv.offsetTop : 0
  if (!document?.documentElement?.style) return
  if (height > 0) document.documentElement.style.setProperty('--visual-viewport-height', `${height}px`)
  document.documentElement.style.setProperty('--visual-viewport-offset-top', `${offsetTop}px`)
}

function clearVisualViewportVars() {
  if (!document?.documentElement?.style) return
  document.documentElement.style.removeProperty('--visual-viewport-height')
  document.documentElement.style.removeProperty('--visual-viewport-offset-top')
}

function addVisualViewportListeners() {
  const vv = window?.visualViewport
  if (vv?.addEventListener) {
    vv.addEventListener('resize', setVisualViewportVars)
    vv.addEventListener('scroll', setVisualViewportVars)
  }
  window?.addEventListener?.('resize', setVisualViewportVars)
}

function removeVisualViewportListeners() {
  const vv = window?.visualViewport
  if (vv?.removeEventListener) {
    vv.removeEventListener('resize', setVisualViewportVars)
    vv.removeEventListener('scroll', setVisualViewportVars)
  }
  window?.removeEventListener?.('resize', setVisualViewportVars)
}

watch(
  fullOpen,
  (next) => {
    if (!document?.body?.style) return
    if (next) {
      previousBodyOverflow.value = document.body.style.overflow || ''
      document.body.style.overflow = 'hidden'

      setVisualViewportVars()
      addVisualViewportListeners()
      return
    }
    document.body.style.overflow = previousBodyOverflow.value

    removeVisualViewportListeners()
    clearVisualViewportVars()
  },
  { flush: 'post' }
)

function openFull() {
  fullOpen.value = true
}

function closeFull() {
  fullOpen.value = false
}

onUnmounted(() => {
  if (document?.body?.style) document.body.style.overflow = previousBodyOverflow.value

  removeVisualViewportListeners()
  clearVisualViewportVars()
})
</script>

<style scoped>
.cabinet {
  width: min(92vw, 560px);
  margin: 14px auto 18px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.07);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.cabinet__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.cabinet__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 900;
  color: #111827;
}

.cabinet__subtitle {
  font-size: 0.85rem;
  font-weight: 800;
  color: #6b7280;
}

.cabinet__state {
  font-size: 0.92rem;
  font-weight: 700;
  color: #6b7280;
}

.cabinet__state--error {
  color: #b91c1c;
}

.cabinet__row-wrap {
  position: relative;
  padding-bottom: 2px;
}

.cabinet__row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  overflow: hidden;
}

.cabinet__item--locked {
  opacity: 0.7;
}

.cabinet__icon {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.65);
  border: 3px solid rgba(122, 90, 58, 0.18);
  cursor: pointer;
}

.cabinet__icon.tier--brown {
  background-color: var(--tier-brown);
}

.cabinet__icon.tier--silver {
  background-color: var(--tier-silver);
}

.cabinet__icon.tier--gold {
  background-color: var(--tier-gold);
}

.cabinet__icon.tier--special {
  background-color: var(--tier-special);
}

.cabinet__icon-img {
  width: 26px;
  height: 26px;
  object-fit: cover;
  border-radius: 8px;
}

.cabinet__more {
  position: absolute;
  right: 0;
  bottom: -2px;
  border: 1px solid rgba(122, 90, 58, 0.25);
  background: rgba(255, 255, 255, 0.75);
  color: #5a3f2a;
  font-weight: 950;
  font-size: 0.78rem;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
}
</style>
