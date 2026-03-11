<template>
  <section class="cabinet">
    <div class="cabinet__header">
      <h3 class="cabinet__title">{{ title }}</h3>
      <div class="cabinet__header-actions">
        <button
          class="cabinet__action"
          type="button"
          :disabled="loading || !merged.length"
          @click="playAwardAnimation"
        >
          Play award animation
        </button>

        <div v-if="subtitle" class="cabinet__subtitle">{{ subtitle }}</div>
      </div>
    </div>

    <div v-if="loading" class="cabinet__state">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="cabinet__state cabinet__state--error">{{ error }}</div>

    <div v-else class="cabinet__categories">
      <section
        v-for="g in grouped"
        :key="g.id"
        class="cabinet__category"
      >
        <div class="cabinet__category-title">{{ g.title }}</div>

        <div class="cabinet__grid" role="list">
          <button
            v-for="a in g.items"
            :key="a.id"
            class="cabinet__item"
            :class="[
              tierClass(a),
              {
                'cabinet__item--locked': !a.isEarned,
                'cabinet__item--award': Boolean(awardFlashById[a.id])
              }
            ]"
            type="button"
            role="listitem"
            @click="openDetail(a)"
          >
            <div
              class="cabinet__icon"
              :class="{ 'cabinet__icon--pop': Boolean(iconPopById[a.id]) }"
              @click="triggerIconPop(a.id)"
            >
              <img class="cabinet__icon-img" :src="achievementIconUrl(a)" alt="" draggable="false" />
            </div>

            <div class="cabinet__name">{{ displayName(a) }}</div>
          </button>
        </div>
      </section>
    </div>

    <Transition name="cabinet-modal">
      <div v-if="showDetail" class="cabinet-modal" role="dialog" aria-modal="true">
        <div class="cabinet-modal__backdrop" @click="closeDetail" />

        <div class="cabinet-modal__card">
          <button class="cabinet-modal__close" type="button" @click="closeDetail">×</button>

          <div class="cabinet-modal__head">
            <div
              class="cabinet-modal__icon"
              :class="[
                tierClass(detail),
                { 'cabinet-modal__icon--locked': !detail?.isEarned }
              ]"
            >
              <img v-if="detail?.id" :src="achievementIconUrl(detail)" alt="" draggable="false" />
              <TimeIcon v-else-if="isTimeAchievementId(detail?.id)" />
              <div v-else class="cabinet-modal__icon-fallback" aria-hidden="true">★</div>
            </div>

            <div class="cabinet-modal__meta">
              <div class="cabinet-modal__title">{{ displayName(detail) }}</div>
              <div class="cabinet-modal__date">
                <template v-if="detail?.isEarned">
                  {{ t('achievement.cabinet.earnedAt') }}:
                  {{ detail?.earnedAt ? formatDate(detail.earnedAt) : t('common.unknown') }}
                </template>
                <template v-else>
                  {{ t('achievement.cabinet.notEarned') }}
                </template>
              </div>
            </div>
          </div>

          <div class="cabinet-modal__desc">
            {{ displayDescription(detail) }}
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { fetchAchievementCabinet } from '@/services/firestore/achievements'
import { achievementIconUrl } from '@/services/achievements/icons'
import { resolveAchievementDescription, resolveAchievementName } from '@/services/achievements/text'
import TimeIcon from '@/components/Achievement/time.vue'

defineOptions({
  name: 'AchievementCabinet'
})

const props = defineProps({
  userId: {
    type: String,
    required: true
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
  }
})

const { t, te, locale } = useI18n({ useScope: 'global' })

const loading = ref(false)
const error = ref('')
const items = ref([])

const merged = computed(() => {
  return Array.isArray(items.value) ? items.value : []
})

function tierClass(a) {
  const tier = a?.tier != null ? String(a.tier).trim().toLowerCase() : ''
  if (tier === 'brown' || tier === 'silver' || tier === 'gold') return `tier--${tier}`
  return ''
}

const grouped = computed(() => {
  /** @type {Map<string, any[]>} */
  const byCategory = new Map()

  for (const a of merged.value) {
    const category = a?.category != null ? String(a.category).trim() : ''
    const key = category || 'misc'
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key).push(a)
  }

  const tierOrder = { brown: 0, silver: 1, gold: 2 }
  for (const [key, list] of byCategory.entries()) {
    list.sort((aa, bb) => {
      const at = aa?.tier != null ? String(aa.tier).trim().toLowerCase() : ''
      const bt = bb?.tier != null ? String(bb.tier).trim().toLowerCase() : ''
      const ao = Object.prototype.hasOwnProperty.call(tierOrder, at) ? tierOrder[at] : 99
      const bo = Object.prototype.hasOwnProperty.call(tierOrder, bt) ? tierOrder[bt] : 99
      if (ao !== bo) return ao - bo
      const aid = aa?.id != null ? String(aa.id) : ''
      const bid = bb?.id != null ? String(bb.id) : ''
      return aid.localeCompare(bid)
    })
    byCategory.set(key, list)
  }

  const preferred = ['projects', 'time', 'misc']
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
    const title = te(titleKey) ? t(titleKey) : id
    return {
      id,
      title,
      items: byCategory.get(id) || []
    }
  })
})

const iconPopById = ref({})
const awardFlashById = ref({})

function triggerIconPop(id) {
  const key = id != null ? String(id).trim() : ''
  if (!key) return

  // Restart the animation even if it's already set.
  iconPopById.value = { ...iconPopById.value, [key]: false }
  requestAnimationFrame(() => {
    iconPopById.value = { ...iconPopById.value, [key]: true }
    window.setTimeout(() => {
      iconPopById.value = { ...iconPopById.value, [key]: false }
    }, 450)
  })
}

function playAwardAnimation() {
  const list = Array.isArray(merged.value) ? merged.value : []
  if (!list.length) return

  // Prefer the most recently earned achievement.
  const earned = list.filter((a) => a?.isEarned)
  let target = null

  if (earned.length) {
    earned.sort((aa, bb) => {
      const ams = aa?.earnedAt ? new Date(String(aa.earnedAt)).getTime() : 0
      const bms = bb?.earnedAt ? new Date(String(bb.earnedAt)).getTime() : 0
      return bms - ams
    })
    target = earned[0]
  } else {
    target = list[0]
  }

  const id = target?.id != null ? String(target.id).trim() : ''
  if (!id) return

  triggerIconPop(id)
  awardFlashById.value = { ...awardFlashById.value, [id]: false }
  requestAnimationFrame(() => {
    awardFlashById.value = { ...awardFlashById.value, [id]: true }
    window.setTimeout(() => {
      awardFlashById.value = { ...awardFlashById.value, [id]: false }
    }, 950)
  })
}

function displayName(a) {
  return resolveAchievementName(a, { t, te }, props.fallbackName)
}

function displayDescription(a) {
  return resolveAchievementDescription(a, { t, te }, '')
}

function isTimeAchievementId(id) {
  const s = id != null ? String(id).trim() : ''
  return s === 'time_1h' || s === 'time_10h' || s === 'time_50h'
}

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

const showDetail = ref(false)
const detail = ref(null)

function openDetail(a) {
  detail.value = a
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  detail.value = null
}

function formatDate(iso) {
  const ms = new Date(String(iso)).getTime()
  if (!Number.isFinite(ms)) return String(iso)
  try {
    return new Date(ms).toLocaleDateString(locale.value || 'en', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    })
  } catch {
    return new Date(ms).toISOString().slice(0, 10)
  }
}
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

.cabinet__header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.cabinet__action {
  border: 1px solid rgba(122, 90, 58, 0.25);
  background: rgba(255, 255, 255, 0.62);
  color: #5a3f2a;
  font-weight: 900;
  font-size: 0.8rem;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.cabinet__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.cabinet__categories {
  display: grid;
  gap: 12px;
}

.cabinet__category {
  display: grid;
  gap: 8px;
}

.cabinet__category-title {
  font-size: 0.9rem;
  font-weight: 950;
  color: rgba(90, 63, 42, 0.9);
  letter-spacing: 0.02em;
}

.cabinet__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 420px) {
  .cabinet__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.cabinet__item {
  border: none;
  background: rgba(245, 235, 218, 0.6);
  border: 1px solid rgba(122, 90, 58, 0.16);
  border-radius: 14px;
  padding: 10px 8px;
  display: grid;
  justify-items: center;
  gap: 6px;
  cursor: pointer;
}

.cabinet__item.tier--brown {
  background-color: var(--tier-brown);
}

.cabinet__item.tier--silver {
  background-color: var(--tier-silver);
}

.cabinet__item.tier--gold {
  background-color: var(--tier-gold);
}

.cabinet__item.tier--brown .cabinet__name {
  color: rgba(255, 255, 255, 0.95);
}

.cabinet__item.tier--brown .cabinet__icon {
  background-color: var(--tier-brown);
}

.cabinet__item.tier--silver .cabinet__icon {
  background-color: var(--tier-silver);
}

.cabinet__item.tier--gold .cabinet__icon {
  background-color: var(--tier-gold);
}

.cabinet__item--locked {
  opacity: 0.7;
}

.cabinet__item--award {
  animation: cabinetAwardFlash 900ms cubic-bezier(0.2, 0.9, 0.2, 1) 1;
}

@keyframes cabinetAwardFlash {
  0% {
    transform: translateY(0) scale(1);
    box-shadow: 0 0 0 rgba(255, 209, 80, 0);
  }
  30% {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 0 6px rgba(255, 209, 80, 0.22);
  }
  65% {
    transform: translateY(0) scale(1.01);
    box-shadow: 0 0 0 2px rgba(255, 209, 80, 0.16);
  }
  100% {
    transform: translateY(0) scale(1);
    box-shadow: 0 0 0 rgba(255, 209, 80, 0);
  }
}

.cabinet__item--locked .cabinet__icon-img,
.cabinet__item--locked .cabinet__icon-svg {
  filter: grayscale(1);
  opacity: 0.75;
}

.cabinet__icon {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(122, 90, 58, 0.18);
  position: relative;
}

.cabinet__icon--pop {
  animation: cabinetIconPop 420ms cubic-bezier(0.2, 0.9, 0.2, 1) 1;
}

@keyframes cabinetIconPop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.12) rotate(-6deg);
  }
  70% {
    transform: scale(1.04) rotate(4deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.cabinet__icon-img {
  width: 26px;
  height: 26px;
  object-fit: cover;
  border-radius: 8px;
}

.cabinet__icon-svg {
  width: 26px;
  height: 26px;
}

.cabinet__lock {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 22px;
  height: 22px;
}

.cabinet__name {
  width: 100%;
  font-size: 0.78rem;
  font-weight: 900;
  color: #5a3f2a;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cabinet-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
}

.cabinet-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
}

.cabinet-modal__card {
  position: relative;
  width: min(92vw, 520px);
  padding: 14px 14px;
  border-radius: 16px;
  background: rgba(245, 235, 218, 0.96);
  border: 2px solid rgba(122, 90, 58, 0.65);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.cabinet-modal__close {
  position: absolute;
  right: 10px;
  top: 8px;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(122, 90, 58, 0.25);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
  color: #5a3f2a;
}

.cabinet-modal__head {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 12px;
  align-items: center;
  padding-right: 40px;
}

.cabinet-modal__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: 1px solid rgba(122, 90, 58, 0.25);
  background: rgba(255, 255, 255, 0.55);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cabinet-modal__icon.tier--brown {
  background-color: var(--tier-brown);
}

.cabinet-modal__icon.tier--silver {
  background-color: var(--tier-silver);
}

.cabinet-modal__icon.tier--gold {
  background-color: var(--tier-gold);
}

.cabinet-modal__icon.tier--brown .cabinet-modal__icon-fallback {
  color: rgba(255, 255, 255, 0.92);
}

.cabinet-modal__icon--locked {
  filter: grayscale(1);
  opacity: 0.8;
}

.cabinet-modal__icon img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 10px;
}

.cabinet-modal__icon-fallback {
  font-size: 26px;
  color: #7a5a3a;
}

.cabinet-modal__title {
  font-size: 1.05rem;
  font-weight: 950;
  color: #5a3f2a;
}

.cabinet-modal__date {
  margin-top: 2px;
  font-size: 0.9rem;
  font-weight: 800;
  color: rgba(90, 63, 42, 0.85);
}

.cabinet-modal__desc {
  margin-top: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(90, 63, 42, 0.92);
  white-space: pre-wrap;
}

.cabinet-modal-enter-active {
  transition: opacity 0.16s ease;
}

.cabinet-modal-leave-active {
  transition: opacity 0.14s ease;
}

.cabinet-modal-enter-from,
.cabinet-modal-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .cabinet-modal-enter-active,
  .cabinet-modal-leave-active {
    transition: none;
  }
}
</style>
